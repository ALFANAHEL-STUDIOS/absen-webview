"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Calendar, Download, FileSpreadsheet, FileText, Loader2, TrendingUp, AlertTriangle } from "lucide-react";
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
  PieChart,
  Pie,
  Cell
} from "recharts";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "react-hot-toast";
import { generatePDF, generateExcel } from "@/lib/reportGenerator";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Sample class data - removed demo data
const CLASSES: any[] = [];

// Colors for pie chart
const COLORS = ["#4C6FFF", "#FF9800", "#8BC34A", "#F44336"];

// Generate attendance data function
const generateClassAttendanceData = (classId: string) => {
  return [
    { name: "Hadir", value: 0, color: "#4C6FFF" },
    { name: "Sakit", value: 0, color: "#FF9800" },
    { name: "Izin", value: 0, color: "#8BC34A" },
    { name: "Alpha", value: 0, color: "#F44336" },
  ];
};

// Generate weekly data function
const generateWeeklyData = (classId: string) => {
  return [];
};

// Generate daily data function - removed demo data
const generateDailyData = () => {
  return [];
};

export default function ClassReport() {
  
  const { schoolId, user } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState([
    { name: "Hadir", value: 85, color: "#4C6FFF" },
    { name: "Sakit", value: 7, color: "#FF9800" },
    { name: "Izin", value: 5, color: "#8BC34A" },
    { name: "Alpha", value: 3, color: "#F44336" },
  ]);
  
  // Chart data
  const [dailyData, setDailyData] = useState<any[]>(generateDailyData());
  
  // Filter states
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // School information
  const [schoolInfo, setSchoolInfo] = useState({
    name: "",
    address: "",
    npsn: "",
    principalName: "",
    principalNip: ""
  });
  
  const [teacherName, setTeacherName] = useState("");
  
  // Fetch classes from database
  useEffect(() => {
    const fetchClasses = async () => {
      if (!schoolId) return;
      
      try {
        setLoading(true);
        const { classApi } = await import('@/lib/api');
        const classesData = await classApi.getAll(schoolId);
        
        if (classesData && classesData.length > 0) {
          setClasses(classesData);
          setSelectedClass(classesData[0]);
        }
      } catch (error) {
        console.error("Error fetching classes:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchClasses();
  }, [schoolId]);
  
  useEffect(() => {
    // Fetch real attendance data when selected class changes
    const fetchClassAttendanceData = async () => {
      if (!selectedClass || !schoolId) return;
      
      try {
        setLoading(true);
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        
        // First, get all students in this class
        const studentsRef = collection(db, `schools/${schoolId}/students`);
        const studentsQuery = query(studentsRef, where("class", "==", selectedClass.name));
        const studentsSnapshot = await getDocs(studentsQuery);
        
        const studentIds: string[] = [];
        let studentCount = 0;
        
        studentsSnapshot.forEach(doc => {
          studentIds.push(doc.id);
          studentCount++;
        });
        
        // Update teacher name if available
        if (selectedClass.teacherName) {
          setTeacherName(selectedClass.teacherName);
        }
        
        // If no students found, set default empty data
        if (studentIds.length === 0) {
          setAttendanceData([
            { name: "Hadir", value: 0, color: "#4C6FFF" },
            { name: "Sakit", value: 0, color: "#FF9800" },
            { name: "Izin", value: 0, color: "#8BC34A" },
            { name: "Alpha", value: 0, color: "#F44336" },
          ]);
          setLoading(false);
          return;
        }
        
        // Get attendance records for these students
        const startDate = format(new Date(), "yyyy-MM-01");
        const endDate = format(new Date(), "yyyy-MM-31");
        
        const attendanceRef = collection(db, `schools/${schoolId}/attendance`);
        const attendanceQuery = query(
          attendanceRef,
          where("date", ">=", startDate),
          where("date", "<=", endDate)
        );
        
        const attendanceSnapshot = await getDocs(attendanceQuery);
        
        // Count by status
        let present = 0, sick = 0, permitted = 0, absent = 0;
        
        // Process attendance records
        attendanceSnapshot.forEach(doc => {
          const data = doc.data();
          
          // Only count if this student belongs to the selected class
          if (data.studentId && studentIds.includes(data.studentId)) {
            // For pie chart data
            if (data.status === 'present' || data.status === 'hadir') present++;
            else if (data.status === 'sick' || data.status === 'sakit') sick++;
            else if (data.status === 'permitted' || data.status === 'izin') permitted++;
            else if (data.status === 'absent' || data.status === 'alpha') absent++;
          }
        });
        
        // Set pie chart data
        const total = present + sick + permitted + absent;
        if (total > 0) {
          setAttendanceData([
            { name: "Hadir", value: Math.round((present / total) * 100), color: "#4C6FFF" },
            { name: "Sakit", value: Math.round((sick / total) * 100), color: "#FF9800" },
            { name: "Izin", value: Math.round((permitted / total) * 100), color: "#8BC34A" },
            { name: "Alpha", value: Math.round((absent / total) * 100), color: "#F44336" },
          ]);
        } else {
          // Default when no data
          setAttendanceData([
            { name: "Hadir", value: 0, color: "#4C6FFF" },
            { name: "Sakit", value: 0, color: "#FF9800" },
            { name: "Izin", value: 0, color: "#8BC34A" },
            { name: "Alpha", value: 0, color: "#F44336" },
          ]);
        }
      } catch (error) {
        console.error("Error fetching class attendance data:", error);
        toast.error("Gagal mengambil data kehadiran dari database");
        
        // Set default empty data
        setAttendanceData([
          { name: "Hadir", value: 0, color: "#4C6FFF" },
          { name: "Sakit", value: 0, color: "#FF9800" },
          { name: "Izin", value: 0, color: "#8BC34A" },
          { name: "Alpha", value: 0, color: "#F44336" },
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchClassAttendanceData();
  }, [selectedClass, schoolId]);
  
  useEffect(() => {
    const fetchSchoolData = async () => {
      if (schoolId) {
        try {
          // Fetch school information
          const schoolDoc = await getDoc(doc(db, "schools", schoolId));
          if (schoolDoc.exists()) {
            const data = schoolDoc.data();
            setSchoolInfo({
              name: data.name || "Sekolah",
              address: data.address || "Alamat Sekolah",
              npsn: data.npsn || "-",
              principalName: data.principalName || "Kepala Sekolah",
              principalNip: data.principalNip || "-"
            });
          }
        } catch (error) {
          console.error("Error fetching school data:", error);
        }
      }
    };
    
    fetchSchoolData();
  }, [schoolId]);
  
  
  

  useEffect(() => {
    // Fetch real attendance data when selected class changes
    const fetchClassAttendanceData = async () => {
      if (!selectedClass || !schoolId) return;
      
      try {
        setLoading(true);
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        
        // First, get all students in this class
        const studentsRef = collection(db, `schools/${schoolId}/students`);
        const studentsQuery = query(studentsRef, where("class", "==", selectedClass.name));
        const studentsSnapshot = await getDocs(studentsQuery);
        
        const studentIds: string[] = [];
        let studentCount = 0;
        
        studentsSnapshot.forEach(doc => {
          studentIds.push(doc.id);
          studentCount++;
        });
        
        // Update teacher name if available
        if (selectedClass.teacherName) {
          setTeacherName(selectedClass.teacherName);
        }
        
        // If no students found, set default empty data
        if (studentIds.length === 0) {
          setAttendanceData([
            { name: "Hadir", value: 0, color: "#4C6FFF" },
            { name: "Sakit", value: 0, color: "#FF9800" },
            { name: "Izin", value: 0, color: "#8BC34A" },
            { name: "Alpha", value: 0, color: "#F44336" },
          ]);
          setDailyData([]);
          setLoading(false);
          return;
        }
        
        // Get attendance records for these students within the date range
        const attendanceRef = collection(db, `schools/${schoolId}/attendance`);
        const attendanceQuery = query(
          attendanceRef,
          where("date", ">=", startDate),
          where("date", "<=", endDate)
        );
        
        const attendanceSnapshot = await getDocs(attendanceQuery);
        
        // Count by status
        let present = 0, sick = 0, permitted = 0, absent = 0;
        
        // Track daily attendance
        const dailyStats: {[key: string]: {hadir: number, sakit: number, izin: number, alpha: number}} = {};
        
        // Process attendance records
        attendanceSnapshot.forEach(doc => {
          const data = doc.data();
          
          // Only count if this student belongs to the selected class
          if (data.studentId && studentIds.includes(data.studentId)) {
            // For pie chart data
            if (data.status === 'present' || data.status === 'hadir') present++;
            else if (data.status === 'sick' || data.status === 'sakit') sick++;
            else if (data.status === 'permitted' || data.status === 'izin') permitted++;
            else if (data.status === 'absent' || data.status === 'alpha') absent++;
            
            // For daily chart data
            if (data.date) {
              // Extract day part from date (format: YYYY-MM-DD)
              const day = data.date.split('-')[2];
              
              if (!dailyStats[day]) {
                dailyStats[day] = {hadir: 0, sakit: 0, izin: 0, alpha: 0};
              }
              
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
          }
        });
        
        // Set pie chart data
        const total = present + sick + permitted + absent;
        if (total > 0) {
          setAttendanceData([
            { name: "Hadir", value: Math.round((present / total) * 100), color: "#4C6FFF" },
            { name: "Sakit", value: Math.round((sick / total) * 100), color: "#FF9800" },
            { name: "Izin", value: Math.round((permitted / total) * 100), color: "#8BC34A" },
            { name: "Alpha", value: Math.round((absent / total) * 100), color: "#F44336" },
          ]);
        } else {
          // Default when no data
          setAttendanceData([
            { name: "Hadir", value: 0, color: "#4C6FFF" },
            { name: "Sakit", value: 0, color: "#FF9800" },
            { name: "Izin", value: 0, color: "#8BC34A" },
            { name: "Alpha", value: 0, color: "#F44336" },
          ]);
        }
        
        // Set daily chart data
        const newDailyData = Object.entries(dailyStats)
          .map(([date, stats]) => ({
            date,
            ...stats
          }))
          .sort((a, b) => parseInt(a.date) - parseInt(b.date));
          
        setDailyData(newDailyData);
      } catch (error) {
        console.error("Error fetching class attendance data:", error);
        toast.error("Gagal mengambil data kehadiran dari database");
        
        // Set default empty data
        setAttendanceData([
          { name: "Hadir", value: 0, color: "#4C6FFF" },
          { name: "Sakit", value: 0, color: "#FF9800" },
          { name: "Izin", value: 0, color: "#8BC34A" },
          { name: "Alpha", value: 0, color: "#F44336" },
        ]);
        setDailyData([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchClassAttendanceData();
  }, [selectedClass, schoolId, startDate, endDate]);
  
  const handleFilterByDate = () => {
    // This would normally fetch data for the selected date range
    toast.success(`Filter diterapkan: ${startDate} sampai ${endDate}`);
  };
  
  const handleDownloadPDF = () => {
    setIsDownloading(true);
    
    try {
      // Generate PDF
      const fileName = generatePDF(
        schoolInfo,
        {
          present: attendanceData[0]?.value || 85,
          sick: attendanceData[1]?.value || 7,
          permitted: attendanceData[2]?.value || 5,
          absent: attendanceData[3]?.value || 3
        },
        "class",
        {
          className: selectedClass?.name || '',
          teacherName: teacherName || ''
        }
      );
      
      toast.success(`Laporan kelas ${selectedClass?.name || 'Selected'} berhasil diunduh sebagai ${fileName}`);
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
      // Dynamically import xlsx library
      const XLSX = await import('xlsx');
      
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      
      // Create header data with school information
      const headerData = [
        [schoolInfo.name.toUpperCase()],
        [schoolInfo.address],
        [`NPSN: ${schoolInfo.npsn}`],
        [""],
        ["REKAPITULASI LAPORAN ABSENSI PESERTA DIDIK"],
        [`KELAS: "${selectedClass?.name || 'SEMUA KELAS'}"`],
        [`BULAN: "${format(new Date(), "MMMM yyyy", { locale: id }).toUpperCase()}"`],
        [""],
        ["No.", "Nama Siswa", "NISN", "Kelas", "Hadir", "Sakit", "Izin", "Alpha", "Total"]
      ];
      
      // Add student data
      let totalHadir = 0, totalSakit = 0, totalIzin = 0, totalAlpha = 0, totalAll = 0;
      
      filteredStudents.forEach((student, index) => {
        const studentTotal = (student.hadir || 0) + (student.sakit || 0) + (student.izin || 0) + (student.alpha || 0);
        
        totalHadir += student.hadir || 0;
        totalSakit += student.sakit || 0;
        totalIzin += student.izin || 0;
        totalAlpha += student.alpha || 0;
        totalAll += studentTotal;
        
        headerData.push([
          index + 1,
          student.name || "", 
          student.nisn || "", 
          student.class || "", 
          student.hadir || 0, 
          student.sakit || 0, 
          student.izin || 0, 
          student.alpha || 0, 
          studentTotal
        ]);
      });
      
      // Add total row
      headerData.push([
        "Total", "", "", "", totalHadir.toString(), totalSakit.toString(), totalIzin.toString(), totalAlpha.toString(), totalAll.toString()
      ]);
      
      // Add empty rows
      headerData.push([]);
      headerData.push([]);
      
      // Get top students by category
      const topStudentsByHadir = [...filteredStudents]
        .sort((a, b) => (b.hadir || 0) - (a.hadir || 0))
        .slice(0, 3);
        
      const topStudentsBySakit = [...filteredStudents]
        .sort((a, b) => (b.sakit || 0) - (a.sakit || 0))
        .slice(0, 3);
        
      const topStudentsByIzin = [...filteredStudents]
        .sort((a, b) => (b.izin || 0) - (a.izin || 0))
        .slice(0, 3);
        
      const topStudentsByAlpha = [...filteredStudents]
        .sort((a, b) => (b.alpha || 0) - (a.alpha || 0))
        .slice(0, 3);
      
      // Add "Siswa dengan Hadir Terbanyak" section
      headerData.push(["Siswa dengan Hadir Terbanyak :"]);
      headerData.push(["No.", "Nama Siswa", "NISN", "Kelas", "Jumlah Hadir"]);
      topStudentsByHadir.forEach((student, index) => {
        headerData.push([
          index + 1,
          student.name || "",
          student.nisn || "",
          student.class || "",
          student.hadir || 0
        ]);
      });
      
      // Add empty row
      headerData.push([]);
      
      // Add "Siswa dengan Sakit Terbanyak" section
      headerData.push(["Siswa dengan Sakit Terbanyak :"]);
      headerData.push(["No.", "Nama Siswa", "NISN", "Kelas", "Jumlah Sakit"]);
      topStudentsBySakit.forEach((student, index) => {
        headerData.push([
          index + 1,
          student.name || "",
          student.nisn || "",
          student.class || "",
          student.sakit || 0
        ]);
      });
      
      // Add empty row
      headerData.push([]);
      
      // Add "Siswa dengan Izin Terbanyak" section
      headerData.push(["Siswa dengan Izin Terbanyak :"]);
      headerData.push(["No.", "Nama Siswa", "NISN", "Kelas", "Jumlah Izin"]);
      topStudentsByIzin.forEach((student, index) => {
        headerData.push([
          index + 1,
          student.name || "",
          student.nisn || "",
          student.class || "",
          student.izin || 0
        ]);
      });
      
      // Add empty row
      headerData.push([]);
      
      // Add "Siswa dengan Alpha Terbanyak" section
      headerData.push(["Siswa dengan Alpha Terbanyak :"]);
      headerData.push(["No.", "Nama Siswa", "NISN", "Kelas", "Jumlah Alpha"]);
      topStudentsByAlpha.forEach((student, index) => {
        headerData.push([
          index + 1,
          student.name || "",
          student.nisn || "",
          student.class || "",
          student.alpha || 0
        ]);
      });
      
      // Add signature section
      headerData.push([]);
      headerData.push([]);
      headerData.push([]);
      
      const currentDate = format(new Date(), "d MMMM yyyy", { locale: id });
      headerData.push(["", "", "", "", `${schoolInfo.address}, ${currentDate}`]);
      headerData.push(["", "Mengetahui", "", "", "", "", "", "Administrator"]);
      headerData.push(["", "KEPALA SEKOLAH,", "", "", "", "", "", "Sekolah,"]);
      headerData.push([]);
      headerData.push([]);
      headerData.push([]);
      headerData.push(["", schoolInfo.principalName || "Kepala Sekolah", "", "", "", "", "", "Administrator"]);
      headerData.push(["", `NIP. ${schoolInfo.principalNip || "..........................."}`, "", "", "", "", "", "NIP. ..............................."]);
      
      // Create worksheet from data
      const ws = XLSX.utils.aoa_to_sheet(headerData);
      
      // Set column widths
      const colWidths = [
        { wch: 6 },    // No.
        { wch: 30 },   // Name
        { wch: 15 },   // NISN
        { wch: 10 },   // Class
        { wch: 8 },    // Hadir
        { wch: 8 },    // Sakit
        { wch: 8 },    // Izin
        { wch: 8 },    // Alpha
        { wch: 8 }     // Total
      ];
      
      ws['!cols'] = colWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Rekap Kehadiran");
      
      // Generate filename with current date
      const fileName = `Laporan_Kehadiran_Rombel_${format(new Date(), "yyyyMMdd")}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success(`Laporan kelas ${selectedClass?.name || 'Semua Kelas'} berhasil diunduh sebagai ${fileName}`);
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast.error("Gagal mengunduh laporan Excel");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClassChange = (e) => {
    const classId = e.target.value;
    const foundClass = classes.find((c) => c.id === classId);
    if (foundClass) {
      setSelectedClass(foundClass);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6">
      <div className="flex items-center mb-6">
        <Link href="/dashboard/reports" className="p-2 mr-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Rekap Per Kelas</h1>
      </div>
      
      {/* Date Range Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
            Tanggal Mulai
          </label>
          <input
            type="date"
            id="startDate"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
            Tanggal Akhir
          </label>
          <input
            type="date"
            id="endDate"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        
        <div className="flex items-end">
          <button
            onClick={handleFilterByDate}
            className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Terapkan Filter
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
        {/* Pie Chart */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <h3 className="text-base font-medium mb-3">Distribusi Kehadiran</h3>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendanceData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={(entry) => `${entry.name}: ${entry.value}%`}
                  >
                    {attendanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Hadir</h3>
            {loading ? (
              <div className="animate-pulse h-8 bg-gray-200 rounded w-16"></div>
            ) : (
              <p className="text-2xl font-bold text-blue-600">{attendanceData[0]?.value}%</p>
            )}
          </div>
          
          <div className="bg-yellow-50 rounded-xl p-4 border border-orange-200">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Sakit</h3>
            {loading ? (
              <div className="animate-pulse h-8 bg-gray-200 rounded w-16"></div>
            ) : (
              <p className="text-2xl font-bold text-orange-600">{attendanceData[1]?.value}%</p>
            )}
          </div>
          
          <div className="bg-yellow-50 rounded-xl p-4 border border-green-200">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Izin</h3>
            {loading ? (
              <div className="animate-pulse h-8 bg-gray-200 rounded w-16"></div>
            ) : (
              <p className="text-2xl font-bold text-green-600">{attendanceData[2]?.value}%</p>
            )}
          </div>
          
          <div className="bg-yellow-50 rounded-xl p-4 border border-red-200">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Alpha</h3>
            {loading ? (
              <div className="animate-pulse h-8 bg-gray-200 rounded w-16"></div>
            ) : (
              <p className="text-2xl font-bold text-red-600">{attendanceData[3]?.value}%</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-20 md:mb-6 mt-8">
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
