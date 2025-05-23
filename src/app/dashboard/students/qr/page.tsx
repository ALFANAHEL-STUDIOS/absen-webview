"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, where, doc, getDoc } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Download, Printer, QrCode, Search, User, FileText, Upload, ChevronLeft, ChevronRight } from "lucide-react";
import QRCode from 'qrcode';
import Link from "next/link";
import { toast } from "react-hot-toast";
import { jsPDF } from "jspdf";

interface Student {
  id: string;
  name: string;
  nisn: string;
  class: string;
  gender: string;
  photoUrl?: string;
}

export default function StudentsQRList() {
  const { schoolId } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [classes, setClasses] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage] = useState(4);
  const [school, setSchool] = useState<{name: string}>({name: "Sekolah"});

  useEffect(() => {
    const fetchStudents = async () => {
      if (!schoolId) return;
      
      try {
        setLoading(true);
        // Fetch school information
        const schoolDoc = await getDoc(doc(db, "schools", schoolId));
        if (schoolDoc.exists()) {
          setSchool({ name: schoolDoc.data().name || "Sekolah" });
        }
        
        const classesRef = collection(db, "schools", schoolId, "classes");
        const classesSnapshot = await getDocs(classesRef);
        const classesData: string[] = [];
        classesSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.name) {
            classesData.push(data.name);
          }
        });
        setClasses(classesData.sort());
        
        const studentsRef = collection(db, "schools", schoolId, "students");
        const q = query(studentsRef, orderBy("name"));
        const snapshot = await getDocs(q);
        
        const fetchedStudents: Student[] = [];
        snapshot.forEach((doc) => {
          fetchedStudents.push({
            id: doc.id,
            ...doc.data() as Omit<Student, 'id'>
          });
        });
        
        setStudents(fetchedStudents);
      } catch (error) {
        console.error("Error fetching students:", error);
        toast.error("Gagal mengambil data siswa");
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [schoolId]);
  
  const filteredStudents = students.filter((student) => {
    // Filter by class
    if (selectedClass !== "all" && student.class !== selectedClass) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery) {
      return (
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.nisn.includes(searchQuery)
      );
    }
    
    return true;
  });
  
  const handlePrint = () => {
    window.print();
  };

  // Generate PDF with multiple QR code cards (6 per page)
  const generateQRCardsPDF = (students: Student[], filename: string) => {
    if (students.length === 0) {
      toast.error("Tidak ada data siswa untuk dicetak");
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      
      // A4 dimensions: 210 x 297 mm
      const pageWidth = 210;
      const pageHeight = 297;
      
      // Card dimensions (ID card size approximately)
      const cardWidth = 85.6; // 8.56cm
      const cardHeight = 54; // 5.4cm
      
      // Margins
      const marginX = 15;
      const marginY = 15;
      const spacingX = 10;
      const spacingY = 10;
      
      // Calculate positions
      const cols = 2;
      const cardsPerPage = 6; // 2x3 grid
      let cardCount = 0;
      
      students.forEach((student, index) => {
        // Calculate position on grid
        const pageIndex = Math.floor(index / cardsPerPage);
        const pagePosition = index % cardsPerPage;
        const col = pagePosition % cols;
        const row = Math.floor(pagePosition / cols);
        
        // Add new page if needed
        if (pagePosition === 0 && index > 0) {
          doc.addPage();
        }
        
        // Calculate x and y position
        const x = marginX + col * (cardWidth + spacingX);
        const y = marginY + row * (cardHeight + spacingY);
        
        // Draw card rectangle with rounded corners
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'F');
        
        // Draw header
        doc.setFillColor(10, 36, 99); // Primary color
        doc.rect(x, y, cardWidth, 12, 'F');
        
        // Draw header text
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text("KARTU ABSENSI SISWA", x + cardWidth/2, y + 6, { align: "center" });
        
        // Draw student information
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.text(student.name, x + cardWidth/2, y + 20, { align: "center" });
        
        doc.setFontSize(9);
        doc.text(`NISN: ${student.nisn}`, x + cardWidth/2, y + 27, { align: "center" });
        doc.text(`Kelas: ${student.class}`, x + cardWidth/2, y + 33, { align: "center" });
        
        // Add QR code (we'll create a data URL from SVG)
        const qrCanvas = document.createElement("canvas");
        const qrSize = 100;
        
        QRCode.toCanvas(qrCanvas, student.nisn || student.id, {
          width: qrSize,
          margin: 0,
          errorCorrectionLevel: 'H'
        }, (error) => {
          if (!error) {
            const qrDataURL = qrCanvas.toDataURL("image/png");
            const qrWidth = 30;
            doc.addImage(qrDataURL, "PNG", x + (cardWidth - qrWidth)/2, y + 35, qrWidth, qrWidth);
          }
        });
        
        // Footer
        doc.setFillColor(245, 245, 245);
        doc.rect(x, y + cardHeight - 7, cardWidth, 7, 'F');
        
        doc.setFontSize(6);
        doc.setTextColor(100, 100, 100);
        doc.text("Kartu ini adalah identitas resmi siswa untuk absensi digital", x + cardWidth/2, y + cardHeight - 3, { align: "center" });
        
        cardCount++;
      });
      
      doc.save(filename);
      toast.success(`PDF berhasil dibuat dengan ${cardCount} kartu QR Code`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Gagal membuat PDF");
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto pb-20 md:pb-6 px-3 sm:px-4 md:px-6">
      <div className="flex items-center mb-6">
        <Link href="/dashboard/students" className="p-2 mr-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Kartu QR Code Siswa</h1>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 md:p-5 mb-4 sm:mb-6 print:hidden">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
          <div className="md:col-span-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Cari nama atau NISN siswa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <button
            onClick={handlePrint}
            className="w-full flex items-center justify-center gap-2 bg-blue-800 text-white px-5 py-2 rounded-lg hover:bg-orange-500 active:bg-orange-600 transition-colors"
          >
            <Printer size={20} />
            Cetak Semua
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : filteredStudents.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 print:grid-cols-2">
            {/* Show only 4 students per page */}
            {filteredStudents
              .slice((currentPage - 1) * studentsPerPage, currentPage * studentsPerPage)
              .map((student) => (
            <div key={student.id} className="bg-white rounded-lg shadow-sm overflow-hidden p-3 border border-gray-200 print:break-inside-avoid w-[8.56cm] h-[12.5cm] print:w-[8.56cm] print:h-[12.5cm] flex flex-col">
              {/* Header */}
              <div className="bg-primary text-white p-2 -mx-3 -mt-3 text-center rounded-t-lg">
                <div className="flex justify-center mt-2 mb-1">
                  <div className="border border-white/30 rounded-full p-1">
                    <User size={48} />
                  </div>
                </div>
                <h2 className="text-lg font-bold mt-2 mb-1">KARTU ABSENSI SISWA</h2>
                <p className="text-sm font-medium pb-1">{school?.name || "Sekolah"}</p>
              </div>

              {/* Content */}
              <div className="flex flex-col justify-center items-center flex-grow py-4 mt-0">
                {/* Student Information - Centered */}
                <div className="text-center mb-5 mt-0">
                  <h3 className="font-bold text-base text-gray-800">{student.name}</h3>
                  <div className="text-xs mt-1">
                    <p className="text-gray-600">NISN : {student.nisn}</p>
                    <p className="text-gray-600">Kelas : {student.class}</p>
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="bg-white p-2 border border-gray-300 rounded-lg">
                    <QRCodeSVG
                      value={student.nisn || student.id}
                      size={110}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 p-1 text-center text-[8px] text-gray-500 mt-auto -mx-3 -mb-3">
                <p>Kartu ini adalah identitas resmi siswa untuk absensi digital</p>
              </div>
            </div>
            ))}
          </div>
          
          {/* Pagination */}
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`flex items-center gap-1 px-4 py-2 rounded-md ${
                currentPage === 1 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            
            <div className="text-gray-600">
              Page {currentPage} of {Math.ceil(filteredStudents.length / studentsPerPage)}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={currentPage >= Math.ceil(filteredStudents.length / studentsPerPage)}
              className={`flex items-center gap-1 px-4 py-2 rounded-md ${
                currentPage >= Math.ceil(filteredStudents.length / studentsPerPage)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center">
          <div className="flex flex-col items-center">
            <div className="bg-gray-100 rounded-full p-3 mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">
              {searchQuery || selectedClass !== "all"
                ? "Tidak ada siswa yang sesuai dengan pencarian atau filter"
                : "Belum ada siswa yang terdaftar"}
            </p>
            <Link
              href="/dashboard/students/add"
              className="bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Tambah Siswa
            </Link>
          </div>
        </div>
      )}
      <hr className="border-t border-none mb-5" />
    </div>
  );
}
