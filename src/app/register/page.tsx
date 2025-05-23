"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { QrCode, Mail, Lock, User, Building, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("siswa");
  const [showSplash, setShowSplash] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    // Show splash screen for 1 second
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation
    if (!name || !email || !password) {
      toast.error("Semua field harus diisi");
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error("Password tidak cocok");
      return;
    }
    
    try {
      setIsLoading(true);
      // Import auth module properly without calling hooks inside handlers
      const { auth, db } = await import("@/lib/firebase");
      const { 
        createUserWithEmailAndPassword, 
        updateProfile 
      } = await import("firebase/auth");
      const { doc, setDoc, Timestamp } = await import("firebase/firestore");
      
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update profile
      await updateProfile(user, {
        displayName: name
      });
      
      // Create a user document with proper data structure for Firestore
      const userData = {
        name,
        email,
        role: role || 'siswa',
        schoolId: null, // Default to null, will be assigned later by admin
        createdAt: Timestamp.now()
      };
      
      try {
        // Create user document first
        await setDoc(doc(db, "users", user.uid), userData);
        
        // Create a school document if user is an admin
        if (role === 'admin') {
          const schoolId = user.uid;
          
          // Create a school document with proper data structure for Firestore
          const schoolData = {
            name: 'New School',
            npsn: '12345678',
            address: 'School Address',
            principalName: name,
            principalNip: '123456',
            createdAt: Timestamp.now(),
            createdBy: user.uid
          };
          
          try {
            await setDoc(doc(db, "schools", schoolId), schoolData);
            // If school was created successfully, update user's schoolId
            await setDoc(doc(db, "users", user.uid), { schoolId }, { merge: true });
          } catch (schoolError) {
            console.error("Error creating school:", schoolError);
            // Continue registration flow even if school creation fails
          }
        }
        
        toast.success("Pendaftaran berhasil!");
        router.push("/login");
      } catch (docError) {
        console.error("Error creating document:", docError);
        toast.error("Gagal mendaftarkan akun. Silakan coba lagi.");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      let errorMessage = "Pendaftaran gagal. Silakan coba lagi.";
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Email sudah digunakan";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Format email tidak valid";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password terlalu lemah";
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = "Koneksi terputus. Periksa koneksi internet Anda";
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    toast.error("Login menggunakan Akun Google sedang dalam Pengembangan");
  };

  return (
    <>
      <Toaster position="top-center" />
      
      <AnimatePresence>
        {showSplash ? (
          <motion.div 
            className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 via-purple-500 to-orange-500 z-50"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex flex-col items-center"
            >
              <div className="bg-white p-6 rounded-full mb-4">
                <QrCode className="h-16 w-16 text-primary" />
              </div>
              <h1 className="text-white text-base sm:text-xl md:text-2xl font-bold text-center">
                ABSENSI DIGITAL QR CODE
              </h1>
            </motion.div>
          </motion.div>
        ) : (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="bg-primary text-white py-4 fixed top-0 left-0 right-0 z-50 shadow-md">
        <div className="container-custom flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <QrCode className="h-6 w-6" />
            <span className="font-bold text-lg">ABSENSI DIGITAL</span>
          </Link>
        </div>
      </header>

      <div className="pt-20 sm:pt-20 md:pt-24 mt-0 pb-12 sm:pb-16 px-3 sm:px-4">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-4 sm:p-6 md:p-8">
            <div className="flex flex-col items-center mb-6">
              <div className="bg-primary/10 p-4 rounded-full mb-4 border border-gray-300">
                <QrCode className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">MEMBUAT AKUN</h2>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nama Lengkap Anda</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary focus:border-primary block w-full pl-10 p-2.5"
                    placeholder="Nama lengkap"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary focus:border-primary block w-full pl-10 p-2.5"
                    placeholder="Masukkan E-mail"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">Peran</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary focus:border-primary block w-full pl-10 p-2.5"
                  >
                    <option value="admin">Administrator</option>
                    <option value="guru">Operator</option>
                    <option value="siswa">Pegawai</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary focus:border-primary block w-full pl-10 pr-10 p-2.5"
                      placeholder="Masukkan Password"
                    />
                    <div 
                      className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 hover:text-gray-700"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" x2="22" y1="2" y2="22"></line></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 hover:text-gray-700"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Konfirmasi Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary focus:border-primary block w-full pl-10 pr-10 p-2.5"
                      placeholder="Konfirmasi Password"
                    />
                    <div 
                      className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 hover:text-gray-700"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" x2="22" y1="2" y2="22"></line></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 hover:text-gray-700"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2.5 px-5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Mendaftar
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            {/* Registration buttons section - Google login removed */}

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Sudah memiliki akun?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Masuk
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
