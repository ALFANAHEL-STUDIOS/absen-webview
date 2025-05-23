"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Download, Printer, User, Calendar, MapPin, Phone, Mail, School, Hash, Edit } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function StudentDetail({ params }: { params: { id: string } }) {
  const { schoolId } = useAuth();
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!schoolId) return;

      try {
        // Fetch student data
        const studentDoc = await getDoc(doc(db, "schools", schoolId, "students", params.id));
        if (!studentDoc.exists()) {
          throw new Error("Student not found");
        }
        setStudent({ id: studentDoc.id, ...studentDoc.data() });
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [schoolId, params.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">Data siswa tidak ditemukan</p>
        <Link href="/dashboard/students" className="text-primary hover:underline mt-2 inline-block">
          Kembali ke daftar siswa
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 md:pb-6 px-3 sm:px-4 md:px-6">
      <div className="flex items-center mb-6">
        <Link href="/dashboard/students" className="p-2 mr-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-800">Detail Siswa</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* QR Code Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center">
          <h2 className="text-base font-semibold mb-4 text-center">QR Code Absensi</h2>
          <div className="bg-white p-2 border border-gray-300 rounded-lg mb-4">
            <QRCodeSVG
              value={student.nisn || student.id}
              size={150}
              level="H"
              includeMargin={true}
            />
          </div>
          <p className="text-xs text-center text-gray-500 mb-4">NISN: {student.nisn}</p>
          <div className="flex flex-col space-y-2">
            
            <Link 
              href={`/dashboard/students/edit/${student.id}`}
              className="text-sm text-blue-600 hover:underline flex items-center"
            >
              <Edit size={14} className="mr-1" />
              Edit Data Siswa
            </Link>
          </div>
        </div>

        {/* Student Information */}
        <div className="bg-white rounded-xl shadow-sm p-5 md:col-span-2">
          <h2 className="text-base font-semibold mb-4 border-b pb-2">INFORMASI SISWA</h2>
        
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="w-7 flex-shrink-0">
                <User className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Nama Lengkap</p>
                <p className="font-medium text-sm">{student.name}</p>
              </div>
            </div>
          
            <div className="flex items-start">
              <div className="w-7 flex-shrink-0">
                <Hash className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">NISN</p>
                <p className="font-medium text-sm">{student.nisn}</p>
              </div>
            </div>
          
            <div className="flex items-start bg-blue-50 p-2 rounded-md">
              <div className="w-7 flex-shrink-0">
                <School className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-blue-700">Kelas</p>
                <p className="font-medium text-sm text-blue-800">{student.class}</p>
              </div>
            </div>
          
            <div className="flex items-start">
              <div className="w-7 flex-shrink-0">
                <User className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Jenis Kelamin</p>
                <p className="font-medium text-sm">{student.gender === "male" ? "Laki-laki" : "Perempuan"}</p>
              </div>
            </div>
          
            {student.birthPlace && student.birthDate && (
              <div className="flex items-start">
                <div className="w-7 flex-shrink-0">
                  <Calendar className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Tempat, Tanggal Lahir</p>
                  <p className="font-medium text-sm">{student.birthPlace}, {student.birthDate}</p>
                </div>
              </div>
            )}
          
            {student.address && (
              <div className="flex items-start">
                <div className="w-7 flex-shrink-0">
                  <MapPin className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Alamat</p>
                  <p className="font-medium text-sm">{student.address}</p>
                </div>
              </div>
            )}
          
            {student.telegramNumber && (
              <div className="flex items-start">
                <div className="w-7 flex-shrink-0">
                  <Phone className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">ID Telegram</p>
                  <p className="font-medium text-sm">{student.telegramNumber}</p>
                </div>
              </div>
            )}
          
            {student.email && (
              <div className="flex items-start">
                <div className="w-7 flex-shrink-0">
                  <Mail className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="font-medium text-sm">{student.email}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Attendance Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6 md:col-span-3">
          <h2 className="text-base font-semibold mb-4 border-b pb-2">RINGKASAN KEHADIRAN</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-xs text-blue-600 font-medium mb-1">Hadir</p>
              <p className="text-xl font-bold text-blue-600">95%</p>
              <p className="text-xs text-gray-500 mt-1">19/20 hari</p>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-lg">
              <p className="text-xs text-amber-600 font-medium mb-1">Izin</p>
              <p className="text-xl font-bold text-amber-600">0%</p>
              <p className="text-xs text-gray-500 mt-1">0/20 hari</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-xs text-green-600 font-medium mb-1">Sakit</p>
              <p className="text-xl font-bold text-green-600">5%</p>
              <p className="text-xs text-gray-500 mt-1">1/20 hari</p>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-xs text-red-600 font-medium mb-1">Alpha</p>
              <p className="text-xl font-bold text-red-600">0%</p>
              <p className="text-xs text-gray-500 mt-1">0/20 hari</p>
            </div>
          </div>
        </div>
      </div>
      <hr className="border-t border-none mb-5" />
    </div>
  );
}
