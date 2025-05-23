"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { QrCode, Mail, Lock, ArrowRight, LogIn, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showSplash, setShowSplash] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Show splash screen for 1 second
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1000);
    
    // Check if we have a remembered email
    if (typeof window !== 'undefined') {
      const rememberedEmail = localStorage.getItem('rememberedEmail');
      if (rememberedEmail) {
        setEmail(rememberedEmail);
        setRememberPassword(true);
      }
    }

    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation
    if (!email || !password) {
      toast.error("Email dan password harus diisi");
      return;
    }
    
    try {
      setIsLoading(true);
      // Import directly from firebase instead of using context hook in event handler
      const { auth } = await import("@/lib/firebase");
      const { signInWithEmailAndPassword, setPersistence, browserSessionPersistence, browserLocalPersistence } = await import("firebase/auth");
      const { doc, getDoc } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      
      // Set persistence based on remember password checkbox
      await setPersistence(auth, rememberPassword ? browserLocalPersistence : browserSessionPersistence);
      
      // Sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get user data to determine the role
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userDocData = userDoc.data();
        // Store the role in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('userRole', userDocData.role || 'student');
          if (userDocData.schoolId) {
            localStorage.setItem('schoolId', userDocData.schoolId);
          } else if (userDocData.role === 'admin') {
            // If admin has no schoolId, they need to set up a school
            localStorage.setItem('needsSchoolSetup', 'true');
          }
          
          // Store email in localStorage if remember password is checked
          if (rememberPassword) {
            localStorage.setItem('rememberedEmail', email);
          } else {
            localStorage.removeItem('rememberedEmail');
          }
        }
      }
      
      toast.success("Login berhasil!");
      
      // Redirect based on role and school setup status
      if (userDoc.exists() && userDoc.data().role === 'admin' && !userDoc.data().schoolId) {
        router.push("/dashboard/setup-school");
      } else {
        router.push("/dashboard");
      }
    } catch (error: any) {
      toast.error("Login gagal, Username atau Password salah.");
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
            {/* Header */}
            <header className="bg-primary text-white py-4 fixed top-0 left-0 right-0 z-50 shadow-md">
              <div className="container-custom flex justify-between items-center">
                <Link href="/" className="flex items-center gap-2">
                  <QrCode className="h-6 w-6" />
                  <span className="font-bold text-lg">ABSENSI DIGITAL</span>
                </Link>
              </div>
            </header>

            <div className="pt-20 sm:pt-20 md:pt-24 mt-4 pb-12 sm:pb-16 px-3 md:px-4">
              <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-4 sm:p-6 md:p-8">
                  <div className="flex flex-col items-center mb-6">
                    <div className="bg-primary/10 p-4 rounded-full mb-4 border border-gray-300">
                      <QrCode className="h-12 w-12 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">LOGIN SISTEM</h2>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4">
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
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-gray-400" />
                        </div>
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
                        >
                          {showPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 hover:text-gray-600"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" x2="22" y1="2" y2="22"></line></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 hover:text-gray-600"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center mt-3">
                      <input
                        id="rememberPassword"
                        type="checkbox"
                        checked={rememberPassword}
                        onChange={(e) => setRememberPassword(e.target.checked)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <label htmlFor="rememberPassword" className="ml-2 block text-sm text-gray-700">
                        Ingat Kata Sandi
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2.5 px-5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70"
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <LogIn className="h-5 w-5" />
                      )}
                      {isLoading ? "Memproses..." : "Masuk"}
                    </button>
                  </form>

                  {/* Login buttons section - Google login removed */}

                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                      Belum memiliki akun?{" "}
                      <Link href="/register" className="text-primary hover:underline font-medium">
                        Daftar
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
