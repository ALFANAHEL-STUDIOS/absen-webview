"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { generateComprehensiveReport } from "@/lib/reportGenerator";
import { PlusCircle } from "lucide-react";
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
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  Download,
  FileSpreadsheet,
  Users,
  BookOpen,
  User,
  BarChart2,
  PieChart,
  TrendingUp
} from "lucide-react";
import { format, subMonths, addMonths } from "date-fns";
import { id } from "date-fns/locale";
import ReportGenerator from "@/components/ReportGenerator";

// Dummy attendance data
const attendanceData = [
  { name: "Hadir", value: 85, color: "#4C6FFF" },
  { name: "Sakit", value: 7, color: "#FF9800" },
  { name: "Izin", value: 5, color: "#8BC34A" },
  { name: "Alpha", value: 3, color: "#F44336" },
];

const dailyData = [
  { date: "01", hadir: 95, sakit: 3, izin: 1, alpha: 1 },
  { date: "02", hadir: 92, sakit: 4, izin: 2, alpha: 2 },
  { date: "03", hadir: 88, sakit: 6, izin: 3, alpha: 3 },
  { date: "04", hadir: 90, sakit: 5, izin: 3, alpha: 2 },
  { date: "05", hadir: 93, sakit: 3, izin: 2, alpha: 2 },
  { date: "06", hadir: 91, sakit: 4, izin: 3, alpha: 2 },
  { date: "07", hadir: 94, sakit: 2, izin: 3, alpha: 1 },
  { date: "08", hadir: 95, sakit: 3, izin: 1, alpha: 1 },
  { date: "09", hadir: 92, sakit: 4, izin: 2, alpha: 2 },
  { date: "10", hadir: 88, sakit: 6, izin: 3, alpha: 3 },
  { date: "11", hadir: 90, sakit: 5, izin: 3, alpha: 2 },
  { date: "12", hadir: 93, sakit: 3, izin: 2, alpha: 2 },
];

const weeklyData = [
  { week: "Minggu 1", hadir: 92, sakit: 4, izin: 2, alpha: 2 },
  { week: "Minggu 2", hadir: 90, sakit: 5, izin: 3, alpha: 2 },
  { week: "Minggu 3", hadir: 93, sakit: 3, izin: 2, alpha: 2 },
  { week: "Minggu 4", hadir: 95, sakit: 3, izin: 1, alpha: 1 },
];

export default function Reports() {
  const { schoolId, userRole, userData } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    sick: 0,
    permitted: 0,
    absent: 0
  });

  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!schoolId) return;
      
      try {
        setLoading(true);
        // Get current month in YYYY-MM format
        const currentYearMonth = format(currentDate, "yyyy-MM");
        const startDate = `${currentYearMonth}-01`;
        const endDate = `${currentYearMonth}-31`; // Using 31 to cover all possible days
        
        // Query attendance records for the current month
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        
        const attendanceRef = collection(db, `schools/${schoolId}/attendance`);
        const attendanceQuery = query(
          attendanceRef,
          where("date", ">=", startDate),
          where("date", "<=", endDate)
        );
        
        const snapshot = await getDocs(attendanceQuery);
        
        // Count by status
        let present = 0, sick = 0, permitted = 0, absent = 0;
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.status === "hadir" || data.status === "present") present++;
          else if (data.status === "sakit" || data.status === "sick") sick++;
          else if (data.status === "izin" || data.status === "permitted") permitted++;
          else if (data.status === "alpha" || data.status === "absent") absent++;
        });
        
        const total = present + sick + permitted + absent || 1; // Prevent division by zero
        
        setAttendanceStats({
          present: Math.round((present / total) * 100),
          sick: Math.round((sick / total) * 100),
          permitted: Math.round((permitted / total) * 100),
          absent: Math.round((absent / total) * 100)
        });
        
      } catch (error) {
        console.error("Error fetching attendance data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAttendanceData();
  }, [schoolId, currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  // Format current date for display
  const formattedMonth = format(currentDate, "MMMM yyyy", { locale: id });

  return (
    <div className="pb-20 md:pb-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Laporan Absensi Bulan : {formattedMonth}
        </h1>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-md border border-gray-300 hover:bg-gray-50"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-md border border-gray-300 hover:bg-gray-50"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
      <p className="text-gray-500 mb-6">Ringkasan Kehadiran Siswa dan Rekap Laporan</p>
      
      {/* Attendance Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-200 rounded-xl shadow-sm p-4 border border-blue-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-xs sm:text-sm md:text-base font-medium text-gray-500">Hadir</h3>
          </div>
          {loading ? (
            <div className="animate-pulse h-8 bg-gray-200 rounded w-16"></div>
          ) : (
            <p className="text-xl sm:text-2xl font-bold text-gray-800">{attendanceStats.present}%</p>
          )}
        </div>
        
        <div className="bg-gradient-to-br from-orange-50 to-orange-200 rounded-xl shadow-sm p-4 border border-orange-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-orange-100 p-2 rounded-lg">
              <Users className="h-5 w-5 text-orange-600" />
            </div>
            <h3 className="text-xs sm:text-sm md:text-base font-medium text-gray-500">Sakit</h3>
          </div>
          {loading ? (
            <div className="animate-pulse h-8 bg-gray-200 rounded w-16"></div>
          ) : (
            <p className="text-xl sm:text-2xl font-bold text-gray-800">{attendanceStats.sick}%</p>
          )}
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-200 rounded-xl shadow-sm p-4 border border-green-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-green-100 p-2 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="text-xs sm:text-sm md:text-base font-medium text-gray-500">Izin</h3>
          </div>
          {loading ? (
            <div className="animate-pulse h-8 bg-gray-200 rounded w-16"></div>
          ) : (
            <p className="text-xl sm:text-2xl font-bold text-gray-800">{attendanceStats.permitted}%</p>
          )}
        </div>
        
        <div className="bg-gradient-to-br from-red-50 to-red-200 rounded-xl shadow-sm p-4 border border-red-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-red-100 p-2 rounded-lg">
              <Users className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="text-xs sm:text-sm md:text-base font-medium text-gray-500">Alpha</h3>
          </div>
          {loading ? (
            <div className="animate-pulse h-8 bg-gray-200 rounded w-16"></div>
          ) : (
            <p className="text-xl sm:text-2xl font-bold text-gray-800">{attendanceStats.absent}%</p>
          )}
        </div>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-1 md:gap-6 mb-4 sm:mb-6 md:mb-8">
        {/* Attendance Distribution */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm p-6 border border-purple-100">
          <div className="flex items-center mb-4">
            <div className="bg-orange-100 p-2 rounded-lg mr-3">
              <PieChart className="h-6 w-6 text-orange-600" />
            </div>
            <h2 className="text-lg font-semibold">Distribusi Kehadiran</h2>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsInternalPieChart>
                <Pie
                  data={[
                    { name: "Hadir", value: attendanceStats.present, color: "#4C6FFF" },
                    { name: "Sakit", value: attendanceStats.sick, color: "#FF9800" },
                    { name: "Izin", value: attendanceStats.permitted, color: "#8BC34A" },
                    { name: "Alpha", value: attendanceStats.absent, color: "#F44336" }
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={(entry) => entry.name}
                >
                  {[
                    { name: "Hadir", value: attendanceStats.present, color: "#4C6FFF" },
                    { name: "Sakit", value: attendanceStats.sick, color: "#FF9800" },
                    { name: "Izin", value: attendanceStats.permitted, color: "#8BC34A" },
                    { name: "Alpha", value: attendanceStats.absent, color: "#F44336" }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </RechartsInternalPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Report Types Section - Role-specific */}
      <div className="mb-8">
        <h2 className="flex items-center text-xl font-semibold mb-6 text-gray-800 tracking-wide">
          <FileText className="mr-3 h-6 w-6 text-gray-800" />
          Jenis Laporan
        </h2>
        
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-4">
          {/* Monthly Report - All users */}
          <Link href="/dashboard/reports/monthly-attendance/" className="bg-red-50 rounded-xl shadow-sm p-5 hover:shadow-md transition-all border border-red-200 text-gray-800">
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-100 p-3 rounded-full mb-3">
                <Calendar className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="font-medium text-gray-800 mb-1">Rekap Bulanan</h3>
              <p className="text-sm text-gray-500">Laporan Siswa Perbulan</p>
            </div>
          </Link>
          
          
          {/* Group Report - Admin and Teacher only */}
          {(userRole === 'admin' || userRole === 'teacher') && (
            <Link href="/dashboard/reports/by-group" className="bg-green-50 rounded-xl shadow-sm p-5 hover:shadow-md transition-all border border-green-200 text-gray-800">
              <div className="flex flex-col items-center text-center">
                <div className="bg-green-100 p-3 rounded-full mb-3">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-medium text-gray-800 mb-1">Rekap Per Tanggal</h3>
                <p className="text-sm text-gray-500">Laporan Kehadiran Rombel</p>
              </div>
            </Link>
          )}
          
          {/* Student Report - Different behavior based on role */}
          {userRole === 'student' ? (
            // For students - direct link to their own report
            <Link href={`/dashboard/reports/by-student?id=${userData?.id || ''}`} className="bg-amber-50 rounded-xl shadow-sm p-5 hover:shadow-md transition-all border border-amber-200 text-gray-800">
              <div className="flex flex-col items-center text-center">
                <div className="bg-amber-100 p-3 rounded-full mb-3">
                  <User className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="font-medium text-gray-800 mb-1">Rekap Kehadiran Saya</h3>
                <p className="text-sm text-gray-500">Laporan Kehadiran Pribadi</p>
              </div>
            </Link>
          ) : (
            // For admin and teacher - link to student selection
            <Link href="/dashboard/reports/by-student" className="bg-amber-50 rounded-xl shadow-sm p-5 hover:shadow-md transition-all border border-amber-200 text-gray-800">
              <div className="flex flex-col items-center text-center">
                <div className="bg-amber-100 p-3 rounded-full mb-3">
                  <User className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="font-medium text-gray-800 mb-1">Rekap Per Siswa</h3>
                <p className="text-sm text-gray-500">Laporan Kehadiran Setiap Siswa</p>
              </div>
            </Link>
          )}
          
        </div>
      </div>
      
      {/* Download Section removed as requested */}
    </div>
  );
}
