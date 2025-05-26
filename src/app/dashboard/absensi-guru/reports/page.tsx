"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Calendar, Download, FileSpreadsheet, FileText, Loader2, PieChart, BarChart2, Users, Clock, X } from "lucide-react";
import Link from "next/link";
import { format, subMonths, subDays, addDays, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
 BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
 PieChart as RechartsInternalPieChart, Pie, Cell
} from "recharts";
import { jsPDF } from "jspdf";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
// Define color constants
const COLORS = {
 present: "#4ade80", // green
 late: "#facc15",    // yellow
 permitted: "#60a5fa", // blue
 absent: "#f87171",  // red
};
// Define the type for teacher status counts
interface TeacherStatusCounts {
 present: number;
 late: number;
 permitted: number;
 absent: number;
 total: number;
}
// Define the type for attendance records
interface AttendanceRecord {
 id: string;
 teacherId: string;
 teacherName: string;
 status: string;
 date: string;
 time: string;
 timestamp: Timestamp;
 type: string;
}
// Define the type for teacher status details
interface TeacherStatusDetail {
 id: string;
 name: string;
 status: string;
 date: string;
 time: string;
}
export default function TeacherAttendanceReportPage() {
 const { schoolId, userRole } = useAuth();
 const [loading, setLoading] = useState(true);
 const [isDownloading, setIsDownloading] = useState(false);
 const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('week');
 const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
 const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
 const [statusCounts, setStatusCounts] = useState<TeacherStatusCounts>({
   present: 0,
   late: 0,
   permitted: 0,
   absent: 0,
   total: 0
 });

 // Store detailed lists of teachers with each status for the reports
 const [permittedTeachers, setPermittedTeachers] = useState<TeacherStatusDetail[]>([]);
 const [absentTeachers, setAbsentTeachers] = useState<TeacherStatusDetail[]>([]);
 const [allAttendanceRecords, setAllAttendanceRecords] = useState<AttendanceRecord[]>([]);
 const [dailyData, setDailyData] = useState<any[]>([]);
 const [schoolInfo, setSchoolInfo] = useState({
   name: "Nama Sekolah",
   address: "Alamat Sekolah",
   npsn: "12345678",
   principalName: "Kepala Sekolah",
   principalNip: "123456789"
 });

 // Use effect to fetch school information
 useEffect(() => {
   const fetchSchoolInfo = async () => {
     if (!schoolId) return;
     try {
       const { doc, getDoc } = await import('firebase/firestore');
       const schoolDoc = await getDoc(doc(db, "schools", schoolId));
       if (schoolDoc.exists()) {
         const data = schoolDoc.data();
         setSchoolInfo({
           name: data.name || "Nama Sekolah",
           address: data.address || "Alamat Sekolah",
           npsn: data.npsn || "12345678",
           principalName: data.principalName || "Kepala Sekolah",
           principalNip: data.principalNip || "123456789"
         });
       }
     } catch (error) {
       console.error("Error fetching school info:", error);
     }
   };

   fetchSchoolInfo();
 }, [schoolId]);

 // Handle date range selection
 useEffect(() => {
   if (dateRange === 'today') {
     const today = format(new Date(), 'yyyy-MM-dd');
     setStartDate(today);
     setEndDate(today);
   } else if (dateRange === 'week') {
     setStartDate(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
     setEndDate(format(new Date(), 'yyyy-MM-dd'));
   } else if (dateRange === 'month') {
     setStartDate(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
     setEndDate(format(new Date(), 'yyyy-MM-dd'));
   }
 }, [dateRange]);

 // Fetch attendance data
 useEffect(() => {
   const fetchAttendanceData = async () => {
     if (!schoolId) return;

     setLoading(true);
     try {
       // Fetch teachers registered in the system
       const usersRef = collection(db, "users");
       const teachersQuery = query(
         usersRef,
         where("schoolId", "==", schoolId),
         where("role", "in", ["teacher", "staff"])
       );
       const teachersSnapshot = await getDocs(teachersQuery);
       const teachersCount = teachersSnapshot.size;

       // Fetch attendance records in the date range
       const attendanceRef = collection(db, "teacherAttendance");
       const attendanceQuery = query(
         attendanceRef,
         where("schoolId", "==", schoolId),
         where("date", ">=", startDate),
         where("date", "<=", endDate),
         orderBy("date", "asc")
       );

       const attendanceSnapshot = await getDocs(attendanceQuery);
       const attendanceRecords: AttendanceRecord[] = [];
       attendanceSnapshot.forEach(doc => {
         attendanceRecords.push({
           id: doc.id,
           ...doc.data()
         } as AttendanceRecord);
       });

       setAllAttendanceRecords(attendanceRecords);

       // Calculate counts for each status
       const uniqueTeacherDays = new Map<string, Set<string>>();
       const presentTeacherDays = new Map<string, Set<string>>();
       const lateTeacherDays = new Map<string, Set<string>>();
       const permittedTeacherDays = new Map<string, Set<string>>();

       // Process all attendance records
       const permittedList: TeacherStatusDetail[] = [];
       const absentList: TeacherStatusDetail[] = [];

       // Group attendance by day for charts
       const dailyAttendance = new Map<string, {
         present: number;
         late: number;
         permitted: number;
         absent: number;
         date: string;
       }>();

       // Process each day in the range to ensure all days are represented
       let currentDate = parseISO(startDate);
       const endDateObj = parseISO(endDate);

       while (currentDate <= endDateObj) {
         const dateStr = format(currentDate, 'yyyy-MM-dd');
         dailyAttendance.set(dateStr, {
           present: 0,
           late: 0,
           permitted: 0,
           absent: 0,
           date: dateStr
         });
         currentDate = addDays(currentDate, 1);
       }

       // Process attendance records
       attendanceRecords.forEach(record => {
         const teacherKey = `${record.teacherId}`;
         const dateKey = record.date;

         // Initialize sets if they don't exist
         if (!uniqueTeacherDays.has(teacherKey)) {
           uniqueTeacherDays.set(teacherKey, new Set());
         }
         if (!presentTeacherDays.has(teacherKey)) {
           presentTeacherDays.set(teacherKey, new Set());
         }
         if (!lateTeacherDays.has(teacherKey)) {
           lateTeacherDays.set(teacherKey, new Set());
         }
         if (!permittedTeacherDays.has(teacherKey)) {
           permittedTeacherDays.set(teacherKey, new Set());
         }

         uniqueTeacherDays.get(teacherKey)!.add(dateKey);

         // Update daily attendance stats
         if (dailyAttendance.has(dateKey)) {
           const dailyStat = dailyAttendance.get(dateKey)!;

           if (record.status === 'present') {
             dailyStat.present++;
             presentTeacherDays.get(teacherKey)!.add(dateKey);
           } else if (record.status === 'late') {
             dailyStat.late++;
             lateTeacherDays.get(teacherKey)!.add(dateKey);
           } else if (record.status === 'permitted' || record.status === 'izin') {
             dailyStat.permitted++;
             permittedTeacherDays.get(teacherKey)!.add(dateKey);

             // Add to permitted list for reports
             permittedList.push({
               id: record.teacherId,
               name: record.teacherName,
               status: 'IZIN',
               date: dateKey,
               time: record.time || '-'
             });
           }

           dailyAttendance.set(dateKey, dailyStat);
         }
       });

       // Calculate absent teachers by finding teachers who don't have a record for each day
       teachersSnapshot.forEach(teacherDoc => {
         const teacherId = teacherDoc.id;
         const teacherData = teacherDoc.data();
         currentDate = parseISO(startDate);

         while (currentDate <= endDateObj) {
           const dateStr = format(currentDate, 'yyyy-MM-dd');
           const teacherKey = teacherId;

           // If the teacher has no record for this day, mark as absent
           if (!uniqueTeacherDays.has(teacherKey) ||
               !uniqueTeacherDays.get(teacherKey)!.has(dateStr)) {

             // Update daily absent count
             if (dailyAttendance.has(dateStr)) {
               const dailyStat = dailyAttendance.get(dateStr)!;
               dailyStat.absent++;
               dailyAttendance.set(dateStr, dailyStat);
             }

             // Add to absent list for reports
             absentList.push({
               id: teacherId,
               name: teacherData.name || 'Unknown Teacher',
               status: 'ALPHA',
               date: dateStr,
               time: '-'
             });
           }

           currentDate = addDays(currentDate, 1);
         }
       });

       // Convert daily data for charts
       const chartData = Array.from(dailyAttendance.values())
         .sort((a, b) => a.date.localeCompare(b.date));

       setDailyData(chartData);

       // Count unique teachers with each status
       let presentCount = 0;
       let lateCount = 0;
       let permittedCount = 0;

       for (const [teacherId, dates] of presentTeacherDays) {
         if (dates.size > 0) presentCount++;
       }

       for (const [teacherId, dates] of lateTeacherDays) {
         if (dates.size > 0) lateCount++;
       }

       for (const [teacherId, dates] of permittedTeacherDays) {
         if (dates.size > 0) permittedCount++;
       }

       // Calculate absent count (teachers with no attendance record)
       const absentCount = teachersCount - presentCount - lateCount - permittedCount;

       setStatusCounts({
         present: presentCount,
         late: lateCount,
         permitted: permittedCount,
         absent: absentCount,
         total: teachersCount
       });

       // Set the lists of teachers with permitted and absent status
       setPermittedTeachers(permittedList);
       setAbsentTeachers(absentList);

     } catch (error) {
       console.error("Error fetching attendance data:", error);
       toast.error("Gagal memuat data kehadiran");
     } finally {
       setLoading(false);
     }
   };

   fetchAttendanceData();
 }, [schoolId, startDate, endDate]);

 // Generate data for pie chart
 const pieChartData = [
   { name: 'Hadir', value: statusCounts.present, color: COLORS.present },
   { name: 'Terlambat', value: statusCounts.late, color: COLORS.late },
   { name: 'Izin', value: statusCounts.permitted, color: COLORS.permitted },
   { name: 'Alpha', value: statusCounts.absent, color: COLORS.absent }
 ].filter(item => item.value > 0);
 // Function to generate PDF with IZIN and ALPHA lists
 const generatePDF = async () => {
   try {
     setIsDownloading(true);

     const doc = new jsPDF({
       orientation: 'portrait',
       unit: 'mm',
       format: 'a4'
     });

     const pageWidth = doc.internal.pageSize.getWidth();
     const pageHeight = doc.internal.pageSize.getHeight();
     const margin = 15;

     // Add header with school info
     doc.setFontSize(16);
     doc.setFont('helvetica', 'bold');
     doc.text(schoolInfo.name.toUpperCase(), pageWidth / 2, margin, { align: 'center' });
     doc.setFontSize(11);
     doc.setFont('helvetica', 'normal');
     doc.text(schoolInfo.address, pageWidth / 2, margin + 7, { align: 'center' });
     doc.text(`NPSN: ${schoolInfo.npsn}`, pageWidth / 2, margin + 14, { align: 'center' });

     // Add horizontal line
     doc.setLineWidth(0.5);
     doc.line(margin, margin + 20, pageWidth - margin, margin + 20);

     // Add title
     doc.setFontSize(14);
     doc.setFont('helvetica', 'bold');
     doc.text('LAPORAN KEHADIRAN GURU DAN TENAGA KEPENDIDIKAN', pageWidth / 2, margin + 30, { align: 'center' });

     // Add date range
     const startDateFormatted = format(parseISO(startDate), 'd MMMM yyyy', { locale: id });
     const endDateFormatted = format(parseISO(endDate), 'd MMMM yyyy', { locale: id });
     doc.setFontSize(11);
     doc.text(`Periode: ${startDateFormatted} - ${endDateFormatted}`, pageWidth / 2, margin + 40, { align: 'center' });

     // Add summary table
     doc.setFontSize(12);
     doc.text('RINGKASAN KEHADIRAN', margin, margin + 55);

     let yPos = margin + 65;
     const tableHeaders = ['Status', 'Jumlah', 'Persentase'];
     const columnWidths = [40, 25, 25];
     const rowHeight = 10;

     // Draw table header with background
     doc.setFillColor(230, 230, 230);
     doc.rect(margin, yPos, columnWidths.reduce((a, b) => a + b), rowHeight, 'F');
     doc.setFont('helvetica', 'bold');
     doc.setFontSize(10);

     let xPos = margin;
     tableHeaders.forEach((header, i) => {
       doc.text(header, xPos + columnWidths[i] / 2, yPos + 7, { align: 'center' });
       xPos += columnWidths[i];
     });
     yPos += rowHeight;

     // Draw table rows
     doc.setFont('helvetica', 'normal');
     const total = statusCounts.total || 1; // Prevent division by zero

     const rows = [
       ['Hadir', statusCounts.present.toString(), `${Math.round(statusCounts.present / total * 100)}%`],
       ['Terlambat', statusCounts.late.toString(), `${Math.round(statusCounts.late / total * 100)}%`],
       ['Izin', statusCounts.permitted.toString(), `${Math.round(statusCounts.permitted / total * 100)}%`],
       ['Alpha', statusCounts.absent.toString(), `${Math.round(statusCounts.absent / total * 100)}%`],
       ['Total', statusCounts.total.toString(), '100%']
     ];

     rows.forEach((row, rowIndex) => {
       // Add background for alternating rows
       if (rowIndex % 2 === 0) {
         doc.setFillColor(245, 245, 245);
         doc.rect(margin, yPos, columnWidths.reduce((a, b) => a + b), rowHeight, 'F');
       }

       xPos = margin;
       row.forEach((cell, cellIndex) => {
         doc.text(cell, xPos + columnWidths[cellIndex] / 2, yPos + 7, { align: 'center' });
         xPos += columnWidths[cellIndex];
       });
       yPos += rowHeight;
     });

     // Add IZIN list title
     yPos += 10;
     doc.setFontSize(12);
     doc.setFont('helvetica', 'bold');
     doc.text('DAFTAR GURU DENGAN STATUS IZIN', margin, yPos);
     yPos += 10;

     // Add IZIN table headers
     const izinHeaders = ['No', 'Nama', 'Tanggal', 'Waktu'];
     const izinWidths = [10, 60, 30, 30];

     doc.setFillColor(230, 230, 230);
     doc.rect(margin, yPos, izinWidths.reduce((a, b) => a + b), rowHeight, 'F');

     xPos = margin;
     izinHeaders.forEach((header, i) => {
       doc.text(header, xPos + izinWidths[i] / 2, yPos + 7, { align: 'center' });
       xPos += izinWidths[i];
     });
     yPos += rowHeight;

     // Add IZIN table rows
     doc.setFont('helvetica', 'normal');

     if (permittedTeachers.length === 0) {
       doc.text('Tidak ada data', margin + 50, yPos + 7);
       yPos += rowHeight;
     } else {
       permittedTeachers.slice(0, 10).forEach((teacher, index) => {
         if (yPos > pageHeight - 40) {
           // Add new page if we're getting close to the bottom
           doc.addPage();
           yPos = margin + 20;
           doc.setFont('helvetica', 'bold');
           doc.text('DAFTAR GURU DENGAN STATUS IZIN (Lanjutan)', margin, yPos);
           yPos += 10;

           // Add header again on new page
           doc.setFillColor(230, 230, 230);
           doc.rect(margin, yPos, izinWidths.reduce((a, b) => a + b), rowHeight, 'F');

           xPos = margin;
           izinHeaders.forEach((header, i) => {
             doc.text(header, xPos + izinWidths[i] / 2, yPos + 7, { align: 'center' });
             xPos += izinWidths[i];
           });
           yPos += rowHeight;
           doc.setFont('helvetica', 'normal');
         }

         // Add background for alternating rows
         if (index % 2 === 0) {
           doc.setFillColor(245, 245, 245);
           doc.rect(margin, yPos, izinWidths.reduce((a, b) => a + b), rowHeight, 'F');
         }

         xPos = margin;
         const formattedDate = format(parseISO(teacher.date), 'dd/MM/yyyy');

         [
           (index + 1).toString(),
           teacher.name,
           formattedDate,
           teacher.time
         ].forEach((cell, cellIndex) => {
           const textAlign = cellIndex === 1 ? 'left' : 'center';
           const xOffset = cellIndex === 1 ? 3 : izinWidths[cellIndex] / 2;
           doc.text(cell, xPos + xOffset, yPos + 7, { align: textAlign });
           xPos += izinWidths[cellIndex];
         });

         yPos += rowHeight;
       });
     }

     // Add "Continued on next page" if needed
     if (permittedTeachers.length > 10) {
       doc.setFont('helvetica', 'italic');
       doc.text(`... dan ${permittedTeachers.length - 10} guru izin lainnya`, margin, yPos + 7);
       yPos += rowHeight + 5;
     }

     // Add ALPHA list title
     yPos += 10;
     if (yPos > pageHeight - 60) {
       doc.addPage();
       yPos = margin + 20;
     }

     doc.setFontSize(12);
     doc.setFont('helvetica', 'bold');
     doc.text('DAFTAR GURU DENGAN STATUS ALPHA', margin, yPos);
     yPos += 10;

     // Add ALPHA table headers
     const alphaHeaders = ['No', 'Nama', 'Tanggal', 'Status'];
     const alphaWidths = [10, 60, 30, 30];

     doc.setFillColor(230, 230, 230);
     doc.rect(margin, yPos, alphaWidths.reduce((a, b) => a + b), rowHeight, 'F');

     xPos = margin;
     alphaHeaders.forEach((header, i) => {
       doc.text(header, xPos + alphaWidths[i] / 2, yPos + 7, { align: 'center' });
       xPos += alphaWidths[i];
     });
     yPos += rowHeight;

     // Add ALPHA table rows
     doc.setFont('helvetica', 'normal');

     if (absentTeachers.length === 0) {
       doc.text('Tidak ada data', margin + 50, yPos + 7);
       yPos += rowHeight;
     } else {
       absentTeachers.slice(0, 10).forEach((teacher, index) => {
         if (yPos > pageHeight - 40) {
           // Add new page if we're getting close to the bottom
           doc.addPage();
           yPos = margin + 20;
           doc.setFont('helvetica', 'bold');
           doc.text('DAFTAR GURU DENGAN STATUS ALPHA (Lanjutan)', margin, yPos);
           yPos += 10;

           // Add header again on new page
           doc.setFillColor(230, 230, 230);
           doc.rect(margin, yPos, alphaWidths.reduce((a, b) => a + b), rowHeight, 'F');

           xPos = margin;
           alphaHeaders.forEach((header, i) => {
             doc.text(header, xPos + alphaWidths[i] / 2, yPos + 7, { align: 'center' });
             xPos += alphaWidths[i];
           });
           yPos += rowHeight;
           doc.setFont('helvetica', 'normal');
         }

         // Add background for alternating rows
         if (index % 2 === 0) {
           doc.setFillColor(245, 245, 245);
           doc.rect(margin, yPos, alphaWidths.reduce((a, b) => a + b), rowHeight, 'F');
         }

         xPos = margin;
         const formattedDate = format(parseISO(teacher.date), 'dd/MM/yyyy');

         [
           (index + 1).toString(),
           teacher.name,
           formattedDate,
           teacher.status
         ].forEach((cell, cellIndex) => {
           const textAlign = cellIndex === 1 ? 'left' : 'center';
           const xOffset = cellIndex === 1 ? 3 : alphaWidths[cellIndex] / 2;
           doc.text(cell, xPos + xOffset, yPos + 7, { align: textAlign });
           xPos += alphaWidths[cellIndex];
         });

         yPos += rowHeight;
       });
     }

     // Add "Continued on next page" if needed
     if (absentTeachers.length > 10) {
       doc.setFont('helvetica', 'italic');
       doc.text(`... dan ${absentTeachers.length - 10} guru alpha lainnya`, margin, yPos + 7);
     }

     // Add footer
     const today = format(new Date(), 'd MMMM yyyy', { locale: id });
     yPos = pageHeight - 40;

     doc.text(`${schoolInfo.address}, ${today}`, pageWidth - margin, yPos, { align: 'right' });
     yPos += 10;

     doc.text('Kepala Sekolah', pageWidth - margin, yPos, { align: 'right' });
     yPos += 20;

     doc.text(schoolInfo.principalName, pageWidth - margin, yPos, { align: 'right' });
     yPos += 5;

     doc.text(`NIP. ${schoolInfo.principalNip}`, pageWidth - margin, yPos, { align: 'right' });

     // Save the PDF
     const fileName = `Laporan_Kehadiran_Guru_${format(new Date(), 'yyyyMMdd')}.pdf`;
     doc.save(fileName);

     toast.success(`Laporan PDF berhasil diunduh: ${fileName}`);

   } catch (error) {
     console.error("Error generating PDF:", error);
     toast.error("Gagal mengunduh laporan PDF");
   } finally {
     setIsDownloading(false);
   }
 };

 // Function to generate Excel with IZIN and ALPHA lists
 const generateExcel = async () => {
   try {
     setIsDownloading(true);

     // Dynamically import xlsx
     const XLSX = await import('xlsx');

     // Create workbook
     const wb = XLSX.utils.book_new();

     // Create summary worksheet
     const summaryData = [
       [`${schoolInfo.name.toUpperCase()}`],
       [`${schoolInfo.address}`],
       [`NPSN: ${schoolInfo.npsn}`],
       [`LAPORAN KEHADIRAN GURU DAN TENAGA KEPENDIDIKAN`],
       [`Periode: ${format(parseISO(startDate), 'd MMMM yyyy', { locale: id })} - ${format(parseISO(endDate), 'd MMMM yyyy', { locale: id })}`],
       [],
       ['RINGKASAN KEHADIRAN'],
       ['Status', 'Jumlah', 'Persentase']
     ];

     const total = statusCounts.total || 1;
     summaryData.push(
       ['Hadir', statusCounts.present, `${Math.round(statusCounts.present / total * 100)}%`],
       ['Terlambat', statusCounts.late, `${Math.round(statusCounts.late / total * 100)}%`],
       ['Izin', statusCounts.permitted, `${Math.round(statusCounts.permitted / total * 100)}%`],
       ['Alpha', statusCounts.absent, `${Math.round(statusCounts.absent / total * 100)}%`],
       ['Total', statusCounts.total, '100%']
     );

     summaryData.push(
       [],
       ['DAFTAR GURU DENGAN STATUS IZIN'],
       ['No', 'Nama', 'Tanggal', 'Waktu']
     );

     if (permittedTeachers.length === 0) {
       summaryData.push(['', 'Tidak ada data', '', '']);
     } else {
       permittedTeachers.forEach((teacher, index) => {
         summaryData.push([
           index + 1,
           teacher.name,
           format(parseISO(teacher.date), 'dd/MM/yyyy'),
           teacher.time
         ]);
       });
     }

     summaryData.push(
       [],
       ['DAFTAR GURU DENGAN STATUS ALPHA'],
       ['No', 'Nama', 'Tanggal', 'Status']
     );

     if (absentTeachers.length === 0) {
       summaryData.push(['', 'Tidak ada data', '', '']);
     } else {
       absentTeachers.forEach((teacher, index) => {
         summaryData.push([
           index + 1,
           teacher.name,
           format(parseISO(teacher.date), 'dd/MM/yyyy'),
           teacher.status
         ]);
       });
     }

     const ws = XLSX.utils.aoa_to_sheet(summaryData);

     // Set column widths
     const colWidths = [
       { wch: 10 }, // No
       { wch: 30 }, // Name
       { wch: 15 }, // Date
       { wch: 15 }, // Status/Time
     ];
     ws['!cols'] = colWidths;

     // Add worksheet to workbook
     XLSX.utils.book_append_sheet(wb, ws, 'Kehadiran Guru');

     // Generate separate worksheets for IZIN and ALPHA details
     if (permittedTeachers.length > 0) {
       const izinData = [
         ['DAFTAR GURU DENGAN STATUS IZIN'],
         [],
         ['No', 'Nama', 'Tanggal', 'Waktu']
       ];

       permittedTeachers.forEach((teacher, index) => {
         izinData.push([
           index + 1,
           teacher.name,
           format(parseISO(teacher.date), 'dd/MM/yyyy'),
           teacher.time
         ]);
       });

       const izinWs = XLSX.utils.aoa_to_sheet(izinData);
       izinWs['!cols'] = colWidths;
       XLSX.utils.book_append_sheet(wb, izinWs, 'Guru IZIN');
     }

     if (absentTeachers.length > 0) {
       const alphaData = [
         ['DAFTAR GURU DENGAN STATUS ALPHA'],
         [],
         ['No', 'Nama', 'Tanggal', 'Status']
       ];

       absentTeachers.forEach((teacher, index) => {
         alphaData.push([
           index + 1,
           teacher.name,
           format(parseISO(teacher.date), 'dd/MM/yyyy'),
           teacher.status
         ]);
       });

       const alphaWs = XLSX.utils.aoa_to_sheet(alphaData);
       alphaWs['!cols'] = colWidths;
       XLSX.utils.book_append_sheet(wb, alphaWs, 'Guru ALPHA');
     }

     // Generate filename with current date
     const fileName = `Laporan_Kehadiran_Guru_${format(new Date(), 'yyyyMMdd')}.xlsx`;

     // Write file and trigger download
     XLSX.writeFile(wb, fileName);

     toast.success(`Laporan Excel berhasil diunduh: ${fileName}`);

   } catch (error) {
     console.error("Error generating Excel:", error);
     toast.error("Gagal mengunduh laporan Excel");
   } finally {
     setIsDownloading(false);
   }
 };
 return (
   <div className="w-full max-w-6xl mx-auto pb-20 md:pb-6">
     <div className="flex items-center mb-6">
       <Link href="/dashboard/absensi-guru" className="p-2 mr-2 hover:bg-gray-100 rounded-full">
         <ArrowLeft size={20} />
       </Link>
       <h1 className="text-2xl font-bold text-gray-800">Laporan Kehadiran Guru & Tendik</h1>
     </div>

     {/* Date Range Selection */}
     <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
       <h2 className="text-lg font-semibold mb-4 flex items-center">
         <Calendar className="mr-2 h-5 w-5 text-indigo-600" />
         Pilih Rentang Waktu
       </h2>

       <div className="flex flex-wrap gap-3 mb-4">
         <button
           onClick={() => setDateRange('today')}
           className={`px-4 py-2 rounded-lg text-sm font-medium ${
             dateRange === 'today'
               ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
               : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
           }`}
         >
           Hari Ini
         </button>
         <button
           onClick={() => setDateRange('week')}
           className={`px-4 py-2 rounded-lg text-sm font-medium ${
             dateRange === 'week'
               ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
               : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
           }`}
         >
           7 Hari Terakhir
         </button>
         <button
           onClick={() => setDateRange('month')}
           className={`px-4 py-2 rounded-lg text-sm font-medium ${
             dateRange === 'month'
               ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
               : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
           }`}
         >
           30 Hari Terakhir
         </button>
         <button
           onClick={() => setDateRange('custom')}
           className={`px-4 py-2 rounded-lg text-sm font-medium ${
             dateRange === 'custom'
               ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
               : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
           }`}
         >
           Kustom
         </button>
       </div>

       {dateRange === 'custom' && (
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           <div>
             <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
               Tanggal Mulai
             </label>
             <input
               type="date"
               id="startDate"
               value={startDate}
               onChange={(e) => setStartDate(e.target.value)}
               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
             />
           </div>

           <div>
             <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
               Tanggal Akhir
             </label>
             <input
               type="date"
               id="endDate"
               value={endDate}
               onChange={(e) => setEndDate(e.target.value)}
               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
             />
           </div>
         </div>
       )}
     </div>

     {loading ? (
       <div className="flex justify-center items-center h-64">
         <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
       </div>
     ) : (
       <>
         {/* Summary Cards */}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.3 }}
             className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white shadow-md"
           >
             <div className="flex items-center mb-1">
               <Users className="h-7 w-7 text-white opacity-80 mr-3" />
               <h3 className="font-semibold text-base">Hadir</h3>
             </div>
             <p className="text-3xl font-bold">{statusCounts.present}</p>
             <p className="text-xs text-green-100 mt-1">
               {Math.round(statusCounts.present / (statusCounts.total || 1) * 100)}% dari total
             </p>
           </motion.div>

           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.3, delay: 0.1 }}
             className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl p-4 text-white shadow-md"
           >
             <div className="flex items-center mb-1">
               <Clock className="h-7 w-7 text-white opacity-80 mr-3" />
               <h3 className="font-semibold text-base">Terlambat</h3>
             </div>
             <p className="text-3xl font-bold">{statusCounts.late}</p>
             <p className="text-xs text-yellow-100 mt-1">
               {Math.round(statusCounts.late / (statusCounts.total || 1) * 100)}% dari total
             </p>
           </motion.div>

           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.3, delay: 0.2 }}
             className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-md"
           >
             <div className="flex items-center mb-1">
               <Calendar className="h-7 w-7 text-white opacity-80 mr-3" />
               <h3 className="font-semibold text-base">Izin</h3>
             </div>
             <p className="text-3xl font-bold">{statusCounts.permitted}</p>
             <p className="text-xs text-blue-100 mt-1">
               {Math.round(statusCounts.permitted / (statusCounts.total || 1) * 100)}% dari total
             </p>
           </motion.div>

           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.3, delay: 0.3 }}
             className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-4 text-white shadow-md"
           >
             <div className="flex items-center mb-1">
               <X className="h-7 w-7 text-white opacity-80 mr-3" />
               <h3 className="font-semibold text-base">Alpha</h3>
             </div>
             <p className="text-3xl font-bold">{statusCounts.absent}</p>
             <p className="text-xs text-red-100 mt-1">
               {Math.round(statusCounts.absent / (statusCounts.total || 1) * 100)}% dari total
             </p>
           </motion.div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
           {/* Chart Section */}
           <div className="bg-white rounded-xl shadow-sm p-6">
             <h2 className="text-lg font-semibold mb-4 flex items-center">
               <PieChart className="mr-2 h-5 w-5 text-indigo-600" />
               Distribusi Kehadiran
             </h2>

             <div className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                 <RechartsInternalPieChart>
                   <Pie
                     data={pieChartData}
                     cx="50%"
                     cy="50%"
                     labelLine={false}
                     outerRadius={80}
                     fill="#8884d8"
                     dataKey="value"
                     label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                   >
                     {pieChartData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                   <Tooltip formatter={(value) => [`${value} guru`, 'Jumlah']} />
                 </RechartsInternalPieChart>
               </ResponsiveContainer>
             </div>
           </div>

           {/* Daily Trend Chart */}
           <div className="bg-white rounded-xl shadow-sm p-6">
             <h2 className="text-lg font-semibold mb-4 flex items-center">
               <BarChart2 className="mr-2 h-5 w-5 text-indigo-600" />
               Tren Kehadiran Harian
             </h2>

             <div className="h-[300px]">
               {dailyData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={dailyData}>
                     <CartesianGrid strokeDasharray="3 3" />
                     <XAxis
                       dataKey="date"
                       tickFormatter={(date) => date.split('-')[2]} // Show only day
                     />
                     <YAxis />
                     <Tooltip
                       formatter={(value, name) => {
                         const nameMap = {
                           present: 'Hadir',
                           late: 'Terlambat',
                           permitted: 'Izin',
                           absent: 'Alpha'
                         };
                         return [value, nameMap[name] || name];
                       }}
                       labelFormatter={(date) => {
                         try {
                           return format(parseISO(date), 'd MMMM yyyy', { locale: id });
                         } catch (e) {
                           return date;
                         }
                       }}
                     />
                     <Legend
                       formatter={(value) => {
                         const nameMap = {
                           present: 'Hadir',
                           late: 'Terlambat',
                           permitted: 'Izin',
                           absent: 'Alpha'
                         };
                         return nameMap[value] || value;
                       }}
                     />
                     <Bar dataKey="present" name="present" fill={COLORS.present} />
                     <Bar dataKey="late" name="late" fill={COLORS.late} />
                     <Bar dataKey="permitted" name="permitted" fill={COLORS.permitted} />
                     <Bar dataKey="absent" name="absent" fill={COLORS.absent} />
                   </BarChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="flex items-center justify-center h-full text-gray-500">
                   Tidak ada data untuk ditampilkan
                 </div>
               )}
             </div>
           </div>
         </div>

         {/* IZIN and ALPHA Tables */}
         <div className="grid grid-cols-1 gap-6 mb-6">
           {/* IZIN Table */}
           <div className="bg-white rounded-xl shadow-sm overflow-hidden">
             <div className="p-6 border-b border-gray-100">
               <h2 className="text-lg font-semibold flex items-center text-blue-700">
                 <Calendar className="mr-2 h-5 w-5" />
                 Daftar Guru dengan Status IZIN
               </h2>
             </div>

             <div className="overflow-x-auto">
               <table className="w-full">
                 <thead>
                   <tr className="bg-blue-50 text-left">
                     <th className="px-6 py-3 text-xs font-medium text-blue-700 uppercase tracking-wider">No</th>
                     <th className="px-6 py-3 text-xs font-medium text-blue-700 uppercase tracking-wider">Nama</th>
                     <th className="px-6 py-3 text-xs font-medium text-blue-700 uppercase tracking-wider">Tanggal</th>
                     <th className="px-6 py-3 text-xs font-medium text-blue-700 uppercase tracking-wider">Waktu</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-200">
                   {permittedTeachers.length > 0 ? (
                     permittedTeachers.map((teacher, index) => (
                       <tr key={index} className="hover:bg-gray-50">
                         <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                           {index + 1}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                           {teacher.name}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                           {format(parseISO(teacher.date), 'd MMMM yyyy', { locale: id })}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                           {teacher.time}
                         </td>
                       </tr>
                     ))
                   ) : (
                     <tr>
                       <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                         Tidak ada data guru dengan status IZIN
                       </td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
           </div>

           {/* ALPHA Table */}
           <div className="bg-white rounded-xl shadow-sm overflow-hidden">
             <div className="p-6 border-b border-gray-100">
               <h2 className="text-lg font-semibold flex items-center text-red-700">
                 <X className="mr-2 h-5 w-5" />
                 Daftar Guru dengan Status ALPHA
               </h2>
             </div>

             <div className="overflow-x-auto">
               <table className="w-full">
                 <thead>
                   <tr className="bg-red-50 text-left">
                     <th className="px-6 py-3 text-xs font-medium text-red-700 uppercase tracking-wider">No</th>
                     <th className="px-6 py-3 text-xs font-medium text-red-700 uppercase tracking-wider">Nama</th>
                     <th className="px-6 py-3 text-xs font-medium text-red-700 uppercase tracking-wider">Tanggal</th>
                     <th className="px-6 py-3 text-xs font-medium text-red-700 uppercase tracking-wider">Status</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-200">
                   {absentTeachers.length > 0 ? (
                     absentTeachers.map((teacher, index) => (
                       <tr key={index} className="hover:bg-gray-50">
                         <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                           {index + 1}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                           {teacher.name}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                           {format(parseISO(teacher.date), 'd MMMM yyyy', { locale: id })}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                           <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                             {teacher.status}
                           </span>
                         </td>
                       </tr>
                     ))
                   ) : (
                     <tr>
                       <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                         Tidak ada data guru dengan status ALPHA
                       </td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
           </div>
         </div>

         {/* Download Buttons */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
           <button
             onClick={generatePDF}
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
             onClick={generateExcel}
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
       </>
     )}
   </div>
 );
}
