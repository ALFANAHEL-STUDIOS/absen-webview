"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import { ArrowLeft, Calendar, FileText, FileSpreadsheet, Download, Loader2, ChevronDown, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import Link from "next/link";

export default function GroupAttendanceReport() {
  const { schoolId, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedClass, setSelectedClass] = useState("all");
  const [classes, setClasses] = useState<string[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({
    start: format(new Date(new Date().setDate(new Date().getDate() - 30)), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd")
  });
  const [schoolInfo, setSchoolInfo] = useState({
    name: "NAMA SEKOLAH",
    address: "Alamat",
    npsn: "NPSN",
    principalName: "",
    principalNip: ""
  });

  // Fetch school info, classes and student data
  useEffect(() => {
    const fetchData = async () => {
      if (!schoolId) return;
      
      try {
        setLoading(true);
        
        // Fetch school information
        const schoolDoc = await getDoc(doc(db, "schools", schoolId));
        if (schoolDoc.exists()) {
          const data = schoolDoc.data();
          setSchoolInfo({
            name: data.name || "NAMA SEKOLAH",
            address: data.address || "Alamat",
            npsn: data.npsn || "NPSN",
            principalName: data.principalName || "",
            principalNip: data.principalNip || ""
          });
        }
        
        // Fetch classes
        const classesRef = collection(db, `schools/${schoolId}/classes`);
        const classesQuery = query(classesRef, orderBy("name"));
        const classesSnapshot = await getDocs(classesQuery);
        const classesData: string[] = [];
        
        classesSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.name) {
            classesData.push(data.name);
          }
        });
        setClasses(classesData.sort());
        
        // Fetch students with attendance data
        await fetchStudentsWithAttendance();
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Gagal mengambil data dari database");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [schoolId]);

  // Fetch attendance data when date range or class selection changes
  useEffect(() => {
    if (schoolId) {
      fetchStudentsWithAttendance();
    }
  }, [dateRange, selectedClass, schoolId]);
  
  // Set filtered students whenever students array changes
  useEffect(() => {
    setFilteredStudents(students);
  }, [students]);

  const fetchStudentsWithAttendance = async () => {
    if (!schoolId) return;
    
    try {
      setLoading(true);
      
      // Fetch students filtered by class if needed
      const studentsRef = collection(db, `schools/${schoolId}/students`);
      const studentsQuery = selectedClass === "all" 
        ? query(studentsRef, orderBy("name"))
        : query(studentsRef, where("class", "==", selectedClass), orderBy("name"));
      
      const studentsSnapshot = await getDocs(studentsQuery);
      let studentsList: any[] = [];
      
      studentsSnapshot.forEach(doc => {
        studentsList.push({
          id: doc.id,
          ...doc.data(),
          // Initialize attendance counters
          hadir: 0,
          sakit: 0,
          izin: 0,
          alpha: 0,
          total: 0
        });
      });
      
      // If we have students, fetch attendance records for the date range
      if (studentsList.length > 0) {
        const attendanceRef = collection(db, `schools/${schoolId}/attendance`);
        const attendanceQuery = query(
          attendanceRef,
          where("date", ">=", dateRange.start),
          where("date", "<=", dateRange.end)
        );
        
        const attendanceSnapshot = await getDocs(attendanceQuery);
        
        // Count attendance by student ID
        attendanceSnapshot.forEach(doc => {
          const data = doc.data();
          const studentId = data.studentId;
          const status = data.status;
          
          // Find the student and update counts
          const studentIndex = studentsList.findIndex(s => s.id === studentId);
          if (studentIndex !== -1) {
            if (status === 'present' || status === 'hadir') {
              studentsList[studentIndex].hadir++;
            } else if (status === 'sick' || status === 'sakit') {
              studentsList[studentIndex].sakit++;
            } else if (status === 'permitted' || status === 'izin') {
              studentsList[studentIndex].izin++;
            } else if (status === 'absent' || status === 'alpha') {
              studentsList[studentIndex].alpha++;
            }
            
            studentsList[studentIndex].total++;
          }
        });
      }
      
      setStudents(studentsList);
    } catch (error) {
      console.error("Error fetching student attendance data:", error);
      toast.error("Gagal mengambil data kehadiran siswa");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClass(e.target.value);
  };

  // Generate and download PDF report
  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    
    try {
      // Create PDF document
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);

      
      // Add KOP Sekolah
      doc.setFontSize(15);
      doc.setFont("helvetica");
      doc.text(schoolInfo.name.toUpperCase(), pageWidth / 2, margin, { align: "center" });
      
      doc.setFontSize(14);
      doc.setFont("helvetica");
      doc.text(schoolInfo.address, pageWidth / 2, margin + 7, { align: "center" });
      doc.text(`NPSN ${schoolInfo.npsn}`, pageWidth / 2, margin + 14, { align: "center" });
      doc.setLineWidth(0.5);
      doc.line(margin, margin + 18, pageWidth - margin, margin + 18);

      
      // Add report title and class information
      doc.setFontSize(12);
      doc.setFont("helvetica");
      doc.text("REKAPITULASI LAPORAN ABSENSI SISWA", pageWidth / 2, margin + 31, { align: "center" });
      // Add date range
      const startDate = format(new Date(dateRange.start), "d MMMM yyyy", { locale: id });
      const endDate = format(new Date(dateRange.end), "d MMMM yyyy", { locale: id });
      doc.text(`Dari Tanggal : ${startDate} - Sampai Tanggal : ${endDate}`, pageWidth / 2, margin + 38, { align: "center" });
      // Draw table headers
     
      const headers = ["NO.", "                         NAMA SISWA", "           NISN", "     KELAS", " HADIR", " SAKIT", "   IZIN", " ALPHA", "        TOTAL"];
      const colWidths = [11, 85, 38, 28, 18, 18, 18, 18, 33];
      let yPos = margin + 48;
      
      // Draw header row with green background
      doc.setFillColor(144, 238, 144); // Light green
      doc.rect(margin, yPos, contentWidth, 8, "F");
      doc.setDrawColor(0);
      doc.rect(margin, yPos, contentWidth, 8, "S"); // Border
      
      let xPos = margin;
      
      // Draw column headers
      doc.setFontSize(11);
      doc.setTextColor(0);
      headers.forEach((header, i) => {
        if (i > 0) {
          doc.line(xPos, yPos, xPos, yPos + 8);
        }
        doc.text(header, xPos + 2, yPos + 5.5);
        xPos += colWidths[i];
      });
      
      yPos += 8;
      
      // Draw table rows
      //doc.setFontSize(10);
      students.forEach((student, index) => {
        // Alternating row background
        if (index % 2 === 0) {
          doc.setFillColor(240, 240, 240);
          doc.rect(margin, yPos, contentWidth, 7, "F");
        }
        
        // Draw row border
        doc.rect(margin, yPos, contentWidth, 7, "S");
        
        // Draw cell content
        xPos = margin;
        
        // Number
        doc.text((index + 1).toString(), xPos + colWidths[0]/2, yPos + 5, { align: "center" });
        xPos += colWidths[0];
        
        // Draw vertical line
        doc.line(xPos, yPos, xPos, yPos + 7);
        doc.text(student.name || "", xPos + 2, yPos + 5); xPos += colWidths[1];
        
        // Draw vertical line
        doc.line(xPos, yPos, xPos, yPos + 7);
        doc.text(student.nisn || "", xPos + colWidths[2]/2, yPos + 5, { align: "center" }); xPos += colWidths[2];
        
        // Draw vertical line
        doc.line(xPos, yPos, xPos, yPos + 7);
        doc.text(student.class || "", xPos + colWidths[3]/2, yPos + 5, { align: "center" }); xPos += colWidths[3];
        
        // Draw vertical line
        doc.line(xPos, yPos, xPos, yPos + 7);
        doc.text(student.hadir.toString(), xPos + colWidths[4]/2, yPos + 5, { align: "center" }); xPos += colWidths[4];
        
        // Draw vertical line
        doc.line(xPos, yPos, xPos, yPos + 7);
        doc.text(student.sakit.toString(), xPos + colWidths[5]/2, yPos + 5, { align: "center" }); xPos += colWidths[5];
        
        // Draw vertical line
        doc.line(xPos, yPos, xPos, yPos + 7);
        doc.text(student.izin.toString(), xPos + colWidths[6]/2, yPos + 5, { align: "center" }); xPos += colWidths[6];
        
        // Draw vertical line
        doc.line(xPos, yPos, xPos, yPos + 7);
        doc.text(student.alpha.toString(), xPos + colWidths[7]/2, yPos + 5, { align: "center" }); xPos += colWidths[7];
        
        // Draw vertical line
        doc.line(xPos, yPos, xPos, yPos + 7);
        doc.text(student.total.toString(), xPos + colWidths[8]/2, yPos + 5, { align: "center" });
        
        yPos += 7;
        
        // Add a new page if needed
        if (yPos > pageHeight - margin - 40 && index < students.length - 1) {
          doc.addPage();
          
          // Add header to new page (simplified)
          doc.setFontSize(15);
      doc.setFont("helvetica");
      doc.text(schoolInfo.name.toUpperCase(), pageWidth / 2, margin, { align: "center" });
      
      doc.setFontSize(14);
      doc.setFont("helvetica");
      doc.text(schoolInfo.address, pageWidth / 2, margin + 7, { align: "center" });
      doc.text(`NPSN ${schoolInfo.npsn}`, pageWidth / 2, margin + 14, { align: "center" });
      doc.setLineWidth(0.5);
      doc.line(margin, margin + 18, pageWidth - margin, margin + 18);
          
          // Add title (simplified for continuation pages)
          doc.setFontSize(12);
          doc.text(`REKAPITULASI LAPORAN ABSENSI SISWA - ${selectedClass === "all" ? "(LANJUTAN)" : selectedClass}`, pageWidth / 2, margin + 30, { align: "center" });
          
          yPos = margin + 40;
          
          // Draw header row
          doc.setFillColor(144, 238, 144); // Light green
          doc.rect(margin, yPos, contentWidth, 8, "F");
          doc.rect(margin, yPos, contentWidth, 8, "S"); // Border
          
          xPos = margin;
          headers.forEach((header, i) => {
            if (i > 0) {
              doc.line(xPos, yPos, xPos, yPos + 8);
            }
            doc.setFontSize(11);
            doc.text(header, xPos + 2, yPos + 5.5);
            xPos += colWidths[i];
          });
          
          yPos += 8;
        }
      });
      
      // Add footer with signature section
      const currentDate = format(new Date(), "d MMMM yyyy", { locale: id });
      doc.setFontSize(11);
      //doc.text(`${schoolInfo.address}, ${currentDate}`, pageWidth - margin, yPos + 15, { align: "right" });
      
      const signatureWidth = (pageWidth - margin * 2) / 2;
      
      doc.text("Mengetahui,", margin + signatureWidth * 0.25, yPos + 20, { align: "center" });
      doc.text("Admin Pengelola Data", margin + signatureWidth * 1.75, yPos + 20, { align: "center" });
      
      doc.text("Kepala Sekolah", margin + signatureWidth * 0.25, yPos + 25, { align: "center" });
      doc.text("Absensi QR Code,", margin + signatureWidth * 1.75, yPos + 25, { align: "center" });
      
      doc.setFont("helvetica", "bold");
      doc.text(schoolInfo.principalName, margin + signatureWidth * 0.25, yPos + 45, { align: "center" });
      doc.text("Administrator", margin + signatureWidth * 1.75, yPos + 45, { align: "center" });
      
      doc.setFont("helvetica", "normal");
      doc.text(`NIP. ${schoolInfo.principalNip}`, margin + signatureWidth * 0.25, yPos + 50, { align: "center" });
      
      // Generate filename with current date
      const fileName = `Laporan_Kehadiran_Rombel_${format(new Date(), "yyyyMMdd")}.pdf`;
      doc.save(fileName);
      
      toast.success(`Laporan ${selectedClass === "all" ? "Semua Kelas" : selectedClass} berhasil diunduh ${fileName}`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Gagal mengunduh laporan PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  // Generate and download Excel report
  const handleDownloadExcel = async () => {
    setIsDownloading(true);
    
    try {
      // Create worksheet data with school information
      const wsData = [
        //["NAMA SEKOLAH"],
        //["Alamat"],
        //["NPSN"],
        [],
        ["REKAPITULASI LAPORAN ABSENSI PESERTA DIDIK"],
        [`Kelas : ${selectedClass === "all" ? "Semua Kelas" : selectedClass}`],
        [`Dari Tanggal : ${format(new Date(dateRange.start), "d MMMM yyyy", { locale: id })} - Sampai Tanggal : ${format(new Date(dateRange.end), "d MMMM yyyy", { locale: id })}`],
        [],
        ["No.", "Nama Siswa", "NISN", "Kelas", "Hadir", "Sakit", "Izin", "Alpha", "Total"]
      ];
      
      // Add student data
      students.forEach((student, index) => {
        wsData.push([
          index + 1,
          student.name || "", 
          student.nisn || "", 
          student.class || "", 
          student.hadir || 0, 
          student.sakit || 0, 
          student.izin || 0, 
          student.alpha || 0, 
          student.total || 0
        ]);
      });
      
      // Add total row
      const totalHadir = students.reduce((sum, student) => sum + (student.hadir || 0), 0);
      const totalSakit = students.reduce((sum, student) => sum + (student.sakit || 0), 0);
      const totalIzin = students.reduce((sum, student) => sum + (student.izin || 0), 0);
      const totalAlpha = students.reduce((sum, student) => sum + (student.alpha || 0), 0);
      const grandTotal = totalHadir + totalSakit + totalIzin + totalAlpha;
      
      wsData.push([
        "Total", "", "", "", totalHadir, totalSakit, totalIzin, totalAlpha, grandTotal
      ]);
      
      // Add signature section
      wsData.push(
        [],
        [],
        //[`${schoolInfo.address}, ${format(new Date(), "d MMMM yyyy", { locale: id })}`],
        [],
        ["Mengetahui,", "", "", "", "Administrator"],
        ["Kepala Sekolah", "", "", "", "Sekolah"],
        [],
        [],
        [schoolInfo.principalName, "", "", "", "Administrator"],
        [`NIP. ${schoolInfo.principalNip}`, "", "", "", ""]
      );
      
      // Create workbook and add worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Set column widths
      const colWidths = [
        { wch: 5 },  // No
        { wch: 30 }, // Nama Siswa
        { wch: 15 }, // NISN
        { wch: 10 }, // Kelas
        { wch: 8 },  // Hadir
        { wch: 8 },  // Sakit
        { wch: 8 },  // Izin
        { wch: 8 },  // Alpha
        { wch: 8 }   // Total
      ];
      
      ws['!cols'] = colWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Laporan Kehadiran");
      
      // Generate filename with current date
      const fileName = `Laporan_Kehadiran_Rombel_${format(new Date(), "yyyyMMdd")}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success(`Laporan kelas ${selectedClass === "all" ? "Semua Kelas" : selectedClass} berhasil diunduh sebagai ${fileName}`);
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast.error("Gagal mengunduh laporan Excel");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6">
      <div className="flex items-center mb-6">
        <Link href="/dashboard/reports" className="p-2 mr-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Laporan Absen Rombel</h1>
      </div>
      
      {/* Filters and Date Range */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filter Data</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* Date Range */}
          <div>
            <label htmlFor="start" className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Mulai
            </label>
            <input
              type="date"
              id="start"
              name="start"
              value={dateRange.start}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            />
          </div>
          
          <div>
            <label htmlFor="end" className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Akhir
            </label>
            <input
              type="date"
              id="end"
              name="end"
              value={dateRange.end}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      </div>
      
      {/* School Information and Table */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-8">
        <div className="text-center mb-4 sm:mb-3">
          <h2 className="text-gray-700 sm:text-xl font-bold uppercase">{schoolInfo.name}</h2>
          <p className="text-gray-700 text-sm sm:text-base font-bold">{schoolInfo.address}</p>
          <p className="text-gray-700 text-sm sm:text-base font-bold">NPSN : {schoolInfo.npsn}</p>
        </div>
        <hr className="border-t border-gray-800 mt-1 mb-6" /> 
        <div className="text-center mb-4 sm:mb-6">
          <h3 className="text-base sm:text-gray-600 uppercase">REKAP LAPORAN KEHADIRAN SISWA</h3>
        
          <p className="text-xs sm:text-sm sm:text-gray-600 mt-1">
            Dari Tanggal : {format(new Date(dateRange.start), "d MMMM yyyy", { locale: id })} <br className="sm:hidden" /> Sampai Tanggal : {format(new Date(dateRange.end), "d MMMM yyyy", { locale: id })}
          </p>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
          </div>
        ) : students.length > 0 ? (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden">
                <table className="min-w-full bg-white border">
                  <thead className="bg-green-100">
                    <tr>
                      <th className="text-gray-600 border px-2 sm:px-4 py-2 text-left font-bold text-xs sm:text-sm">NAMA SISWA</th>
                      <th className="text-gray-600 border px-2 sm:px-4 py-2 text-center font-bold text-xs sm:text-sm">NISN</th>
                      <th className="text-gray-600 border px-2 sm:px-4 py-2 text-center font-bold text-xs sm:text-sm">KELAS</th>
                      <th className="text-gray-600 border px-2 sm:px-4 py-2 text-center font-bold text-xs sm:text-sm">HADIR</th>
                      <th className="text-gray-600 border px-2 sm:px-4 py-2 text-center font-bold text-xs sm:text-sm">SAKIT</th>
                      <th className="text-gray-600 border px-2 sm:px-4 py-2 text-center font-bold text-xs sm:text-sm">IZIN</th>
                      <th className="text-gray-600 border px-2 sm:px-4 py-2 text-center font-bold text-xs sm:text-sm">ALPHA</th>
                      <th className="text-gray-600 border px-2 sm:px-4 py-2 text-center font-bold text-xs sm:text-sm">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, index) => (
                      <tr key={student.id} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                        <td className="text-gray-600 border px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm">{student.name}</td>
                        <td className="text-gray-600 border px-2 sm:px-4 py-1 sm:py-2 text-center text-xs sm:text-sm">{student.nisn}</td>
                        <td className="text-gray-600 border px-2 sm:px-4 py-1 sm:py-2 text-center text-xs sm:text-sm">{student.class}</td>
                        <td className="text-gray-600 border px-2 sm:px-4 py-1 sm:py-2 text-center text-xs sm:text-sm">{student.hadir}</td>
                        <td className="text-gray-600 border px-2 sm:px-4 py-1 sm:py-2 text-center text-xs sm:text-sm">{student.sakit}</td>
                        <td className="text-gray-600 border px-2 sm:px-4 py-1 sm:py-2 text-center text-xs sm:text-sm">{student.izin}</td>
                        <td className="text-gray-600 border px-2 sm:px-4 py-1 sm:py-2 text-center text-xs sm:text-sm">{student.alpha}</td>
                        <td className="text-gray-600 border px-2 sm:px-4 py-1 sm:py-2 text-center text-xs sm:text-sm">{student.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 border rounded-lg">
            <p className="text-gray-500">Tidak ada data yang ditemukan untuk filter yang dipilih</p>
          </div>
        )}
      </div>
      
      {/* Download Buttons - Fixed at bottom on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 pb-20 sm:pb-0">
        <button
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className="flex items-center justify-center gap-2 sm:gap-3 bg-red-600 text-white p-3 sm:p-4 rounded-lg hover:bg-red-700 transition-colors"
        >
          {isDownloading ? (
            <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
          ) : (
            <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
          )}
          <span className="font-medium text-sm sm:text-base">Download Laporan PDF</span>
        </button>
        
        <button
          onClick={handleDownloadExcel}
          disabled={isDownloading}
          className="flex items-center justify-center gap-2 sm:gap-3 bg-green-600 text-white p-3 sm:p-4 rounded-lg hover:bg-green-700 transition-colors"
        >
          {isDownloading ? (
            <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-5 w-5 sm:h-6 sm:w-6" />
          )}
          <span className="font-medium text-sm sm:text-base">Download Laporan Excel</span>
        </button>
      </div>
    </div>
  );
}
