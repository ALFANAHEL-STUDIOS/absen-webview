"use client";

import React, { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { QRCodeSVG } from "qrcode.react";
import { 
  User, 
  Hash, 
  Calendar, 
  MapPin,
  Phone,
  Image as ImageIcon,
  Save,
  ArrowLeft
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

const classList = Array.from({ length: 12 }, (_, i) => ({
  value: `${i + 1}`,
  label: `${i + 1}`
}));

export default function AddStudent() {
  const { schoolId } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  // Removed file input references
  
  const [studentData, setStudentData] = useState({
    name: "",
    nisn: "",
    class: "1",
    gender: "male",
    birthPlace: "",
    birthDate: "",
    telegramNumber: "",
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setStudentData((prev) => ({ ...prev, [name]: value }));
  };
  
  // Image change handler removed
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!schoolId) {
      toast.error("Tidak dapat mengakses data sekolah");
      return;
    }
    
    try {
      setSaving(true);
      
      // Image upload removed
      const photoUrl = "";
      
      // Add student to Firestore using the improved API
      const { studentApi } = await import('@/lib/api');
      await studentApi.create(schoolId, {
        ...studentData,
        photoUrl,
        qrCode: studentData.nisn // NISN is used as QR code data
      });
      
      // Redirect back to students list
      router.push('/dashboard/students');
    } catch (error) {
      console.error("Error adding student:", error);
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="w-full max-w-3xl mx-auto pb-20 md:pb-6 px-3 sm:px-4 md:px-6">
      <div className="flex items-center mb-6">
        <Link href="/dashboard/students" className="p-2 mr-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Tambah Siswa Baru</h1>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 md:p-6">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            
            {/* Student Information */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={studentData.name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white"
                    placeholder="Nama lengkap siswa"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="nisn" className="block text-sm font-medium text-gray-700 mb-1">
                  NISN
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    id="nisn"
                    name="nisn"
                    value={studentData.nisn}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white"
                    placeholder="Nomor NISN"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="class" className="block text-sm font-medium text-gray-700 mb-1">
                  Kelas
                </label>
                <select
                  id="class"
                  name="class"
                  value={studentData.class}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white"
                  required
                >
                  {classList.map((item) => (
                    <option key={item.value} value={item.value}>
                      Kelas {item.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                  Jenis Kelamin
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={studentData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white"
                  required
                >
                  <option value="male">Laki-laki</option>
                  <option value="female">Perempuan</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="birthPlace" className="block text-sm font-medium text-gray-700 mb-1">
                  Tempat Lahir
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    id="birthPlace"
                    name="birthPlace"
                    value={studentData.birthPlace}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white"
                    placeholder="Tempat lahir"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Tanggal Lahir
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="date"
                    id="birthDate"
                    name="birthDate"
                    value={studentData.birthDate}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="telegramNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  ID Telegram
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    id="telegramNumber"
                    name="telegramNumber"
                    value={studentData.telegramNumber}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white"
                    placeholder="ID Telegram"
                    required
                  />
                </div>
              </div>
            </div>
            
            {/* QR Code Preview */}
            {studentData.nisn && (
              <div className="flex flex-col items-center pt-4 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-700 mb-3">Preview QR Code</h3>
                <div className="bg-white p-4 border border-gray-300 rounded-lg">
                  <QRCodeSVG
                    value={studentData.nisn}
                    size={150}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">QR Code dibuat berdasarkan NISN siswa.</p>
              </div>
            )}
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-orange-500 active:bg-orange-600 transition-colors"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <Save size={20} />
                )}
                Simpan Data
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
  <hr className="border-t border-none mb-5" />
}
