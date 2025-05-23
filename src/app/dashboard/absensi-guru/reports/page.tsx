"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { FileText, Calendar, Download, FileSpreadsheet, ArrowLeft, Loader2, Filter, Search, User, ChevronDown } from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { format, subDays } from "date-fns";
import { id } from "date-fns/locale";
import { motion } from "framer-motion";
import { jsPDF } from "jspdf";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
export default function TeacherAttendanceReports() {
  const {
    user,
    userRole,
    schoolId
  } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd")
  });
  const [filters, setFilters] = useState({
    teacherId: "all",
    type: "all",
    status: "all",
    searchQuery: ""
  });

  // Load data
  useEffect(() => {
    // Check authorization
    if (userRole !== 'admin') {
      toast.error("Anda tidak memiliki akses ke halaman ini");
      router.push('/dashboard');
      return;
    }
    const loadData = async () => {
      if (!schoolId) return;
      try {
        setLoading(true);

        // Load teachers
        const teachersRef = collection(db, "users");
        const teachersQuery = query(teachersRef, where("schoolId", "==", schoolId), where("role", "in", ["teacher", "staff"]));
        const teachersSnapshot = await getDocs(teachersQuery);
        const teachersList: any[] = [];
        teachersSnapshot.forEach(doc => {
          const data = doc.data();
          teachersList.push({
            id: doc.id,
            name: data.name || "",
            role: data.role || "teacher"
          });
        });
        setTeachers(teachersList);

        // Load attendance data
        await fetchAttendanceData();
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Gagal memuat data");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [schoolId, userRole, router]);

  // Fetch attendance data based on date range
  const fetchAttendanceData = async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const attendanceRef = collection(db, "teacherAttendance");
      const attendanceQuery = query(attendanceRef, where("schoolId", "==", schoolId), where("date", ">=", dateRange.start), where("date", "<=", dateRange.end), orderBy("date", "desc"), orderBy("time", "desc"));
      const snapshot = await getDocs(attendanceQuery);
      const attendanceList: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        attendanceList.push({
          id: doc.id,
          ...data,
          // Convert Firestore timestamp to JS Date if needed
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date()
        });
      });
      setAttendanceData(attendanceList);
      setFilteredData(attendanceList);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      toast.error("Gagal mengambil data kehadiran");
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...attendanceData];

    // Apply teacher filter
    if (filters.teacherId !== "all") {
      filtered = filtered.filter(item => item.teacherId === filters.teacherId);
    }

    // Apply type filter (in/out)
    if (filters.type !== "all") {
      filtered = filtered.filter(item => item.type === filters.type);
    }

    // Apply status filter
    if (filters.status !== "all") {
      filtered = filtered.filter(item => item.status === filters.status);
    }

    // Apply search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(item => item.teacherName.toLowerCase().includes(query) || item.date.includes(query) || item.time.includes(query));
    }
    setFilteredData(filtered);
  }, [attendanceData, filters]);

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {
      name,
      value
    } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Apply date filter
  const applyDateFilter = () => {
    fetchAttendanceData();
  };

  // Handle filter changes
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const {
      name,
      value
    } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Export to PDF
  const exportToPDF = async () => {
    try {
      setExporting(true);
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;

      // Add title
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("LAPORAN ABSENSI GURU & TENAGA KEPENDIDIKAN", pageWidth / 2, margin, {
        align: "center"
      });

      // Add date range
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      const startDate = format(new Date(dateRange.start), "d MMMM yyyy", {
        locale: id
      });
      const endDate = format(new Date(dateRange.end), "d MMMM yyyy", {
        locale: id
      });
      doc.text(`Periode: ${startDate} - ${endDate}`, pageWidth / 2, margin + 8, {
        align: "center"
      });

      // Add current date
      const currentDate = format(new Date(), "d MMMM yyyy", {
        locale: id
      });
      doc.text(`Dicetak pada: ${currentDate}`, pageWidth - margin, margin, {
        align: "right"
      });

      // Add table headers
      const headers = ["No", "Nama", "Tanggal", "Waktu", "Jenis", "Status"];
      const colWidths = [15, 60, 35, 30, 30, 30];
      let yPos = margin + 20;

      // Draw header row with light blue background
      doc.setFillColor(200, 220, 240);
      doc.rect(margin, yPos, pageWidth - margin * 2, 10, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      let xPos = margin;
      headers.forEach((header, i) => {
        doc.text(header, xPos + colWidths[i] / 2, yPos + 6, {
          align: "center"
        });
        xPos += colWidths[i];
      });
      yPos += 10;

      // Draw table rows
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      filteredData.forEach((record, index) => {
        // Add new page if needed
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = margin;

          // Draw header on new page
          doc.setFillColor(200, 220, 240);
          doc.rect(margin, yPos, pageWidth - margin * 2, 10, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          xPos = margin;
          headers.forEach((header, i) => {
            doc.text(header, xPos + colWidths[i] / 2, yPos + 6, {
              align: "center"
            });
            xPos += colWidths[i];
          });
          yPos += 10;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
        }

        // Alternate row colors
        if (index % 2 === 0) {
          doc.setFillColor(240, 240, 240);
          doc.rect(margin, yPos, pageWidth - margin * 2, 8, "F");
        }

        // Draw row content
        xPos = margin;

        // No
        doc.text((index + 1).toString(), xPos + colWidths[0] / 2, yPos + 5, {
          align: "center"
        });
        xPos += colWidths[0];

        // Name
        doc.text(record.teacherName, xPos + 5, yPos + 5, {
          align: "left"
        });
        xPos += colWidths[1];

        // Date
        const formattedDate = format(new Date(record.date), "d MMM yyyy", {
          locale: id
        });
        doc.text(formattedDate, xPos + colWidths[2] / 2, yPos + 5, {
          align: "center"
        });
        xPos += colWidths[2];

        // Time
        doc.text(record.time, xPos + colWidths[3] / 2, yPos + 5, {
          align: "center"
        });
        xPos += colWidths[3];

        // Type
        const typeText = record.type === "in" ? "Masuk" : "Pulang";
        doc.text(typeText, xPos + colWidths[4] / 2, yPos + 5, {
          align: "center"
        });
        xPos += colWidths[4];

        // Status
        const statusText = record.status === "present" ? "Hadir" : record.status === "late" ? "Terlambat" : "Tidak Hadir";
        doc.text(statusText, xPos + colWidths[5] / 2, yPos + 5, {
          align: "center"
        });
        yPos += 8;
      });

      // Save the PDF
      const fileName = `Laporan_Absensi_Guru_${format(new Date(), "yyyyMMdd")}.pdf`;
      doc.save(fileName);
      toast.success("Laporan PDF berhasil diunduh");
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      toast.error("Gagal mengunduh laporan PDF");
    } finally {
      setExporting(false);
    }
  };

  // Export to Excel
  const exportToExcel = async () => {
    try {
      setExporting(true);

      // Dynamic import XLSX library
      const XLSX = await import('xlsx');

      // Prepare data
      const excelData = [["LAPORAN ABSENSI GURU & TENAGA KEPENDIDIKAN"], [`Periode: ${format(new Date(dateRange.start), "d MMMM yyyy", {
        locale: id
      })} - ${format(new Date(dateRange.end), "d MMMM yyyy", {
        locale: id
      })}`], [], ["No", "Nama", "Tanggal", "Waktu", "Jenis", "Status", "NIK"]];

      // Add data rows
      filteredData.forEach((record, index) => {
        const formattedDate = format(new Date(record.date), "d MMM yyyy", {
          locale: id
        });
        const typeText = record.type === "in" ? "Masuk" : "Pulang";
        const statusText = record.status === "present" ? "Hadir" : record.status === "late" ? "Terlambat" : "Tidak Hadir";
        excelData.push([index + 1, record.teacherName, formattedDate, record.time, typeText, statusText, record.teacherNik || "-"]);
      });

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(excelData);

      // Set column widths
      ws['!cols'] = [{
        wch: 5
      },
      // No
      {
        wch: 30
      },
      // Nama
      {
        wch: 15
      },
      // Tanggal
      {
        wch: 10
      },
      // Waktu
      {
        wch: 10
      },
      // Jenis
      {
        wch: 15
      },
      // Status
      {
        wch: 20
      } // NIK
      ];

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Absensi Guru");

      // Save file
      const fileName = `Laporan_Absensi_Guru_${format(new Date(), "yyyyMMdd")}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success("Laporan Excel berhasil diunduh");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("Gagal mengunduh laporan Excel");
    } finally {
      setExporting(false);
    }
  };

  // Function to format date for display
  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "d MMMM yyyy", {
      locale: id
    });
  };
  return <div className="pb-20 md:pb-6" data-unique-id="e74d58fa-0cd1-46b3-bf3e-457349c4df7a" data-file-name="app/dashboard/absensi-guru/reports/page.tsx" data-dynamic-text="true">
      <div className="flex items-center mb-6" data-unique-id="6d3111d3-0f06-4e6e-bc4d-1238bc4bd1b3" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
        <div className="flex items-center" data-unique-id="1e2c73da-b6b5-47ae-8166-b6a0b0d1e894" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
          <Link href="/dashboard/absensi-guru" className="p-2 mr-2 hover:bg-gray-100 rounded-full" data-unique-id="59a4b174-ce57-4bff-9ce3-9e3b733bde60" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-800" data-unique-id="e1050595-a499-4a64-a01a-4dce280654c4" data-file-name="app/dashboard/absensi-guru/reports/page.tsx"><span className="editable-text" data-unique-id="f536d5b1-68a3-4884-ba10-b570dbde524c" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">Laporan Absensi Guru</span></h1>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-6" data-unique-id="e0bf7360-3222-4839-b3f8-d04a09d40f11" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
        <h2 className="text-base font-semibold mb-4" data-unique-id="c1d183f5-6a6a-4d04-8234-aac3e04cc60b" data-file-name="app/dashboard/absensi-guru/reports/page.tsx"><span className="editable-text" data-unique-id="22a4ba78-e9d2-4c14-8b57-591dfd0fbb90" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">Filter Laporan</span></h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4" data-unique-id="c64ce97d-bf85-4226-b632-72635109138e" data-file-name="app/dashboard/absensi-guru/reports/page.tsx" data-dynamic-text="true">
          {/* Date range */}
          <div data-unique-id="e719c290-1bd8-448a-8ef6-6165ae5410a6" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
            <label htmlFor="start" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="5b2d637a-75b3-4f52-8982-054f415bd12b" data-file-name="app/dashboard/absensi-guru/reports/page.tsx"><span className="editable-text" data-unique-id="4c95a344-6a7e-421a-a20b-95a6f0242fad" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
              Tanggal Mulai
            </span></label>
            <input type="date" id="start" name="start" value={dateRange.start} onChange={handleDateChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" data-unique-id="55bec4e3-524a-4ee0-9849-24f60a2286f6" data-file-name="app/dashboard/absensi-guru/reports/page.tsx" />
          </div>
          
          <div data-unique-id="34c071a8-548c-4043-a863-cd4ef93bb5a8" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
            <label htmlFor="end" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="fceb23dd-db0d-4492-8bb0-036e7bdddfdf" data-file-name="app/dashboard/absensi-guru/reports/page.tsx"><span className="editable-text" data-unique-id="4eac1463-5eed-4f52-9b81-9949badc7a97" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
              Tanggal Akhir
            </span></label>
            <input type="date" id="end" name="end" value={dateRange.end} onChange={handleDateChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" data-unique-id="9b0421df-9652-4757-995a-eacf9c092b4d" data-file-name="app/dashboard/absensi-guru/reports/page.tsx" />
          </div>
          
          {/* Teacher filter */}
          <div data-unique-id="908bf6ca-d581-4320-ae95-6a55cae08420" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
            <label htmlFor="teacherId" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="86f10bff-d680-4ba4-afbf-a4764f513e69" data-file-name="app/dashboard/absensi-guru/reports/page.tsx"><span className="editable-text" data-unique-id="6aecae03-bb40-4cdb-b9f5-8b19430ca956" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
              Guru / Tendik
            </span></label>
            <div className="relative" data-unique-id="7ed45868-80ee-4afe-a35a-9a83ad40bc59" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select id="teacherId" name="teacherId" value={filters.teacherId} onChange={handleFilterChange} className="w-full pl-9 px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary appearance-none bg-white" data-unique-id="c47c9f94-ef1c-43d6-909b-607893e33624" data-file-name="app/dashboard/absensi-guru/reports/page.tsx" data-dynamic-text="true">
                <option value="all" data-unique-id="bbf3fec3-bebc-4a45-a13f-381771a37658" data-file-name="app/dashboard/absensi-guru/reports/page.tsx"><span className="editable-text" data-unique-id="476d8fd6-993e-4f6a-8adb-e759e07f1755" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">Semua</span></option>
                {teachers.map(teacher => <option key={teacher.id} value={teacher.id} data-is-mapped="true" data-unique-id="bff32cd0-8235-4dff-80f6-042e4bcc411b" data-file-name="app/dashboard/absensi-guru/reports/page.tsx" data-dynamic-text="true">
                    {teacher.name}
                  </option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            </div>
          </div>
          
          {/* Type filter */}
          <div data-unique-id="d1b7d649-85ff-4c54-9b51-f036fdb444da" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="878e8fe5-0af6-4f7b-95ec-1d929b61951a" data-file-name="app/dashboard/absensi-guru/reports/page.tsx"><span className="editable-text" data-unique-id="84475c9b-d6db-4be4-a5b6-4203d5e08191" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
              Jenis Absensi
            </span></label>
            <div className="relative" data-unique-id="48e1310e-c4cd-4815-b813-03dbdfb0eb67" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select id="type" name="type" value={filters.type} onChange={handleFilterChange} className="w-full pl-9 px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary appearance-none bg-white" data-unique-id="76ef6e7e-8a9d-402e-b8a6-c9802d52a0a0" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
                <option value="all" data-unique-id="7802d748-cd13-48e9-958c-61e3cffb90ed" data-file-name="app/dashboard/absensi-guru/reports/page.tsx"><span className="editable-text" data-unique-id="fe8671ff-cb1b-4a00-a1a2-88345e4a8762" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">Semua</span></option>
                <option value="in" data-unique-id="6ae3a82f-ae3a-4e12-9143-477c9b752009" data-file-name="app/dashboard/absensi-guru/reports/page.tsx"><span className="editable-text" data-unique-id="ce5b2fb9-95b8-4b2f-94d2-4c7cb04aeed4" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">Masuk</span></option>
                <option value="out" data-unique-id="1061fca9-5b7e-4a20-8453-69d3e4a1b91c" data-file-name="app/dashboard/absensi-guru/reports/page.tsx"><span className="editable-text" data-unique-id="adde7d00-a221-4db8-847d-1a163dfdcc12" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">Pulang</span></option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4" data-unique-id="207287b9-66da-423f-81d7-a08b27c750f3" data-file-name="app/dashboard/absensi-guru/reports/page.tsx" data-dynamic-text="true">
          {/* Status filter */}
          <div data-unique-id="9b17a06f-1443-421a-b0b6-99bc5d510cb9" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="4f2f4669-c7fe-4383-bd8c-8111a0fb1588" data-file-name="app/dashboard/absensi-guru/reports/page.tsx"><span className="editable-text" data-unique-id="ec277810-5d7b-42aa-8d81-cd9e20e9ce26" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
              Status
            </span></label>
            <div className="relative" data-unique-id="080b27f1-62ee-42b5-8076-a242d89b3178" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select id="status" name="status" value={filters.status} onChange={handleFilterChange} className="w-full pl-9 px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary appearance-none bg-white" data-unique-id="685bc902-3e84-4249-b279-af856ec6cfe8" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
                <option value="all" data-unique-id="258c40f3-e908-49b9-85fb-c19b7d458cef" data-file-name="app/dashboard/absensi-guru/reports/page.tsx"><span className="editable-text" data-unique-id="e0e27adb-a516-4c7c-bbc1-e4c8c4594fd8" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">Semua</span></option>
                <option value="present" data-unique-id="4a234fab-cb37-453b-8e2c-72c88f7c46a9" data-file-name="app/dashboard/absensi-guru/reports/page.tsx"><span className="editable-text" data-unique-id="5ff35fd1-628e-40e4-b896-88e7ae2e2a2b" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">Hadir</span></option>
                <option value="late" data-unique-id="a5a7b4e8-3f0c-43b1-912f-7cc779e39559" data-file-name="app/dashboard/absensi-guru/reports/page.tsx"><span className="editable-text" data-unique-id="621bc04b-83c2-4cc8-a39f-c045f5cf4e43" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">Terlambat</span></option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            </div>
          </div>
          
          {/* Search */}
          <div className="md:col-span-2" data-unique-id="6615fe34-7938-4039-9e62-36db79f346bb" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
            <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="c8bf6c78-484e-4ac3-a316-83b9dbda56ac" data-file-name="app/dashboard/absensi-guru/reports/page.tsx"><span className="editable-text" data-unique-id="00809d4a-6688-475f-ac93-33aaaa72be5c" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
              Cari
            </span></label>
            <div className="relative" data-unique-id="e967250b-e0d1-4c96-8a34-bfe7f66f2472" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" id="searchQuery" name="searchQuery" value={filters.searchQuery} onChange={handleFilterChange} placeholder="Cari nama, tanggal..." className="w-full pl-9 px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" data-unique-id="b41c7fc2-f65c-46ca-a667-2e5bc2db7cc3" data-file-name="app/dashboard/absensi-guru/reports/page.tsx" />
            </div>
          </div>
          
          {/* Apply date filter button */}
          <div className="flex items-end" data-unique-id="dc004d11-e4cc-4ad3-a1a7-9d581e089192" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
            <button onClick={applyDateFilter} className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2" data-unique-id="4f24cd2f-ddfa-43a3-8160-f6cf00c28771" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
              <Calendar size={16} data-unique-id="09d6fdf5-5f89-404f-b8ec-d03f13ebdcc8" data-file-name="app/dashboard/absensi-guru/reports/page.tsx" /><span className="editable-text" data-unique-id="319abcdf-3a29-43b2-b49b-43673e35f289" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
              Terapkan Tanggal
            </span></button>
          </div>
        </div>
      </div>
      
      {/* Attendance Data */}
      {loading ? <div className="flex justify-center items-center h-64" data-unique-id="d1fa5ea7-7697-417c-a2c1-defe52e49032" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
        </div> : filteredData.length > 0 ? <div className="bg-white rounded-xl shadow-sm overflow-hidden" data-unique-id="96868eb2-4084-416b-bfb2-e68394160068" data-file-name="app/dashboard/absensi-guru/reports/page.tsx" data-dynamic-text="true">
          <div className="p-5 border-b border-gray-200 flex justify-between items-center" data-unique-id="11c39dd5-cb7e-4704-b34b-d9f1a2e6a2fd" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
            <h2 className="text-lg font-semibold" data-unique-id="065ecd97-79bd-4e11-9f1a-56f4834ef3c9" data-file-name="app/dashboard/absensi-guru/reports/page.tsx"><span className="editable-text" data-unique-id="3a9a18ef-0a40-4a15-8e93-ade13890be20" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">Data Absensi</span></h2>
            <p className="text-sm text-gray-500" data-unique-id="8a2496ad-4193-4be2-af33-da5d6c6297e1" data-file-name="app/dashboard/absensi-guru/reports/page.tsx" data-dynamic-text="true"><span className="editable-text" data-unique-id="d212dc98-a9dd-4dcd-ab57-d27fbf6c62e8" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">Total: </span>{filteredData.length}<span className="editable-text" data-unique-id="3d9fa513-9905-492d-b7de-023d2f82ccb5" data-file-name="app/dashboard/absensi-guru/reports/page.tsx"> data</span></p>
          </div>
          
          <div className="overflow-x-auto" data-unique-id="3475220c-fd0b-4c7b-a4af-1ff3dcae9387" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
            <table className="min-w-full divide-y divide-gray-200" data-unique-id="183753fc-236d-4ccf-83d5-c31c536d2520" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
              <thead className="bg-gray-50" data-unique-id="8c389eff-2b4d-4268-860c-357092bef083" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
                <tr data-unique-id="b097375f-1821-4079-ba56-a4d202489c04" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-unique-id="d7cac579-66b5-4e3f-a8df-ae67390542fe" data-file-name="app/dashboard/absensi-guru/reports/page.tsx"><span className="editable-text" data-unique-id="5d325266-c3b4-43e7-8011-8c1c7dcfe3de" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
                    Nama
                  </span></th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-unique-id="1ce60142-5de0-448a-bb11-5f5d39eaa1b3" data-file-name="app/dashboard/absensi-guru/reports/page.tsx"><span className="editable-text" data-unique-id="25b06c0e-09f6-431b-b8fe-1548e7273d4c" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
                    NIK
                  </span></th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-unique-id="b9634a81-da8e-48f1-ad43-2c3ff74cf89a" data-file-name="app/dashboard/absensi-guru/reports/page.tsx"><span className="editable-text" data-unique-id="6836680f-ece7-4dfb-af00-721521233a90" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
                    Tanggal
                  </span></th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-unique-id="dd357562-d87f-4be7-9461-105a4464da96" data-file-name="app/dashboard/absensi-guru/reports/page.tsx"><span className="editable-text" data-unique-id="06bc3842-1e13-4eac-965b-1a2295476c30" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
                    Waktu
                  </span></th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-unique-id="60001338-2ee6-4996-8d5b-8d92598d1b19" data-file-name="app/dashboard/absensi-guru/reports/page.tsx"><span className="editable-text" data-unique-id="fbbd9fce-bb09-48e2-8f84-57039a73e94b" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
                    Jenis
                  </span></th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-unique-id="d03aa0a0-6f44-43e6-aea8-dff05a21fe75" data-file-name="app/dashboard/absensi-guru/reports/page.tsx"><span className="editable-text" data-unique-id="79d20eff-c005-4d22-a574-f1306b550362" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
                    Status
                  </span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200" data-unique-id="4ea993bf-d57e-4c46-8498-f9bae074810a" data-file-name="app/dashboard/absensi-guru/reports/page.tsx" data-dynamic-text="true">
                {filteredData.map(record => <tr key={record.id} className="hover:bg-gray-50" data-is-mapped="true" data-unique-id="8fff8923-2bdb-41cb-a810-19e35f50c8f1" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
                    <td className="px-6 py-4 whitespace-nowrap" data-is-mapped="true" data-unique-id="26adac37-ed53-43c5-a9ca-dda8a06a3232" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
                      <div className="font-medium text-gray-900" data-is-mapped="true" data-unique-id="dd49d7f8-0720-4ae7-bbd1-a9b5a71719ee" data-file-name="app/dashboard/absensi-guru/reports/page.tsx" data-dynamic-text="true">{record.teacherName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-is-mapped="true" data-unique-id="8e9231b1-d775-4bd8-85a8-292f30b59883" data-file-name="app/dashboard/absensi-guru/reports/page.tsx" data-dynamic-text="true">
                      {record.teacherNik || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-is-mapped="true" data-unique-id="d1ffe3da-207c-4769-ad02-5f56e5ee62c9" data-file-name="app/dashboard/absensi-guru/reports/page.tsx" data-dynamic-text="true">
                      {formatDate(record.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-is-mapped="true" data-unique-id="a1e627e2-0d66-4b4c-8a26-ecf2855343a7" data-file-name="app/dashboard/absensi-guru/reports/page.tsx" data-dynamic-text="true">
                      {record.time}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" data-is-mapped="true" data-unique-id="04b8e78c-bc55-418c-a11c-2c444542d812" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${record.type === "in" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}`} data-is-mapped="true" data-unique-id="b304eb07-738d-49d2-8349-66e185c15ec2" data-file-name="app/dashboard/absensi-guru/reports/page.tsx" data-dynamic-text="true">
                        {record.type === "in" ? "Masuk" : "Pulang"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" data-is-mapped="true" data-unique-id="54609deb-40ac-4447-8e65-8ce227d12268" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${record.status === "present" ? "bg-green-100 text-green-800" : record.status === "late" ? "bg-orange-100 text-orange-800" : "bg-red-100 text-red-800"}`} data-is-mapped="true" data-unique-id="8e2fc6ad-b668-4666-a355-f7d9871171a1" data-file-name="app/dashboard/absensi-guru/reports/page.tsx" data-dynamic-text="true">
                        {record.status === "present" ? "Hadir" : record.status === "late" ? "Terlambat" : "Tidak Hadir"}
                      </span>
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
          
          {/* Download buttons - Moved below table */}
          <div className="flex flex-col w-full gap-4 mt-6 p-4 border-t border-gray-200" data-unique-id="d02f5d19-8fb1-4765-a4db-167162231f67" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
            <button onClick={exportToPDF} disabled={exporting || filteredData.length === 0} className="w-full flex items-center justify-center gap-3 bg-red-600 text-white p-4 rounded-xl hover:bg-red-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors" data-unique-id="413ad4fc-0ab9-4e35-b66f-770355ae2fa7" data-file-name="app/dashboard/absensi-guru/reports/page.tsx" data-dynamic-text="true">
              {exporting ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileText className="h-6 w-6" />}
              <span className="font-medium" data-unique-id="1f34561e-3f0d-4d84-822c-4d582055366d" data-file-name="app/dashboard/absensi-guru/reports/page.tsx"><span className="editable-text" data-unique-id="b19ca0f3-042a-422a-b8da-23dff00c6209" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">Download Laporan PDF</span></span>
            </button>
            
            <button onClick={exportToExcel} disabled={exporting || filteredData.length === 0} className="w-full flex items-center justify-center gap-3 bg-green-600 text-white p-4 rounded-xl hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors" data-unique-id="2f9c7076-1e3c-48c1-b2a5-27820226cf34" data-file-name="app/dashboard/absensi-guru/reports/page.tsx" data-dynamic-text="true">
              {exporting ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileSpreadsheet className="h-6 w-6" />}
              <span className="font-medium" data-unique-id="036fb80d-e943-4817-ab07-251f7764420d" data-file-name="app/dashboard/absensi-guru/reports/page.tsx"><span className="editable-text" data-unique-id="4d2b9248-c677-4f7f-9fab-44dc60d6b945" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">Download Laporan Excel</span></span>
            </button>
          </div>
        </div> : <div className="bg-white rounded-xl shadow-sm p-10 text-center" data-unique-id="fa25594f-5148-49d1-b79c-1b4173fc9751" data-file-name="app/dashboard/absensi-guru/reports/page.tsx" data-dynamic-text="true">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2" data-unique-id="a98c4e78-8bc4-4dbc-bdae-3a52a67e3650" data-file-name="app/dashboard/absensi-guru/reports/page.tsx"><span className="editable-text" data-unique-id="4f289092-01c5-4e96-ad70-640c953ddec8" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">Tidak Ada Data</span></h2>
          <p className="text-gray-500 mb-8" data-unique-id="c93856ad-2cce-4e56-9c5b-9880a5254338" data-file-name="app/dashboard/absensi-guru/reports/page.tsx" data-dynamic-text="true">
            {dateRange.start !== format(subDays(new Date(), 30), "yyyy-MM-dd") || dateRange.end !== format(new Date(), "yyyy-MM-dd") || Object.values(filters).some(value => value !== "all") ? "Tidak ada data yang sesuai dengan filter yang dipilih" : "Belum ada data absensi guru yang tersedia"}
          </p>
          
          {/* Download buttons - Also shown when no data, but disabled */}
          <div className="flex flex-col w-full gap-4 mt-6 border-t border-gray-200 pt-6" data-unique-id="4b587d1f-9efa-4344-9d97-0cb1ec0a019e" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
            <button onClick={exportToPDF} disabled={true} className="w-full flex items-center justify-center gap-3 bg-gray-300 text-gray-500 p-4 rounded-xl cursor-not-allowed transition-colors" data-unique-id="236d27a7-8ede-4b67-9f4b-8648cf4bb8bf" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
              <FileText className="h-6 w-6" />
              <span className="font-medium" data-unique-id="26ee574a-05b9-4151-ac4c-0e60905cb336" data-file-name="app/dashboard/absensi-guru/reports/page.tsx"><span className="editable-text" data-unique-id="c8839b70-9840-47fc-b210-acbd58cb6d51" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">Download Laporan PDF</span></span>
            </button>
            
            <button onClick={exportToExcel} disabled={true} className="w-full flex items-center justify-center gap-3 bg-gray-300 text-gray-500 p-4 rounded-xl cursor-not-allowed transition-colors" data-unique-id="5044b72e-a199-439a-a299-ec5904a4cfec" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">
              <FileSpreadsheet className="h-6 w-6" />
              <span className="font-medium" data-unique-id="db5d9c74-2c94-4db6-9d03-3fa2ba328680" data-file-name="app/dashboard/absensi-guru/reports/page.tsx"><span className="editable-text" data-unique-id="9f265f89-098f-4780-b2a1-53abb143b0a1" data-file-name="app/dashboard/absensi-guru/reports/page.tsx">Download Laporan Excel</span></span>
            </button>
          </div>
        </div>}
    </div>;
}
