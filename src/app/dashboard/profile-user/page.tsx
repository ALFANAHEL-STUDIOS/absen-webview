"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { User, Mail, Phone, MapPin, Save, CheckCircle, Loader2, QrCode } from "lucide-react";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { updateDocument } from "@/lib/firestore";
import { useRouter } from "next/navigation";

interface UserProfileData {
  name: string;
  email: string;
  phone: string;
  address: string;
  bio: string;
  role: string;
  avatarUrl?: string;
}

export default function UserProfile() {
  const { user, updateUserProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [userData, setUserData] = useState<UserProfileData>({
    name: "",
    email: "",
    phone: "",
    address: "",
    bio: "",
    role: "",
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          // Get user data from Firebase Auth
          setUserData({
            name: user.displayName || "",
            email: user.email || "",
            phone: user.phoneNumber || "",
            address: "",
            bio: "",
            role: "",
          });
          
          // Try to get additional user data from Firestore
          const { userApi } = await import('@/lib/api');
          const userDoc = await userApi.getById(user.uid) as {
            name?: string;
            phone?: string;
            address?: string;
            bio?: string;
            role?: string;
          };
          
          if (userDoc) {
            setUserData(prev => ({
              ...prev,
              name: user.displayName || userDoc.name || "",
              phone: user.phoneNumber || userDoc.phone || "",
              address: userDoc.address || "",
              bio: userDoc.bio || "",
              role: userDoc.role || "",
            }));
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserData();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Data pengguna tidak tersedia");
      return;
    }

    try {
      setSaving(true);
      
      // Update user profile in Firebase Auth
      await updateUserProfile({
        displayName: userData.name
      });
      
      // Update user data in Firestore
      const { userApi } = await import('@/lib/api');
      await userApi.update(user.uid, {
        name: userData.name,
        phone: userData.phone,
        address: userData.address,
        bio: userData.bio
      });
      
      // Show success animation
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        // Redirect back to dashboard
        router.push('/dashboard');
      }, 1500);
    } catch (error) {
      console.error("Error saving user data:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 md:px-6 pb-24 md:pb-6">
      <div className="flex items-center mb-6">
        <User className="h-8 w-8 text-primary mr-3" />
        <h1 className="text-2xl font-bold text-gray-800">Profil Pengguna</h1>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8 border border-gray-100">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 md:gap-6">
            <div className="md:col-span-2 flex flex-col items-center justify-center mb-4">
              <div className="w-24 h-24 bg-white rounded-lg flex items-center justify-center text-gray-500 mb-3 border border-gray-300">
                <QrCode size={48} />
              </div>
            </div>
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nama Lengkap
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={userData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white shadow-sm"
                  placeholder="Nama lengkap"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={userData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white shadow-sm"
                  placeholder="Email"
                  required
                  disabled
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Email tidak dapat diubah</p>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Nomor Telepon
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  id="phone"
                  name="phone"
                  value={userData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white shadow-sm"
                  placeholder="Nomor telepon"
                />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Peran
              </label>
              <input
                type="text"
                id="role"
                name="role"
                value={userData.role === 'admin' ? 'Administrator' : userData.role === 'teacher' ? 'Guru' : 'Siswa'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white shadow-sm"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">Peran tidak dapat diubah</p>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Alamat Lengkap
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                <textarea
                  id="address"
                  name="address"
                  value={userData.address}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white shadow-sm"
                  placeholder="Alamat lengkap"
                />
              </div>
            </div>


            <div className="md:col-span-2 flex justify-end">
              <motion.button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                whileTap={{ scale: 0.95 }}
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : saveSuccess ? (
                  <CheckCircle size={20} />
                ) : (
                  <Save size={20} />
                )}
                {saveSuccess ? "Tersimpan" : "Simpan"}
              </motion.button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
