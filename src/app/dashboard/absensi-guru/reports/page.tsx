"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Calendar, Download, FileSpreadsheet, FileText, Filter, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
interface TeacherAttendance {
 id: string;
 name: string;
 role: string; // "teacher" or "staff"
 position: string; // Jabatan
 present: number;
 permitted: number;
 absent: number;
 total: number;
}
export default function TeacherAttendanceReports() {
 const { schoolId } = useAuth();
 const [loading, setLoading] = useState(true);
 const [generating, setGenerating] = useState(false);
 const [attendanceData, setAttendanceData] = useState<TeacherAttendance[]>([]);
 const [filteredData, setFilteredData] = useState<TeacherAttendance[]>([]);
 const [filters, setFilters] = useState({
   role: "all", // "all", "teacher", "staff"
   month: format(new Date(), "yyyy-MM"),
   sortBy: "name",
   sortDirection: "asc" as "asc" | "desc"
 });
 const [schoolInfo, setSchoolInfo] = useState({
   name: "Sekolah",
   address: "Alamat Sekolah",
   npsn: "12345678",
   principalName: "Kepala Sekolah",
   principalNip: "123456789"
 });
 const roles = {
   "all": "Semua",
   "teacher": "Guru",
   "staff": "Tendik"
 };
 // Fetch school information and teacher attendance data
 useEffect(() => {
   const fetchData = async () => {
     if (!schoolId) return;

     setLoading(true);
     try {
       // Fetch school info
       const { doc, getDoc } = await import('firebase/firestore');
       const { db } = await import('@/lib/firebase');
       const schoolDoc = await getDoc(doc(db, "schools", schoolId));

       if (schoolDoc.exists()) {
         const data = schoolDoc.data();
         setSchoolInfo({
           name: data.name || "Sekolah",
           address: data.address || "Alamat Sekolah",
           npsn: data.npsn || "12345678",
           principalName: data.principalName || "Kepala Sekolah",
           principalNip: data.principalNip || "123456789"
         });
       }

       // Fetch teacher data
       const { collection, query, where, getDocs } = await import('firebase/firestore');
       const teachersRef = collection(db, "users");
       const teachersQuery = query(teachersRef, where("schoolId", "==", schoolId),
                                 where("role", "in", ["teacher", "staff"]));
       const teachersSnapshot = await getDocs(teachersQuery);

       // Get month from filters for attendance records
       const year = parseInt(filters.month.split('-')[0]);
       const month = parseInt(filters.month.split('-')[1]);
       const startDate = new Date(year, month - 1, 1);
       const endDate = new Date(year, month, 0);
       const startDateStr = format(startDate, "yyyy-MM-dd");
       const endDateStr = format(endDate, "yyyy-MM-dd");
       // Fetch attendance records
       const attendanceRef = collection(db, `schools/${schoolId}/teacherAttendance`);
       const attendanceQuery = query(attendanceRef,
                                 where("date", ">=", startDateStr),
                                 where("date", "<=", endDateStr));
       const attendanceSnapshot = await getDocs(attendanceQuery);

       // Process attendance records
       const attendanceCounts: Record<string, { present: number, permitted: number, absent: number }> = {};

       attendanceSnapshot.forEach(doc => {
         const data = doc.data();
         const teacherId = data.teacherId;

         if (!attendanceCounts[teacherId]) {
           attendanceCounts[teacherId] = { present: 0, permitted: 0, absent: 0 };
         }

         if (data.status === 'present' || data.status === 'hadir') {
           attendanceCounts[teacherId].present++;
         } else if (data.status === 'permitted' || data.status === 'izin' || data.status === 'sick' || data.status === 'sakit') {
           attendanceCounts[teacherId].permitted++;
         } else if (data.status === 'absent' || data.status === 'alpha') {
           attendanceCounts[teacherId].absent++;
         }
       });
       // Combine teacher data with attendance data
       const teacherAttendanceData: TeacherAttendance[] = [];

       teachersSnapshot.forEach(doc => {
         const teacherData = doc.data();
         const teacherId = doc.id;
         const attendance = attendanceCounts[teacherId] || { present: 0, permitted: 0, absent: 0 };
         const total = attendance.present + attendance.permitted + attendance.absent;

         teacherAttendanceData.push({
           id: teacherId,
           name: teacherData.name || "Unnamed",
           role: teacherData.role || "teacher",
           position: teacherData.position || (teacherData.role === "staff" ? "Tenaga Kependidikan" : "Guru"),
           present: attendance.present,
           permitted: attendance.permitted,
           absent: attendance.absent,
           total: total
         });
       });
       setAttendanceData(teacherAttendanceData);
     } catch (error) {
       console.error("Error fetching data:", error);
       toast.error("Gagal memuat data kehadiran");
     } finally {
       setLoading(false);
     }
   };
   fetchData();
 }, [schoolId, filters.month]);
 // Apply filters when filter state changes
 useEffect(() => {
   let data = [...attendanceData];

   // Filter by role
   if (filters.role !== "all") {
     data = data.filter(teacher => teacher.role === filters.role);
   }

   // Sort data
   data.sort((a, b) => {
     if (filters.sortBy === 'name') {
       return filters.sortDirection === 'asc'
         ? a.name.localeCompare(b.name)
         : b.name.localeCompare(a.name);
     } else if (filters.sortBy === 'position') {
       return filters.sortDirection === 'asc'
         ? a.position.localeCompare(b.position)
         : b.position.localeCompare(a.position);
     } else if (filters.sortBy === 'present') {
       return filters.sortDirection === 'asc'
         ? a.present - b.present
         : b.present - a.present;
     } else if (filters.sortBy === 'total') {
       return filters.sortDirection === 'asc'
         ? a.total - b.total
         : b.total - a.total;
     }
     return 0;
   });

   setFilteredData(data);
 }, [attendanceData, filters]);
 // Toggle sort direction
 const toggleSort = (field: string) => {
   setFilters(prev => ({
     ...prev,
     sortBy: field,
     sortDirection: prev.sortBy === field && prev.sortDirection === 'asc' ? 'desc' : 'asc'
   }));
 };
 // Generate and download PDF report
 const handleGeneratePDF = async () => {
   if (filteredData.length === 0) {
     toast.error("Tidak ada data untuk dicetak");
     return;
   }

   setGenerating(true);
   try {
     const doc = new jsPDF();
     const pageWidth = doc.internal.pageSize.getWidth();
     const pageHeight = doc.internal.pageSize.getHeight();
     const margin = 15;

     // Add header
     doc.setFontSize(16);
     doc.setFont("helvetica", "bold");
     doc.text(schoolInfo.name.toUpperCase(), pageWidth / 2, margin, { align: "center" });

     doc.setFontSize(11);
     doc.setFont("helvetica", "normal");
     doc.text(schoolInfo.address, pageWidth / 2, margin + 7, { align: "center" });
     doc.text(`NPSN: ${schoolInfo.npsn}`, pageWidth / 2, margin + 12, { align: "center" });

     // Add horizontal line
     doc.setLineWidth(0.5);
     doc.line(margin, margin + 16, pageWidth - margin, margin + 16);

     // Add title
     doc.setFontSize(14);
     doc.setFont("helvetica", "bold");
     doc.text("REKAP KEHADIRAN GURU DAN TENDIK", pageWidth / 2, margin + 25, { align: "center" });

     // Add filters info
     doc.setFontSize(10);
     doc.setFont("helvetica", "normal");
     const monthDate = new Date(parseInt(filters.month.split('-')[0]), parseInt(filters.month.split('-')[1]) - 1, 1);
     const monthName = format(monthDate, "MMMM yyyy", { locale: id });
     doc.text(`Bulan: ${monthName}`, pageWidth / 2, margin + 32, { align: "center" });
     doc.text(`Kategori: ${roles[filters.role as keyof typeof roles]}`, pageWidth / 2, margin + 38, { align: "center" });

     // Create table
     const headers = ["No", "Nama", "Jabatan", "Hadir", "Izin", "Alpha", "Total"];
     const colWidths = [10, 60, 40, 18, 18, 18, 20];
     const tableTop = margin + 45;
     let yPos = tableTop;

     // Table header
     doc.setFillColor(220, 220, 220);
     doc.rect(margin, yPos, colWidths.reduce((a, b) => a + b, 0), 10, "F");
     doc.setFont("helvetica", "bold");

     let xPos = margin;
     for (let i = 0; i < headers.length; i++) {
       const align = i === 0 || i >= 3 ? "center" : "left";
       const xOffset = i === 0 || i >= 3 ? colWidths[i] / 2 : 3;
       doc.text(headers[i], xPos + xOffset, yPos + 6.5, i === 0 || i >= 3 ? { align } : undefined);
       xPos += colWidths[i];
     }

     yPos += 10;

     // Table rows
     doc.setFont("helvetica", "normal");

     filteredData.forEach((teacher, index) => {
       // Check if we need a new page
       if (yPos > pageHeight - 30) {
         doc.addPage();
         yPos = margin;

         // Add header to new page
         doc.setFillColor(220, 220, 220);
         doc.rect(margin, yPos, colWidths.reduce((a, b) => a + b, 0), 10, "F");
         doc.setFont("helvetica", "bold");

         xPos = margin;
         for (let i = 0; i < headers.length; i++) {
           const align = i === 0 || i >= 3 ? "center" : "left";
           const xOffset = i === 0 || i >= 3 ? colWidths[i] / 2 : 3;
           doc.text(headers[i], xPos + xOffset, yPos + 6.5, i === 0 || i >= 3 ? { align } : undefined);
           xPos += colWidths[i];
         }

         yPos += 10;
         doc.setFont("helvetica", "normal");
       }

       // Zebra striping
       if (index % 2 === 0) {
         doc.setFillColor(245, 245, 245);
         doc.rect(margin, yPos, colWidths.reduce((a, b) => a + b, 0), 8, "F");
       }

       // Row data
       xPos = margin;

       // No.
       doc.text((index + 1).toString(), xPos + colWidths[0] / 2, yPos + 5, { align: "center" });
       xPos += colWidths[0];

       // Name
       let displayName = teacher.name;
       if (displayName.length > 25) {
         displayName = displayName.substring(0, 22) + "...";
       }
       doc.text(displayName, xPos + 3, yPos + 5);
       xPos += colWidths[1];

       // Position
       let displayPosition = teacher.position;
       if (displayPosition.length > 18) {
         displayPosition = displayPosition.substring(0, 15) + "...";
       }
       doc.text(displayPosition, xPos + 3, yPos + 5);
       xPos += colWidths[2];

       // Present
       doc.text(teacher.present.toString(), xPos + colWidths[3] / 2, yPos + 5, { align: "center" });
       xPos += colWidths[3];

       // Permitted
       doc.text(teacher.permitted.toString(), xPos + colWidths[4] / 2, yPos + 5, { align: "center" });
       xPos += colWidths[4];

       // Absent
       doc.text(teacher.absent.toString(), xPos + colWidths[5] / 2, yPos + 5, { align: "center" });
       xPos += colWidths[5];

       // Total
       doc.text(teacher.total.toString(), xPos + colWidths[6] / 2, yPos + 5, { align: "center" });

       yPos += 8;
     });

     // Summary footer
     yPos += 10;
     const totalPresent = filteredData.reduce((sum, teacher) => sum + teacher.present, 0);
     const totalPermitted = filteredData.reduce((sum, teacher) => sum + teacher.permitted, 0);
     const totalAbsent = filteredData.reduce((sum, teacher) => sum + teacher.absent, 0);
     const grandTotal = totalPresent + totalPermitted + totalAbsent;

     doc.setFillColor(230, 230, 230);
     doc.rect(margin, yPos, colWidths.reduce((a, b) => a + b, 0), 10, "F");
     doc.setFont("helvetica", "bold");

     xPos = margin;
     doc.text("TOTAL", xPos + (colWidths[0] + colWidths[1] + colWidths[2]) / 2, yPos + 6.5, { align: "center" });
     xPos += (colWidths[0] + colWidths[1] + colWidths[2]);

     doc.text(totalPresent.toString(), xPos + colWidths[3] / 2, yPos + 6.5, { align: "center" });
     xPos += colWidths[3];

     doc.text(totalPermitted.toString(), xPos + colWidths[4] / 2, yPos + 6.5, { align: "center" });
     xPos += colWidths[4];

     doc.text(totalAbsent.toString(), xPos + colWidths[5] / 2, yPos + 6.5, { align: "center" });
     xPos += colWidths[5];

     doc.text(grandTotal.toString(), xPos + colWidths[6] / 2, yPos + 6.5, { align: "center" });

     // Add signature section
     yPos += 25;
     const currentDate = format(new Date(), "d MMMM yyyy", { locale: id });
     doc.setFont("helvetica", "normal");
     doc.setFontSize(10);
     doc.text(`${schoolInfo.address}, ${currentDate}`, pageWidth - margin - 40, yPos, { align: "right" });

     yPos += 10;
     doc.text("Mengetahui,", margin + 30, yPos, { align: "center" });
     doc.text("Kepala Sekolah", margin + 30, yPos + 5, { align: "center" });

     doc.text("Dibuat oleh,", pageWidth - margin - 30, yPos, { align: "center" });
     doc.text("Administrator", pageWidth - margin - 30, yPos + 5, { align: "center" });

     yPos += 30;
     doc.setFont("helvetica", "bold");
     doc.text(schoolInfo.principalName, margin + 30, yPos, { align: "center" });
     doc.setFont("helvetica", "normal");
     doc.text(`NIP. ${schoolInfo.principalNip}`, margin + 30, yPos + 5, { align: "center" });

     // Save the PDF
     const monthStr = format(monthDate, "MM-yyyy");
     const fileName = `Rekap_Kehadiran_Guru_${monthStr}.pdf`;
     doc.save(fileName);
     toast.success(`PDF berhasil diunduh: ${fileName}`);
   } catch (error) {
     console.error("Error generating PDF:", error);
     toast.error("Gagal mengunduh laporan PDF");
   } finally {
     setGenerating(false);
   }
 };
 // Generate and download Excel report
 const handleGenerateExcel = async () => {
   if (filteredData.length === 0) {
     toast.error("Tidak ada data untuk dicetak");
     return;
   }

   setGenerating(true);
   try {
     const wb = XLSX.utils.book_new();

     // Create header data
     const monthDate = new Date(parseInt(filters.month.split('-')[0]), parseInt(filters.month.split('-')[1]) - 1, 1);
     const monthName = format(monthDate, "MMMM yyyy", { locale: id });

     const headerData = [
       [schoolInfo.name.toUpperCase()],
       [schoolInfo.address],
       [`NPSN: ${schoolInfo.npsn}`],
       [""],
       ["REKAP KEHADIRAN GURU DAN TENDIK"],
       [`Bulan: ${monthName}`],
       [`Kategori: ${roles[filters.role as keyof typeof roles]}`],
       [""]
     ];

     // Create table headers
     const tableHeaders = ["No", "Nama", "Jabatan", "Hadir", "Izin", "Alpha", "Total"];
     headerData.push(tableHeaders);

     // Add table rows
     filteredData.forEach((teacher, index) => {
       headerData.push([
         index + 1,
         teacher.name,
         teacher.position,
         teacher.present,
         teacher.permitted,
         teacher.absent,
         teacher.total
       ]);
     });

     // Add total row
     const totalPresent = filteredData.reduce((sum, teacher) => sum + teacher.present, 0);
     const totalPermitted = filteredData.reduce((sum, teacher) => sum + teacher.permitted, 0);
     const totalAbsent = filteredData.reduce((sum, teacher) => sum + teacher.absent, 0);
     const grandTotal = totalPresent + totalPermitted + totalAbsent;

     headerData.push(["TOTAL", "", "", totalPresent, totalPermitted, totalAbsent, grandTotal]);

     // Add signature section
     const currentDate = format(new Date(), "d MMMM yyyy", { locale: id });
     headerData.push(
       [""],
       [""],
       [`${schoolInfo.address}, ${currentDate}`],
       [""],
       ["Mengetahui,", "", "", "", "", "", "Dibuat oleh,"],
       ["Kepala Sekolah", "", "", "", "", "", "Administrator"],
       ["", "", "", "", "", "", ""],
       ["", "", "", "", "", "", ""],
       [schoolInfo.principalName, "", "", "", "", "", "Administrator"],
       [`NIP. ${schoolInfo.principalNip}`, "", "", "", "", "", ""],
     );

     // Create worksheet
     const ws = XLSX.utils.aoa_to_sheet(headerData);

     // Set column widths
     const colWidths = [
       { wch: 5 },  // No
       { wch: 30 }, // Nama
       { wch: 25 }, // Jabatan
       { wch: 10 }, // Hadir
       { wch: 10 }, // Izin
       { wch: 10 }, // Alpha
       { wch: 10 }  // Total
     ];

     ws['!cols'] = colWidths;

     // Add worksheet to workbook
     XLSX.utils.book_append_sheet(wb, ws, "Rekap Kehadiran");

     // Save Excel file
     const monthStr = format(monthDate, "MM-yyyy");
     const fileName = `Rekap_Kehadiran_Guru_${monthStr}.xlsx`;
     XLSX.writeFile(wb, fileName);
     toast.success(`Excel berhasil diunduh: ${fileName}`);
   } catch (error) {
     console.error("Error generating Excel:", error);
     toast.error("Gagal mengunduh laporan Excel");
   } finally {
     setGenerating(false);
   }
 };
 return (
   <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 pb-20 md:pb-6">
     <div className="flex items-center mb-6">
       <Link href="/dashboard/absensi-guru" className="p-2 mr-2 hover:bg-gray-100 rounded-full">
         <ArrowLeft size={20} />
       </Link>
       <h1 className="text-2xl font-bold text-gray-800">Laporan Kehadiran Guru dan Tendik</h1>
     </div>

     {/* Filters */}
     <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
       <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
         <div>
           <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-2">
             <Calendar className="h-4 w-4 inline-block mr-1" /> Bulan
           </label>
           <input
             type="month"
             id="month"
             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
             value={filters.month}
             onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))}
           />
         </div>

         <div>
           <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
             <Filter className="h-4 w-4 inline-block mr-1" /> Kategori
           </label>
           <select
             id="role"
             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
             value={filters.role}
             onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
           >
             <option value="all">Semua</option>
             <option value="teacher">Guru</option>
             <option value="staff">Tenaga Kependidikan</option>
           </select>
         </div>

         <div className="flex items-end gap-2">
           <button
             onClick={handleGeneratePDF}
             disabled={generating || loading}
             className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
           >
             {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
             <span>PDF</span>
           </button>

           <button
             onClick={handleGenerateExcel}
             disabled={generating || loading}
             className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
           >
             {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileSpreadsheet className="h-5 w-5" />}
             <span>Excel</span>
           </button>
         </div>
       </div>
     </div>

     {/* Attendance table */}
     <div className="bg-white rounded-xl shadow-sm overflow-hidden">
       <div className="p-6 pb-0">
         <h2 className="text-xl font-bold text-gray-800 mb-4">REKAP KEHADIRAN GURU DAN TENDIK</h2>
       </div>

       {loading ? (
         <div className="flex justify-center items-center h-64">
           <Loader2 className="h-12 w-12 text-primary animate-spin" />
         </div>
       ) : filteredData.length > 0 ? (
         <div className="overflow-x-auto">
           <table className="w-full">
             <thead>
               <tr className="bg-gray-50 border-b border-gray-200">
                 <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                   <div className="flex items-center justify-center">
                     No
                   </div>
                 </th>
                 <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                   <div
                     className="flex items-center cursor-pointer"
                     onClick={() => toggleSort('name')}
                   >
                     Nama
                     {filters.sortBy === 'name' && (
                       filters.sortDirection === 'asc' ?
                         <ChevronUp size={16} className="ml-1" /> :
                         <ChevronDown size={16} className="ml-1" />
                     )}
                   </div>
                 </th>
                 <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                   <div
                     className="flex items-center cursor-pointer"
                     onClick={() => toggleSort('position')}
                   >
                     Jabatan
                     {filters.sortBy === 'position' && (
                       filters.sortDirection === 'asc' ?
                         <ChevronUp size={16} className="ml-1" /> :
                         <ChevronDown size={16} className="ml-1" />
                     )}
                   </div>
                 </th>
                 <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                   <div
                     className="flex items-center justify-center cursor-pointer"
                     onClick={() => toggleSort('present')}
                   >
                     Hadir
                     {filters.sortBy === 'present' && (
                       filters.sortDirection === 'asc' ?
                         <ChevronUp size={16} className="ml-1" /> :
                         <ChevronDown size={16} className="ml-1" />
                     )}
                   </div>
                 </th>
                 <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                   <div className="flex items-center justify-center">
                     Izin
                   </div>
                 </th>
                 <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                   <div className="flex items-center justify-center">
                     Alpha
                   </div>
                 </th>
                 <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                   <div
                     className="flex items-center justify-center cursor-pointer"
                     onClick={() => toggleSort('total')}
                   >
                     Total
                     {filters.sortBy === 'total' && (
                       filters.sortDirection === 'asc' ?
                         <ChevronUp size={16} className="ml-1" /> :
                         <ChevronDown size={16} className="ml-1" />
                     )}
                   </div>
                 </th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-200">
               {filteredData.map((teacher, index) => (
                 <motion.tr
                   key={teacher.id}
                   initial={{ opacity: 0, y: 5 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{
                     duration: 0.2,
                     delay: index * 0.03,
                     ease: "easeOut"
                   }}
                   className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                 >
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                     {index + 1}
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                     {teacher.name}
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                     {teacher.position}
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                     <span className="bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full">
                       {teacher.present}
                     </span>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                     <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                       {teacher.permitted}
                     </span>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                     <span className="bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full">
                       {teacher.absent}
                     </span>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-center">
                     {teacher.total}
                   </td>
                 </motion.tr>
               ))}
             </tbody>
             <tfoot>
               <tr className="bg-gray-100 font-semibold text-gray-900">
                 <td colSpan={3} className="px-6 py-3 text-right">TOTAL</td>
                 <td className="px-6 py-3 text-center">{filteredData.reduce((sum, t) => sum + t.present, 0)}</td>
                 <td className="px-6 py-3 text-center">{filteredData.reduce((sum, t) => sum + t.permitted, 0)}</td>
                 <td className="px-6 py-3 text-center">{filteredData.reduce((sum, t) => sum + t.absent, 0)}</td>
                 <td className="px-6 py-3 text-center">{filteredData.reduce((sum, t) => sum + t.total, 0)}</td>
               </tr>
             </tfoot>
           </table>
         </div>
       ) : (
         <div className="text-center py-20">
           <h3 className="text-lg font-medium text-gray-500 mb-2">Data tidak ditemukan</h3>
           <p className="text-gray-400">Tidak ada data kehadiran yang sesuai dengan filter</p>
         </div>
       )}
     </div>
   </div>
 );
}
