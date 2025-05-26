"use client";
import React, { useState, useEffect } from "react";
import { ArrowLeft, Calendar, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { format, subMonths, addMonths } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { jsPDF } from "jspdf";
export default function TeacherAttendanceReports() {
 const { schoolId, user } = useAuth();
 const [currentDate, setCurrentDate] = useState(new Date());
 const [isDownloading, setIsDownloading] = useState(false);
 const [loading, setLoading] = useState(true);
 const [teachers, setTeachers] = useState<any[]>([]);
 const [filteredTeachers, setFilteredTeachers] = useState<any[]>([]);
 const [userData, setUserData] = useState<any>(null);
 const [attendanceData, setAttendanceData] = useState<any[]>([]);
 const [dateRange, setDateRange] = useState({
   start: format(new Date(new Date().setDate(1)), "yyyy-MM-dd"),
   end: format(new Date(new Date().setMonth(new Date().getMonth() + 1, 0)), "yyyy-MM-dd")
 });
 // Helper function to calculate percentages for attendance data
 const calculatePercentage = (data: any[], type: string): string => {
   if (!data || data.length === 0) return "0.0";
   const item = data.find(item => {
     if (type === 'present') return item.type === 'Hadir';
     if (type === 'late') return item.type === 'Terlambat';
     if (type === 'permitted') return item.type === 'Izin';
     if (type === 'absent') return item.type === 'Alpha';
     return false;
   });
   return item ? item.value : "0.0";
 };
 const [schoolInfo, setSchoolInfo] = useState({
   name: "NAMA SEKOLAH",
   address: "Alamat",
   npsn: "NPSN",
   principalName: "",
   principalNip: ""
 });
 // Format current date for display
 const formattedMonth = format(currentDate, "MMMM yyyy", {
   locale: id
 });
 const formattedYear = format(currentDate, "yyyy");
 // Fetch school, teachers and attendance data
 useEffect(() => {
   const fetchData = async () => {
     if (!schoolId) return;
     try {
       setLoading(true);
       // Fetch school info
       const schoolDoc = await getDoc(doc(db, "schools", schoolId));
       if (schoolDoc.exists()) {
         const data = schoolDoc.data();
         setSchoolInfo({
           name: data.name || "NAMA SEKOLAH",
           address: data.address || "Alamat",
           npsn: data.npsn || "NPSN",
           principalName: data.principalName || "",
           principalNip: data.principalNip || ""
         });
       }
       // Fetch user data for administrator signature
       if (user) {
         const userDoc = await getDoc(doc(db, "users", user.uid));
         if (userDoc.exists()) {
           setUserData(userDoc.data());
         }
       }
       // Fetch teachers with attendance data
       await fetchAttendanceData();
     } catch (error) {
       console.error("Error fetching data:", error);
       toast.error("Gagal mengambil data dari database");
     } finally {
       setLoading(false);
     }
   };
   fetchData();
 }, [schoolId, user]);
 // Fetch attendance data when month changes
 useEffect(() => {
   if (schoolId) {
     fetchAttendanceData();
   }
 }, [currentDate, schoolId]);
 // Set all teachers to filtered teachers
 useEffect(() => {
   setFilteredTeachers(teachers);
 }, [teachers]);
 // Function to fetch attendance data
 const fetchAttendanceData = async () => {
   if (!schoolId) return;
   try {
     setLoading(true);
     // Get start and end date for the month
     const year = currentDate.getFullYear();
     const month = currentDate.getMonth() + 1;
     const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
     const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;
     // Get all teachers
     const usersRef = collection(db, "users");
     const teachersQuery = query(
       usersRef,
       where("schoolId", "==", schoolId),
       where("role", "in", ["teacher", "staff"])
     );
     const teachersSnapshot = await getDocs(teachersQuery);
     const teachersList: any[] = [];
     teachersSnapshot.forEach(doc => {
       teachersList.push({
         id: doc.id,
         ...doc.data(),
         // Initialize attendance counters
         hadir: 0,
         terlambat: 0,
         izin: 0,
         alpha: 0,
         total: 0
       });
     });
     // If we have teachers, get their attendance for the selected month
     if (teachersList.length > 0) {
       const attendanceRef = collection(db, "teacherAttendance");
       const attendanceQuery = query(
         attendanceRef,
         where("schoolId", "==", schoolId),
         where("date", ">=", startDate),
         where("date", "<=", endDate)
       );
       const attendanceSnapshot = await getDocs(attendanceQuery);
       // Process attendance records
       attendanceSnapshot.forEach(doc => {
         const data = doc.data();
         const teacherId = data.teacherId;
         const status = data.status;
         const type = data.type; // 'in' or 'out'
         // Find the teacher and update their attendance counts
         const teacherIndex = teachersList.findIndex(t => t.id === teacherId);
         if (teacherIndex !== -1) {
           // Only count check-ins, not check-outs
           if (type === 'in') {
             if (status === 'present') {
               teachersList[teacherIndex].hadir++;
             } else if (status === 'late') {
               teachersList[teacherIndex].terlambat++;
             } else if (status === 'permitted') {
               teachersList[teacherIndex].izin++;
             } else if (status === 'absent') {
               teachersList[teacherIndex].alpha++;
             }
             teachersList[teacherIndex].total++;
           }
         }
       });
     }
     setTeachers(teachersList);
     setFilteredTeachers(teachersList);
     // Calculate overall percentages
     let totalHadir = 0;
     let totalTerlambat = 0;
     let totalIzin = 0;
     let totalAlpha = 0;
     let totalAttendance = 0;

     teachersList.forEach(teacher => {
       totalHadir += teacher.hadir || 0;
       totalTerlambat += teacher.terlambat || 0;
       totalIzin += teacher.izin || 0;
       totalAlpha += teacher.alpha || 0;
       totalAttendance += teacher.total || 0;
     });
     // Prevent division by zero
     if (totalAttendance === 0) totalAttendance = 1;
     // Calculate percentages with one decimal place
     const hadirPercentage = (totalHadir / totalAttendance * 100).toFixed(1);
     const terlambatPercentage = (totalTerlambat / totalAttendance * 100).toFixed(1);
     const izinPercentage = (totalIzin / totalAttendance * 100).toFixed(1);
     const alphaPercentage = (totalAlpha / totalAttendance * 100).toFixed(1);

     setAttendanceData([
       {
         type: 'Hadir',
         value: hadirPercentage,
         color: 'bg-blue-100 text-blue-800',
         count: totalHadir
       },
       {
         type: 'Terlambat',
         value: terlambatPercentage,
         color: 'bg-amber-100 text-amber-800',
         count: totalTerlambat
       },
       {
         type: 'Izin',
         value: izinPercentage,
         color: 'bg-green-100 text-green-800',
         count: totalIzin
       },
       {
         type: 'Alpha',
         value: alphaPercentage,
         color: 'bg-red-100 text-red-800',
         count: totalAlpha
       }
     ]);
   } catch (error) {
     console.error("Error fetching attendance data:", error);
     toast.error("Gagal mengambil data kehadiran");
   } finally {
     setLoading(false);
   }
 };
 const handlePrevMonth = () => {
   setCurrentDate(subMonths(currentDate, 1));
 };
 const handleNextMonth = () => {
   setCurrentDate(addMonths(currentDate, 1));
 };
 const handleDownloadPDF = async () => {
   setIsDownloading(true);
   try {
     const pdfDoc = new jsPDF({
       orientation: "portrait",
       unit: "mm",
       format: "a4"
     });
     const pageWidth = pdfDoc.internal.pageSize.getWidth();
     const pageHeight = pdfDoc.internal.pageSize.getHeight();
     const margin = 15;
     // Add header with school information
     pdfDoc.setFontSize(16);
     pdfDoc.setFont("helvetica", "bold");
     pdfDoc.text(schoolInfo.name.toUpperCase(), pageWidth / 2, margin, {
       align: "center"
     });
     pdfDoc.setFontSize(12);
     pdfDoc.setFont("helvetica", "normal");
     pdfDoc.text(schoolInfo.address, pageWidth / 2, margin + 7, {
       align: "center"
     });
     pdfDoc.text(`NPSN: ${schoolInfo.npsn}`, pageWidth / 2, margin + 14, {
       align: "center"
     });
     // Add horizontal line
     pdfDoc.setLineWidth(0.5);
     pdfDoc.line(margin, margin + 20, pageWidth - margin, margin + 20);
     // Add title
     pdfDoc.setFontSize(12);
     pdfDoc.setFont("helvetica", "normal");
     pdfDoc.text("REKAPITULASI LAPORAN ABSENSI GURU DAN TENAGA KEPENDIDIKAN", pageWidth / 2, margin + 30, {
       align: "center"
     });
     pdfDoc.text(`BULAN ${formattedMonth.toUpperCase()}`, pageWidth / 2, margin + 36, {
       align: "center"
     });
     // Main attendance table
     let yPos = margin + 43;
     // Table headers
     const headers = ["NO.", "NAMA GURU", "", "JABATAN", "HADIR", "TERLAMBAT", "IZIN", "ALPHA", "TOTAL"];
     const colWidths = [12, 54, 0, 20, 17, 25, 15, 17, 20];
     // Draw table header - Light blue background
     pdfDoc.setFillColor(173, 216, 230);
     pdfDoc.rect(margin, yPos, pageWidth - margin * 2, 8, "F");
     pdfDoc.setDrawColor(0);
     pdfDoc.rect(margin, yPos, pageWidth - margin * 2, 8, "S"); // Border
     let xPos = margin;
     pdfDoc.setFontSize(9);
     pdfDoc.setTextColor(0);
     // Draw vertical lines and headers
     headers.forEach((header, i) => {
       if (i > 0) {
         pdfDoc.line(xPos, yPos, xPos, yPos + 8);
       }
       pdfDoc.text(header, xPos + colWidths[i] / 2, yPos + 5.5, {
         align: "center"
       });
       xPos += colWidths[i];
     });
     yPos += 8;
     // Draw table rows
     pdfDoc.setFontSize(10);
     let totalHadir = 0,
       totalTerlambat = 0,
       totalIzin = 0,
       totalAlpha = 0,
       totalAll = 0;
     // Process each teacher's data
     filteredTeachers.forEach((teacher, index) => {
       // Row background (alternating)
       if (index % 2 === 0) {
         pdfDoc.setFillColor(240, 240, 240);
         pdfDoc.rect(margin, yPos, pageWidth - margin * 2, 7, "F");
       }
       // Draw row border
       pdfDoc.rect(margin, yPos, pageWidth - margin * 2, 7, "S");
       // Calculate totals
       totalHadir += teacher.hadir || 0;
       totalTerlambat += teacher.terlambat || 0;
       totalIzin += teacher.izin || 0;
       totalAlpha += teacher.alpha || 0;
       const teacherTotal = (teacher.hadir || 0) + (teacher.terlambat || 0) + (teacher.izin || 0) + (teacher.alpha || 0);
       totalAll += teacherTotal;
       // Draw cell content
       xPos = margin;
       // Number
       pdfDoc.text((index + 1).toString(), xPos + colWidths[0] / 2, yPos + 5, {
         align: "center"
       });
       xPos += colWidths[0];
       // Draw vertical line
       pdfDoc.line(xPos, yPos, xPos, yPos + 7);
       // Name - truncate if too long
       const displayName = teacher.name.length > 25 ? teacher.name.substring(0, 22) + "..." : teacher.name;
       pdfDoc.text(displayName || "", xPos + 2, yPos + 5);
       xPos += colWidths[1];
  // Draw vertical line
      pdfDoc.line(xPos, yPos, xPos, yPos + 7);
       //pdfDoc.text(teacher.nik || "", xPos + colWidths[2] / 2, yPos + 5, {
        // align: "center"
      // });
      xPos += colWidths[2];
       // Draw vertical line
       pdfDoc.line(xPos, yPos, xPos, yPos + 7);
       const roleText = teacher.role === 'teacher' ? 'Guru' : 'Tendik';
       pdfDoc.text(roleText, xPos + colWidths[3] / 2, yPos + 5, {
         align: "center"
       });
       xPos += colWidths[3];
       // Draw vertical line
       pdfDoc.line(xPos, yPos, xPos, yPos + 7);
       pdfDoc.text((teacher.hadir || 0).toString(), xPos + colWidths[4] / 2, yPos + 5, {
         align: "center"
       });
       xPos += colWidths[4];
       // Draw vertical line
       pdfDoc.line(xPos, yPos, xPos, yPos + 7);
       pdfDoc.text((teacher.terlambat || 0).toString(), xPos + colWidths[5] / 2, yPos + 5, {
         align: "center"
       });
       xPos += colWidths[5];
       // Draw vertical line
       pdfDoc.line(xPos, yPos, xPos, yPos + 7);
       pdfDoc.text((teacher.izin || 0).toString(), xPos + colWidths[6] / 2, yPos + 5, {
         align: "center"
       });
       xPos += colWidths[6];
       // Draw vertical line
       pdfDoc.line(xPos, yPos, xPos, yPos + 7);
       pdfDoc.text((teacher.alpha || 0).toString(), xPos + colWidths[7] / 2, yPos + 5, {
         align: "center"
       });
       xPos += colWidths[7];
       // Draw vertical line
       pdfDoc.line(xPos, yPos, xPos, yPos + 7);
       pdfDoc.text(teacherTotal.toString(), xPos + colWidths[8] / 2, yPos + 5, {
         align: "center"
       });
       yPos += 7;
       // Add a new page if needed
       if (yPos > pageHeight - margin - 100 && index < filteredTeachers.length - 1) {
         pdfDoc.addPage();
         // Add header to new page
         pdfDoc.setFontSize(12);
         pdfDoc.setFont("helvetica", "bold");
         pdfDoc.text(schoolInfo.name.toUpperCase(), pageWidth / 2, margin + 6, {
           align: "center"
         });
         pdfDoc.setFontSize(12);
         pdfDoc.setFont("helvetica", "normal");
         pdfDoc.text(schoolInfo.address, pageWidth / 2, margin + 12, {
           align: "center"
         });
         pdfDoc.text(`NPSN : ${schoolInfo.npsn}`, pageWidth / 2, margin + 18, {
           align: "center"
         });
         // Add horizontal line
         pdfDoc.setLineWidth(0.5);
         pdfDoc.line(margin, margin + 22, pageWidth - margin, margin + 22);
         yPos = margin + 30;
         // Add table header
         pdfDoc.setFillColor(173, 216, 230);
         pdfDoc.rect(margin, yPos, pageWidth - margin * 2, 8, "F");
         pdfDoc.rect(margin, yPos, pageWidth - margin * 2, 8, "S");
         xPos = margin;
         pdfDoc.setFontSize(10);
         // Draw headers again
         headers.forEach((header, i) => {
           if (i > 0) {
             pdfDoc.line(xPos, yPos, xPos, yPos + 8);
           }
           pdfDoc.text(header, xPos + colWidths[i] / 2, yPos + 5.5, {
             align: "center"
           });
           xPos += colWidths[i];
         });
         yPos += 8;
         pdfDoc.setFontSize(10);
       }
     });
     // Add total row
     pdfDoc.setFillColor(200, 200, 200);
     pdfDoc.rect(margin, yPos, pageWidth - margin * 2, 8, "F");
     pdfDoc.rect(margin, yPos, pageWidth - margin * 2, 8, "S");
     xPos = margin;
     pdfDoc.setFontSize(10);
     pdfDoc.setFont("helvetica", "normal");
     // Total text
     pdfDoc.text("TOTAL", xPos + colWidths[0] / 2 + colWidths[1] / 2, yPos + 5, {
       align: "center"
     });
     xPos += colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3];
     // Draw vertical line
     pdfDoc.line(xPos, yPos, xPos, yPos + 8);
     pdfDoc.text(totalHadir.toString(), xPos + colWidths[4] / 2, yPos + 5, {
       align: "center"
     });
     xPos += colWidths[4];
     // Draw vertical line
     pdfDoc.line(xPos, yPos, xPos, yPos + 8);
     pdfDoc.text(totalTerlambat.toString(), xPos + colWidths[5] / 2, yPos + 5, {
       align: "center"
     });
     xPos += colWidths[5];
     // Draw vertical line
     pdfDoc.line(xPos, yPos, xPos, yPos + 8);
     pdfDoc.text(totalIzin.toString(), xPos + colWidths[6] / 2, yPos + 5, {
       align: "center"
     });
     xPos += colWidths[6];
     // Draw vertical line
     pdfDoc.line(xPos, yPos, xPos, yPos + 8);
     pdfDoc.text(totalAlpha.toString(), xPos + colWidths[7] / 2, yPos + 5, {
       align: "center"
     });
     xPos += colWidths[7];
     // Draw vertical line
     pdfDoc.line(xPos, yPos, xPos, yPos + 8);
     pdfDoc.text(totalAll.toString(), xPos + colWidths[8] / 2, yPos + 5, {
       align: "center"
     });
     yPos += 18;
     // Get top teachers by category
     const getTopTeachersByCategory = () => {
       const sortedByHadir = [...teachers].sort((a, b) => (b.hadir || 0) - (a.hadir || 0)).slice(0, 3);
       const sortedByTerlambat = [...teachers].sort((a, b) => (b.terlambat || 0) - (a.terlambat || 0)).slice(0, 3);
       const sortedByIzin = [...teachers].sort((a, b) => (b.izin || 0) - (a.izin || 0)).slice(0, 3);
       const sortedByAlpha = [...teachers].sort((a, b) => (b.alpha || 0) - (a.alpha || 0)).slice(0, 3);

       return {
         hadir: sortedByHadir,
         terlambat: sortedByTerlambat,
         izin: sortedByIzin,
         alpha: sortedByAlpha
       };
     };

     const topTeachersByCategory = getTopTeachersByCategory();
     // Add sections for teachers with most attendance in each category
     const addTeacherCategorySection = (title, teachers, startY) => {
       pdfDoc.setFontSize(10);
       pdfDoc.setFont("helvetica", "normal");
       pdfDoc.text(title + " Terbanyak :", margin, startY);
       const tableHeaders = ["No.", "Nama", "NIK", "Jabatan", "Jumlah"];
       const colWidths = [10, 55, 38, 23, 27];
       let yPosition = startY + 5;
       // Draw header row
       pdfDoc.setFillColor(173, 216, 230);
       pdfDoc.rect(margin, yPosition, colWidths.reduce((a, b) => a + b, 0), 8, "F");
       pdfDoc.rect(margin, yPosition, colWidths.reduce((a, b) => a + b, 0), 8, "S");
       let xPosition = margin;
       // Draw column headers
       tableHeaders.forEach((header, i) => {
         if (i > 0) {
           pdfDoc.line(xPosition, yPosition, xPosition, yPosition + 8);
         }
         pdfDoc.text(header, xPosition + colWidths[i] / 2, yPosition + 5, {
           align: "center"
         });
         xPosition += colWidths[i];
       });
       yPosition += 8;
       // Draw rows
       pdfDoc.setFont("helvetica", "normal");
       teachers.forEach((teacher, index) => {
         // Draw row border
         pdfDoc.rect(margin, yPosition, colWidths.reduce((a, b) => a + b, 0), 8, "S");
         xPosition = margin;
         // Number
         pdfDoc.text((index + 1).toString(), xPosition + colWidths[0] / 2, yPosition + 5, {
           align: "center"
         });
         xPosition += colWidths[0];
         pdfDoc.line(xPosition, yPosition, xPosition, yPosition + 8);
         // Name - truncate if too long
         const displayName = teacher.name.length > 25 ? teacher.name.substring(0, 22) + "..." : teacher.name;
         pdfDoc.text(displayName || "", xPosition + 2, yPosition + 5);
         xPosition += colWidths[1];
         pdfDoc.line(xPosition, yPosition, xPosition, yPosition + 8);
         // NIP/NIK
         pdfDoc.text(teacher.nik || "", xPosition + colWidths[2] / 2, yPosition + 5, {
           align: "center"
         });
         xPosition += colWidths[2];
         pdfDoc.line(xPosition, yPosition, xPosition, yPosition + 8);
         // Role
         const roleText = teacher.role === 'teacher' ? 'Guru' : 'Tendik';
         pdfDoc.text(roleText, xPosition + colWidths[3] / 2, yPosition + 5, {
           align: "center"
         });
         xPosition += colWidths[3];
         pdfDoc.line(xPosition, yPosition, xPosition, yPosition + 8);
         // Count - varies depending on section type
         let count = 0;
         switch (title) {
           case "Guru/Tendik dengan Hadir":
             count = teacher.hadir || 0;
             break;
           case "Guru/Tendik dengan Terlambat":
             count = teacher.terlambat || 0;
             break;
           case "Guru/Tendik dengan Izin":
             count = teacher.izin || 0;
             break;
           case "Guru/Tendik dengan Alpha":
             count = teacher.alpha || 0;
             break;
         }
         pdfDoc.text(count.toString(), xPosition + colWidths[4] / 2, yPosition + 5, {
           align: "center"
         });
         yPosition += 8;
       });
       return yPosition;
     };
     // Check if we need a new page for the teacher sections
     if (yPos + 120 > pageHeight) {
       pdfDoc.addPage();
       yPos = margin + 20;
     }
     // Teachers with most "Hadir"
     yPos = addTeacherCategorySection("Guru/Tendik dengan Hadir", topTeachersByCategory.hadir, yPos) + 8;
     // Teachers with most "Terlambat"
     yPos = addTeacherCategorySection("Guru/Tendik dengan Terlambat", topTeachersByCategory.terlambat, yPos) + 8;
     // Check if we need a new page for the remaining sections
     if (yPos + 80 > pageHeight) {
       pdfDoc.addPage();
       yPos = margin + 20;
     }
     // Teachers with most "Izin"
     yPos = addTeacherCategorySection("Guru/Tendik dengan Izin", topTeachersByCategory.izin, yPos) + 8;
     // Teachers with most "Alpha"
     yPos = addTeacherCategorySection("Guru/Tendik dengan Alpha", topTeachersByCategory.alpha, yPos) + 12;
     // Add signature section
     yPos += 5;
     // Signature layout
     const signatureWidth = (pageWidth - margin * 2) / 2;
     pdfDoc.setFontSize(10);
     pdfDoc.setFont("helvetica", "normal");
     pdfDoc.text("Mengetahui", signatureWidth * 0.25 + margin, yPos, {
       align: "center"
     });
     pdfDoc.text("Administrator Sekolah", signatureWidth * 1.75 + margin, yPos, {
       align: "center"
     });
     yPos += 5;
     pdfDoc.text("KEPALA SEKOLAH,", signatureWidth * 0.25 + margin, yPos, {
       align: "center"
     });
     pdfDoc.text("Absensi Digital,", signatureWidth * 1.75 + margin, yPos, {
       align: "center"
     });
     yPos += 20;
     pdfDoc.text(schoolInfo.principalName || "Kepala Sekolah", signatureWidth * 0.25 + margin, yPos, {
       align: "center"
     });
     pdfDoc.text(userData?.name || "Administrator", signatureWidth * 1.75 + margin, yPos, {
       align: "center"
     });
     yPos += 5;
     pdfDoc.text(`NIP. ${schoolInfo.principalNip || "................................"}`, signatureWidth * 0.25 + margin, yPos, {
       align: "center"
     });
     pdfDoc.text("NIP. ....................................", signatureWidth * 1.75 + margin, yPos, {
       align: "center"
     });
     // Save the PDF
     const fileName = `Rekap_Kehadiran_Guru_${formattedMonth.replace(' ', '_')}.pdf`;
     pdfDoc.save(fileName);
     toast.success(`Laporan berhasil diunduh sebagai ${fileName}`);
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
     // Create header data with school information
     const headerData = [
       [schoolInfo.name.toUpperCase()],
       [schoolInfo.address],
       [`NPSN: ${schoolInfo.npsn}`],
       [""],
       ["REKAPITULASI LAPORAN ABSENSI GURU DAN TENAGA KEPENDIDIKAN"],
       [`BULAN ${formattedMonth.toUpperCase()}`],
       [""],
       ["No.", "Nama Guru/Tendik", "NIK", "Jabatan", "Hadir", "Terlambat", "Izin", "Alpha", "Total"]
     ];
     // Calculate totals for summary
     let totalHadir = 0;
     let totalTerlambat = 0;
     let totalIzin = 0;
     let totalAlpha = 0;
     let totalAll = 0;
     // Add teacher data
     filteredTeachers.forEach((teacher, index) => {
       const teacherHadir = teacher.hadir || 0;
       const teacherTerlambat = teacher.terlambat || 0;
       const teacherIzin = teacher.izin || 0;
       const teacherAlpha = teacher.alpha || 0;
       const teacherTotal = teacherHadir + teacherTerlambat + teacherIzin + teacherAlpha;
       const roleText = teacher.role === 'teacher' ? 'Guru' : 'Tendik';
       // Add to totals
       totalHadir += teacherHadir;
       totalTerlambat += teacherTerlambat;
       totalIzin += teacherIzin;
       totalAlpha += teacherAlpha;
       totalAll += teacherTotal;

       headerData.push([
         index + 1,
         teacher.name || "nama guru/tendik",
         teacher.nik || "nip/nik",
         roleText,
         teacherHadir,
         teacherTerlambat,
         teacherIzin,
         teacherAlpha,
         teacherTotal
       ]);
     });
     // Add total row
     headerData.push([
       "Total", "", "", "",
       totalHadir.toString(),
       totalTerlambat.toString(),
       totalIzin.toString(),
       totalAlpha.toString(),
       totalAll.toString()
     ]);
     // Add empty rows
     headerData.push([]);
     headerData.push([]);
     // Get top teachers by category
     const topTeachersByHadir = [...filteredTeachers].sort((a, b) => (b.hadir || 0) - (a.hadir || 0)).slice(0, 3);
     const topTeachersByTerlambat = [...filteredTeachers].sort((a, b) => (b.terlambat || 0) - (a.terlambat || 0)).slice(0, 3);
     const topTeachersByIzin = [...filteredTeachers].sort((a, b) => (b.izin || 0) - (a.izin || 0)).slice(0, 3);
     const topTeachersByAlpha = [...filteredTeachers].sort((a, b) => (b.alpha || 0) - (a.alpha || 0)).slice(0, 3);
     // Add "Guru/Tendik dengan Hadir Terbanyak" section
     headerData.push(["Guru/Tendik dengan Hadir Terbanyak :"]);
     headerData.push(["No.", "Nama", "NIP/NIK", "Jabatan", "Jumlah"]);
     topTeachersByHadir.forEach((teacher, index) => {
       headerData.push([
         index + 1,
         teacher.name || "nama",
         teacher.nik || "nip/nik",
         teacher.role === 'teacher' ? 'Guru' : 'Tendik',
         teacher.hadir || 0
       ]);
     });
     // Add empty row
     headerData.push([]);
     // Add "Guru/Tendik dengan Terlambat Terbanyak" section
     headerData.push(["Guru/Tendik dengan Terlambat Terbanyak :"]);
     headerData.push(["No.", "Nama", "NIP/NIK", "Jabatan", "Jumlah"]);
     topTeachersByTerlambat.forEach((teacher, index) => {
       headerData.push([
         index + 1,
         teacher.name || "nama",
         teacher.nik || "nip/nik",
         teacher.role === 'teacher' ? 'Guru' : 'Tendik',
         teacher.terlambat || 0
       ]);
     });
     // Add empty row
     headerData.push([]);
     // Add "Guru/Tendik dengan Izin Terbanyak" section
     headerData.push(["Guru/Tendik dengan Izin Terbanyak :"]);
     headerData.push(["No.", "Nama", "NIP/NIK", "Jabatan", "Jumlah"]);
     topTeachersByIzin.forEach((teacher, index) => {
       headerData.push([
         index + 1,
         teacher.name || "nama",
         teacher.nik || "nip/nik",
         teacher.role === 'teacher' ? 'Guru' : 'Tendik',
         teacher.izin || 0
       ]);
     });
     // Add empty row
     headerData.push([]);
     // Add "Guru/Tendik dengan Alpha Terbanyak" section
     headerData.push(["Guru/Tendik dengan Alpha Terbanyak :"]);
     headerData.push(["No.", "Nama", "NIP/NIK", "Jabatan", "Jumlah"]);
     topTeachersByAlpha.forEach((teacher, index) => {
       headerData.push([
         index + 1,
         teacher.name || "nama",
         teacher.nik || "nip/nik",
         teacher.role === 'teacher' ? 'Guru' : 'Tendik',
         teacher.alpha || 0
       ]);
     });
     // Add signature section
     headerData.push([]);
     headerData.push([]);
     headerData.push([]);
     // Add signature
     const currentDate = format(new Date(), "d MMMM yyyy", {
       locale: id
     });
     headerData.push([`${schoolInfo.address}, ${currentDate}`]);
     headerData.push([]);
     headerData.push(["", "Mengetahui", "", "", "", "", "", "Administrator Sekolah"]);
     headerData.push(["", "KEPALA SEKOLAH,", "", "", "", "", "", "Nama Sekolah,"]);
     headerData.push([]);
     headerData.push([]);
     headerData.push([]);
     headerData.push(["", schoolInfo.principalName, "", "", "", "", "", userData?.name || "Administrator"]);
     headerData.push(["", `NIP. ${schoolInfo.principalNip}`, "", "", "", "", "", "NIP. ..............................."]);
     // Create workbook and add worksheet
     const wb = XLSX.utils.book_new();
     const ws = XLSX.utils.aoa_to_sheet(headerData);
     // Set column widths
     const colWidths = [
       { wch: 6 },  // No.
       { wch: 30 }, // Name
       { wch: 15 }, // NIP/NIK
       { wch: 15 }, // Jabatan
       { wch: 8 },  // Hadir
       { wch: 12 }, // Terlambat
       { wch: 8 },  // Izin
       { wch: 8 },  // Alpha
       { wch: 8 }   // Total
     ];
     ws['!cols'] = colWidths;
     // Add worksheet to workbook
     XLSX.utils.book_append_sheet(wb, ws, "Rekap Kehadiran Guru");
     // Generate filename with current date
     const fileName = `Rekap_Kehadiran_Guru_${formattedMonth.replace(' ', '_')}.xlsx`;
     XLSX.writeFile(wb, fileName);
     toast.success(`Laporan berhasil diunduh sebagai ${fileName}`);
   } catch (error) {
     console.error("Error generating Excel:", error);
     toast.error("Gagal mengunduh laporan Excel");
   } finally {
     setIsDownloading(false);
   }
 };
 // Calculate attendance summary
 const calculateSummary = () => {
   if (!attendanceData || attendanceData.length === 0) {
     return {
       hadir: "0.0",
       terlambat: "0.0",
       izin: "0.0",
       alpha: "0.0"
     };
   }

   return {
     hadir: calculatePercentage(attendanceData, 'present'),
     terlambat: calculatePercentage(attendanceData, 'late'),
     izin: calculatePercentage(attendanceData, 'permitted'),
     alpha: calculatePercentage(attendanceData, 'absent')
   };
 };

 const summary = calculateSummary();
 return (
   <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6">
     <div className="flex items-center mb-6">
       <Link href="/dashboard/absensi-guru" className="p-2 mr-2 hover:bg-gray-100 rounded-full">
         <ArrowLeft size={20} />
       </Link>
       <h1 className="text-2xl font-bold text-gray-800"><span className="editable-text">Rekap Kehadiran Guru dan Tendik</span></h1>
     </div>

     <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
       <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 md:mb-6">
         <div className="flex items-center mb-4 md:mb-0">
           <div className="bg-blue-100 p-2 rounded-lg mr-3">
             <Calendar className="h-6 w-6 text-blue-600" />
           </div>
           <h2 className="text-xl font-semibold"><span className="editable-text">Bulan : </span>{formattedMonth}</h2>
         </div>

         <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
           <button onClick={handlePrevMonth} className="p-2 rounded-md border border-gray-300 hover:bg-gray-50"><span className="editable-text">
             Sebelumnya
           </span></button>
           <button onClick={handleNextMonth} className="p-2 rounded-md border border-gray-300 hover:bg-gray-50"><span className="editable-text">
             Berikutnya
           </span></button>
         </div>
       </div>

       {/* Attendance Summary Cards */}
       <div className="grid grid-cols-2 gap-4 mb-6">
         <div className="bg-blue-100 p-4 rounded-lg">
           <h3 className="text-sm font-medium text-gray-700 mb-1"><span className="editable-text">Hadir</span></h3>
           <p className="text-3xl font-bold text-blue-700">
             {loading ? <span className="animate-pulse"><span className="editable-text">--.--%</span></span> : `${summary.hadir}%`}
           </p>
         </div>
         <div className="bg-amber-100 p-4 rounded-lg">
           <h3 className="text-sm font-medium text-gray-700 mb-1"><span className="editable-text">Terlambat</span></h3>
           <p className="text-3xl font-bold text-amber-700">
             {loading ? <span className="animate-pulse"><span className="editable-text">--.--%</span></span> : `${summary.terlambat}%`}
           </p>
         </div>
         {/*<div className="bg-green-100 p-4 rounded-lg">
           <h3 className="text-sm font-medium text-gray-700 mb-1"><span className="editable-text">Izin</span></h3>
           <p className="text-3xl font-bold text-green-700">
             {loading ? <span className="animate-pulse"><span className="editable-text">--.--%</span></span> : `${summary.izin}%`}
           </p>
         </div>
         <div className="bg-red-100 p-4 rounded-lg">
           <h3 className="text-sm font-medium text-gray-700 mb-1"><span className="editable-text">Alpha</span></h3>
           <p className="text-3xl font-bold text-red-700">
             {loading ? <span className="animate-pulse"><span className="editable-text">--.--%</span></span> : `${summary.alpha}%`}
           </p>
         </div>*/}
       </div>

       {/* School Information and Table */}
       <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
         {/*<div className="text-center p-4 border-b border-gray-200">
           <h2 className="text-xl font-bold uppercase">{schoolInfo.name}</h2>
           <p className="text-gray-600 font-medium">{schoolInfo.address}</p>
         </div>*/}

          <div className="text-center p-4">
            <h2 className="text-gray-700 sm:text-xl font-bold uppercase">{schoolInfo.name}</h2>
            <p className="text-gray-700 font-bold">{schoolInfo.address}</p>
            <p className="text-gray-700 font-bold">NPSN : {schoolInfo.npsn}</p>
          </div>
          <hr className="border-t border-gray-600 mt-1 mb-6" />
          <div className="text-center mb-4 sm:mb-6">
           
            <h3 className="text-gray-700 uppercase">REKAP LAPORAN KEHADIRAN GURU DAN TENDIK</h3>
            <p className="text-gray-700">BULAN {formattedMonth.toUpperCase()}</p>
          </div>

         {loading ? (
           <div className="flex justify-center items-center h-64">
             <Loader2 className="h-12 w-12 text-primary animate-spin" />
           </div>
         ) : (
           <div className="overflow-x-auto">
             <table className="min-w-full border">
               <thead>
                 <tr className="bg-green-100">
                   <th className="border px-2 py-2 text-center text-sm font-bold text-gray-700"><span className="editable-text">Nama</span></th>
                   <th className="border px-2 py-2 text-center text-sm font-bold text-gray-700"><span className="editable-text">NIK</span></th>
                   <th className="border px-2 py-2 text-center text-sm font-bold text-gray-700"><span className="editable-text">Jabatan</span></th>
                   <th className="border px-2 py-2 text-center text-sm font-bold text-gray-700"><span className="editable-text">Hadir</span></th>
                   <th className="border px-2 py-2 text-center text-sm font-bold text-gray-700"><span className="editable-text">Terlambat</span></th>
                   <th className="border px-2 py-2 text-center text-sm font-bold text-gray-700"><span className="editable-text">Izin</span></th>
                   <th className="border px-2 py-2 text-center text-sm font-bold text-gray-700"><span className="editable-text">Alpha</span></th>
                   <th className="border px-2 py-2 text-center text-sm font-bold text-gray-700"><span className="editable-text">Total</span></th>
                 </tr>
               </thead>
               <tbody>
                 {filteredTeachers.length > 0 ? filteredTeachers.map((teacher, index) => (
                   <tr key={teacher.id} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                     <td className="text-gray-600 border px-2 py-1 text-xs sm:text-sm">{teacher.name}</td>
                     <td className="text-gray-600 border px-2 py-1 text-xs sm:text-sm text-center">{teacher.nik}</td>
                     <td className="text-gray-600 border px-2 py-1 text-xs sm:text-sm text-center">
                       {teacher.role === 'teacher' ? 'Guru' : 'Tendik'}
                     </td>
                     <td className="text-gray-600 border px-2 py-1 text-xs sm:text-sm text-center">{teacher.hadir}</td>
                     <td className="text-gray-600 border px-2 py-1 text-xs sm:text-sm text-center">{teacher.terlambat}</td>
                     <td className="text-gray-600 border px-2 py-1 text-xs sm:text-sm text-center">{teacher.izin}</td>
                     <td className="text-gray-600 border px-2 py-1 text-xs sm:text-sm text-center">{teacher.alpha}</td>
                     <td className="text-gray-600 border px-2 py-1 text-xs sm:text-sm text-center">
                       {(teacher.hadir || 0) + (teacher.terlambat || 0) + (teacher.izin || 0) + (teacher.alpha || 0)}
                     </td>
                   </tr>
                 )) : (
                   <tr>
                     <td colSpan={8} className="border px-4 py-4 text-center text-gray-500"><span className="editable-text">
                       Tidak ada data kehadiran yang ditemukan
                     </span></td>
                   </tr>
                 )}

                 {/* Total row */}
                 {filteredTeachers.length > 0 && (
                   <tr className="bg-gray-200 font-medium">
                     <td colSpan={3} className="border px-2 py-2 font-bold text-sm text-center"><span className="editable-text">TOTAL</span></td>
                     <td className="border px-2 py-2 text-center font-bold text-sm">
                       {filteredTeachers.reduce((sum, teacher) => sum + (teacher.hadir || 0), 0)}
                     </td>
                     <td className="border px-2 py-2 text-center font-bold text-sm">
                       {filteredTeachers.reduce((sum, teacher) => sum + (teacher.terlambat || 0), 0)}
                     </td>
                     <td className="border px-2 py-2 text-center font-bold text-sm">
                       {filteredTeachers.reduce((sum, teacher) => sum + (teacher.izin || 0), 0)}
                     </td>
                     <td className="border px-2 py-2 text-center font-bold text-sm">
                       {filteredTeachers.reduce((sum, teacher) => sum + (teacher.alpha || 0), 0)}
                     </td>
                     <td className="border px-2 py-2 text-center font-bold text-sm">
                       {filteredTeachers.reduce((sum, teacher) => sum +
                         ((teacher.hadir || 0) +
                          (teacher.terlambat || 0) +
                          (teacher.izin || 0) +
                          (teacher.alpha || 0)), 0)}
                     </td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
         )}
       </div>
     </div>

     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-20 md:mb-6">
       <button
         onClick={handleDownloadPDF}
         disabled={isDownloading}
         className="flex items-center justify-center gap-3 bg-red-600 text-white p-4 rounded-xl hover:bg-red-700 transition-colors"
       >
         {isDownloading ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileText className="h-6 w-6" />}
         <span className="font-medium"><span className="editable-text">Download Laporan PDF</span></span>
       </button>

       <button
         onClick={handleDownloadExcel}
         disabled={isDownloading}
         className="flex items-center justify-center gap-3 bg-green-600 text-white p-4 rounded-xl hover:bg-green-700 transition-colors"
       >
         {isDownloading ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileSpreadsheet className="h-6 w-6" />}
         <span className="font-medium"><span className="editable-text">Download Laporan Excel</span></span>
       </button>
     </div>
   </div>
 );
}
