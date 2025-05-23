"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { School, Save, CheckCircle, Loader2, QrCode, MapPin, Phone, Mail, Globe } from "lucide-react";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function SetupSchool() {
  const { user, schoolId } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schoolData, setSchoolData] = useState({
    name: "",
    npsn: "",
    address: "",
    principalName: "",
    principalNip: "",
    email: "",
    phone: "",
    website: "",
  });

  // State for notification popup
  const [showNotification, setShowNotification] = useState(true);

  useEffect(() => {
    // Check if user already has a school
    if (schoolId) {
      router.push('/dashboard');
    } else {
      setLoading(false);
      
      // Always show notification for new users
      setShowNotification(true);
      
      // Check if this is a first-time login
      if (typeof window !== 'undefined') {
        const isFirstLogin = localStorage.getItem('isFirstLogin') !== 'false';
        if (isFirstLogin) {
          localStorage.setItem('isFirstLogin', 'false');
        }
      }
    }
  }, [schoolId, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSchoolData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Silakan login terlebih dahulu");
      return;
    }
    
    try {
      setSaving(true);
      
      const { schoolApi } = await import('@/lib/api');
      const { userApi } = await import('@/lib/api');
      
      // Create new school with user's ID as the school ID
      const schoolId = user.uid;
      await schoolApi.create({
        ...schoolData,
        createdAt: new Date(),
        createdBy: user.uid
      }, schoolId);
      
      // Update user record with schoolId
      await userApi.update(user.uid, { schoolId });
      
      toast.success("Sekolah berhasil didaftarkan");
      router.push('/dashboard');
    } catch (error) {
      console.error("Error saving school data:", error);
      toast.error("Gagal menyimpan data sekolah");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 md:px-6 pb-24 md:pb-6">
      {/* Notification Popup */}
      {showNotification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-center mb-4">PEMBERITAHUAN</h2>
            <hr className="border-gray-200 my-4"/>
            
            <p className="text-gray-700 mb-4">
              Bagi Pengguna yang baru pertama kali membuat akun dan Login ke Sistem Absensi QR Code, tidak akan bisa mengisi Data Sekolah. Silahkan lakukan Konfirmasi kepada SuperAdmin dengan cara mengirim pesan melalui chat Whatsapp dengan format :
            </p>

            <p className="text-gray-700 mb-4">
              Saya Pengguna baru dan ini Data Sekolah saya :<br/>
              Nama Sekolah : ...... <br/>
              E-Mail Sekolah : ...... <br/>
              <br/>
              Mohon untuk di Approve Akun kami agar dapat mengisi data Sekolah.
            </p>

            <p className="text-gray-700 mb-6">
              Kirim Pesan Whatsapp ke: <br/>
              <span className="text-lg font-bold">0812 7240 5881</span>
            </p>
            <button 
              onClick={() => {
                setShowNotification(false);
                router.push('/login');
              }}
              className="w-full bg-primary text-white py-2 rounded-lg hover:bg-primary/90"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center justify-center mb-6">
        <School className="h-8 w-8 text-primary mr-3" />
        <h1 className="text-2xl font-bold text-gray-800">Selamat Datang di Absensi Digital</h1>
      </div>
      
      <div className="bg-blue-50 rounded-lg p-4 mb-6 text-center shadow-sm">
        <p className="text-blue-700">Silahkan lengkapi data Anda untuk mulai menggunakan aplikasi.</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8 border border-gray-100">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <div className="md:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nama Desa <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={schoolData.name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white shadow-sm text-base"
                placeholder="Masukkan nama Desa"
                required
              />
            </div>

            <div className="mb-1">
              <label htmlFor="npsn" className="block text-sm font-medium text-gray-700 mb-1">
                Kode Pos <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="npsn"
                name="npsn"
                value={schoolData.npsn}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white shadow-sm text-base"
                placeholder="Masukkan Kode Pos"
                required
              />
            </div>
            
            <div className="mb-1">
              <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                Website Desa (jika ada)
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  id="website"
                  name="website"
                  value={schoolData.website}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white shadow-sm text-base"
                  placeholder="https://www.nama.desa.id"
                />
              </div>
            </div>

            <div className="md:col-span-2 mb-1">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Alamat Desa <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-gray-400" size={20} />
                <textarea
                  id="address"
                  name="address"
                  value={schoolData.address}
                  onChange={handleChange}
                  rows={3}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white shadow-sm text-base"
                  placeholder="Masukkan alamat lengkap desa"
                  required
                />
              </div>
            </div>
            
            <div className="mb-1">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Desa
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={schoolData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white shadow-sm text-base"
                  placeholder="email@desa.id"
                />
              </div>
            </div>
            
            <div className="mb-1">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Nomor Telepon
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  id="phone"
                  name="phone"
                  value={schoolData.phone}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white shadow-sm text-base"
                  placeholder="+62-xxx-xxxx-xxxx"
                />
              </div>
            </div>

            <div className="mb-1">
              <label htmlFor="principalName" className="block text-sm font-medium text-gray-700 mb-1">
                Nama Kepala Desa <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="principalName"
                name="principalName"
                value={schoolData.principalName}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white shadow-sm text-base"
                placeholder="Masukkan nama kepala desa"
                required
              />
            </div>

            <div className="mb-1">
              <label htmlFor="principalNip" className="block text-sm font-medium text-gray-700 mb-1">
                NIP Kepala Desa <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="principalNip"
                name="principalNip"
                value={schoolData.principalNip}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white shadow-sm text-base"
                placeholder="Masukkan NIP kepala Desa"
                required
              />
            </div>

            <div className="md:col-span-2 flex justify-center mt-4">
              <motion.button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors shadow-sm w-full md:w-auto"
                whileTap={{ scale: 0.95 }}
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save size={20} />
                )}
                <span className="font-medium">
                  {saving ? "Menyimpan..." : "Simpan & Lanjutkan"}
                </span>
              </motion.button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
