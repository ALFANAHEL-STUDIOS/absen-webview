"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Calendar, ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, subMonths, addMonths } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "react-hot-toast";
import { generatePDF, generateExcel } from "@/lib/reportGenerator";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Function to fetch daily attendance data from Firestore
const fetchDailyData = async (schoolId: string, year: number, month: number) => {
  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');
    
    // Format month for queries (1 -> 01, 12 -> 12)
    const monthStr = month.toString().padStart(2, '0');
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-31`; // Use 31 to cover all possible days
    
    // Query attendance records for the month
    const attendanceRef = collection(db, `schools/${schoolId}/attendance`);
    const attendanceQuery = query(
      attendanceRef,
      where("date", ">=", startDate),
      where("date", "<=", endDate)
    );
    
    const snapshot = await getDocs(attendanceQuery);
    
    // Organize by day of month
    const dailyStats: {[key: string]: {hadir: number, sakit: number, izin: number, alpha: number}} = {};
    
    // Initialize data for each day in month
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      const day = i.toString().padStart(2, '0');
      dailyStats[day] = {hadir: 0, sakit: 0, izin: 0, alpha: 0};
    }
    
    // Count attendance by status for each day
    snapshot.forEach(doc => {
      const data = doc.data();
      const date = data.date;
      if (!date) return;
      
      // Extract day from date (format: YYYY-MM-DD)
      const day = date.split('-')[2];
      
      if (day && dailyStats[day]) {
        if (data.status === 'present' || data.status === 'hadir') {
          dailyStats[day].hadir++;
        } else if (data.status === 'sick' || data.status === 'sakit') {
          dailyStats[day].sakit++;
        } else if (data.status === 'permitted' || data.status === 'izin') {
          dailyStats[day].izin++;
        } else if (data.status === 'absent' || data.status === 'alpha') {
          dailyStats[day].alpha++;
        }
      }
    });
    
    // Convert to array format for charts
    const result = Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      ...stats
    }));
    
    return result.sort((a, b) => parseInt(a.date) - parseInt(b.date));
  } catch (error) {
    console.error("Error fetching daily attendance data:", error);
    return [];
  }
};

export default function MonthlyReport() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDownloading, setIsDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
  const { schoolId } = useAuth();
  const [selectedClass, setSelectedClass] = useState("all");
  const [filteredAttendanceData, setFilteredAttendanceData] = useState<any[]>([]);
  const [schoolInfo, setSchoolInfo] = useState({
    name: "Sekolah Dasar Negeri 1",
    address: "Jl. Pendidikan No. 123, Kota",
    npsn: "12345678",
    principalName: "Drs. Ahmad Sulaiman, M.Pd."
  });
  const [dailyData, setDailyData] = useState<any[]>([]);
  
  // Format current date for display
  const formattedMonth = format(currentDate, "MMMM yyyy", { locale: id });
  
  // Remove duplicate useEffect - this second one is not needed as it's identical to the first
  
  // Remove duplicate useEffect - this second one is not needed as it's identical to the first
  
  // Fetch attendance data when date changes
  useEffect(() => {
    const loadAttendanceData = async () => {
      if (!schoolId) return;
      
      setLoading(true);
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const data = await fetchDailyData(schoolId, year, month);
        setDailyData(data);
        setFilteredAttendanceData(data);
      } catch (error) {
        console.error("Error loading attendance data:", error);
        toast.error("Gagal memuat data kehadiran dari database");
      } finally {
        setLoading(false);
      }
    };
    
    loadAttendanceData();
  }, [schoolId, currentDate]);
  
  // Set filtered data directly from daily data
  useEffect(() => {
    setFilteredAttendanceData(dailyData);
  }, [dailyData]);
  
  useEffect(() => {
    const fetchSchoolData = async () => {
      if (schoolId) {
        try {
          const schoolDoc = await getDoc(doc(db, "schools", schoolId));
          if (schoolDoc.exists()) {
            const data = schoolDoc.data();
            setSchoolInfo({
              name: data.name || "Sekolah Dasar Negeri 1",
              address: data.address || "Jl. Pendidikan No. 123, Kota",
              npsn: data.npsn || "12345678",
              principalName: data.principalName || "Drs. Ahmad Sulaiman, M.Pd."
            });
          }
        } catch (error) {
          console.error("Error fetching school data:", error);
        }
      }
    };
    
    fetchSchoolData();
  }, [schoolId]);
  
  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };
  
  const [reportOptions, setReportOptions] = useState({
    includeCharts: true,
    includeStatistics: true,
    includeAttendanceHistory: false,
    paperSize: "a4",
    orientation: "portrait",
    showHeader: true,
    showFooter: true,
    showSignature: true,
    dateRange: {
      start: format(new Date(), "yyyy-MM-dd"),
      end: format(new Date(), "yyyy-MM-dd")
    }
  });
  
  const handleOptionChange = (key: string, value: any) => {
    setReportOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const handleDownloadPDF = async () => {
    setIsDownloading(true);
  
    try {
      // Get summary data
      const summary = calculateSummary();
      
      // Fetch student data from Firestore for the report
      let students = [];
      
      if (schoolId) {
        try {
          const { collection, getDocs, query, where, orderBy, limit } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');
          
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth() + 1;
          const monthStr = month.toString().padStart(2, '0');
          const startDate = `${year}-${monthStr}-01`;
          const endDate = `${year}-${monthStr}-31`; // Use 31 to cover all possible days
          
          // Fetch students
          const studentsRef = collection(db, `schools/${schoolId}/students`);
          const studentsQuery = query(studentsRef);
          const studentsSnapshot = await getDocs(studentsQuery);
          
          const studentMap = new Map();
          studentsSnapshot.forEach(doc => {
            studentMap.set(doc.id, {
              id: doc.id,
              name: doc.data().name || 'Unnamed',
              class: doc.data().class || '-',
              nisn: doc.data().nisn || '-',
              hadir: 0,
              sakit: 0,
              izin: 0,
              alpha: 0,
              total: 0
            });
          });
          
          // Fetch attendance records
          const attendanceRef = collection(db, `schools/${schoolId}/attendance`);
          const attendanceQuery = query(
            attendanceRef,
            where("date", ">=", startDate),
            where("date", "<=", endDate)
          );
          
          const attendanceSnapshot = await getDocs(attendanceQuery);
          
          // Update student attendance counts
          attendanceSnapshot.forEach(doc => {
            const data = doc.data();
            const studentId = data.studentId;
            
            if (studentId && studentMap.has(studentId)) {
              const student = studentMap.get(studentId);
              
              if (data.status === 'present' || data.status === 'hadir') {
                student.hadir++;
              } else if (data.status === 'sick' || data.status === 'sakit') {
                student.sakit++;
              } else if (data.status === 'permitted' || data.status === 'izin') {
                student.izin++;
              } else if (data.status === 'absent' || data.status === 'alpha') {
                student.alpha++;
              }
              
              student.total++;
              studentMap.set(studentId, student);
            }
          });
          
          students = Array.from(studentMap.values());
          
          // Generate PDF using jsPDF directly to match the required format
          const { jsPDF } = await import('jspdf');
          const doc = new jsPDF();
          
          // Document setup
          const pageWidth = doc.internal.pageSize.getWidth();
          const margin = 20;
          let currentY = 20;
          
          // School header
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text("NAMA SEKOLAH", margin, currentY);
          doc.text("Dari Database", pageWidth - margin, currentY, { align: "right" });
          currentY += 7;
          
          doc.text("Alamat", margin, currentY);
          doc.text("Dari Database", pageWidth - margin, currentY, { align: "right" });
          currentY += 7;
          
          doc.text("NPSN", margin, currentY);
          doc.text("Dari Database", pageWidth - margin, currentY, { align: "right" });
          currentY += 7;
          
          // Horizontal line
          doc.setLineWidth(0.5);
          doc.line(margin, currentY, pageWidth - margin, currentY);
          currentY += 12;
          
          // Report title
          doc.setFontSize(12);
          doc.setTextColor(0);
          doc.text("REKAPITULASI LAPORAN ABSENSI PESERTA DIDIK", pageWidth / 2, currentY, { align: "center" });
          currentY += 6;
          
          // Month
          doc.text("BULAN:", pageWidth / 2, currentY, { align: "center" });
          currentY += 15;
          
          // Main attendance table
          doc.setFontSize(10);
          
          // Define table columns
          const columns = ["No.", "Nama Siswa", "NISN", "Kelas", "Hadir", "Sakit", "Izin", "Alpha", "Total"];
          const columnWidths = [10, 40, 25, 15, 15, 15, 15, 15, 15];
          
          // Calculate table width
          const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
          
          // Table starting position
          const tableX = (pageWidth - tableWidth) / 2;
          
          // Table header with blue background
          doc.setFillColor(173, 216, 230); // Light blue color for header
          doc.rect(tableX, currentY, tableWidth, 10, 'F');
          
          // Draw header cells and text
          let xOffset = tableX;
          columns.forEach((col, i) => {
            // Cell borders
            doc.setDrawColor(0);
            doc.rect(xOffset, currentY, columnWidths[i], 10);
            
            // Header text
            doc.setFont("helvetica", "bold");
            doc.text(col, xOffset + columnWidths[i]/2, currentY + 6, { align: "center" });
            xOffset += columnWidths[i];
          });
          
          currentY += 10;
          
          // Table rows
          doc.setFont("helvetica", "normal");
          
          // Get total counts for each student
          const totalAttendance = {
            hadir: 0,
            sakit: 0,
            izin: 0,
            alpha: 0,
            total: 0
          };
          
          // Display up to 5 students in the main table (for example)
          const displayedStudents = students.slice(0, 5);
          
          displayedStudents.forEach((student, index) => {
            // Alternate row colors
            doc.setFillColor(index % 2 === 0 ? 240 : 255, index % 2 === 0 ? 240 : 255, 255);
            doc.rect(tableX, currentY, tableWidth, 10, 'F');
            
            // Draw row cells
            xOffset = tableX;
            
            // Draw cell content
            // No.
            doc.rect(xOffset, currentY, columnWidths[0], 10);
            doc.text((index + 1).toString(), xOffset + columnWidths[0]/2, currentY + 6, { align: "center" });
            xOffset += columnWidths[0];
            
            // Name
            doc.rect(xOffset, currentY, columnWidths[1], 10);
            doc.text(student.name, xOffset + 2, currentY + 6, { align: "left" });
            xOffset += columnWidths[1];
            
            // NISN
            doc.rect(xOffset, currentY, columnWidths[2], 10);
            doc.text(student.nisn, xOffset + columnWidths[2]/2, currentY + 6, { align: "center" });
            xOffset += columnWidths[2];
            
            // Class
            doc.rect(xOffset, currentY, columnWidths[3], 10);
            doc.text(student.class, xOffset + columnWidths[3]/2, currentY + 6, { align: "center" });
            xOffset += columnWidths[3];
            
            // Hadir
            doc.rect(xOffset, currentY, columnWidths[4], 10);
            doc.text(student.hadir.toString(), xOffset + columnWidths[4]/2, currentY + 6, { align: "center" });
            totalAttendance.hadir += student.hadir;
            xOffset += columnWidths[4];
            
            // Sakit
            doc.rect(xOffset, currentY, columnWidths[5], 10);
            doc.text(student.sakit.toString(), xOffset + columnWidths[5]/2, currentY + 6, { align: "center" });
            totalAttendance.sakit += student.sakit;
            xOffset += columnWidths[5];
            
            // Izin
            doc.rect(xOffset, currentY, columnWidths[6], 10);
            doc.text(student.izin.toString(), xOffset + columnWidths[6]/2, currentY + 6, { align: "center" });
            totalAttendance.izin += student.izin;
            xOffset += columnWidths[6];
            
            // Alpha
            doc.rect(xOffset, currentY, columnWidths[7], 10);
            doc.text(student.alpha.toString(), xOffset + columnWidths[7]/2, currentY + 6, { align: "center" });
            totalAttendance.alpha += student.alpha;
            xOffset += columnWidths[7];
            
            // Total
            const studentTotal = student.hadir + student.sakit + student.izin + student.alpha;
            totalAttendance.total += studentTotal;
            doc.rect(xOffset, currentY, columnWidths[8], 10);
            doc.text(studentTotal.toString(), xOffset + columnWidths[8]/2, currentY + 6, { align: "center" });
            
            currentY += 10;
          });
          
          // Total row
          xOffset = tableX;
          
          // "Total" text cell
          doc.rect(xOffset, currentY, columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3], 10);
          doc.setFont("helvetica", "bold");
          doc.text("Total", xOffset + (columnWidths[0] + columnWidths[1])/2, currentY + 6, { align: "center" });
          xOffset += columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3];
          
          // Hadir total
          doc.rect(xOffset, currentY, columnWidths[4], 10);
          doc.text(totalAttendance.hadir.toString(), xOffset + columnWidths[4]/2, currentY + 6, { align: "center" });
          xOffset += columnWidths[4];
          
          // Sakit total
          doc.rect(xOffset, currentY, columnWidths[5], 10);
          doc.text(totalAttendance.sakit.toString(), xOffset + columnWidths[5]/2, currentY + 6, { align: "center" });
          xOffset += columnWidths[5];
          
          // Izin total
          doc.rect(xOffset, currentY, columnWidths[6], 10);
          doc.text(totalAttendance.izin.toString(), xOffset + columnWidths[6]/2, currentY + 6, { align: "center" });
          xOffset += columnWidths[6];
          
          // Alpha total
          doc.rect(xOffset, currentY, columnWidths[7], 10);
          doc.text(totalAttendance.alpha.toString(), xOffset + columnWidths[7]/2, currentY + 6, { align: "center" });
          xOffset += columnWidths[7];
          
          // Grand total
          doc.rect(xOffset, currentY, columnWidths[8], 10);
          doc.text(totalAttendance.total.toString(), xOffset + columnWidths[8]/2, currentY + 6, { align: "center" });
          
          currentY += 20;
          
          // Sort students by attendance categories to find the top 3 in each category
          const studentsByHadir = [...students].sort((a, b) => b.hadir - a.hadir).slice(0, 3);
          const studentsBySakit = [...students].sort((a, b) => b.sakit - a.sakit).slice(0, 3);
          const studentsByIzin = [...students].sort((a, b) => b.izin - a.izin).slice(0, 3);
          const studentsByAlpha = [...students].sort((a, b) => b.alpha - a.alpha).slice(0, 3);
          
          // Function to render a category table
          const renderCategoryTable = (title, categoryStudents, categoryField) => {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text(title, margin, currentY);
            currentY += 10;
            
            // Table columns for category tables
            const catColumns = ["No.", "Nama Siswa", "NISN", "Kelas", "Jumlah " + categoryField.charAt(0).toUpperCase() + categoryField.slice(1)];
            const catColumnWidths = [10, 40, 25, 20, 25];
            const catTableWidth = catColumnWidths.reduce((sum, width) => sum + width, 0);
            
            // Category table header with blue background
            doc.setFillColor(173, 216, 230);
            doc.rect(margin, currentY, catTableWidth, 10, 'F');
            
            // Draw header cells
            let catXOffset = margin;
            catColumns.forEach((col, i) => {
              doc.rect(catXOffset, currentY, catColumnWidths[i], 10);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(10);
              doc.text(col, catXOffset + catColumnWidths[i]/2, currentY + 6, { align: "center" });
              catXOffset += catColumnWidths[i];
            });
            
            currentY += 10;
            
            // Draw rows
            doc.setFont("helvetica", "normal");
            categoryStudents.forEach((student, index) => {
              // Alternate row colors
              doc.setFillColor(index % 2 === 0 ? 240 : 255, index % 2 === 0 ? 240 : 255, 255);
              doc.rect(margin, currentY, catTableWidth, 10, 'F');
              
              catXOffset = margin;
              
              // No.
              doc.rect(catXOffset, currentY, catColumnWidths[0], 10);
              doc.text((index + 1).toString(), catXOffset + catColumnWidths[0]/2, currentY + 6, { align: "center" });
              catXOffset += catColumnWidths[0];
              
              // Name
              doc.rect(catXOffset, currentY, catColumnWidths[1], 10);
              doc.text(student.name, catXOffset + 2, currentY + 6, { align: "left" });
              catXOffset += catColumnWidths[1];
              
              // NISN
              doc.rect(catXOffset, currentY, catColumnWidths[2], 10);
              doc.text(student.nisn, catXOffset + catColumnWidths[2]/2, currentY + 6, { align: "center" });
              catXOffset += catColumnWidths[2];
              
              // Class
              doc.rect(catXOffset, currentY, catColumnWidths[3], 10);
              doc.text(student.class, catXOffset + catColumnWidths[3]/2, currentY + 6, { align: "center" });
              catXOffset += catColumnWidths[3];
              
              // Count
              doc.rect(catXOffset, currentY, catColumnWidths[4], 10);
              doc.text(student[categoryField].toString(), catXOffset + catColumnWidths[4]/2, currentY + 6, { align: "center" });
              
              currentY += 10;
            });
            
            currentY += 10;
          };
          
          // Render the four category tables
          renderCategoryTable("Siswa dengan Hadir Terbanyak :", studentsByHadir, "hadir");
          renderCategoryTable("Siswa dengan Sakit Terbanyak :", studentsBySakit, "sakit");
          renderCategoryTable("Siswa dengan Izin Terbanyak :", studentsByIzin, "izin");
          renderCategoryTable("Siswa dengan Alpha Terbanyak :", studentsByAlpha, "alpha");
          
          // Signature section
          currentY += 20;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(11);
          
          const signatureColumnWidth = (pageWidth - 2 * margin) / 2;
          
          // Left signature
          doc.text("Mengetahui", margin + signatureColumnWidth / 4, currentY, { align: "center" });
          doc.text("KEPALA SEKOLAH,", margin + signatureColumnWidth / 4, currentY + 5, { align: "center" });
          
          // Right signature
          doc.text("Pengelola Data", margin + signatureColumnWidth + signatureColumnWidth / 4, currentY, { align: "center" });
          doc.text("Administrator Sekolah,", margin + signatureColumnWidth + signatureColumnWidth / 4, currentY + 5, { align: "center" });
          
          currentY += 30;
          
          // Signature lines
          doc.setLineWidth(0.5);
          doc.line(margin + 10, currentY, margin + signatureColumnWidth / 2 + 10, currentY);
          doc.line(margin + signatureColumnWidth + 10, currentY, margin + signatureColumnWidth * 1.5 + 10, currentY);
          
          currentY += 5;
          
          // NIP lines
          doc.text("NIP.", margin + 15, currentY);
          doc.text("NIP.", margin + signatureColumnWidth + 15, currentY);
          
          // Save the PDF
          const fileName = `Laporan_Kehadiran_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`;
          doc.save(fileName);
          
          toast.success(`Laporan bulan ${formattedMonth} berhasil diunduh sebagai ${fileName}`);
          
        } catch (error) {
          console.error("Error fetching student data:", error);
        }
      }
      
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
      // Get summary data
      const summary = calculateSummary();
      
      // Fetch student data from Firestore for the report
      let students = [];
      
      if (schoolId) {
        try {
          const { collection, getDocs, query, where } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');
          
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth() + 1;
          const monthStr = month.toString().padStart(2, '0');
          const startDate = `${year}-${monthStr}-01`;
          const endDate = `${year}-${monthStr}-31`; // Use 31 to cover all possible days
          
          // Fetch students
          const studentsRef = collection(db, `schools/${schoolId}/students`);
          const studentsQuery = query(studentsRef);
          const studentsSnapshot = await getDocs(studentsQuery);
          
          const studentMap = new Map();
          studentsSnapshot.forEach(doc => {
            studentMap.set(doc.id, {
              id: doc.id,
              name: doc.data().name || 'Unnamed',
              class: doc.data().class || '-',
              nisn: doc.data().nisn || '-',
              hadir: 0,
              sakit: 0,
              izin: 0,
              alpha: 0,
              total: 0
            });
          });
          
          // Fetch attendance records
          const attendanceRef = collection(db, `schools/${schoolId}/attendance`);
          const attendanceQuery = query(
            attendanceRef,
            where("date", ">=", startDate),
            where("date", "<=", endDate)
          );
          
          const attendanceSnapshot = await getDocs(attendanceQuery);
          
          // Update student attendance counts
          attendanceSnapshot.forEach(doc => {
            const data = doc.data();
            const studentId = data.studentId;
            
            if (studentId && studentMap.has(studentId)) {
              const student = studentMap.get(studentId);
              
              if (data.status === 'present' || data.status === 'hadir') {
                student.hadir++;
              } else if (data.status === 'sick' || data.status === 'sakit') {
                student.sakit++;
              } else if (data.status === 'permitted' || data.status === 'izin') {
                student.izin++;
              } else if (data.status === 'absent' || data.status === 'alpha') {
                student.alpha++;
              }
              
              student.total++;
              studentMap.set(studentId, student);
            }
          });
          
          students = Array.from(studentMap.values());
        } catch (error) {
          console.error("Error fetching student data:", error);
        }
      }
      
      // Add students to report options
      const reportOptionsWithStudents = {
        ...reportOptions,
        schoolId,
        students,
        dateRange: {
          start: format(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), "yyyy-MM-dd"),
          end: format(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0), "yyyy-MM-dd")
        }
      };
    
      // Generate Excel
      const fileName = generateExcel(
        schoolInfo,
        {
          present: parseInt(summary.hadir) || 0,
          sick: parseInt(summary.sakit) || 0,
          permitted: parseInt(summary.izin) || 0,
          absent: parseInt(summary.alpha) || 0,
          month: formattedMonth
        },
        "monthly",
        reportOptionsWithStudents
      );
    
      toast.success(`Laporan bulan ${formattedMonth} berhasil diunduh sebagai ${fileName}`);
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast.error("Gagal mengunduh laporan Excel");
    } finally {
      setIsDownloading(false);
    }
  };

  // Calculate attendance summary
  const calculateSummary = () => {
    const totalDays = dailyData.length;
    
    const summary = dailyData.reduce((acc, day) => {
      acc.hadir += day.hadir;
      acc.sakit += day.sakit;
      acc.izin += day.izin;
      acc.alpha += day.alpha;
      return acc;
    }, { hadir: 0, sakit: 0, izin: 0, alpha: 0 });
    
    return {
      hadir: (summary.hadir / totalDays).toFixed(1),
      sakit: (summary.sakit / totalDays).toFixed(1),
      izin: (summary.izin / totalDays).toFixed(1),
      alpha: (summary.alpha / totalDays).toFixed(1)
    };
  };
  
  const summary = calculateSummary();

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6">
      <div className="flex items-center mb-6">
        <Link href="/dashboard/reports" className="p-2 mr-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Rekap Bulanan</h1>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 md:mb-6">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="bg-blue-100 p-2 rounded-lg mr-3">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold">Laporan Bulan: {formattedMonth}</h2>
          </div>
          
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-md border border-gray-300 hover:bg-gray-50"
            >
              Bulan Sebelumnya
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-md border border-gray-300 hover:bg-gray-50"
            >
              Bulan Berikutnya
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 md:gap-4 mb-4 sm:mb-6">
          <div className="bg-yellow-50 rounded-xl p-4 border border-blue-200">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Hadir</h3>
            <p className="text-2xl font-bold text-blue-600">{summary.hadir}%</p>
          </div>
          
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Sakit</h3>
            <p className="text-2xl font-bold text-orange-600">{summary.sakit}%</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Izin</h3>
            <p className="text-2xl font-bold text-green-600">{summary.izin}%</p>
          </div>
          
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Alpha</h3>
            <p className="text-2xl font-bold text-red-600">{summary.alpha}%</p>
          </div>
        </div>
        
      </div>
      
      {/* Download Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-20 md:mb-6">
        <button 
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className="flex items-center justify-center gap-3 bg-red-600 text-white p-4 rounded-xl hover:bg-red-700 transition-colors"
        >
          {isDownloading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <FileText className="h-6 w-6" />
          )}
          <span className="font-medium">Download Laporan PDF</span>
        </button>
        
        <button 
          onClick={handleDownloadExcel}
          disabled={isDownloading}
          className="flex items-center justify-center gap-3 bg-green-600 text-white p-4 rounded-xl hover:bg-green-700 transition-colors"
        >
          {isDownloading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-6 w-6" />
          )}
          <span className="font-medium">Download Laporan Excel</span>
        </button>
      </div>
    </div>
  );
}
