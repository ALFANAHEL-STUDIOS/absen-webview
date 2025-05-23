"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Calendar, ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { format, subMonths, addMonths } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { jsPDF } from "jspdf";

export default function MonthlyAttendanceReport() {
  const { schoolId, user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDownloading, setIsDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({
    start: format(new Date(new Date().setDate(new Date().getDate() - 30)), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd")
  });
  const [schoolInfo, setSchoolInfo] = useState({
    name: "NAMA SEKOLAH",
    address: "Alamat",
    npsn: "NPSN",
    principalName: "",
    principalNip: ""
  });
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState("all");

  // Format current date for display
  const formattedMonth = format(currentDate, "MMMM yyyy", { locale: id });
  const formattedYear = format(currentDate, "yyyy");
  
  // Fetch school, classes and attendance data
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
        
        // Fetch classes
        const classesRef = collection(db, `schools/${schoolId}/classes`);
        const classesSnapshot = await getDocs(classesRef);
        const classesData: string[] = [];
        classesSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.name) {
            classesData.push(data.name);
          }
        });
        setClasses(classesData.sort());

        // Fetch students with attendance data
        await fetchAttendanceData();
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Gagal mengambil data dari database");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [schoolId]);

  // Fetch attendance data when month changes
  useEffect(() => {
    if (schoolId) {
      fetchAttendanceData();
    }
  }, [currentDate, schoolId]);
  
  // Set all students to filtered students
  useEffect(() => {
    setFilteredStudents(students);
  }, [students]);

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
      
      // Get all students
      const studentsRef = collection(db, `schools/${schoolId}/students`);
      const studentsQuery = query(studentsRef);
      
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsList: any[] = [];
      
      studentsSnapshot.forEach(doc => {
        studentsList.push({
          id: doc.id,
          ...doc.data(),
          // Initialize attendance counters
          hadir: 0,
          sakit: 0,
          izin: 0,
          alpha: 0,
          total: 0
        });
      });
      
      // If we have students, get their attendance for the selected month
      if (studentsList.length > 0) {
        const attendanceRef = collection(db, `schools/${schoolId}/attendance`);
        const attendanceQuery = query(
          attendanceRef,
          where("date", ">=", startDate),
          where("date", "<=", endDate)
        );
        
        const attendanceSnapshot = await getDocs(attendanceQuery);
        
        // Process attendance records
        attendanceSnapshot.forEach(doc => {
          const data = doc.data();
          const studentId = data.studentId;
          const status = data.status;
          
          // Find the student and update their attendance counts
          const studentIndex = studentsList.findIndex(s => s.id === studentId);
          if (studentIndex !== -1) {
            if (status === 'present' || status === 'hadir') {
              studentsList[studentIndex].hadir++;
            } else if (status === 'sick' || status === 'sakit') {
              studentsList[studentIndex].sakit++;
            } else if (status === 'permitted' || status === 'izin') {
              studentsList[studentIndex].izin++;
            } else if (status === 'absent' || status === 'alpha') {
              studentsList[studentIndex].alpha++;
            }
            
            studentsList[studentIndex].total++;
          }
        });
      }
      
      setStudents(studentsList);
      setFilteredStudents(studentsList);
      
      // Calculate overall percentages
      let totalHadir = 0;
      let totalSakit = 0;
      let totalIzin = 0;
      let totalAlpha = 0;
      let totalAttendance = 0;
      
      studentsList.forEach(student => {
        totalHadir += student.hadir;
        totalSakit += student.sakit;
        totalIzin += student.izin;
        totalAlpha += student.alpha;
        totalAttendance += student.total;
      });
      
      setAttendanceData([
        {
          type: 'Hadir',
          value: totalAttendance > 0 ? ((totalHadir / totalAttendance) * 100).toFixed(1) : "0.0",
          color: 'bg-blue-100 text-blue-800'
        },
        {
          type: 'Sakit',
          value: totalAttendance > 0 ? ((totalSakit / totalAttendance) * 100).toFixed(1) : "0.0",
          color: 'bg-orange-100 text-orange-800'
        },
        {
          type: 'Izin',
          value: totalAttendance > 0 ? ((totalIzin / totalAttendance) * 100).toFixed(1) : "0.0",
          color: 'bg-green-100 text-green-800'
        },
        {
          type: 'Alpha',
          value: totalAttendance > 0 ? ((totalAlpha / totalAttendance) * 100).toFixed(1) : "0.0",
          color: 'bg-red-100 text-red-800'
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


  const handleDownloadPDF = () => {
    setIsDownloading(true);
    try {
      // Use filtered students for PDF generation
      const studentsToExport = filteredStudents;
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;

      // Add header with school information
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(schoolInfo.name.toUpperCase(), pageWidth / 2, margin, { align: "center" });
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(schoolInfo.address, pageWidth / 2, margin + 7, { align: "center" });
      doc.text(`NPSN : ${schoolInfo.npsn}`, pageWidth / 2, margin + 14, { align: "center" });
      
      // Add horizontal line
      doc.setLineWidth(0.5);
      doc.line(margin, margin + 20, pageWidth - margin, margin + 20);

      // Add title
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("REKAPITULASI LAPORAN ABSENSI PESERTA DIDIK", pageWidth / 2, margin + 30, { align: "center" });
      doc.text(`BULAN ${formattedMonth.toUpperCase()}`, pageWidth / 2, margin + 38, { align: "center" });
      
      // Main attendance table
      let yPos = margin + 48;
      
      // Table headers
      const headers = ["No.", "Nama Siswa", "NISN", "Kelas", "Hadir", "Sakit", "Izin", "Alpha", "Total"];
      const colWidths = [10, 50, 25, 15, 15, 15, 15, 15, 15];
      
      // Draw table header - Light blue background
      doc.setFillColor(173, 216, 230);
      doc.rect(margin, yPos, pageWidth - margin * 2, 8, "F");
      doc.setDrawColor(0);
      doc.rect(margin, yPos, pageWidth - margin * 2, 8, "S"); // Border
      
      let xPos = margin;
      doc.setFontSize(9);
      doc.setTextColor(0);
      
      // Draw vertical lines and headers
      headers.forEach((header, i) => {
        if (i > 0) {
          doc.line(xPos, yPos, xPos, yPos + 8);
        }
        doc.text(header, xPos + colWidths[i]/2, yPos + 5.5, { align: "center" });
        xPos += colWidths[i];
      });
      
      yPos += 8;
      
      // Draw table rows
      doc.setFontSize(8);
      let totalHadir = 0, totalSakit = 0, totalIzin = 0, totalAlpha = 0, totalAll = 0;

      filteredStudents.forEach((student, index) => {
        // Row background (alternating)
        if (index % 2 === 0) {
          doc.setFillColor(240, 240, 240);
          doc.rect(margin, yPos, pageWidth - margin * 2, 7, "F");
        }
        
        // Draw row border
        doc.rect(margin, yPos, pageWidth - margin * 2, 7, "S");
        
        // Calculate totals
        totalHadir += student.hadir || 0;
        totalSakit += student.sakit || 0;
        totalIzin += student.izin || 0;
        totalAlpha += student.alpha || 0;
        const studentTotal = (student.hadir || 0) + (student.sakit || 0) + (student.izin || 0) + (student.alpha || 0);
        totalAll += studentTotal;
        
        // Draw cell content
        xPos = margin;
        
        // Number
        doc.text((index + 1).toString(), xPos + colWidths[0]/2, yPos + 5, { align: "center" });
        xPos += colWidths[0];
        
        // Draw vertical line
        doc.line(xPos, yPos, xPos, yPos + 7);
        doc.text(student.name || "", xPos + 2, yPos + 5); xPos += colWidths[1];
        
        // Draw vertical line
        doc.line(xPos, yPos, xPos, yPos + 7);
        doc.text(student.nisn || "", xPos + colWidths[2]/2, yPos + 5, { align: "center" }); xPos += colWidths[2];
        
        // Draw vertical line
        doc.line(xPos, yPos, xPos, yPos + 7);
        doc.text(student.class || "", xPos + colWidths[3]/2, yPos + 5, { align: "center" }); xPos += colWidths[3];
        
        // Draw vertical line
        doc.line(xPos, yPos, xPos, yPos + 7);
        doc.text(student.hadir.toString(), xPos + colWidths[4]/2, yPos + 5, { align: "center" }); xPos += colWidths[4];
        
        // Draw vertical line
        doc.line(xPos, yPos, xPos, yPos + 7);
        doc.text(student.sakit.toString(), xPos + colWidths[5]/2, yPos + 5, { align: "center" }); xPos += colWidths[5];
        
        // Draw vertical line
        doc.line(xPos, yPos, xPos, yPos + 7);
        doc.text(student.izin.toString(), xPos + colWidths[6]/2, yPos + 5, { align: "center" }); xPos += colWidths[6];
        
        // Draw vertical line
        doc.line(xPos, yPos, xPos, yPos + 7);
        doc.text(student.alpha.toString(), xPos + colWidths[7]/2, yPos + 5, { align: "center" }); xPos += colWidths[7];
        
        // Draw vertical line
        doc.line(xPos, yPos, xPos, yPos + 7);
        doc.text(studentTotal.toString(), xPos + colWidths[8]/2, yPos + 5, { align: "center" });
        
        yPos += 7;
        
        // Add a new page if needed
        if (yPos > pageHeight - margin - 100 && index < filteredStudents.length - 1) {
          doc.addPage();
          
          // Add header to new page
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text(schoolInfo.name.toUpperCase(), pageWidth / 2, margin + 6, { align: "center" });
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.text(schoolInfo.address, pageWidth / 2, margin + 12, { align: "center" });
          doc.text(`NPSN: ${schoolInfo.npsn}`, pageWidth / 2, margin + 18, { align: "center" });
          
          // Add horizontal line
          doc.setLineWidth(0.5);
          doc.line(margin, margin + 22, pageWidth - margin, margin + 22);
          
          yPos = margin + 30;
          
          // Add table header
          doc.setFillColor(173, 216, 230);
          doc.rect(margin, yPos, pageWidth - margin * 2, 8, "F");
          doc.rect(margin, yPos, pageWidth - margin * 2, 8, "S");
          
          xPos = margin;
          doc.setFontSize(9);
          
          // Draw headers again
          headers.forEach((header, i) => {
            if (i > 0) {
              doc.line(xPos, yPos, xPos, yPos + 8);
            }
            doc.text(header, xPos + colWidths[i]/2, yPos + 5.5, { align: "center" });
            xPos += colWidths[i];
          });
          
          yPos += 8;
          doc.setFontSize(8);
        }
      });
      
      // Add total row
      doc.setFillColor(200, 200, 200);
      doc.rect(margin, yPos, pageWidth - margin * 2, 8, "F");
      doc.rect(margin, yPos, pageWidth - margin * 2, 8, "S");
      
      xPos = margin;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      
      // Total text
      doc.text("Total", xPos + colWidths[0]/2 + colWidths[1]/2, yPos + 5, { align: "center" });
      xPos += colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3];
      
      // Draw vertical line
      doc.line(xPos, yPos, xPos, yPos + 8);
      doc.text(totalHadir.toString(), xPos + colWidths[4]/2, yPos + 5, { align: "center" }); xPos += colWidths[4];
      
      // Draw vertical line
      doc.line(xPos, yPos, xPos, yPos + 8);
      doc.text(totalSakit.toString(), xPos + colWidths[5]/2, yPos + 5, { align: "center" }); xPos += colWidths[5];
      
      // Draw vertical line
      doc.line(xPos, yPos, xPos, yPos + 8);
      doc.text(totalIzin.toString(), xPos + colWidths[6]/2, yPos + 5, { align: "center" }); xPos += colWidths[6];
      
      // Draw vertical line
      doc.line(xPos, yPos, xPos, yPos + 8);
      doc.text(totalAlpha.toString(), xPos + colWidths[7]/2, yPos + 5, { align: "center" }); xPos += colWidths[7];
      
      // Draw vertical line
      doc.line(xPos, yPos, xPos, yPos + 8);
      doc.text(totalAll.toString(), xPos + colWidths[8]/2, yPos + 5, { align: "center" });
      
      yPos += 15;
      
      // Get top students by category
      const getTopStudentsByCategory = () => {
        const sortedByHadir = [...students].sort((a, b) => (b.hadir || 0) - (a.hadir || 0)).slice(0, 3);
        const sortedBySakit = [...students].sort((a, b) => (b.sakit || 0) - (a.sakit || 0)).slice(0, 3);
        const sortedByIzin = [...students].sort((a, b) => (b.izin || 0) - (a.izin || 0)).slice(0, 3);
        const sortedByAlpha = [...students].sort((a, b) => (b.alpha || 0) - (a.alpha || 0)).slice(0, 3);
        
        return {
          hadir: sortedByHadir,
          sakit: sortedBySakit,
          izin: sortedByIzin,
          alpha: sortedByAlpha
        };
      };
      
      const topStudentsByCategory = getTopStudentsByCategory();
      
      // Add sections for students with most attendance in each category
      const addStudentCategorySection = (title, students, startY) => {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(title + " Terbanyak :", margin, startY);
        
        const tableHeaders = ["No.", "Nama Siswa", "NISN", "Kelas", "Jumlah Hadir"];
        const colWidths = [10, 50, 30, 20, 30];
        
        let yPosition = startY + 5;
        
        // Draw header row
        doc.setFillColor(173, 216, 230);
        doc.rect(margin, yPosition, colWidths.reduce((a, b) => a + b, 0), 8, "F");
        doc.rect(margin, yPosition, colWidths.reduce((a, b) => a + b, 0), 8, "S");
        
        let xPosition = margin;
        
        // Draw column headers
        tableHeaders.forEach((header, i) => {
          if (i > 0) {
            doc.line(xPosition, yPosition, xPosition, yPosition + 8);
          }
          doc.text(header, xPosition + colWidths[i]/2, yPosition + 5, { align: "center" });
          xPosition += colWidths[i];
        });
        
        yPosition += 8;
        
        // Draw rows
        doc.setFont("helvetica", "normal");
        students.forEach((student, index) => {
          // Draw row border
          doc.rect(margin, yPosition, colWidths.reduce((a, b) => a + b, 0), 8, "S");
          
          xPosition = margin;
          
          // Number
          doc.text((index + 1).toString(), xPosition + colWidths[0]/2, yPosition + 5, { align: "center" });
          xPosition += colWidths[0];
          doc.line(xPosition, yPosition, xPosition, yPosition + 8);
          
          // Name
          doc.text(student.name || "", xPosition + 2, yPosition + 5);
          xPosition += colWidths[1];
          doc.line(xPosition, yPosition, xPosition, yPosition + 8);
          
          // NISN
          doc.text(student.nisn || "", xPosition + colWidths[2]/2, yPosition + 5, { align: "center" });
          xPosition += colWidths[2];
          doc.line(xPosition, yPosition, xPosition, yPosition + 8);
          
          // Class
          doc.text(student.class || "", xPosition + colWidths[3]/2, yPosition + 5, { align: "center" });
          xPosition += colWidths[3];
          doc.line(xPosition, yPosition, xPosition, yPosition + 8);
          
          // Count - varies depending on section type
          let count = 0;
          switch(title) {
            case "Siswa dengan Hadir": count = student.hadir || 0; break;
            case "Siswa dengan Sakit": count = student.sakit || 0; break;
            case "Siswa dengan Izin": count = student.izin || 0; break;
            case "Siswa dengan Alpha": count = student.alpha || 0; break;
          }
          doc.text(count.toString(), xPosition + colWidths[4]/2, yPosition + 5, { align: "center" });
          
          yPosition += 8;
        });
        
        return yPosition;
      };
      
      // Check if we need a new page for the student sections
      if (yPos + 120 > pageHeight) {
        doc.addPage();
        yPos = margin + 20;
      }
      
      // Students with most "Hadir"
      yPos = addStudentCategorySection("Siswa dengan Hadir", topStudentsByCategory.hadir, yPos) + 5;
      
      // Students with most "Sakit"
      yPos = addStudentCategorySection("Siswa dengan Sakit", topStudentsByCategory.sakit, yPos) + 5;
      
      // Check if we need a new page for the remaining sections
      if (yPos + 80 > pageHeight) {
        doc.addPage();
        yPos = margin + 20;
      }
      
      // Students with most "Izin"
      yPos = addStudentCategorySection("Siswa dengan Izin", topStudentsByCategory.izin, yPos) + 5;
      
      // Students with most "Alpha"
      yPos = addStudentCategorySection("Siswa dengan Alpha", topStudentsByCategory.alpha, yPos) + 15;
      
      // Add signature section
      yPos += 10;
      
      // Signature layout
      const signatureWidth = (pageWidth - margin * 2) / 2;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      doc.text("Mengetahui", signatureWidth * 0.25 + margin, yPos, { align: "center" });
      doc.text("Administrator Sekolah", signatureWidth * 1.75 + margin, yPos, { align: "center" });
      
      yPos += 5;
      
      doc.text("KEPALA SEKOLAH,", signatureWidth * 0.25 + margin, yPos, { align: "center" });
      doc.text("Nama Sekolah,", signatureWidth * 1.75 + margin, yPos, { align: "center" });
      
      yPos += 25;
      
      doc.text(schoolInfo.principalName || "Kepala Sekolah", signatureWidth * 0.25 + margin, yPos, { align: "center" });
      doc.text(userData?.name || "Administrator", signatureWidth * 1.75 + margin, yPos, { align: "center" });
      
      yPos += 5;
      
      doc.text(`NIP. ${schoolInfo.principalNip || "..........................."}`, signatureWidth * 0.25 + margin, yPos, { align: "center" });
      doc.text("NIP. ...............................", signatureWidth * 1.75 + margin, yPos, { align: "center" });
      
      // Save the PDF
      const fileName = `Rekap_Kehadiran_${formattedMonth.replace(' ', '_')}.pdf`;
      doc.save(fileName);
      
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
      // Use filtered students for Excel generation
      const studentsToExport = filteredStudents;
      // Dynamically import xlsx library
      const XLSX = await import('xlsx');
      
      // Create header data with school information
      const headerData = [
        [schoolInfo.name.toUpperCase()],
        [schoolInfo.address],
        [`NPSN: ${schoolInfo.npsn}`],
        [""],
        ["REKAPITULASI LAPORAN ABSENSI PESERTA DIDIK"],
        [`BULAN ${formattedMonth.toUpperCase()}`],
        [""],
        ["No.", "Nama Siswa", "NISN", "Kelas", "Hadir", "Sakit", "Izin", "Alpha", "Total"]
      ];
      
      // Add student data
      filteredStudents.forEach((student, index) => {
        const studentTotal = (student.hadir || 0) + (student.sakit || 0) + (student.izin || 0) + (student.alpha || 0);
        
        headerData.push([
          index + 1,
          student.name || "nama siswa", 
          student.nisn || "nisn", 
          student.class || "kelas", 
          student.hadir || 0, 
          student.sakit || 0, 
          student.izin || 0, 
          student.alpha || 0, 
          studentTotal
        ]);
      });
      
      // Add total row
      headerData.push(["Total", "", "", "", 
        filteredStudents.reduce((sum, student) => sum + (student.hadir || 0), 0),
        filteredStudents.reduce((sum, student) => sum + (student.sakit || 0), 0),
        filteredStudents.reduce((sum, student) => sum + (student.izin || 0), 0),
        filteredStudents.reduce((sum, student) => sum + (student.alpha || 0), 0),
        filteredStudents.reduce((sum, student) => sum + ((student.hadir || 0) + (student.sakit || 0) + (student.izin || 0) + (student.alpha || 0)), 0)
      ]);
      
      // Add empty rows
      headerData.push([]);
      headerData.push([]);
      
      // Get top students by category
      const topStudentsByHadir = [...filteredStudents].sort((a, b) => (b.hadir || 0) - (a.hadir || 0)).slice(0, 3);
      const topStudentsBySakit = [...filteredStudents].sort((a, b) => (b.sakit || 0) - (a.sakit || 0)).slice(0, 3);
      const topStudentsByIzin = [...filteredStudents].sort((a, b) => (b.izin || 0) - (a.izin || 0)).slice(0, 3); 
      const topStudentsByAlpha = [...filteredStudents].sort((a, b) => (b.alpha || 0) - (a.alpha || 0)).slice(0, 3);
      
      // Add "Siswa dengan Hadir Terbanyak" section
      headerData.push(["Siswa dengan Hadir Terbanyak :"]);
      headerData.push(["No.", "Nama Siswa", "NISN", "Kelas", "Jumlah Hadir"]);
      topStudentsByHadir.forEach((student, index) => {
        headerData.push([
          index + 1,
          student.name || "nama siswa",
          student.nisn || "nisn",
          student.class || "kelas",
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
          student.name || "nama siswa",
          student.nisn || "nisn",
          student.class || "kelas",
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
          student.name || "nama siswa",
          student.nisn || "nisn",
          student.class || "kelas",
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
          student.name || "nama siswa",
          student.nisn || "nisn",
          student.class || "kelas",
          student.alpha || 0
        ]);
      });
      
      // Add signature section
      headerData.push([]);
      headerData.push([]);
      headerData.push([]);
      
      // Add signature
      headerData.push(["", "Mengetahui", "", "", "", "", "", "Pengelola Data"]);
      headerData.push(["", "Kepala Sekolah,", "", "", "", "", "", "Absensi Siswa QR Code,"]);
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
      const fileName = `Rekap_Kehadiran_${formattedMonth.replace(' ', '_')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success(`Laporan berhasil diunduh sebagai ${fileName}`);
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast.error("Gagal mengunduh laporan Excel");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6">
      <div className="flex items-center mb-6">
        <Link href="/dashboard/reports" className="p-2 mr-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Rekap Kehadiran Per Bulan</h1>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 md:mb-6">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="bg-blue-100 p-2 rounded-lg mr-3">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold">Laporan Bulan : {formattedMonth}</h2>
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
        
        
        {/* Attendance Summary Cards */}
        {/*<div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-100 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-1">Hadir</h3>
            <p className="text-3xl font-bold text-blue-700">58.8%</p>
          </div>
          <div className="bg-amber-100 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-1">Sakit</h3>
            <p className="text-3xl font-bold text-amber-700">8.8%</p>
          </div>
          <div className="bg-green-100 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-1">Izin</h3>
            <p className="text-3xl font-bold text-green-700">23.5%</p>
          </div>
          <div className="bg-red-100 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-1">Alpha</h3>
            <p className="text-3xl font-bold text-red-700">8.8%</p>
          </div>
        </div>*/}
        
        {/* School Information and Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/*<div className="text-center p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold uppercase">SD NEGERI 2 SENDANG AYU</h2>
            <p className="text-gray-600 font-medium">Sendang Ayu Kecamatan Padang Ratu</p>
          </div>*/}


          <div className="text-center p-4">
            <h2 className="text-gray-800 sm:text-xl font-bold uppercase">{schoolInfo.name}</h2>
            <p className="text-gray-800 font-bold">{schoolInfo.address}</p>
            <p className="text-gray-800 font-bold">NPSN : {schoolInfo.npsn}</p>
          </div>
          <hr className="border-t border-gray-800 mt-1 mb-6" />
          <div className="text-center mb-4 sm:mb-6">
           
            <h3 className="text-gray-600 uppercase">REKAP LAPORAN KEHADIRAN SISWA</h3>
            <p className="text-gray-600">BULAN {formattedMonth.toUpperCase()}</p>
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
                    <th className="text-gray-600 border px-2 py-2 text-left text-sm font-bold text-gray-700">NAMA SISWA</th>
                    <th className="text-gray-600 border px-2 py-2 text-center text-sm font-bold text-gray-700">NISN</th>
                    <th className="text-gray-600 border px-2 py-2 text-center text-sm font-bold text-gray-700">KELAS</th>
                    <th className="text-gray-600 border px-2 py-2 text-center text-sm font-bold text-gray-700">HADIR</th>
                    <th className="text-gray-600 border px-2 py-2 text-center text-sm font-bold text-gray-700">SAKIT</th>
                    <th className="text-gray-600 border px-2 py-2 text-center text-sm font-bold text-gray-700">IZIN</th>
                    <th className="text-gray-600 border px-2 py-2 text-center text-sm font-bold text-gray-700">ALPHA</th>
                    <th className="text-gray-600 border px-2 py-2 text-center text-sm font-bold text-gray-700">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student, index) => (
                      <tr key={student.id} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                        <td className="text-gray-600 border px-2 py-1 text-xs sm:text-sm">{student.name}</td>
                        <td className="text-gray-600 border px-2 py-1 text-xs sm:text-sm text-center">{student.nisn}</td>
                        <td className="text-gray-600 border px-2 py-1 text-xs sm:text-sm text-center">{student.class}</td>
                        <td className="text-gray-600 border px-2 py-1 text-xs sm:text-sm text-center">{student.hadir}</td>
                        <td className="text-gray-600 border px-2 py-1 text-xs sm:text-sm text-center">{student.sakit}</td>
                        <td className="text-gray-600 border px-2 py-1 text-xs sm:text-sm text-center">{student.izin}</td>
                        <td className="text-gray-600 border px-2 py-1 text-xs sm:text-sm text-center">{student.alpha}</td>
                        <td className="text-gray-600 border px-2 py-1 text-xs sm:text-sm text-center">{student.total}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="border px-4 py-4 text-center text-gray-500">
                        Tidak ada data kehadiran yang ditemukan
                      </td>
                    </tr>
                  )}
                  
                  {/* Total row */}
                  {filteredStudents.length > 0 && (
                    <tr className="bg-gray-200 font-medium">
                      <td colSpan={3} className="text-gray-600 border px-2 py-2 font-bold text-sm text-center">TOTAL</td>
                      <td className="text-gray-600 border px-2 py-2 text-center font-bold text-sm">
                        {filteredStudents.reduce((sum, student) => sum + student.hadir, 0)}
                      </td>
                      <td className="text-gray-600 border px-2 py-2 text-center font-bold text-sm">
                        {filteredStudents.reduce((sum, student) => sum + student.sakit, 0)}
                      </td>
                      <td className="text-gray-600 border px-2 py-2 text-center font-bold text-sm">
                        {filteredStudents.reduce((sum, student) => sum + student.izin, 0)}
                      </td>
                      <td className="text-gray-600 border px-2 py-2 text-center font-bold text-sm">
                        {filteredStudents.reduce((sum, student) => sum + student.alpha, 0)}
                      </td>
                      <td className="text-gray-600 border px-2 py-2 text-center font-bold text-sm">
                        {filteredStudents.reduce((sum, student) => sum + student.total, 0)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
              
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4 sm:gap-6 mb-20 md:mb-6">
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
        <hr className="border-t border-none mb-1" />
      </div>
    </div>
  );
}
