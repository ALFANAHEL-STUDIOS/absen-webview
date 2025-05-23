"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Download, Printer, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function StudentQRCode({ params }: { params: { id: string } }) {
  const { schoolId } = useAuth();
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
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

        // Fetch school data
        const schoolDoc = await getDoc(doc(db, "schools", schoolId));
        if (schoolDoc.exists()) {
          setSchool(schoolDoc.data());
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [schoolId, params.id]);

  const handlePrint = () => {
    window.print();
  };

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
    <div className="max-w-2xl mx-auto pb-20 md:pb-6 px-3 sm:px-4 md:px-6">
      <div className="flex items-center mb-6 print:hidden">
        <Link href="/dashboard/students" className="p-2 mr-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Kartu QR Code Siswa</h1>
      </div>

      {/* ID Card Preview */}
      <div id="student-card" className="bg-white rounded-xl shadow-md overflow-hidden border-2 border-gray-200 h-[580px]">
        {/* Header */}
        <div className="bg-primary text-white p-5 text-center">
          <div className="flex justify-center mt-2 mb-2">
            <User className="h-16 w-16" />
          </div>
          <h2 className="text-6xl font-bold mt-2">KARTU ABSENSI SISWA</h2>
          <p className="text-base font-medium mt-1">{school?.name || "Sekolah"}</p>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center justify-center w-full">
            {/* Student Information */}
            <div className="text-center mb-2 mt-0 w-full">
              <h3 className="font-bold text-3xl text-gray-800">{student.name}</h3>
              <table className="text-sm mt-2 mx-auto">
                <tbody>
                  <tr>
                    <td className="pr-3 py-1 text-gray-500">NISN</td>
                    <td> : {student.nisn}</td>
                  </tr>
                  <tr>
                    <td className="pr-3 py-1 text-gray-500">Kelas</td>
                    <td> : Kelas {student.class}</td>
                  </tr>
                  <tr>
                    <td className="pr-3 py-1 text-gray-500">Jenis Kelamin</td>
                    <td> : {student.gender === "male" ? "Laki-laki" : "Perempuan"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center justify-center mt-0 w-full">
            <div className="bg-white p-3 border border-gray-300 rounded-lg mx-auto">
              <QRCodeSVG
                value={student.nisn}
                size={270}
                level="H"
                includeMargin={true}
              />
            </div>
            <p className="text-sm text-center text-gray-500 mt-4">Scan QR code ini untuk absensi</p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-3 text-center text-xs text-gray-500 mt-2">
          <p>Kartu ini adalah identitas resmi siswa untuk absensi digital</p>
        </div>
      </div>

      {/* Action Buttons - Removed */}
    </div>
  );
}
