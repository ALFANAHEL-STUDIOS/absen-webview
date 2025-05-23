"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, where, doc, getDoc } from "firebase/firestore";
import { 
  Search, 
  Calendar, 
  Filter,
  ChevronDown,
  Check,
  X,
  Loader2,
  BookOpen,
  FileText,
  FileSpreadsheet,
  Download
} from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  date: string;
  time: string;
  status: string;
  note?: string;
  notes?: string;
  catatan?: string;
}

export default function AttendanceHistory() {
  const { schoolId, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [classes, setClasses] = useState<string[]>([]);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [classFilterVisible, setClassFilterVisible] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: format(new Date(new Date().setDate(new Date().getDate() - 30)), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd")
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  // Fetch classes and attendance records
  useEffect(() => {
    const fetchData = async () => {
      if (!schoolId) return;
      
      try {
        setLoading(true);
        
        // Fetch classes
        const classesRef = collection(db, `schools/${schoolId}/classes`);
        const classesSnapshot = await getDocs(classesRef);
        const classesData: string[] = [];
        classesSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.name) {
            classesData.push(data.name);
          }
        });
        setClasses(classesData.sort());
        
        // Fetch user data for administrator signature
        if (user) {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        }
        
        // Fetch user data for administrator signature
        if (user) {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        }
        
        // Fetch attendance records
        const attendanceRef = collection(db, `schools/${schoolId}/attendance`);
        const attendanceQuery = query(
          attendanceRef,
          where("date", ">=", dateRange.start),
          where("date", "<=", dateRange.end),
          orderBy("date", "desc"),
          orderBy("time", "desc")
        );
        
        const snapshot = await getDocs(attendanceQuery);
        
        const records: AttendanceRecord[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as Omit<AttendanceRecord, 'id'>;
          records.push({
            id: doc.id,
            ...data,
            // Ensure notes field is available for display
            notes: data.notes || data.note || null
          } as AttendanceRecord);
        });
        
        setAttendanceRecords(records);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Gagal mengambil data kehadiran");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [schoolId, dateRange]);

  // Filter attendance records
  const filteredRecords = attendanceRecords.filter((record) => {
    // Filter by class
    if (selectedClass !== "all" && record.class !== selectedClass) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery) {
      return (
        record.studentName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return true;
  });

  // Get unique classes from attendance records for the filter
  useEffect(() => {
    if (attendanceRecords.length > 0) {
      const uniqueClasses = Array.from(new Set(attendanceRecords.map(record => record.class))).sort();
      if (uniqueClasses.length > 0) {
        setClasses(uniqueClasses);
      }
    }
  }, [attendanceRecords]);

  // Handle date range change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Get status badge color
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'hadir':
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'sakit':
      case 'sick':
        return 'bg-orange-100 text-orange-800';
      case 'izin':
      case 'permitted':
        return 'bg-blue-100 text-blue-800';
      case 'alpha':
      case 'absent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status display text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'hadir':
      case 'present':
        return 'Hadir';
      case 'sakit':
      case 'sick':
        return 'Sakit';
      case 'izin':
      case 'permitted':
        return 'Izin';
      case 'alpha':
      case 'absent':
        return 'Alpha';
      default:
        return status;
    }
  };

  // Function to download attendance data as PDF
  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    
    try {
      // Fetch school information
      const schoolDocRef = doc(db, "schools", schoolId || "");
      const schoolDoc = await getDoc(schoolDocRef);
      const schoolData = schoolDoc.exists() ? schoolDoc.data() : null;
      
      const schoolInfo = {
        name: schoolData && typeof schoolData === 'object' && 'name' in schoolData ? String(schoolData.name) : "NAMA SEKOLAH",
        address: schoolData && typeof schoolData === 'object' && 'address' in schoolData ? String(schoolData.address) : "Alamat Sekolah",
        npsn: schoolData && typeof schoolData === 'object' && 'npsn' in schoolData ? String(schoolData.npsn) : "NPSN",
        principalName: schoolData && typeof schoolData === 'object' && 'principalName' in schoolData ? String(schoolData.principalName) : "Kepala Sekolah",
        principalNip: schoolData && typeof schoolData === 'object' && 'principalNip' in schoolData ? String(schoolData.principalNip) : "-"
      };
      
      // Create a new PDF document
      const pdfDoc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      
      // Set document properties
      const pageWidth = pdfDoc.internal.pageSize.getWidth();
      const pageHeight = pdfDoc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      
      // Add KOP Sekolah
      pdfDoc.setFontSize(14);
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.text(schoolInfo.name.toUpperCase(), pageWidth / 2, margin + 6, { align: "center" });
      
      pdfDoc.setFontSize(12);
      pdfDoc.setFont("helvetica", "normal");
      pdfDoc.text(schoolInfo.address, pageWidth / 2, margin + 12, { align: "center" });
      pdfDoc.text(`NPSN : ${schoolInfo.npsn}`, pageWidth / 2, margin + 18, { align: "center" });
      
      // Add horizontal line
      pdfDoc.setLineWidth(0.5);
      pdfDoc.line(margin, margin + 22, pageWidth - margin, margin + 22);
      
      // Add title
      pdfDoc.setFontSize(12);
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.text("LAPORAN RIWAYAT KEHADIRAN SISWA", pageWidth / 2, margin + 32, { align: "center" });
      
      // Add filter information
      pdfDoc.setFontSize(11);
      pdfDoc.setFont("helvetica", "normal");
      
      // Add date range
      const startDate = format(new Date(dateRange.start), "d MMMM yyyy", { locale: id });
      const endDate = format(new Date(dateRange.end), "d MMMM yyyy", { locale: id });
      pdfDoc.text(`Periode : ${startDate} s.d ${endDate}`, pageWidth / 2, margin + 40, { align: "center" });
      
      // Add class filter if selected
      if (selectedClass !== "all") {
        pdfDoc.text(`Kelas ${selectedClass}`, pageWidth / 2, margin + 46, { align: "center" });
      }
      
      // Table headers
      const headers = ["Tanggal", "Waktu", "Nama Siswa", "Kelas", "Status", "Catatan"];
      const colWidths = [24, 19, 50, 15, 17, 40];
      
      let yPos = margin + 55;
      
      // Draw table header
      pdfDoc.setFillColor(240, 240, 240);
      pdfDoc.rect(margin, yPos - 5, contentWidth, 10, "F");
      
      let xPos = margin;
      pdfDoc.setFont("helvetica", "bold");
      
      headers.forEach((header, i) => {
        pdfDoc.text(header, xPos + 3, yPos);
        xPos += colWidths[i];
      });
      
      yPos += 10;
      pdfDoc.setFont("helvetica", "normal");
      
      // Draw table rows
      filteredRecords.forEach((record, index) => {
        // Format date from YYYY-MM-DD to DD-MM-YYYY
        const dateParts = record.date.split('-');
        const formattedDate = dateParts.length === 3 ? 
          `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : 
          record.date;
        
        // Get status text
        const statusText = getStatusText(record.status);
        
        // Add alternating row background
        if (index % 2 === 0) {
          pdfDoc.setFillColor(250, 250, 250);
          pdfDoc.rect(margin, yPos - 5, contentWidth, 10, "F");
        }
        
        // Add row data
        xPos = margin;
        pdfDoc.text(formattedDate, xPos + 3, yPos);
        xPos += colWidths[0];
        
        pdfDoc.text(record.time, xPos + 3, yPos);
        xPos += colWidths[1];
        
        // Truncate long names
        const displayName = record.studentName.length > 30 
          ? record.studentName.substring(0, 27) + "..." 
          : record.studentName;
        pdfDoc.text(displayName, xPos + 3, yPos);
        xPos += colWidths[2];
        
        pdfDoc.text(record.class, xPos + 3, yPos);
        xPos += colWidths[3];
        
        pdfDoc.text(statusText, xPos + 3, yPos);
        xPos += colWidths[4];
        
        // Truncate long notes
        const note = (record.status === 'sakit' || record.status === 'sick' || 
          record.status === 'izin' || record.status === 'permitted' || 
          record.status === 'alpha' || record.status === 'absent') ? 
          (record.note || '-') : '-';
        
        const displayNote = note.length > 30 
          ? note.substring(0, 27) + "..." 
          : note;
        pdfDoc.text(displayNote, xPos + 3, yPos);
        
        yPos += 10;
        
        // Add a new page if needed
        if (yPos > pageHeight - margin - 60 && index < filteredRecords.length - 1) {
          pdfDoc.addPage();
          
          // Add KOP Sekolah to new page (simplified)
          pdfDoc.setFontSize(14);
          pdfDoc.setFont("helvetica", "bold");
          pdfDoc.text(schoolInfo.name.toUpperCase(), pageWidth / 2, margin + 6, { align: "center" });
          pdfDoc.setFontSize(12);
          pdfDoc.setFont("helvetica", "normal");
          pdfDoc.text(schoolInfo.address, pageWidth / 2, margin + 12, { align: "center" });
          pdfDoc.text(`NPSN : ${schoolInfo.npsn}`, pageWidth / 2, margin + 18, { align: "center" });
          
          // Add horizontal line
          pdfDoc.setLineWidth(0.5);
          pdfDoc.line(margin, margin + 22, pageWidth - margin, margin + 22);
          
          yPos = margin + 30;
          
          // Add header to new page
          pdfDoc.setFillColor(240, 240, 240);
          pdfDoc.rect(margin, yPos - 5, contentWidth, 10, "F");
          
          xPos = margin;
          pdfDoc.setFont("helvetica", "bold");
          pdfDoc.setFontSize(11);
          
          headers.forEach((header, i) => {
            pdfDoc.text(header, xPos + 3, yPos);
            xPos += colWidths[i];
          });
          
          yPos += 10;
          pdfDoc.setFont("helvetica", "normal");
        }
      });
      
      // Add signature section
      const signatureY = Math.min(yPos + 30, pageHeight - margin - 40);
      const leftSignatureX = margin + 40;
      const rightSignatureX = pageWidth - margin - 40;
      
      const currentDate = format(new Date(), "d MMMM yyyy", { locale: id });
      
      pdfDoc.setFontSize(11);
      //pdfDoc.text(`${schoolInfo.address}, ${currentDate}`, pageWidth - margin - 40, signatureY - 10, { align: "right" });
      
      pdfDoc.text("Mengetahui,", leftSignatureX, signatureY, { align: "center" });
      pdfDoc.text("Kepala Sekolah", leftSignatureX, signatureY + 5, { align: "center" });
      
      pdfDoc.text("Administrator", rightSignatureX, signatureY, { align: "center" });
      pdfDoc.text("Sekolah", rightSignatureX, signatureY + 5, { align: "center" });
      
      // Space for signatures
      const nameY = signatureY + 25;
      
      pdfDoc.setFontSize(10);
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.text(schoolInfo.principalName, leftSignatureX, nameY, { align: "center" });
      pdfDoc.setFont("helvetica", "normal");
      pdfDoc.text(`NIP. ${schoolInfo.principalNip}`, leftSignatureX, nameY + 5, { align: "center" });
      
      // Admin signature (right side)
      const adminName = userData?.name || "Administrator";
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.text(adminName, rightSignatureX, nameY, { align: "center" });
      pdfDoc.setFont("helvetica", "normal");
      
      // Add footer with generation date
      const generationDate = format(new Date(), "d MMMM yyyy HH:mm", { locale: id });
      pdfDoc.setFontSize(8);
      pdfDoc.text(`Laporan dibuat pada: ${generationDate}`, pageWidth - margin, pageHeight - margin, { align: "right" });
      
      // Save the PDF
      const fileName = `Laporan_Kehadiran_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`;
      pdfDoc.save(fileName);
      
      toast.success("Laporan PDF berhasil diunduh");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Gagal mengunduh laporan PDF");
    } finally {
      setIsDownloading(false);
    }
  };
  
  const handleDownloadExcel = async () => {
    setIsDownloading(true);
    try {
      // Fetch school information
      const schoolDoc = await getDoc(doc(db, "schools", schoolId || ""));
      const schoolData = schoolDoc.exists() ? schoolDoc.data() : null;
      
      const schoolInfo = {
        name: schoolData && typeof schoolData === 'object' && 'name' in schoolData ? String(schoolData.name) : "NAMA SEKOLAH",
        address: schoolData && typeof schoolData === 'object' && 'address' in schoolData ? String(schoolData.address) : "Alamat Sekolah",
        npsn: schoolData && typeof schoolData === 'object' && 'npsn' in schoolData ? String(schoolData.npsn) : "NPSN",
        principalName: schoolData && typeof schoolData === 'object' && 'principalName' in schoolData ? String(schoolData.principalName) : "Kepala Sekolah",
        principalNip: schoolData && typeof schoolData === 'object' && 'principalNip' in schoolData ? String(schoolData.principalNip) : "-"
      };
      
      // Prepare data for Excel
      const excelData = filteredRecords.map(record => {
        // Format date from YYYY-MM-DD to DD-MM-YYYY
        const dateParts = record.date.split('-');
        const formattedDate = dateParts.length === 3 ? 
          `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : 
          record.date;
        
        // Get status text
        const statusText = getStatusText(record.status);
        
        // Prepare note
        const note = record.notes || record.note || '-';
        
        return {
          "Tanggal": formattedDate,
          "Waktu": record.time,
          "Nama Siswa": record.studentName,
          "Kelas": record.class,
          "Status": statusText,
          "Catatan": record.notes || record.note || '-'
        };
      });
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Create header worksheet with school information
      const headerData = [
        [schoolInfo.name.toUpperCase()],
        [schoolInfo.address],
        [`NPSN : ${schoolInfo.npsn}`],
        [""],
        ["LAPORAN KEHADIRAN SISWA"],
        [`Periode : ${format(new Date(dateRange.start), "d MMMM yyyy", { locale: id })} - ${format(new Date(dateRange.end), "d MMMM yyyy", { locale: id })}`],
        [selectedClass !== "all" ? `Kelas : ${selectedClass}` : "Semua Kelas"],
        [""],
      ];
      
      // Create worksheet with data
      const ws = XLSX.utils.aoa_to_sheet(headerData);
      
      // Add the table data
      XLSX.utils.sheet_add_json(ws, excelData, { origin: "A9", skipHeader: false });
      
      // Add signature section
      const lastRow = 11 + excelData.length;
      
      // Add empty rows for spacing
      ws[`A${lastRow}`] = { t: 's', v: "" };
      ws[`A${lastRow+1}`] = { t: 's', v: "" };
      
      // Add signature headers
      ws[`B${lastRow+2}`] = { t: 's', v: "Mengetahui," };
      ws[`E${lastRow+2}`] = { t: 's', v: "Administrator" };
      
      ws[`B${lastRow+3}`] = { t: 's', v: "Kepala Sekolah" };
      ws[`E${lastRow+3}`] = { t: 's', v: "Sekolah" };
      
      // Add empty rows for signature space
      ws[`A${lastRow+4}`] = { t: 's', v: "" };
      ws[`A${lastRow+5}`] = { t: 's', v: "" };
      ws[`A${lastRow+6}`] = { t: 's', v: "" };
      
      // Add names
      ws[`B${lastRow+7}`] = { t: 's', v: schoolInfo.principalName };
      ws[`E${lastRow+7}`] = { t: 's', v: userData?.name || "Administrator" };
      
      ws[`B${lastRow+8}`] = { t: 's', v: `NIP. ${schoolInfo.principalNip}` };
      
      // Add generation date
      ws[`A${lastRow+10}`] = { t: 's', v: `Laporan dibuat pada: ${format(new Date(), "d MMMM yyyy HH:mm", { locale: id })}` };
      
      // Set column widths
      const colWidths = [
        { wch: 15 }, // Tanggal
        { wch: 10 }, // Waktu
        { wch: 40 }, // Nama Siswa
        { wch: 10 }, // Kelas
        { wch: 15 }, // Status
        { wch: 40 }  // Catatan
      ];
      
      ws['!cols'] = colWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Kehadiran");
      
      // Generate Excel file
      const fileName = `Laporan_Kehadiran_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success("Laporan Excel berhasil diunduh");
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast.error("Gagal mengunduh laporan Excel");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="pb-20 md:pb-6">
      <div className="flex items-center mb-6">
        <Calendar className="h-7 w-7 text-primary mr-3" />
        <h1 className="text-2xl font-bold text-gray-800">Riwayat Kehadiran Siswa</h1>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-6 w-full">
        <h2 className="text-lg font-semibold mb-4">Filter Data</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 w-full">
          {/* Date Range */}
          <div className="w-full">
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
          
          <div className="w-full">
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
          
          <div className="w-full">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Cari Siswa
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                id="search"
                placeholder="Cari nama siswa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
        </div>
        
        {/* Class Filter */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Filter Kelas
            </label>
            <button 
              onClick={() => setClassFilterVisible(!classFilterVisible)}
              className="text-sm text-primary flex items-center"
            >
              {classFilterVisible ? 'Sembunyikan' : 'Tampilkan'} Filter Kelas
              <ChevronDown 
                className={`ml-1 h-4 w-4 transition-transform ${classFilterVisible ? 'rotate-180' : ''}`} 
              />
            </button>
          </div>
          
          {classFilterVisible && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              <button
                onClick={() => setSelectedClass("all")}
                className={`px-3 py-2 text-sm rounded-lg border ${
                  selectedClass === "all"
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Semua Kelas
              </button>
              
              {classes.map((className) => (
                <button
                  key={className}
                  onClick={() => setSelectedClass(className)}
                  className={`px-3 py-2 text-sm rounded-lg border ${
                    selectedClass === className
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  Kelas {className}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Download Buttons */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleDownloadPDF}
            disabled={isDownloading || filteredRecords.length === 0}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg ${
              isDownloading || filteredRecords.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            } transition-colors flex-1`}
          >
            {isDownloading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <FileText className="h-5 w-5" />
            )}
            <span>Download PDF</span>
          </button>
          
          <button
            onClick={handleDownloadExcel}
            disabled={isDownloading || filteredRecords.length === 0}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg ${
              isDownloading || filteredRecords.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            } transition-colors flex-1`}
          >
            {isDownloading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-5 w-5" />
            )}
            <span>Download Excel</span>
          </button>
        </div>
      </div>
      
      {/* Attendance Records Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
        </div>
      ) : filteredRecords.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-sm font-bold text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-sm font-bold text-gray-500 uppercase tracking-wider">
                    Waktu
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-sm font-bold text-gray-500 uppercase tracking-wider">
                    Nama Siswa
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-sm font-bold text-gray-500 uppercase tracking-wider">
                    Kelas
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-sm font-bold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-sm font-bold text-gray-500 uppercase tracking-wider">
                    Catatan
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record) => {
                  // Format date from YYYY-MM-DD to DD-MM-YYYY
                  const dateParts = record.date.split('-');
                  const formattedDate = dateParts.length === 3 ? 
                    `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : 
                    record.date;
                    
                  return (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formattedDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.time}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{record.studentName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.class}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-sm leading-5 text-gray-600 font-semibold rounded-full ${getStatusBadgeClass(record.status)}`}>
                          {getStatusText(record.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {record.notes || record.note || record.catatan || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center">
          <div className="flex flex-col items-center">
            <div className="bg-gray-100 rounded-full p-3 mb-4">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">
              {searchQuery || selectedClass !== "all"
                ? "Tidak ada data kehadiran yang sesuai dengan filter"
                : "Belum ada data kehadiran"}
            </p>
          </div>
        </div>
      )}
      <hr className="border-t border-none mb-5" />
    </div>
  );
}
