"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Calendar, Download, FileSpreadsheet, FileText, Loader2, BarChart2, PieChart } from "lucide-react";
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
  PieChart as RechartsInternalPieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Sample data for comprehensive report - removed demo data
const monthlyTrendData: any[] = [];

const classSummaryData: any[] = [];

const attendanceDistribution = [
  { name: "Hadir", value: 0, color: "#4C6FFF" },
  { name: "Sakit", value: 0, color: "#FF9800" },
  { name: "Izin", value: 0, color: "#8BC34A" },
  { name: "Alpha", value: 0, color: "#F44336" },
];

export default function SummaryReport() {
  const { schoolId, userRole } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState({
    name: "Sekolah Dasar Negeri 1",
    address: "Jl. Pendidikan No. 123, Kota",
    npsn: "12345678",
    principalName: "Drs. Ahmad Sulaiman, M.Pd."
  });
  
  // Redirect if not admin
  useEffect(() => {
    if (userRole !== 'admin') {
      window.location.href = '/dashboard/reports';
    }
  }, [userRole]);
  
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
  
  const handleDownloadPDF = () => {
    setIsDownloading(true);
    
    setTimeout(() => {
      toast.success("Laporan komprehensif berhasil diunduh sebagai PDF");
      setIsDownloading(false);
    }, 1500);
  };
  
  const handleDownloadExcel = () => {
    setIsDownloading(true);
    
    setTimeout(() => {
      toast.success("Laporan komprehensif berhasil diunduh sebagai Excel");
      setIsDownloading(false);
    }, 1500);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6">
      <div className="flex items-center mb-6">
        <Link href="/dashboard/reports" className="p-2 mr-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Laporan Komprehensif</h1>
      </div>
      
      {/* School Info Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border-l-4 border-blue-500">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">{schoolInfo.name}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">NPSN</p>
            <p className="font-medium">{schoolInfo.npsn}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Kepala Sekolah</p>
            <p className="font-medium">{schoolInfo.principalName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Tahun Ajaran</p>
            <p className="font-medium">2024/2025</p>
          </div>
        </div>
      </div>
      
      {/* Overall Attendance Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center mb-4">
          <div className="bg-blue-100 p-2 rounded-lg mr-3">
            <PieChart className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold">Distribusi Kehadiran Keseluruhan</h2>
        </div>
        
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 md:gap-6">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsInternalPieChart>
                <Pie
                  data={attendanceDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={(entry) => `${entry.name}: ${entry.value}%`}
                >
                  {attendanceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </RechartsInternalPieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Hadir</h3>
              <p className="text-2xl font-bold text-blue-600">92%</p>
              <div className="text-xs text-blue-600 mt-1">Total: 4,600 siswa</div>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
              <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Sakit</h3>
              <p className="text-2xl font-bold text-orange-600">4%</p>
              <div className="text-xs text-orange-600 mt-1">Total: 200 siswa</div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Izin</h3>
              <p className="text-2xl font-bold text-green-600">3%</p>
              <div className="text-xs text-green-600 mt-1">Total: 150 siswa</div>
            </div>
            
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
              <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Alpha</h3>
              <p className="text-2xl font-bold text-red-600">1%</p>
              <div className="text-xs text-red-600 mt-1">Total: 50 siswa</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Monthly Trend */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center mb-4">
          <div className="bg-green-100 p-2 rounded-lg mr-3">
            <BarChart2 className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold">Tren Kehadiran Bulanan</h2>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={monthlyTrendData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="hadir" 
                stroke="#4C6FFF" 
                strokeWidth={2} 
                name="Hadir" 
              />
              <Line 
                type="monotone" 
                dataKey="sakit" 
                stroke="#FF9800" 
                strokeWidth={2} 
                name="Sakit" 
              />
              <Line 
                type="monotone" 
                dataKey="izin" 
                stroke="#8BC34A" 
                strokeWidth={2} 
                name="Izin" 
              />
              <Line 
                type="monotone" 
                dataKey="alpha" 
                stroke="#F44336" 
                strokeWidth={2} 
                name="Alpha" 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Class Comparison */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center mb-4">
          <div className="bg-purple-100 p-2 rounded-lg mr-3">
            <BarChart2 className="h-6 w-6 text-purple-600" />
          </div>
          <h2 className="text-lg font-semibold">Perbandingan Kehadiran Per Kelas</h2>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={classSummaryData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
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
      
      {/* Download Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-20 md:mb-6">
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
          <span className="font-medium">Download Laporan Komprehensif PDF</span>
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
          <span className="font-medium">Download Laporan Komprehensif Excel</span>
        </button>
      </div>
    </div>
  );
}
