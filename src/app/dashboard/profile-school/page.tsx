"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { readDocument, updateDocument } from "@/lib/firestore";
import { School, Save, CheckCircle, Loader2, QrCode, PlusCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

interface SchoolData {
  name: string;
  npsn: string;
  address: string;
  principalName: string;
  principalNip: string;
  email?: string;
  phone?: string;
  website?: string;
  logo?: string;
}

export default function SchoolProfile() {
  const { user, schoolId, userRole } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isNewSchool, setIsNewSchool] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [schoolData, setSchoolData] = useState<SchoolData>({
    name: "",
    npsn: "",
    address: "",
    principalName: "",
    principalNip: "",
    email: "",
    phone: "",
    website: "",
    logo: "",
  });

  useEffect(() => {
    const fetchSchoolData = async () => {
      if (schoolId) {
        try {
          const { schoolApi } = await import('@/lib/api');
          const data = await schoolApi.getById(schoolId) as unknown as SchoolData;
          
          if (data) {
            // Safely construct a SchoolData object from the returned data
            setSchoolData({
              name: data.name || "",
              npsn: data.npsn || "",
              address: data.address || "",
              principalName: data.principalName || "",
              principalNip: data.principalNip || "",
              email: data.email || "",
              phone: data.phone || "",
              website: data.website || "",
              logo: data.logo || "",
            });
            setShowForm(true);
          } else {
            // If no school data found, show the "Add School" button
            setIsNewSchool(true);
          }
        } catch (error) {
          console.error("Error fetching school data:", error);
          setIsNewSchool(true);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
        setIsNewSchool(true);
      }
    };

    fetchSchoolData();
  }, [schoolId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSchoolData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      try {
        const { schoolApi } = await import('@/lib/api');
        const { db } = await import('@/lib/firebase');
        const { doc, setDoc, updateDoc, serverTimestamp } = await import('firebase/firestore');
        
        if (isNewSchool) {
          // Create new school - use user UID as school ID for admin users
          if (!user) {
            toast.error("Pengguna tidak terdeteksi");
            return;
          }
          
          const newSchoolId = user.uid; // Use the user's UID as the school ID
          
          try {
            // Create the school document directly with Firestore for better error handling
            await setDoc(doc(db, "schools", newSchoolId), {
              ...schoolData,
              createdAt: serverTimestamp(),
              createdBy: user.uid,
              updatedAt: serverTimestamp()
            });
            
            // Update the user's record to include the schoolId
            await updateDoc(doc(db, "users", user.uid), { 
              schoolId: newSchoolId,
              updatedAt: serverTimestamp()
            });
            
            // Update local storage
            if (typeof window !== 'undefined') {
              localStorage.setItem('schoolId', newSchoolId);
              localStorage.removeItem('needsSchoolSetup');
            }
            
            toast.success("Instansi berhasil dibuat");
          } catch (firestoreError: any) {
            console.error("Firestore error:", firestoreError);
            
            if (firestoreError.code === 'permission-denied') {
              toast.error("Akses ditolak. Anda tidak memiliki izin untuk membuat Instansi.");
            } else {
              toast.error("Gagal membuat Instansi : " + firestoreError.message);
            }
            return;
          }
        } else {
          // Update existing school
          if (!schoolId) {
            toast.error("Tidak dapat mengakses data Instansi");
            return;
          }
          
          try {
            // Update school document directly with Firestore
            await updateDoc(doc(db, "schools", schoolId), {
              ...schoolData,
              updatedAt: serverTimestamp()
            });
            
            toast.success("Data Instansi berhasil diperbarui");
          } catch (firestoreError: any) {
            console.error("Firestore error:", firestoreError);
            
            if (firestoreError.code === 'permission-denied') {
              toast.error("Akses ditolak. Anda tidak memiliki izin untuk memperbarui data Instansi.");
            } else {
              toast.error("Gagal memperbarui data Instansi : " + firestoreError.message);
            }
            return;
          }
        }
        
        // Show success animation
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          // Redirect back to dashboard
          router.push('/dashboard');
        }, 1500);
      } catch (apiError) {
        console.error("API error:", apiError);
        toast.error("Gagal menyimpan data Instansi - kesalahan API");
      }
    } catch (error) {
      console.error("Error saving instansi data:", error);
      toast.error("Gagal menyimpan data Instansi");
    } finally {
      setSaving(false);
    }
  };
  
  const handleAddNewSchool = () => {
    setShowForm(true);
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
        <School className="h-8 w-8 text-primary mr-3" />
        <h1 className="text-2xl font-bold text-gray-800">Profil Lembagai / Instansi</h1>
      </div>

      {!showForm && isNewSchool ? (
        <div className="bg-white rounded-xl shadow-lg p-10 text-center border border-gray-100">
          <div className="flex flex-col items-center">
            <div className="bg-primary/10 p-6 rounded-full mb-6">
              <School className="h-16 w-16 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-3">Belum Ada Data Instansi</h2>
            <p className="text-gray-600 mb-8">
              Anda belum memiliki data Instansi yang terdaftar. Tambahkan data instansi untuk menggunakan fitur absensi.
            </p>
            <motion.button
              onClick={handleAddNewSchool}
              className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              <PlusCircle size={20} />
              <span>Tambah Data Instnasi</span>
            </motion.button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8 border border-gray-100">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
              <div className="md:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Instansi
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={schoolData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white shadow-sm text-base"
                  placeholder="Masukkan nama instansi"
                  required
                />
              </div>

              <div className="mb-1">
                <label htmlFor="npsn" className="block text-sm font-medium text-gray-700 mb-1">
                  Kode Pos
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
                  Website Instansi (jika ada)
                </label>
                <input
                  type="text"
                  id="website"
                  name="website"
                  value={schoolData.website}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white shadow-sm text-base"
                  placeholder="https://www.nama.desa.id"
                />
              </div>

              <div className="md:col-span-2 mb-1">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Alamat Instansi
                </label>
                <textarea
                  id="address"
                  name="address"
                  value={schoolData.address}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white shadow-sm text-base"
                  placeholder="Masukkan alamat lengkap Instansi"
                  required
                />
              </div>
              
              <div className="mb-1">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Instansi
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={schoolData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white shadow-sm text-base"
                  placeholder="email@instansi.desa.id"
                />
              </div>
              
              <div className="mb-1">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Nomor Telepon
                </label>
                <input
                  type="text"
                  id="phone"
                  name="phone"
                  value={schoolData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white shadow-sm text-base"
                  placeholder="+62-xxx-xxxx-xxxx"
                />
              </div>

              <div className="mb-1">
                <label htmlFor="principalName" className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Kepala Desa
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
                  NIP Kepala Desa (Jika Ada)
                </label>
                <input
                  type="text"
                  id="principalNip"
                  name="principalNip"
                  value={schoolData.principalNip}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white shadow-sm text-base"
                  placeholder="Masukkan NIP kepala desa"
                  required
                />
              </div>

              <div className="md:col-span-2 flex justify-center md:justify-end mt-4">
                <motion.button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 hover:bg-orange-500 rounded-lg active:bg-orange-600 transition-colors shadow-sm w-full md:w-auto"
                  whileTap={{ scale: 0.95 }}
                >
                  {saving ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : saveSuccess ? (
                    <CheckCircle size={20} />
                  ) : (
                    <Save size={20} />
                  )}
                  <span className="font-medium">
                    {saveSuccess ? "Tersimpan" : isNewSchool ? "Tambah Instansi" : "Simpan Perubahan"}
                  </span>
                </motion.button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
