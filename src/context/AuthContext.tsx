"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { User, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
interface AuthContextType {
  user: User | null;
  userRole: string | null;
  schoolId: string | null;
  loading: boolean;
  userData: any;
  signup: (email: string, password: string, name: string, role: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: any) => Promise<void>;
}
const AuthContext = createContext<AuthContextType>({} as AuthContextType);
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
export const AuthProvider = ({
  children
}: {
  children: ReactNode;
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const router = useRouter();
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async currentUser => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Force token refresh before accessing Firestore
          try {
            await currentUser.getIdToken(true);
          } catch (refreshError) {
            console.error("Failed to refresh authentication token:", refreshError);
            // Continue anyway, but log the error
          }

          // Use safer document access with retry
          const userDocRef = doc(db, "users", currentUser.uid);

          // Import retryOperation dynamically to avoid circular dependencies
          const {
            retryOperation,
            safeGetDoc
          } = await import('@/lib/firebase');
          const userDocResult = await retryOperation(async () => {
            return await safeGetDoc(userDocRef);
          });
          if (userDocResult.success && userDocResult.exists) {
            const userDataObj = userDocResult.data;
            setUserRole(userDataObj.role);
            setSchoolId(userDataObj.schoolId);
            setUserData(userDataObj);

            // Store role in localStorage for persistence
            if (typeof window !== 'undefined') {
              localStorage.setItem('userRole', userDataObj.role);
              if (userDataObj.schoolId) {
                localStorage.setItem('schoolId', userDataObj.schoolId);
              }

              // Store if user is new and needs to setup school
              if (userDataObj.role === 'admin' && !userDataObj.schoolId) {
                localStorage.setItem('needsSchoolSetup', 'true');
              } else {
                localStorage.removeItem('needsSchoolSetup');
              }
            }

            // Validate school ID if present
            if (userDataObj.schoolId) {
              const schoolDocRef = doc(db, "schools", userDataObj.schoolId);
              const schoolDocResult = await retryOperation(async () => {
                return await safeGetDoc(schoolDocRef);
              });
              if (!schoolDocResult.success || !schoolDocResult.exists) {
                console.warn("Warning: User's school ID does not exist or permission denied", schoolDocResult.message);
                if (userDataObj.role === 'admin') {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('needsSchoolSetup', 'true');
                  }
                }
              }
            }
          } else {
            console.error("Error fetching user data:", userDocResult.message);
            toast.error(userDocResult.message || "Gagal memuat data pengguna");
          }
        } catch (error: any) {
          console.error("Error fetching user data:", error);

          // Handle specific error cases
          if (error.code === 'permission-denied') {
            toast.error("Akses ditolak. Silakan login kembali.");
            // Force logout on permission issues
            await auth.signOut().catch(e => console.error("Error signing out:", e));
          }
        }
      } else {
        setUserRole(null);
        setSchoolId(null);
        setUserData(null);

        // Clear localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('userRole');
          localStorage.removeItem('schoolId');
          localStorage.removeItem('needsSchoolSetup');
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Check authorization for routes based on role
  const checkAuthorization = useCallback((requiredRoles?: string[]) => {
    if (!userRole) return false;
    if (!requiredRoles) return true;
    return requiredRoles.includes(userRole);
  }, [userRole]);

  // Use useCallback to prevent recreation of functions on every render
  const signup = useCallback(async (email: string, password: string, name: string, role: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await updateProfile(user, {
        displayName: name
      });

      // Create a school document if user is an administrator
      let schoolId = null;
      if (role === 'admin') {
        // Create a new school ID using the user's ID
        schoolId = user.uid;

        // Create a school document with proper data structure
        const schoolData = {
          name: '',
          npsn: '',
          address: '',
          principalName: '',
          principalNip: '',
          createdAt: serverTimestamp(),
          createdBy: user.uid
        };
        await setDoc(doc(db, "schools", schoolId), schoolData);
      }

      // Create a user document with proper data structure
      const userData = {
        name,
        email,
        role,
        schoolId,
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, "users", user.uid), userData);
      setUserRole(role);
      setSchoolId(schoolId);
    } catch (error) {
      console.error("Error signing up:", error);
      throw error;
    }
  }, []);
  const login = useCallback(async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user role and school ID
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserRole(userData.role);
        setSchoolId(userData.schoolId);
      }
    } catch (error) {
      console.error("Error logging in:", error);
      throw error;
    }
  }, []);
  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setUserRole(null);
      setSchoolId(null);
    } catch (error) {
      console.error("Error logging out:", error);
      throw error;
    }
  }, []);
  const updateUserProfile = useCallback(async (data: any) => {
    try {
      if (user) {
        await setDoc(doc(db, "users", user.uid), data, {
          merge: true
        });
        if (data.displayName) {
          await updateProfile(user, {
            displayName: data.displayName
          });
        }
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  }, [user]);

  // Use useMemo to prevent unnecessary re-creation of the context value object
  const value = useMemo(() => ({
    user,
    userRole,
    schoolId,
    loading,
    userData,
    signup,
    login,
    logout,
    updateUserProfile
  }), [user, userRole, schoolId, loading, userData, signup, login, logout, updateUserProfile]);
  return <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>;
};