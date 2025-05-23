"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  ArrowLeft, 
  Calendar, 
  Download, 
  FileText, 
  Filter, 
  Loader2, 
  Users, 
  BookOpen, 
  User, 
  ChevronDown, 
  Check, 
  BarChart2, 
  PieChart,
  Settings,
  X
} from "lucide-react";
import Link from "next/link";
import { format, subDays, subMonths, isValid, parse } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "react-hot-toast";
import { jsPDF } from "jspdf";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsInternalPieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Types
interface Student {
  id: string;
  name: string;
  nisn: string;
  class: string;
  gender: string;
}

interface Class {
  id: string;
  name: string;
  level: string;
  teacherName: string;
}

interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  date: string;
  time: string;
  status: string;
  note?: string;
}

interface ReportOptions {
  title: string;
  dateRange: {
    start: string;
    end: string;
  };
  filters: {
    classes: string[];
    students: string[];
    statuses: string[];
  };
  showCharts: boolean;
  showDetails: boolean;
  orientation: "portrait" | "landscape";
  pageSize: "a4" | "letter";
  className?: string;
  teacherName?: string;
  students?: any[];
}

// Predefined date ranges
const DATE_RANGES = [
  { label: "Hari Ini", getValue: () => {
    const today = format(new Date(), "yyyy-MM-dd");
    return { start: today, end: today };
  }},
  { label: "7 Hari Terakhir", getValue: () => {
    const end = format(new Date(), "yyyy-MM-dd");
    const start = format(subDays(new Date(), 6), "yyyy-MM-dd");
    return { start, end };
  }},
  { label: "30 Hari Terakhir", getValue: () => {
    const end = format(new Date(), "yyyy-MM-dd");
    const start = format(subDays(new Date(), 29), "yyyy-MM-dd");
    return { start, end };
  }},
  { label: "Bulan Ini", getValue: () => {
    const now = new Date();
    const start = format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd");
    const end = format(new Date(), "yyyy-MM-dd");
    return { start, end };
  }},
  { label: "Bulan Lalu", getValue: () => {
    const now = new Date();
    const start = format(new Date(now.getFullYear(), now.getMonth() - 1, 1), "yyyy-MM-dd");
    const end = format(new Date(now.getFullYear(), now.getMonth(), 0), "yyyy-MM-dd");
    return { start, end };
  }},
];

// Status options with colors
const STATUS_OPTIONS = [
  { value: "hadir", label: "Hadir", color: "#4C6FFF" },
  { value: "sakit", label: "Sakit", color: "#FF9800" },
  { value: "izin", label: "Izin", color: "#8BC34A" },
  { value: "alpha", label: "Alpha", color: "#F44336" },
];

export default function CustomReportGenerator() {
  const { schoolId, userRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  
  // UI state
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showOptionsPanel, setShowOptionsPanel] = useState(false);
  
  // Report options
  const [reportOptions, setReportOptions] = useState<ReportOptions>({
    title: "Laporan Kehadiran",
    dateRange: {
      start: format(subDays(new Date(), 29), "yyyy-MM-dd"),
      end: format(new Date(), "yyyy-MM-dd")
    },
    filters: {
      classes: [],
      students: [],
      statuses: ["hadir", "sakit", "izin", "alpha"]
    },
    showCharts: true,
    showDetails: true,
    orientation: "portrait",
    pageSize: "a4"
  });

  // Fetch classes and students on component mount
  useEffect(() => {
    const fetchData = async () => {
      if (!schoolId) return;
      
      setLoading(true);
      try {
        // Fetch classes
        const classesRef = collection(db, `schools/${schoolId}/classes`);
        const classesQuery = query(classesRef, orderBy("name"));
        const classesSnapshot = await getDocs(classesQuery);
        
        const fetchedClasses: Class[] = [];
        classesSnapshot.forEach((doc) => {
          fetchedClasses.push({
            id: doc.id,
            name: doc.data().name || "",
            level: doc.data().level || "",
            teacherName: doc.data().teacherName || ""
          });
        });
        setClasses(fetchedClasses);
        
        // Fetch students
        const studentsRef = collection(db, `schools/${schoolId}/students`);
        const studentsQuery = query(studentsRef, orderBy("name"));
        const studentsSnapshot = await getDocs(studentsQuery);
        
        const fetchedStudents: Student[] = [];
        studentsSnapshot.forEach((doc) => {
          fetchedStudents.push({
            id: doc.id,
            name: doc.data().name || "",
            nisn: doc.data().nisn || "",
            class: doc.data().class || "",
            gender: doc.data().gender || ""
          });
        });
        setStudents(fetchedStudents);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Gagal mengambil data kelas dan siswa");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [schoolId]);

  // Fetch attendance data when filters change
  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!schoolId) return;
      
      setLoading(true);
      try {
        const { start, end } = reportOptions.dateRange;
        const { classes: selectedClasses, students: selectedStudents, statuses } = reportOptions.filters;
        
        const attendanceRef = collection(db, `schools/${schoolId}/attendance`);
        
        // Build query based on filters
        let attendanceQuery = query(
          attendanceRef,
          where("date", ">=", start),
          where("date", "<=", end),
          orderBy("date", "desc")
        );
        
        const snapshot = await getDocs(attendanceQuery);
        let records: AttendanceRecord[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Apply client-side filtering for classes, students, and statuses
          const matchesClass = selectedClasses.length === 0 || 
            selectedClasses.includes(data.class);
          
          const matchesStudent = selectedStudents.length === 0 || 
            selectedStudents.includes(data.studentId);
          
          const matchesStatus = statuses.length === 0 || 
            statuses.includes(data.status);
          
          if (matchesClass && matchesStudent && matchesStatus) {
            records.push({
              id: doc.id,
              studentId: data.studentId || "",
              studentName: data.studentName || "",
              class: data.class || "",
              date: data.date || "",
              time: data.time || "",
              status: data.status || "",
              note: data.note || ""
            });
          }
        });
        
        setAttendanceData(records);
      } catch (error) {
        console.error("Error fetching attendance data:", error);
        toast.error("Gagal mengambil data kehadiran");
      } finally {
        setLoading(false);
      }
    };
    
    fetchAttendanceData();
  }, [schoolId, reportOptions.dateRange, reportOptions.filters]);

  // Handle date range selection
  const handleDateRangeSelect = (range: { start: string; end: string }) => {
    setReportOptions({
      ...reportOptions,
      dateRange: range
    });
  };

  // Handle class selection
  const handleClassToggle = (classId: string) => {
    const currentClasses = [...reportOptions.filters.classes];
    const index = currentClasses.indexOf(classId);
    
    if (index === -1) {
      currentClasses.push(classId);
    } else {
      currentClasses.splice(index, 1);
    }
    
    setReportOptions({
      ...reportOptions,
      filters: {
        ...reportOptions.filters,
        classes: currentClasses
      }
    });
  };

  // Handle student selection
  const handleStudentToggle = (studentId: string) => {
    const currentStudents = [...reportOptions.filters.students];
    const index = currentStudents.indexOf(studentId);
    
    if (index === -1) {
      currentStudents.push(studentId);
    } else {
      currentStudents.splice(index, 1);
    }
    
    setReportOptions({
      ...reportOptions,
      filters: {
        ...reportOptions.filters,
        students: currentStudents
      }
    });
  };

  // Handle status selection
  const handleStatusToggle = (status: string) => {
    const currentStatuses = [...reportOptions.filters.statuses];
    const index = currentStatuses.indexOf(status);
    
    if (index === -1) {
      currentStatuses.push(status);
    } else {
      currentStatuses.splice(index, 1);
    }
    
    setReportOptions({
      ...reportOptions,
      filters: {
        ...reportOptions.filters,
        statuses: currentStatuses
      }
    });
  };

  // Calculate attendance statistics
  const attendanceStats = useMemo(() => {
    const stats = {
      hadir: 0,
      sakit: 0,
      izin: 0,
      alpha: 0,
      total: attendanceData.length
    };
    
    attendanceData.forEach(record => {
      if (record.status === "hadir" || record.status === "present") stats.hadir++;
      else if (record.status === "sakit" || record.status === "sick") stats.sakit++;
      else if (record.status === "izin" || record.status === "permitted") stats.izin++;
      else if (record.status === "alpha" || record.status === "absent") stats.alpha++;
    });
    
    return stats;
  }, [attendanceData]);

  // Prepare chart data
  const pieChartData = useMemo(() => {
    return [
      { name: "Hadir", value: attendanceStats.hadir, color: "#4C6FFF" },
      { name: "Sakit", value: attendanceStats.sakit, color: "#FF9800" },
      { name: "Izin", value: attendanceStats.izin, color: "#8BC34A" },
      { name: "Alpha", value: attendanceStats.alpha, color: "#F44336" },
    ].filter(item => item.value > 0);
  }, [attendanceStats]);

  // Prepare daily attendance data for bar chart
  const dailyAttendanceData = useMemo(() => {
    const dailyData: Record<string, { date: string; hadir: number; sakit: number; izin: number; alpha: number }> = {};
    
    attendanceData.forEach(record => {
      if (!dailyData[record.date]) {
        dailyData[record.date] = {
          date: record.date,
          hadir: 0,
          sakit: 0,
          izin: 0,
          alpha: 0
        };
      }
      
      if (record.status === "hadir" || record.status === "present") dailyData[record.date].hadir++;
      else if (record.status === "sakit" || record.status === "sick") dailyData[record.date].sakit++;
      else if (record.status === "izin" || record.status === "permitted") dailyData[record.date].izin++;
      else if (record.status === "alpha" || record.status === "absent") dailyData[record.date].alpha++;
    });
    
    return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
  }, [attendanceData]);

  // Generate PDF report
  // Define mock school info for the report
  const schoolInfo = {
    name: "Nama Sekolah",
    address: "Alamat Sekolah",
    npsn: "12345678",
    principalName: "Kepala Sekolah",
    principalNip: "NIP.12345"
  };

  const generatePDF = async () => {
    setGenerating(true);
    
    try {
      // Create new PDF document
      const doc = new jsPDF({
        orientation: reportOptions.orientation,
        unit: "mm",
        format: reportOptions.pageSize
      });
      
      // Get page dimensions
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      
      // Set font
      doc.setFont("helvetica");
      
      // Add school header
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(schoolInfo.name.toUpperCase(), pageWidth / 2, margin, { align: "center" });
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(schoolInfo.address, pageWidth / 2, margin + 7, { align: "center" });
      doc.text(`NPSN: ${schoolInfo.npsn}`, pageWidth / 2, margin + 12, { align: "center" });
      
      // Add horizontal line
      doc.setLineWidth(0.5);
      doc.line(margin, margin + 15, pageWidth - margin, margin + 15);
      
      // Add report title
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("REKAP LAPORAN KEHADIRAN SISWA", pageWidth / 2, margin + 25, { align: "center" });
      
      // Add date range/class info
      doc.setFontSize(12);
      const startDate = format(new Date(reportOptions.dateRange.start), "d MMMM yyyy", { locale: id });
      const endDate = format(new Date(reportOptions.dateRange.end), "d MMMM yyyy", { locale: id });
      doc.text(`KELAS : "${reportOptions.className || 'SEMUA KELAS'}"`, pageWidth / 2, margin + 32, { align: "center" });
      doc.text(`BULAN : "${format(new Date(reportOptions.dateRange.start), "MMMM yyyy", { locale: id }).toUpperCase()}"`, pageWidth / 2, margin + 39, { align: "center" });
      
      // Add filter information
      let yPos = margin + 20;
      doc.setFontSize(10);
      
      if (reportOptions.filters.classes.length > 0) {
        const selectedClassNames = reportOptions.filters.classes.map(id => {
          const classObj = classes.find(c => c.id === id);
          return classObj ? classObj.name : id;
        }).join(", ");
        
        doc.text(`Kelas: ${selectedClassNames}`, margin, yPos);
        yPos += 5;
      }
      
      if (reportOptions.filters.students.length > 0) {
        const selectedStudentNames = reportOptions.filters.students.map(id => {
          const studentObj = students.find(s => s.id === id);
          return studentObj ? studentObj.name : id;
        }).join(", ");
        
        doc.text(`Siswa: ${selectedStudentNames}`, margin, yPos);
        yPos += 5;
      }
      
      // Add statistics
      yPos += 5;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Statistik Kehadiran", margin, yPos);
      yPos += 7;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Total Catatan: ${attendanceStats.total}`, margin, yPos);
      yPos += 5;
      
      const total = attendanceStats.total || 1; // Prevent division by zero
      doc.text(`Hadir: ${attendanceStats.hadir} (${Math.round((attendanceStats.hadir / total) * 100)}%)`, margin, yPos);
      yPos += 5;
      
      doc.text(`Sakit: ${attendanceStats.sakit} (${Math.round((attendanceStats.sakit / total) * 100)}%)`, margin, yPos);
      yPos += 5;
      
      doc.text(`Izin: ${attendanceStats.izin} (${Math.round((attendanceStats.izin / total) * 100)}%)`, margin, yPos);
      yPos += 5;
      
      doc.text(`Alpha: ${attendanceStats.alpha} (${Math.round((attendanceStats.alpha / total) * 100)}%)`, margin, yPos);
      yPos += 10;
      
      // Add charts if enabled
      if (reportOptions.showCharts && pieChartData.length > 0) {
        // We would need to use canvas to render charts in PDF
        // For simplicity, we'll just add a placeholder text
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Grafik Kehadiran", margin, yPos);
        yPos += 7;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text("(Grafik tidak tersedia dalam PDF)", margin, yPos);
        yPos += 15;
      }
      
      // Add attendance details if enabled
      if (reportOptions.showDetails && reportOptions.students && reportOptions.students.length > 0) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        
        // Table headers
        const headers = ["Nama Siswa", "NISN", "Kelas", "Hadir", "Sakit", "Izin", "Alpha", "Total"];
        const colWidths = [50, 25, 20, 15, 15, 15, 15, 15];
        
        yPos = margin + 50;
        
        // Green background for header
        doc.setFillColor(144, 238, 144); // Light green
        doc.rect(margin, yPos - 5, contentWidth, 7, "F");
        doc.setDrawColor(0);
        doc.rect(margin, yPos - 5, contentWidth, 7, "S"); // Border
        
        doc.setFontSize(9);
        doc.setTextColor(0);
        
        let xPos = margin;
        
        // Draw vertical lines and headers
        headers.forEach((header, i) => {
          if (i > 0) {
            doc.line(xPos, yPos - 5, xPos, yPos + 2);
          }
          doc.text(header, xPos + 2, yPos);
          xPos += colWidths[i];
        });
        
        yPos += 7;
        
        // Table rows for students
        doc.setFontSize(8);
        
        reportOptions.students.forEach((student, index) => {
          // Row background (alternating)
          if (index % 2 === 0) {
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, yPos - 3, contentWidth, 7, "F");
          }
          
          // Draw row border
          doc.rect(margin, yPos - 3, contentWidth, 7, "S");
          
          // Draw cell content
          xPos = margin;
          doc.text(student.name || "", xPos + 2, yPos + 1); xPos += colWidths[0];
          
          // Draw vertical line
          doc.line(xPos, yPos - 3, xPos, yPos + 4);
          doc.text(student.nisn || "", xPos + 2, yPos + 1); xPos += colWidths[1];
          
          // Draw vertical line
          doc.line(xPos, yPos - 3, xPos, yPos + 4);
          doc.text(student.class || "", xPos + 2, yPos + 1); xPos += colWidths[2];
          
          // Draw vertical line
          doc.line(xPos, yPos - 3, xPos, yPos + 4);
          doc.text(student.hadir.toString(), xPos + 2, yPos + 1); xPos += colWidths[3];
          
          // Draw vertical line
          doc.line(xPos, yPos - 3, xPos, yPos + 4);
          doc.text(student.sakit.toString(), xPos + 2, yPos + 1); xPos += colWidths[4];
          
          // Draw vertical line
          doc.line(xPos, yPos - 3, xPos, yPos + 4);
          doc.text(student.izin.toString(), xPos + 2, yPos + 1); xPos += colWidths[5];
          
          // Draw vertical line
          doc.line(xPos, yPos - 3, xPos, yPos + 4);
          doc.text(student.alpha.toString(), xPos + 2, yPos + 1); xPos += colWidths[6];
          
          // Draw vertical line
          doc.line(xPos, yPos - 3, xPos, yPos + 4);
          doc.text(student.total.toString(), xPos + 2, yPos + 1);
          
          yPos += 7;
          
          // Add a new page if needed
          if (yPos > pageHeight - margin - 40 && index < reportOptions.students.length - 1) {
            doc.addPage();
            yPos = margin + 20;
            
            // Add header to new page
            doc.setFillColor(144, 238, 144); // Light green
            doc.rect(margin, yPos - 5, contentWidth, 7, "F");
            doc.rect(margin, yPos - 5, contentWidth, 7, "S"); // Border
            
            doc.setFontSize(9);
            xPos = margin;
            headers.forEach((header, i) => {
              if (i > 0) {
                doc.line(xPos, yPos - 5, xPos, yPos + 2);
              }
              doc.text(header, xPos + 2, yPos);
              xPos += colWidths[i];
            });
            
            yPos += 7;
            doc.setFontSize(8);
          }
        });
        
        // Remove the reference to sortedData as it's not defined and not needed
        const attendanceRecords = attendanceData.slice(0, 10);
        for (let i = 0; i < attendanceRecords.length; i++) {
          const record = attendanceRecords[i];
          
          // Check if we need a new page
          if (yPos > pageHeight - margin) {
            doc.addPage();
            yPos = margin + 10;
            
            // Add table headers to new page
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, yPos - 5, contentWidth, 7, "F");
            
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            
            xPos = margin;
            headers.forEach((header, i) => {
              doc.text(header, xPos + 2, yPos);
              xPos += colWidths[i];
            });
            
            yPos += 5;
            doc.setFont("helvetica", "normal");
          }
          
          // Format date
          const formattedDate = format(new Date(record.date), "dd/MM/yyyy");
          
          // Get status text
          let statusText = "";
          if (record.status === "hadir" || record.status === "present") statusText = "Hadir";
          else if (record.status === "sakit" || record.status === "sick") statusText = "Sakit";
          else if (record.status === "izin" || record.status === "permitted") statusText = "Izin";
          else if (record.status === "alpha" || record.status === "absent") statusText = "Alpha";
          
          // Add alternating row background
          if (i % 2 === 0) {
            doc.setFillColor(248, 248, 248);
            doc.rect(margin, yPos - 3, contentWidth, 6, "F");
          }
          
          // Add row data
          xPos = margin;
          
          doc.text(formattedDate, xPos + 2, yPos);
          xPos += colWidths[0];
          
          // Truncate long names
          const displayName = record.studentName.length > 30 
            ? record.studentName.substring(0, 27) + "..." 
            : record.studentName;
          
          doc.text(displayName, xPos + 2, yPos);
          xPos += colWidths[1];
          
          doc.text(record.class, xPos + 2, yPos);
          xPos += colWidths[2];
          
          doc.text(statusText, xPos + 2, yPos);
          xPos += colWidths[3];
          
          doc.text(record.time, xPos + 2, yPos);
          
          yPos += 6;
        }
      }
      
      // Add signature section
      yPos += 20;
      
      // Add footer
      const currentDate = format(new Date(), "d MMMM yyyy", { locale: id });
      doc.setFontSize(10);
      doc.text(`Di unduh pada: ${currentDate}`, pageWidth / 2, yPos, { align: "center" });
      
      yPos += 20;
      
      // Mengetahui section
      const signatureWidth = (pageWidth - margin * 2) / 2;
      
      doc.text("Mengetahui", margin + signatureWidth * 0.25, yPos, { align: "center" });
      doc.text("Wali Kelas", margin + signatureWidth * 1.75, yPos, { align: "center" });
      
      yPos += 5;
      
      doc.text("Kepala Sekolah", margin + signatureWidth * 0.25, yPos, { align: "center" });
      doc.text(`"${reportOptions.className || 'kelas'}"`, margin + signatureWidth * 1.75, yPos, { align: "center" });
      
      yPos += 20;
      
      doc.text(`"${schoolInfo.principalName || 'nama kepala sekolah'}"`, margin + signatureWidth * 0.25, yPos, { align: "center" });
      doc.text(`"${reportOptions.teacherName || 'nama wali kelas'}"`, margin + signatureWidth * 1.75, yPos, { align: "center" });
      
      yPos += 5;
      
      doc.text(`NIP. "${schoolInfo.principalNip || '...........................'}"`, margin + signatureWidth * 0.25, yPos, { align: "center" });
      doc.text("NIP. ...............................", margin + signatureWidth * 1.75, yPos, { align: "center" });
      
      // Save the PDF
      const fileName = `Laporan_Kehadiran_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`;
      doc.save(fileName);
      
      toast.success("Laporan berhasil dibuat");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Gagal membuat laporan PDF");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto pb-20 md:pb-6 px-3 sm:px-4 md:px-6">
      <div className="flex items-center mb-6">
        <Link href="/dashboard/reports" className="p-2 mr-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Generator Laporan Kustom</h1>
      </div>
      
      {/* Report Options */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div className="mb-4 md:mb-0">
            <h2 className="text-lg font-semibold text-gray-800">Opsi Laporan</h2>
            <p className="text-sm text-gray-500">Sesuaikan laporan kehadiran sesuai kebutuhan Anda</p>
          </div>
          
          <div className="flex items-center">
            <button
              onClick={() => setShowOptionsPanel(!showOptionsPanel)}
              className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Settings size={18} />
              <span>Pengaturan Laporan</span>
              <ChevronDown size={16} className={`transition-transform ${showOptionsPanel ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
        
        {/* Advanced Options Panel */}
        <AnimatePresence>
          {showOptionsPanel && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mb-6"
            >
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Pengaturan Laporan</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="reportTitle" className="block text-xs font-medium text-gray-500 mb-1">
                      Judul Laporan
                    </label>
                    <input
                      type="text"
                      id="reportTitle"
                      value={reportOptions.title}
                      onChange={(e) => setReportOptions({...reportOptions, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Orientasi Halaman
                    </label>
                    <div className="flex gap-3">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="orientation"
                          checked={reportOptions.orientation === "portrait"}
                          onChange={() => setReportOptions({...reportOptions, orientation: "portrait"})}
                          className="mr-2"
                        />
                        <span className="text-sm">Potrait</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="orientation"
                          checked={reportOptions.orientation === "landscape"}
                          onChange={() => setReportOptions({...reportOptions, orientation: "landscape"})}
                          className="mr-2"
                        />
                        <span className="text-sm">Landscape</span>
                      </label>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Ukuran Kertas
                    </label>
                    <div className="flex gap-3">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="pageSize"
                          checked={reportOptions.pageSize === "a4"}
                          onChange={() => setReportOptions({...reportOptions, pageSize: "a4"})}
                          className="mr-2"
                        />
                        <span className="text-sm">A4</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="pageSize"
                          checked={reportOptions.pageSize === "letter"}
                          onChange={() => setReportOptions({...reportOptions, pageSize: "letter"})}
                          className="mr-2"
                        />
                        <span className="text-sm">Letter</span>
                      </label>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Konten Laporan
                    </label>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={reportOptions.showCharts}
                          onChange={() => setReportOptions({...reportOptions, showCharts: !reportOptions.showCharts})}
                          className="mr-2"
                        />
                        <span className="text-sm">Tampilkan Grafik</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={reportOptions.showDetails}
                          onChange={() => setReportOptions({...reportOptions, showDetails: !reportOptions.showDetails})}
                          className="mr-2"
                        />
                        <span className="text-sm">Tampilkan Detail Kehadiran</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Date Range Selection */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Rentang Tanggal</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="startDate" className="block text-xs font-medium text-gray-500 mb-1">
                Tanggal Mulai
              </label>
              <input
                type="date"
                id="startDate"
                value={reportOptions.dateRange.start}
                onChange={(e) => setReportOptions({
                  ...reportOptions,
                  dateRange: {
                    ...reportOptions.dateRange,
                    start: e.target.value
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              />
            </div>
            
            <div>
              <label htmlFor="endDate" className="block text-xs font-medium text-gray-500 mb-1">
                Tanggal Akhir
              </label>
              <input
                type="date"
                id="endDate"
                value={reportOptions.dateRange.end}
                onChange={(e) => setReportOptions({
                  ...reportOptions,
                  dateRange: {
                    ...reportOptions.dateRange,
                    end: e.target.value
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {DATE_RANGES.map((range, index) => (
              <button
                key={index}
                onClick={() => handleDateRangeSelect(range.getValue())}
                className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition-colors"
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Class Filter */}
          <div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter Kelas
              </label>
              <button
                onClick={() => setShowClassDropdown(!showClassDropdown)}
                className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white"
              >
                <span className="text-sm">
                  {reportOptions.filters.classes.length > 0
                    ? `${reportOptions.filters.classes.length} kelas dipilih`
                    : "Semua Kelas"}
                </span>
                <ChevronDown size={16} className={`transition-transform ${showClassDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showClassDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <div className="p-2">
                    {classes.length > 0 ? (
                      classes.map((cls) => (
                        <div
                          key={cls.id}
                          className="flex items-center px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
                          onClick={() => handleClassToggle(cls.id)}
                        >
                          <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                            reportOptions.filters.classes.includes(cls.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                          }`}>
                            {reportOptions.filters.classes.includes(cls.id) && (
                              <Check size={12} className="text-white" />
                            )}
                          </div>
                          <span className="ml-2 text-sm">{cls.name}</span>
                        </div>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-gray-500">Tidak ada kelas</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Student Filter */}
          <div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter Siswa
              </label>
              <button
                onClick={() => setShowStudentDropdown(!showStudentDropdown)}
                className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white"
              >
                <span className="text-sm">
                  {reportOptions.filters.students.length > 0
                    ? `${reportOptions.filters.students.length} siswa dipilih`
                    : "Semua Siswa"}
                </span>
                <ChevronDown size={16} className={`transition-transform ${showStudentDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showStudentDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <div className="p-2">
                    <div className="mb-2">
                      <input
                        type="text"
                        placeholder="Cari siswa..."
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded"
                      />
                    </div>
                    
                    {students.length > 0 ? (
                      students.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
                          onClick={() => handleStudentToggle(student.id)}
                        >
                          <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                            reportOptions.filters.students.includes(student.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                          }`}>
                            {reportOptions.filters.students.includes(student.id) && (
                              <Check size={12} className="text-white" />
                            )}
                          </div>
                          <div className="ml-2 flex items-center">
                            <span className="text-sm">{student.name}</span>
                            <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full ml-1.5">Kelas {student.class}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-gray-500">Tidak ada siswa</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Status Filter */}
          <div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter Status
              </label>
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white"
              >
                <span className="text-sm">
                  {reportOptions.filters.statuses.length > 0
                    ? `${reportOptions.filters.statuses.length} status dipilih`
                    : "Semua Status"}
                </span>
                <ChevronDown size={16} className={`transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showStatusDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                  <div className="p-2">
                    {STATUS_OPTIONS.map((status) => (
                      <div
                        key={status.value}
                        className="flex items-center px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
                        onClick={() => handleStatusToggle(status.value)}
                      >
                        <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                          reportOptions.filters.statuses.includes(status.value) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                        }`}>
                          {reportOptions.filters.statuses.includes(status.value) && (
                            <Check size={12} className="text-white" />
                          )}
                        </div>
                        <div className="ml-2 flex items-center">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }}></div>
                          <span className="ml-2 text-sm">{status.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Report Preview */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800">Pratinjau Laporan</h2>
          
          <button
            onClick={generatePDF}
            disabled={generating || attendanceData.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              generating || attendanceData.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            } transition-colors`}
          >
            {generating ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Download size={18} />
            )}
            <span>Download PDF</span>
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 size={40} className="animate-spin text-primary" />
          </div>
        ) : attendanceData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FileText size={48} className="text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">Tidak ada data kehadiran</h3>
            <p className="text-gray-500 max-w-md">
              Tidak ada data kehadiran yang ditemukan untuk filter yang dipilih.
              Coba ubah rentang tanggal atau filter lainnya.
            </p>
          </div>
        ) : (
          <div>
            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <h3 className="text-xs text-blue-700 font-medium mb-1">Hadir</h3>
                <p className="text-2xl font-bold text-blue-700">
                  {attendanceStats.hadir}
                  <span className="text-sm font-normal ml-1">
                    ({Math.round((attendanceStats.hadir / attendanceStats.total) * 100)}%)
                  </span>
                </p>
              </div>
              
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                <h3 className="text-xs text-orange-700 font-medium mb-1">Sakit</h3>
                <p className="text-2xl font-bold text-orange-700">
                  {attendanceStats.sakit}
                  <span className="text-sm font-normal ml-1">
                    ({Math.round((attendanceStats.sakit / attendanceStats.total) * 100)}%)
                  </span>
                </p>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                <h3 className="text-xs text-green-700 font-medium mb-1">Izin</h3>
                <p className="text-2xl font-bold text-green-700">
                  {attendanceStats.izin}
                  <span className="text-sm font-normal ml-1">
                    ({Math.round((attendanceStats.izin / attendanceStats.total) * 100)}%)
                  </span>
                </p>
              </div>
              
              <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                <h3 className="text-xs text-red-700 font-medium mb-1">Alpha</h3>
                <p className="text-2xl font-bold text-red-700">
                  {attendanceStats.alpha}
                  <span className="text-sm font-normal ml-1">
                    ({Math.round((attendanceStats.alpha / attendanceStats.total) * 100)}%)
                  </span>
                </p>
              </div>
            </div>
            
            {/* Charts */}
            {reportOptions.showCharts && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Pie Chart */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Distribusi Kehadiran</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsInternalPieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={(entry) => `${entry.name}: ${entry.value}`}
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} />
                      </RechartsInternalPieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                {/* Bar Chart */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Kehadiran Harian</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dailyAttendanceData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="hadir" name="Hadir" fill="#4C6FFF" />
                        <Bar dataKey="sakit" name="Sakit" fill="#FF9800" />
                        <Bar dataKey="izin" name="Izin" fill="#8BC34A" />
                        <Bar dataKey="alpha" name="Alpha" fill="#F44336" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
            
            {/* Attendance Details */}
            {reportOptions.showDetails && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Detail Kehadiran</h3>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tanggal
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nama
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Kelas
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Waktu
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendanceData.slice(0, 10).map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(new Date(record.date), "dd/MM/yyyy")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{record.studentName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {record.class}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              record.status === "hadir" || record.status === "present"
                                ? "bg-green-100 text-green-800"
                                : record.status === "sakit" || record.status === "sick"
                                ? "bg-orange-100 text-orange-800"
                                : record.status === "izin" || record.status === "permitted"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-red-100 text-red-800"
                            }`}>
                              {record.status === "hadir" || record.status === "present"
                                ? "Hadir"
                                : record.status === "sakit" || record.status === "sick"
                                ? "Sakit"
                                : record.status === "izin" || record.status === "permitted"
                                ? "Izin"
                                : "Alpha"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {record.time}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {attendanceData.length > 10 && (
                  <div className="mt-4 text-center text-sm text-gray-500">
                    Menampilkan 10 dari {attendanceData.length} catatan kehadiran.
                    Semua data akan disertakan dalam laporan PDF.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
