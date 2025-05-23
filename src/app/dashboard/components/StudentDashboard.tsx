"use client";

import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Clock, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  User,
  BookOpen,
  BarChart2,
  Loader2
} from "lucide-react";
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
  LineChart,
  Line
} from "recharts";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface StudentDashboardProps {
  userData: any;
  schoolId: string | null;
}

export default function StudentDashboard({ userData, schoolId }: StudentDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    sick: 0,
    permitted: 0,
    absent: 0,
    total: 0
  });
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  
  // Get current date and time
  const currentDate = new Date();
  const formattedDate = new Intl.DateTimeFormat('id-ID', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }).format(currentDate);
  
  // Fetch student's attendance data
  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!schoolId || !userData?.id) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Get today's date in YYYY-MM-DD format
        const today = format(new Date(), "yyyy-MM-dd");
        const startOfMonth = format(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), "yyyy-MM-dd");
        
        // Fetch today's attendance
        const todayAttendanceRef = collection(db, `schools/${schoolId}/attendance`);
        const todayAttendanceQuery = query(
          todayAttendanceRef,
          where("studentId", "==", userData.id),
          where("date", "==", today)
        );
        
        const todayAttendanceSnapshot = await getDocs(todayAttendanceQuery);
        if (!todayAttendanceSnapshot.empty) {
          setTodayAttendance(todayAttendanceSnapshot.docs[0].data());
        }
        
        // Fetch attendance history
        const historyRef = collection(db, `schools/${schoolId}/attendance`);
        const historyQuery = query(
          historyRef,
          where("studentId", "==", userData.id),
          orderBy("date", "desc"),
          limit(10)
        );
        
        const historySnapshot = await getDocs(historyQuery);
        const historyData: any[] = [];
        
        historySnapshot.forEach(doc => {
          const data = doc.data();
          historyData.push({
            id: doc.id,
            date: data.date,
            status: data.status,
            time: data.time
          });
        });
        
        setAttendanceHistory(historyData);
        
        // Calculate monthly statistics
        const monthlyRef = collection(db, `schools/${schoolId}/attendance`);
        const monthlyQuery = query(
          monthlyRef,
          where("studentId", "==", userData.id),
          where("date", ">=", startOfMonth),
          where("date", "<=", today)
        );
        
        const monthlySnapshot = await getDocs(monthlyQuery);
        
        let present = 0;
        let sick = 0;
        let permitted = 0;
        let absent = 0;
        
        monthlySnapshot.forEach(doc => {
          const data = doc.data();
          if (data.status === "present" || data.status === "hadir") present++;
          else if (data.status === "sick" || data.status === "sakit") sick++;
          else if (data.status === "permitted" || data.status === "izin") permitted++;
          else if (data.status === "absent" || data.status === "alpha") absent++;
        });
        
        const total = present + sick + permitted + absent;
        
        setAttendanceStats({
          present,
          sick,
          permitted,
          absent,
          total
        });
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching attendance data:", error);
        setLoading(false);
      }
    };
    
    fetchAttendanceData();
  }, [schoolId, userData, currentDate]);
  
  // Format date for display
  const formatDisplayDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "d MMMM yyyy", { locale: id });
    } catch (error) {
      return dateString;
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }
  
  return (
    <div>
      {/* Today's attendance status */}
      <div className={`${todayAttendance ? 'bg-green-500' : 'bg-gray-500'} rounded-xl shadow-sm p-6 mb-6 text-white`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-white mr-2" />
              <h2 className="text-lg font-semibold text-white">Status Kehadiran Hari Ini</h2>
            </div>
            <p className="text-white mt-1">{formattedDate}</p>
          </div>
          
          {todayAttendance ? (
            <div className="mt-4 md:mt-0 flex items-center bg-green-400 bg-opacity-30 px-4 py-2 rounded-lg">
              <CheckCircle className="h-5 w-5 text-white mr-2" />
              <span className="font-medium text-white">
                {todayAttendance.status === 'hadir' || todayAttendance.status === 'present' ? 'Hadir' : 
                 todayAttendance.status === 'sakit' || todayAttendance.status === 'sick' ? 'Sakit' : 
                 todayAttendance.status === 'izin' || todayAttendance.status === 'permitted' ? 'Izin' : 'Alpha'}
              </span>
              <span className="text-white ml-2 text-sm">{todayAttendance.time} WIB</span>
            </div>
          ) : (
            <div className="mt-4 md:mt-0 flex items-center bg-gray-400 bg-opacity-30 px-4 py-2 rounded-lg">
              <XCircle className="h-5 w-5 text-white mr-2" />
              <span className="font-medium text-white">Belum Absen</span>
            </div>
          )}
        </div>
      </div>

      {/* Attendance stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-6">
        <div className="bg-blue-500 rounded-xl shadow-sm p-3 sm:p-4 text-white">
          <h3 className="text-xs font-medium text-white mb-1">Total Kehadiran</h3>
          <p className="text-lg sm:text-xl font-bold text-white">
            {attendanceStats.total > 0 ? 
              Math.round((attendanceStats.present / attendanceStats.total) * 100) : 0}%
          </p>
          <div className="flex items-center mt-1 text-xs text-white">
            <CheckCircle size={12} className="mr-1" />
            <span>{attendanceStats.present}/{attendanceStats.total} hari</span>
          </div>
        </div>
        
        <div className="bg-amber-500 rounded-xl shadow-sm p-3 sm:p-4 text-white">
          <h3 className="text-xs font-medium text-white mb-1">Izin</h3>
          <p className="text-lg sm:text-xl font-bold text-white">
            {attendanceStats.total > 0 ? 
              Math.round((attendanceStats.permitted / attendanceStats.total) * 100) : 0}%
          </p>
          <div className="flex items-center mt-1 text-xs text-white">
            <AlertCircle size={12} className="mr-1" />
            <span>{attendanceStats.permitted}/{attendanceStats.total} hari</span>
          </div>
        </div>
        
        <div className="bg-teal-500 rounded-xl shadow-sm p-3 sm:p-4 text-white">
          <h3 className="text-xs font-medium text-white mb-1">Sakit</h3>
          <p className="text-lg sm:text-xl font-bold text-white">
            {attendanceStats.total > 0 ? 
              Math.round((attendanceStats.sick / attendanceStats.total) * 100) : 0}%
          </p>
          <div className="flex items-center mt-1 text-xs text-white">
            <AlertCircle size={12} className="mr-1" />
            <span>{attendanceStats.sick}/{attendanceStats.total} hari</span>
          </div>
        </div>
        
        <div className="bg-red-500 rounded-xl shadow-sm p-3 sm:p-4 text-white">
          <h3 className="text-xs font-medium text-white mb-1">Alpha</h3>
          <p className="text-lg sm:text-xl font-bold text-white">
            {attendanceStats.total > 0 ? 
              Math.round((attendanceStats.absent / attendanceStats.total) * 100) : 0}%
          </p>
          <div className="flex items-center mt-1 text-xs text-white">
            <CheckCircle size={12} className="mr-1" />
            <span>{attendanceStats.absent}/{attendanceStats.total} hari</span>
          </div>
        </div>
      </div>

      {/* Recent attendance history */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center mb-4">
          <div className="bg-green-100 p-2 rounded-lg mr-3">
            <Clock className="h-5 w-5 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold">Riwayat Kehadiran Terbaru</h2>
        </div>
        
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal
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
              {attendanceHistory.length > 0 ? (
                attendanceHistory.map((record) => (
                  <tr key={record.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">{formatDisplayDate(record.date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${record.status === 'hadir' || record.status === 'present' ? 'bg-green-100 text-green-800' : ''}
                        ${record.status === 'sakit' || record.status === 'sick' ? 'bg-orange-100 text-orange-800' : ''}
                        ${record.status === 'izin' || record.status === 'permitted' ? 'bg-blue-100 text-blue-800' : ''}
                        ${record.status === 'alpha' || record.status === 'absent' ? 'bg-red-100 text-red-800' : ''}
                      `}>
                        {record.status === 'hadir' || record.status === 'present' ? 'Hadir' : ''}
                        {record.status === 'sakit' || record.status === 'sick' ? 'Sakit' : ''}
                        {record.status === 'izin' || record.status === 'permitted' ? 'Izin' : ''}
                        {record.status === 'alpha' || record.status === 'absent' ? 'Alpha' : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {record.time}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                    Belum ada riwayat kehadiran
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Quick Access */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Akses Cepat</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <Link href="/dashboard/reports" className="bg-blue-500 rounded-xl shadow-sm p-5 hover:shadow-md transition-all text-white">
            <div className="flex flex-col items-center justify-center">
              <div className="bg-blue-400 bg-opacity-30 p-3 rounded-full mb-3">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-medium text-white text-center">Laporan Kehadiran</h3>
            </div>
          </Link>
          
          <Link href="/dashboard/profile-user" className="bg-purple-500 rounded-xl shadow-sm p-5 hover:shadow-md transition-all text-white">
            <div className="flex flex-col items-center justify-center">
              <div className="bg-purple-400 bg-opacity-30 p-3 rounded-full mb-3">
                <User className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-medium text-white text-center">Profil Saya</h3>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
