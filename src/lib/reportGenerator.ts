"use client";

import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface SchoolInfo {
  name: string;
  address: string;
  npsn: string;
  principalName: string;
  principalNip?: string;
}

interface AttendanceData {
  present: number;
  sick: number;
  permitted: number;
  absent: number;
  total?: number;
  month?: string;
  className?: string;
}

export const generatePDF = async (
  schoolInfo: SchoolInfo,
  attendanceData: AttendanceData,
  reportType: "monthly" | "class" | "student" | "custom",
  additionalInfo?: { className?: string; studentName?: string; teacherName?: string; schoolId?: string; studentId?: string; dateRange?: { start: string; end: string } }
) => {
  // Fetch additional data from Firestore
  let studentData: any[] = [];
  let topAttendees: {[status: string]: any[]} = {
    hadir: [],
    sakit: [],
    izin: [],
    alpha: []
  };
  
  if (additionalInfo?.schoolId) {
    try {
      const { db } = await import('@/lib/firebase');
      const { doc, getDoc, collection, getDocs, query, where, orderBy, limit } = await import('firebase/firestore');
      
      // Fetch school data
      const schoolRef = doc(db, 'schools', additionalInfo.schoolId);
      const schoolSnap = await getDoc(schoolRef);
      if (schoolSnap.exists()) {
        const schoolData = schoolSnap.data();
        schoolInfo.name = schoolData.name || schoolInfo.name;
        schoolInfo.address = schoolData.address || schoolInfo.address;
        schoolInfo.npsn = schoolData.npsn || schoolInfo.npsn;
        schoolInfo.principalName = schoolData.principalName || schoolInfo.principalName;
        schoolInfo.principalNip = schoolData.principalNip || schoolInfo.principalNip;
      }
      
      // For monthly reports, fetch all student attendance data
      if (reportType === "monthly") {
        // Get date range for the current month or specified month
        const month = attendanceData.month ? attendanceData.month.split(' ')[0].toLowerCase() : format(new Date(), "MMMM", { locale: id }).toLowerCase();
        const year = attendanceData.month ? attendanceData.month.split(' ')[1] : format(new Date(), "yyyy");
        
        const monthsInIndonesian = [
          "januari", "februari", "maret", "april", "mei", "juni",
          "juli", "agustus", "september", "oktober", "november", "desember"
        ];
        
        const monthIndex = monthsInIndonesian.findIndex(m => m === month);
        if (monthIndex >= 0) {
          const startDate = new Date(parseInt(year), monthIndex, 1);
          const endDate = new Date(parseInt(year), monthIndex + 1, 0);
          
          const startDateStr = startDate.toISOString().split('T')[0];
          const endDateStr = endDate.toISOString().split('T')[0];
          
          // Fetch all students
          const studentsRef = collection(db, `schools/${additionalInfo.schoolId}/students`);
          const studentsSnapshot = await getDocs(studentsRef);
          
          const students: any[] = [];
          studentsSnapshot.forEach(doc => {
            students.push({
              id: doc.id,
              ...doc.data(),
              hadir: 0,
              sakit: 0,
              izin: 0,
              alpha: 0,
              total: 0
            });
          });
          
          // Fetch all attendance records for the month
          const attendanceRef = collection(db, `schools/${additionalInfo.schoolId}/attendance`);
          const attendanceQuery = query(
            attendanceRef,
            where("date", ">=", startDateStr),
            where("date", "<=", endDateStr)
          );
          
          const attendanceSnapshot = await getDocs(attendanceQuery);
          
          // Count each student's attendance
          let totalHadir = 0, totalSakit = 0, totalIzin = 0, totalAlpha = 0;
          
          attendanceSnapshot.forEach(doc => {
            const data = doc.data();
            const studentIndex = students.findIndex(s => s.id === data.studentId);
            
            if (studentIndex !== -1) {
              if (data.status === "present" || data.status === "hadir") {
                students[studentIndex].hadir++;
                totalHadir++;
              }
              else if (data.status === "sick" || data.status === "sakit") {
                students[studentIndex].sakit++;
                totalSakit++;
              }
              else if (data.status === "permitted" || data.status === "izin") {
                students[studentIndex].izin++;
                totalIzin++;
              }
              else if (data.status === "absent" || data.status === "alpha") {
                students[studentIndex].alpha++;
                totalAlpha++;
              }
              
              students[studentIndex].total++;
            }
          });
          
          // Set the overall attendance counts
          attendanceData.present = totalHadir;
          attendanceData.sick = totalSakit;
          attendanceData.permitted = totalIzin;
          attendanceData.absent = totalAlpha;
          attendanceData.total = totalHadir + totalSakit + totalIzin + totalAlpha;
          
          // Sort students for top attendees in each category
          const sortedByHadir = [...students].sort((a, b) => b.hadir - a.hadir);
          const sortedBySakit = [...students].sort((a, b) => b.sakit - a.sakit);
          const sortedByIzin = [...students].sort((a, b) => b.izin - a.izin);
          const sortedByAlpha = [...students].sort((a, b) => b.alpha - a.alpha);
          
          topAttendees = {
            hadir: sortedByHadir.slice(0, 3),
            sakit: sortedBySakit.slice(0, 3),
            izin: sortedByIzin.slice(0, 3),
            alpha: sortedByAlpha.slice(0, 3)
          };
          
          studentData = students;
        }
      }
      
      // Other report types remain the same...
      else if (reportType === "student" && additionalInfo?.studentId) {
        // Existing student report code...
        const studentRef = doc(db, `schools/${additionalInfo.schoolId}/students`, additionalInfo.studentId);
        const studentSnap = await getDoc(studentRef);
        
        if (studentSnap.exists()) {
          const studentData = studentSnap.data();
          additionalInfo.className = studentData.class || additionalInfo.className;
          additionalInfo.studentName = studentData.name || additionalInfo.studentName;
          
          const attendanceRef = collection(db, `schools/${additionalInfo.schoolId}/attendance`);
          const attendanceQuery = query(
            attendanceRef,
            where("studentId", "==", additionalInfo.studentId),
            orderBy("date", "desc"),
            limit(30)
          );
          const attendanceSnap = await getDocs(attendanceQuery);
          
          let present = 0, sick = 0, permitted = 0, absent = 0;
          attendanceSnap.forEach(doc => {
            const data = doc.data();
            if (data.status === "present" || data.status === "hadir") present++;
            else if (data.status === "sick" || data.status === "sakit") sick++;
            else if (data.status === "permitted" || data.status === "izin") permitted++;
            else if (data.status === "absent" || data.status === "alpha") absent++;
          });
          
          const total = present + sick + permitted + absent || 1;
          attendanceData.present = present;
          attendanceData.sick = sick;
          attendanceData.permitted = permitted;
          attendanceData.absent = absent;
          attendanceData.total = total;
        }
      } else if (reportType === "class" && additionalInfo?.className) {
        // Existing class report code...
        const studentsRef = collection(db, `schools/${additionalInfo.schoolId}/students`);
        const studentsQuery = query(
          studentsRef,
          where("class", "==", additionalInfo.className)
        );
        const studentsSnap = await getDocs(studentsQuery);
        
        let present = 0, sick = 0, permitted = 0, absent = 0;
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 7);
        
        const promises = studentsSnap.docs.map(async (studentDoc) => {
          const studentId = studentDoc.id;
          const attendanceRef = collection(db, `schools/${additionalInfo.schoolId}/attendance`);
          const attendanceQuery = query(
            attendanceRef,
            where("studentId", "==", studentId),
            where("date", ">=", recentDate.toISOString().split('T')[0])
          );
          
          const attendanceSnap = await getDocs(attendanceQuery);
          attendanceSnap.forEach(doc => {
            const data = doc.data();
            if (data.status === "present" || data.status === "hadir") present++;
            else if (data.status === "sick" || data.status === "sakit") sick++;
            else if (data.status === "permitted" || data.status === "izin") permitted++;
            else if (data.status === "absent" || data.status === "alpha") absent++;
          });
        });
        
        await Promise.all(promises);
        
        const total = present + sick + permitted + absent || 1;
        attendanceData.present = present;
        attendanceData.sick = sick;
        attendanceData.permitted = permitted;
        attendanceData.absent = absent;
        attendanceData.total = total;
      }
    } catch (error) {
      console.error("Error fetching data for PDF:", error);
    }
  }
  
  // Create PDF document
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  const currentDate = format(new Date(), "d MMMM yyyy", { locale: id });
  
  // Set font
  doc.setFont("helvetica");
  
  // School header section
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(schoolInfo.name, pageWidth / 2, 20, { align: "center" });
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(schoolInfo.address, pageWidth / 2, 26, { align: "center" });
  doc.text(`NPSN ${schoolInfo.npsn}`, pageWidth / 2, 31, { align: "center" });
  
  // Horizontal line
  doc.setLineWidth(0.5);
  doc.line(margin, 34, pageWidth - margin, 34);
  
  // Report title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("REKAPITULASI LAPORAN ABSENSI PESERTA DIDIK", pageWidth / 2, 44, { align: "center" });
  doc.text(`BULAN: ${attendanceData.month?.toUpperCase() || format(new Date(), "MMMM yyyy", { locale: id }).toUpperCase()}`, pageWidth / 2, 51, { align: "center" });
  
  let yPos = 60;
  
  // Main attendance table
  if (reportType === "monthly" && studentData.length > 0) {
    // Draw main table header
    doc.setFillColor(173, 216, 230); // Light blue background for header
    doc.rect(margin, yPos, contentWidth, 10, "F");
    
    // Table headers
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    
    const headers = ["No.", "Nama Siswa", "NISN", "Kelas", "Hadir", "Sakit", "Izin", "Alpha", "Total"];
    const colWidths = [10, 50, 25, 15, 15, 15, 15, 15, 15];
    
    let xPos = margin;
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], xPos + colWidths[i]/2, yPos + 6, { align: "center" });
      xPos += colWidths[i];
      
      // Draw vertical line except for the last column
      if (i < headers.length - 1) {
        doc.line(xPos, yPos, xPos, yPos + 10);
      }
    }
    
    // Draw horizontal line below header
    doc.line(margin, yPos + 10, margin + contentWidth, yPos + 10);
    
    // Draw table rows
    const rowHeight = 8;
    yPos += 10;
    
    studentData.forEach((student, index) => {
      // Check if we need a new page
      if (yPos > pageHeight - margin - 40) {
        doc.addPage();
        yPos = margin + 10;
        
        // Redraw table header on new page
        doc.setFillColor(173, 216, 230);
        doc.rect(margin, yPos, contentWidth, 10, "F");
        
        let xPos = margin;
        for (let i = 0; i < headers.length; i++) {
          doc.text(headers[i], xPos + colWidths[i]/2, yPos + 6, { align: "center" });
          xPos += colWidths[i];
          
          if (i < headers.length - 1) {
            doc.line(xPos, yPos, xPos, yPos + 10);
          }
        }
        
        doc.line(margin, yPos + 10, margin + contentWidth, yPos + 10);
        yPos += 10;
      }
      
      // Draw row background (alternate colors)
      if (index % 2 === 0) {
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPos, contentWidth, rowHeight, "F");
      }
      
      // Row data
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      
      xPos = margin;
      
      // Draw row data
      doc.text((index + 1).toString(), xPos + colWidths[0]/2, yPos + 5, { align: "center" });
      xPos += colWidths[0];
      
      doc.line(xPos, yPos, xPos, yPos + rowHeight);
      const nameText = student.name || "nama siswa";
      doc.text(nameText, xPos + 3, yPos + 5);
      xPos += colWidths[1];
      
      doc.line(xPos, yPos, xPos, yPos + rowHeight);
      doc.text(student.nisn || "nisn", xPos + colWidths[2]/2, yPos + 5, { align: "center" });
      xPos += colWidths[2];
      
      doc.line(xPos, yPos, xPos, yPos + rowHeight);
      doc.text(student.class || "kelas", xPos + colWidths[3]/2, yPos + 5, { align: "center" });
      xPos += colWidths[3];
      
      doc.line(xPos, yPos, xPos, yPos + rowHeight);
      doc.text(student.hadir.toString(), xPos + colWidths[4]/2, yPos + 5, { align: "center" });
      xPos += colWidths[4];
      
      doc.line(xPos, yPos, xPos, yPos + rowHeight);
      doc.text(student.sakit.toString(), xPos + colWidths[5]/2, yPos + 5, { align: "center" });
      xPos += colWidths[5];
      
      doc.line(xPos, yPos, xPos, yPos + rowHeight);
      doc.text(student.izin.toString(), xPos + colWidths[6]/2, yPos + 5, { align: "center" });
      xPos += colWidths[6];
      
      doc.line(xPos, yPos, xPos, yPos + rowHeight);
      doc.text(student.alpha.toString(), xPos + colWidths[7]/2, yPos + 5, { align: "center" });
      xPos += colWidths[7];
      
      doc.line(xPos, yPos, xPos, yPos + rowHeight);
      doc.text(student.total.toString(), xPos + colWidths[8]/2, yPos + 5, { align: "center" });
      
      // Draw horizontal line at bottom of row
      doc.line(margin, yPos + rowHeight, margin + contentWidth, yPos + rowHeight);
      
      yPos += rowHeight;
    });
    
    // Add total row
    doc.setFillColor(220, 220, 220);
    doc.rect(margin, yPos, contentWidth, rowHeight, "F");
    
    doc.setFont("helvetica", "bold");
    doc.text("Total", margin + (colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3])/2, yPos + 5, { align: "center" });
    
    xPos = margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3];
    doc.line(xPos, yPos, xPos, yPos + rowHeight);
    doc.text(attendanceData.present.toString(), xPos + colWidths[4]/2, yPos + 5, { align: "center" });
    xPos += colWidths[4];
    
    doc.line(xPos, yPos, xPos, yPos + rowHeight);
    doc.text(attendanceData.sick.toString(), xPos + colWidths[5]/2, yPos + 5, { align: "center" });
    xPos += colWidths[5];
    
    doc.line(xPos, yPos, xPos, yPos + rowHeight);
    doc.text(attendanceData.permitted.toString(), xPos + colWidths[6]/2, yPos + 5, { align: "center" });
    xPos += colWidths[6];
    
    doc.line(xPos, yPos, xPos, yPos + rowHeight);
    doc.text(attendanceData.absent.toString(), xPos + colWidths[7]/2, yPos + 5, { align: "center" });
    xPos += colWidths[7];
    
    doc.line(xPos, yPos, xPos, yPos + rowHeight);
    doc.text(attendanceData.total.toString(), xPos + colWidths[8]/2, yPos + 5, { align: "center" });
    
    yPos += rowHeight + 10;
    
    // Create top attendees tables for each category
    const categories = [
      { title: "Siswa dengan Hadir Terbanyak", data: topAttendees.hadir, key: "hadir" },
      { title: "Siswa dengan Sakit Terbanyak", data: topAttendees.sakit, key: "sakit" },
      { title: "Siswa dengan Izin Terbanyak", data: topAttendees.izin, key: "izin" },
      { title: "Siswa dengan Alpha Terbanyak", data: topAttendees.alpha, key: "alpha" }
    ];
    
    for (const category of categories) {
      // Check if we need a new page
      if (yPos > pageHeight - margin - 50) {
        doc.addPage();
        yPos = margin + 10;
      }
      
      // Table title
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(category.title + " :", margin, yPos);
      yPos += 5;
      
      // Table header
      const subTableWidth = 140;
      const subColWidths = [10, 50, 20, 20, 40];
      
      doc.setFillColor(173, 216, 230);
      doc.rect(margin, yPos, subTableWidth, 8, "F");
      
      let xPos = margin;
      const subHeaders = ["No.", "Nama Siswa", "NISN", "Kelas", `Jumlah ${category.key.charAt(0).toUpperCase() + category.key.slice(1)}`];
      
      for (let i = 0; i < subHeaders.length; i++) {
        doc.text(subHeaders[i], xPos + subColWidths[i]/2, yPos + 5, { align: "center" });
        xPos += subColWidths[i];
        
        if (i < subHeaders.length - 1) {
          doc.line(xPos, yPos, xPos, yPos + 8);
        }
      }
      
      // Draw horizontal line below header
      doc.line(margin, yPos + 8, margin + subTableWidth, yPos + 8);
      yPos += 8;
      
      // Draw rows for top attendees
      category.data.forEach((student, index) => {
        if (student[category.key] > 0) {  // Only show students with actual values
          xPos = margin;
          
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          
          doc.text((index + 1).toString(), xPos + subColWidths[0]/2, yPos + 4, { align: "center" });
          xPos += subColWidths[0];
          
          doc.line(xPos, yPos, xPos, yPos + 7);
          doc.text(student.name || "nama siswa", xPos + 3, yPos + 4);
          xPos += subColWidths[1];
          
          doc.line(xPos, yPos, xPos, yPos + 7);
          doc.text(student.nisn || "nisn", xPos + subColWidths[2]/2, yPos + 4, { align: "center" });
          xPos += subColWidths[2];
          
          doc.line(xPos, yPos, xPos, yPos + 7);
          doc.text(student.class || "kelas", xPos + subColWidths[3]/2, yPos + 4, { align: "center" });
          xPos += subColWidths[3];
          
          doc.line(xPos, yPos, xPos, yPos + 7);
          doc.text(student[category.key].toString(), xPos + subColWidths[4]/2, yPos + 4, { align: "center" });
          
          // Draw horizontal line below row
          doc.line(margin, yPos + 7, margin + subTableWidth, yPos + 7);
          yPos += 7;
        }
      });
      
      yPos += 10;
    }
  }
  else {
    // Fallback to the old table format if not monthly report
    const tableX = margin;
    const tableY = reportType === "student" ? 85 : 70;
    
    // Add status table with percentages
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 80);
    
    // Calculate total
    const total = attendanceData.total || 
      (attendanceData.present + attendanceData.sick + attendanceData.permitted + attendanceData.absent);
    
    // Table headers
    doc.setFillColor(240, 249, 255);
    doc.rect(tableX, tableY, contentWidth, 12, "F");
    doc.setDrawColor(180, 200, 230);
    doc.rect(tableX, tableY, contentWidth, 12, "S");
    
    // Draw vertical lines for header
    doc.line(tableX + contentWidth * 0.4, tableY, tableX + contentWidth * 0.4, tableY + 12);
    doc.line(tableX + contentWidth * 0.7, tableY, tableX + contentWidth * 0.7, tableY + 12);
    
    doc.text("Status", tableX + contentWidth * 0.2, tableY + 8, { align: "center" });
    doc.text("Jumlah", tableX + contentWidth * 0.55, tableY + 8, { align: "center" });
    doc.text("%", tableX + contentWidth * 0.85, tableY + 8, { align: "center" });
    
    // Table rows
    const rowHeight = 10;
    doc.setDrawColor(150, 180, 220);
    doc.setFontSize(11);
    
    // Hadir row
    doc.setFillColor(255, 255, 255);
    doc.rect(tableX, tableY + 12, contentWidth, rowHeight, "F");
    doc.rect(tableX, tableY + 12, contentWidth, rowHeight, "S");
    doc.line(tableX + contentWidth * 0.4, tableY + 12, tableX + contentWidth * 0.4, tableY + 12 + rowHeight);
    doc.line(tableX + contentWidth * 0.7, tableY + 12, tableX + contentWidth * 0.7, tableY + 12 + rowHeight);
    doc.text("Hadir", tableX + contentWidth * 0.2, tableY + 12 + 7, { align: "center" });
    doc.text(`${attendanceData.present}`, tableX + contentWidth * 0.55, tableY + 12 + 7, { align: "center" });
    doc.text(`${((attendanceData.present / total) * 100).toFixed(1)}%`, tableX + contentWidth * 0.85, tableY + 12 + 7, { align: "center" });
    
    // Sakit row
    doc.setFillColor(255, 255, 255);
    doc.rect(tableX, tableY + 22, contentWidth, rowHeight, "F");
    doc.rect(tableX, tableY + 22, contentWidth, rowHeight, "S");
    doc.line(tableX + contentWidth * 0.4, tableY + 22, tableX + contentWidth * 0.4, tableY + 22 + rowHeight);
    doc.line(tableX + contentWidth * 0.7, tableY + 22, tableX + contentWidth * 0.7, tableY + 22 + rowHeight);
    doc.text("Sakit", tableX + contentWidth * 0.2, tableY + 22 + 7, { align: "center" });
    doc.text(`${attendanceData.sick}`, tableX + contentWidth * 0.55, tableY + 22 + 7, { align: "center" });
    doc.text(`${((attendanceData.sick / total) * 100).toFixed(1)}%`, tableX + contentWidth * 0.85, tableY + 22 + 7, { align: "center" });
    
    // Izin row
    doc.setFillColor(255, 255, 255);
    doc.rect(tableX, tableY + 32, contentWidth, rowHeight, "F");
    doc.rect(tableX, tableY + 32, contentWidth, rowHeight, "S");
    doc.line(tableX + contentWidth * 0.4, tableY + 32, tableX + contentWidth * 0.4, tableY + 32 + rowHeight);
    doc.line(tableX + contentWidth * 0.7, tableY + 32, tableX + contentWidth * 0.7, tableY + 32 + rowHeight);
    doc.text("Izin", tableX + contentWidth * 0.2, tableY + 32 + 7, { align: "center" });
    doc.text(`${attendanceData.permitted}`, tableX + contentWidth * 0.55, tableY + 32 + 7, { align: "center" });
    doc.text(`${((attendanceData.permitted / total) * 100).toFixed(1)}%`, tableX + contentWidth * 0.85, tableY + 32 + 7, { align: "center" });
    
    // Alpha row
    doc.setFillColor(255, 255, 255);
    doc.rect(tableX, tableY + 42, contentWidth, rowHeight, "F");
    doc.rect(tableX, tableY + 42, contentWidth, rowHeight, "S");
    doc.line(tableX + contentWidth * 0.4, tableY + 42, tableX + contentWidth * 0.4, tableY + 42 + rowHeight);
    doc.line(tableX + contentWidth * 0.7, tableY + 42, tableX + contentWidth * 0.7, tableY + 42 + rowHeight);
    doc.text("Alpha", tableX + contentWidth * 0.2, tableY + 42 + 7, { align: "center" });
    doc.text(`${attendanceData.absent}`, tableX + contentWidth * 0.55, tableY + 42 + 7, { align: "center" });
    doc.text(`${((attendanceData.absent / total) * 100).toFixed(1)}%`, tableX + contentWidth * 0.85, tableY + 42 + 7, { align: "center" });
    
    // Total row
    doc.setFillColor(255, 255, 255);
    doc.rect(tableX, tableY + 52, contentWidth, rowHeight, "F");
    doc.rect(tableX, tableY + 52, contentWidth, rowHeight, "S");
    doc.line(tableX + contentWidth * 0.4, tableY + 52, tableX + contentWidth * 0.4, tableY + 52 + rowHeight);
    doc.line(tableX + contentWidth * 0.7, tableY + 52, tableX + contentWidth * 0.7, tableY + 52 + rowHeight);
    doc.text("Total", tableX + contentWidth * 0.2, tableY + 52 + 7, { align: "center" });
    doc.text(`${total}`, tableX + contentWidth * 0.55, tableY + 52 + 7, { align: "center" });
    doc.text("100%", tableX + contentWidth * 0.85, tableY + 52 + 7, { align: "center" });
    
    yPos = tableY + 70;
  }
  
  // Add signatures at the bottom
  doc.setFontSize(10);
  doc.text("Mengetahui", pageWidth / 4, pageHeight - 40, { align: "center" });
  doc.text("KEPALA SEKOLAH,", pageWidth / 4, pageHeight - 35, { align: "center" });
  
  doc.text("Pengelola Data", pageWidth - pageWidth / 4, pageHeight - 40, { align: "center" });
  doc.text("Administrator Sekolah,", pageWidth - pageWidth / 4, pageHeight - 35, { align: "center" });
  
  // Lines for signatures
  doc.setDrawColor(100, 100, 100);
  doc.line(pageWidth / 4 - 25, pageHeight - 15, pageWidth / 4 + 25, pageHeight - 15);
  doc.line(pageWidth - pageWidth / 4 - 25, pageHeight - 15, pageWidth - pageWidth / 4 + 25, pageHeight - 15);
  
  // NIP
  doc.text("NIP. " + (schoolInfo.principalNip || ".................."), pageWidth / 4, pageHeight - 10, { align: "center" });
  doc.text("NIP. " + "..................", pageWidth - pageWidth / 4, pageHeight - 10, { align: "center" });
  
  // Save the PDF
  const fileName = `Laporan_${reportType}_${format(new Date(), "dd-MM-yyyy")}.pdf`;
  doc.save(fileName);
  
  return fileName;
};

// Make sure this function is properly exported
export const generateComprehensiveReport = (
  schoolInfo: SchoolInfo,
  monthlyData: any,
  weeklyData: any,
  studentData: any,
  reportType: "pdf" | "excel"
) => {
  if (reportType === "pdf") {
    return generateComprehensivePDF(schoolInfo, monthlyData, weeklyData, studentData);
  } else {
    return generateComprehensiveExcel(schoolInfo, monthlyData, weeklyData, studentData);
  }
};

function generateComprehensivePDF(
  schoolInfo: SchoolInfo,
  monthlyData: any,
  weeklyData: any,
  studentData: any
) {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const currentDate = format(new Date(), "d MMMM yyyy", { locale: id });
    
    // Set font
    doc.setFont("helvetica");
    
    // School header - moved closer to the top
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(schoolInfo.name.toUpperCase(), pageWidth / 2, 15, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(schoolInfo.address, pageWidth / 2, 22, { align: "center" });
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`NPSN: ${schoolInfo.npsn}`, pageWidth / 2, 28, { align: "center" });
    doc.setFont("helvetica", "normal");
    
    // Horizontal line - moved up
    doc.setLineWidth(0.5);
    doc.line(20, 32, pageWidth - 20, 32);
    
    // Report title - moved down slightly
    doc.setFontSize(14);
    doc.text("LAPORAN KOMPREHENSIF KEHADIRAN SISWA", pageWidth / 2, 48, { align: "center" });
    doc.setFontSize(11);
    doc.text(`PERIODE : ${(monthlyData?.month || format(new Date(), "MMMM yyyy", { locale: id })).toUpperCase()}`, pageWidth / 2, 56, { align: "center" });
    
    // Monthly summary
    doc.setFontSize(12);
    doc.text("1. Rekapitulasi Kehadiran Bulanan", 20, 70);
    
    const tableX = 20;
    let tableY = 80;
    
    // Table headers
    doc.setFillColor(240, 240, 240);
    doc.rect(tableX, tableY, pageWidth - 40, 10, "F");
    doc.setDrawColor(180, 180, 180);
    doc.rect(tableX, tableY, pageWidth - 40, 10, "S");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text("Status", tableX + 20, tableY + 6, { align: "center" });
    doc.text("Jumlah", tableX + 60, tableY + 6, { align: "center" });
    doc.text("%", tableX + 100, tableY + 6, { align: "center" });
    
    const rowHeight = 8;
    
    // Monthly data rows
    const data = monthlyData || { hadir: 0, sakit: 0, izin: 0, alpha: 0, total: 0 };
    const total = data.total || 100; // Prevent division by zero
    
    ["Hadir", "Sakit", "Izin", "Alpha"].forEach((status, index) => {
      const y = tableY + 10 + (index * rowHeight);
      const value = data[status.toLowerCase()] || 0;
      const percent = ((value / total) * 100).toFixed(1);
      
      doc.setFillColor(index % 2 === 0 ? 255 : 245, index % 2 === 0 ? 255 : 245, index % 2 === 0 ? 255 : 245);
      doc.rect(tableX, y, pageWidth - 40, rowHeight, "F");
      doc.setDrawColor(220, 220, 220);
      doc.rect(tableX, y, pageWidth - 40, rowHeight, "S");
      doc.text(status, tableX + 20, y + 6, { align: "center" });
      doc.text(value.toString(), tableX + 60, y + 6, { align: "center" });
      doc.text(`${percent}%`, tableX + 100, y + 6, { align: "center" });
    });
    
    // Total row
    tableY += 40;
    doc.setFillColor(240, 240, 240);
    doc.rect(tableX, tableY, pageWidth - 40, rowHeight, "F");
    doc.rect(tableX, tableY, pageWidth - 40, rowHeight, "S");
    doc.text("Total", tableX + 20, tableY + 6, { align: "center" });
    doc.text(total.toString(), tableX + 60, tableY + 6, { align: "center" });
    doc.text("100%", tableX + 100, tableY + 6, { align: "center" });
    
    // Weekly summary
    tableY += 25;
    doc.setFontSize(12);
    doc.text("2. Rekapitulasi Kehadiran Mingguan", 20, tableY);
    
    tableY += 10;
    // Weekly table headers
    doc.setFillColor(240, 240, 240);
    doc.rect(tableX, tableY, pageWidth - 40, 10, "F");
    doc.setDrawColor(180, 180, 180);
    doc.rect(tableX, tableY, pageWidth - 40, 10, "S");
    doc.text("Minggu", tableX + 15, tableY + 6, { align: "center" });
    doc.text("Hadir", tableX + 45, tableY + 6, { align: "center" });
    doc.text("Sakit", tableX + 70, tableY + 6, { align: "center" });
    doc.text("Izin", tableX + 95, tableY + 6, { align: "center" });
    doc.text("Alpha", tableX + 120, tableY + 6, { align: "center" });
    
    // Weekly data rows
    if (weeklyData && Array.isArray(weeklyData) && weeklyData.length > 0) {
      weeklyData.forEach((week, index) => {
        const y = tableY + 10 + (index * rowHeight);
        doc.setFillColor(index % 2 === 0 ? 255 : 245, index % 2 === 0 ? 255 : 245, index % 2 === 0 ? 255 : 245);
        doc.rect(tableX, y, pageWidth - 40, rowHeight, "F");
        doc.setDrawColor(220, 220, 220);
        doc.rect(tableX, y, pageWidth - 40, rowHeight, "S");
        doc.text(week.week || `Minggu ${index + 1}`, tableX + 15, y + 6, { align: "center" });
        doc.text((week.hadir || 0).toString(), tableX + 45, y + 6, { align: "center" });
        doc.text((week.sakit || 0).toString(), tableX + 70, y + 6, { align: "center" });
        doc.text((week.izin || 0).toString(), tableX + 95, y + 6, { align: "center" });
        doc.text((week.alpha || 0).toString(), tableX + 120, y + 6, { align: "center" });
      });
    }
    
    // Add a new page for student data
    doc.addPage();
    
    // Student summary
    doc.setFontSize(12);
    doc.text("3. Rekapitulasi Kehadiran Per Siswa", 20, 40);
    
    tableY = 50;
    // Students table headers
    doc.setFillColor(240, 240, 240);
    doc.rect(tableX, tableY, pageWidth - 40, 10, "F");
    doc.setDrawColor(180, 180, 180);
    doc.rect(tableX, tableY, pageWidth - 40, 10, "S");
    doc.text("Nama", tableX + 25, tableY + 6, { align: "center" });
    doc.text("Kelas", tableX + 60, tableY + 6, { align: "center" });
    doc.text("Hadir", tableX + 85, tableY + 6, { align: "center" });
    doc.text("Sakit", tableX + 105, tableY + 6, { align: "center" });
    doc.text("Izin", tableX + 125, tableY + 6, { align: "center" });
    doc.text("Alpha", tableX + 145, tableY + 6, { align: "center" });
    
    // Student data rows
    // Student rows (fetch real data from Firestore would go here)
    const studentRows: any[] = [];
  
    // Define the function at the top level of the function body
    const fetchStudentData = async (schoolIdParam: string) => {
      try {
        const { collection, getDocs, query, orderBy, where } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
    
        // Fetch actual students from Firestore
        const studentsRef = collection(db, `schools/${schoolIdParam}/students`);
        const studentsQuery = query(studentsRef, orderBy('name', 'asc'));
        const studentsSnapshot = await getDocs(studentsQuery);
    
        const fetchedStudentRows = [];
    
        // Track attendance data for each student
        for (const studentDoc of studentsSnapshot.docs) {
          const studentData = studentDoc.data();
          const studentId = studentDoc.id;
      
          // Get attendance records for this student
          const attendanceRef = collection(db, `schools/${schoolIdParam}/attendance`);
          const attendanceQuery = query(
            attendanceRef,
            where("studentId", "==", studentId)
          );
      
          const attendanceSnapshot = await getDocs(attendanceQuery);
      
          let present = 0;
          let sick = 0;
          let permitted = 0;
          let absent = 0;
      
          attendanceSnapshot.forEach(doc => {
            const status = doc.data().status;
            if (status === 'present' || status === 'hadir') present++;
            else if (status === 'sick' || status === 'sakit') sick++;
            else if (status === 'permitted' || status === 'izin') permitted++;
            else if (status === 'absent' || status === 'alpha') absent++;
          });
      
          fetchedStudentRows.push({
            name: studentData.name || "Unknown Name",
            class: studentData.class || "-",
            hadir: present,
            sakit: sick,
            izin: permitted,
            alpha: absent
          });
        }
    
        return fetchedStudentRows;
      } catch (error) {
        console.error("Error fetching student data from Firestore:", error);
        return [];
      }
    };
  
    // If we have real data, use it; otherwise fall back to provided data
    const records: any[] = [];
    const recordsToUse = records.length > 0 ? records : 
      (studentData && Array.isArray(studentData) && studentData.length > 0) ? studentData : [];
  
    recordsToUse.forEach((student, index) => {
      const y = tableY + 10 + (index * rowHeight);
      // Skip to new page if we're about to overflow
      if (y > 270) {
        doc.addPage();
        tableY = 20;
      
        // Re-add header on new page
        doc.setFillColor(240, 240, 240);
        doc.rect(tableX, tableY, pageWidth - 40, 10, "F");
        doc.setDrawColor(180, 180, 180);
        doc.rect(tableX, tableY, pageWidth - 40, 10, "S");
        doc.text("Nama", tableX + 25, tableY + 6, { align: "center" });
        doc.text("Kelas", tableX + 60, tableY + 6, { align: "center" });
        doc.text("Hadir", tableX + 85, tableY + 6, { align: "center" });
        doc.text("Sakit", tableX + 105, tableY + 6, { align: "center" });
        doc.text("Izin", tableX + 125, tableY + 6, { align: "center" });
        doc.text("Alpha", tableX + 145, tableY + 6, { align: "center" });
      }
    
      const rowY = tableY + 10 + ((index % 25) * rowHeight);
      doc.setFillColor(index % 2 === 0 ? 255 : 245, index % 2 === 0 ? 255 : 245, index % 2 === 0 ? 255 : 245);
      doc.rect(tableX, rowY, pageWidth - 40, rowHeight, "F");
      doc.setDrawColor(220, 220, 220);
      doc.rect(tableX, rowY, pageWidth - 40, rowHeight, "S");
    
      // Truncate long names
      const name = student.name || "";
      const displayName = name.length > 18 ? name.substring(0, 16) + "..." : name;
    
      doc.text(displayName, tableX + 25, rowY + 6, { align: "center" });
      doc.text(student.class || "-", tableX + 60, rowY + 6, { align: "center" });
      doc.text((student.hadir || 0).toString(), tableX + 85, rowY + 6, { align: "center" });
      doc.text((student.sakit || 0).toString(), tableX + 105, rowY + 6, { align: "center" });
      doc.text((student.izin || 0).toString(), tableX + 125, rowY + 6, { align: "center" });
      doc.text((student.alpha || 0).toString(), tableX + 145, rowY + 6, { align: "center" });
    });
    
    // Footer - position right after the table
    // Get the last y-position after the table
    const tableEndY = tableY + (studentData && Array.isArray(studentData) ? studentData.length * rowHeight : 0) + 10;
    
    // Downloaded on date
    doc.setFontSize(11);
    doc.text(`Di unduh pada: ${currentDate}`, pageWidth / 2, tableEndY + 10, { align: "center" });
    
    // Signatures with better positioning
    doc.setFontSize(10);
    doc.text("Mengetahui,", 50, tableEndY + 20);
    doc.text("Kepala Sekolah", 50, tableEndY + 26);
    
    doc.text("Wali Kelas", pageWidth - 50, tableEndY + 20, { align: "center" });
    
    // Principal and teacher names - with better spacing
    doc.text("_________________", 50, tableEndY + 45);
    doc.text("_________________", pageWidth - 50, tableEndY + 45, { align: "center" });
    
    // Save the PDF
    const fileName = `Laporan_Komprehensif_${format(new Date(), "dd-MM-yyyy")}.pdf`;
    doc.save(fileName);
    
    return fileName;
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}

function generateComprehensiveExcel(
  schoolInfo: SchoolInfo,
  monthlyData: any,
  weeklyData: any,
  studentData: any
) {
  // Create workbook and worksheets
  const wb = XLSX.utils.book_new();
  
  // Header data for monthly sheet
  const monthlyHeaderData = [
    [schoolInfo.name.toUpperCase()],
    [schoolInfo.address],
    [`NPSN: ${schoolInfo.npsn}`],
    [""],
    ["LAPORAN REKAPITULASI KEHADIRAN BULANAN"],
    [`Periode: ${monthlyData.month || format(new Date(), "MMMM yyyy", { locale: id })}`],
    [""],
    ["Rekapitulasi Kehadiran:"]
  ];
  
  // Monthly attendance data
  const monthlyAttendanceRows = [
    ["Status", "Jumlah", "Persentase"],
    ["Hadir", monthlyData.hadir || 0, `${((monthlyData.hadir / monthlyData.total) * 100).toFixed(1)}%`],
    ["Sakit", monthlyData.sakit || 0, `${((monthlyData.sakit / monthlyData.total) * 100).toFixed(1)}%`],
    ["Izin", monthlyData.izin || 0, `${((monthlyData.izin / monthlyData.total) * 100).toFixed(1)}%`],
    ["Alpha", monthlyData.alpha || 0, `${((monthlyData.alpha / monthlyData.total) * 100).toFixed(1)}%`],
    ["Total", monthlyData.total || 0, "100%"]
  ];
  
  // Weekly sheet data - fetch real data from Firestore
  const weeklyHeaderData = [
    [schoolInfo.name],
    ["LAPORAN KEHADIRAN MINGGUAN"],
    [""],
    ["Minggu", "Hadir", "Sakit", "Izin", "Alpha", "Total"]
  ];
  
  // Get real weekly attendance data
  let realWeeklyData = [];
  
  // Define a function to fetch weekly data
  async function fetchWeeklyData(schoolIdParam: string) {
    try {
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const { startOfWeek, endOfWeek, subWeeks, format } = await import('date-fns');
      
      // Get data for last 4 weeks
      for (let i = 0; i < 4; i++) {
        const weekStartDate = subWeeks(startOfWeek(new Date()), i);
        const weekEndDate = endOfWeek(weekStartDate);
        
        const startDateStr = format(weekStartDate, 'yyyy-MM-dd');
        const endDateStr = format(weekEndDate, 'yyyy-MM-dd');
        
        const attendanceRef = collection(db, `schools/${schoolIdParam}/attendance`);
        const attendanceQuery = query(
          attendanceRef,
          where("date", ">=", startDateStr),
          where("date", "<=", endDateStr)
        );
        
        const attendanceSnapshot = await getDocs(attendanceQuery);
        
        let present = 0, sick = 0, permitted = 0, absent = 0;
        
        attendanceSnapshot.forEach(doc => {
          const status = doc.data().status;
          if (status === 'present' || status === 'hadir') present++;
          else if (status === 'sick' || status === 'sakit') sick++;
          else if (status === 'permitted' || status === 'izin') permitted++;
          else if (status === 'absent' || status === 'alpha') absent++;
        });
        
        realWeeklyData.push({
          week: `Minggu ${4-i}`,
          hadir: present,
          sakit: sick,
          izin: permitted,
          alpha: absent
        });
      }
    } catch (error) {
      console.error("Error fetching weekly data from Firestore:", error);
    }
  }
  
  // Use real data if available, fallback to dummy data
  const weeklyDataToUse = realWeeklyData.length > 0 ? realWeeklyData : weeklyData;
  
  const weeklyRows = weeklyDataToUse.map(week => [
    week.week || "",
    week.hadir || 0,
    week.sakit || 0,
    week.izin || 0,
    week.alpha || 0,
    (week.hadir || 0) + (week.sakit || 0) + (week.izin || 0) + (week.alpha || 0)
  ]);
  
  // Student sheet data - fetch real data from Firestore
  const studentHeaderData = [
    [schoolInfo.name],
    ["LAPORAN KEHADIRAN PER SISWA"],
    [""],
    ["Nama", "Kelas", "Hadir", "Sakit", "Izin", "Alpha", "Total"]
  ];
  
  // Create an empty array for student rows
  const studentRows: any[] = [];
  
  // Use the student rows array (which would be populated in an async context)
  const studentRowsData = studentRows.length > 0 ? studentRows.map(student => [
    student.name || "",
    student.class || "",
    student.hadir || 0,
    student.sakit || 0,
    student.izin || 0,
    student.alpha || 0,
    (student.hadir || 0) + (student.sakit || 0) + (student.izin || 0) + (student.alpha || 0)
  ]) : [];
  
  // Footer data (common to all sheets)
  const footerData = [
    [""],
    [""],
    [`Nama Alamat Sekolah`],
    [""],
    ["Mengetahui,", "", "Wali Kelas"],
    ["Kepala Sekolah", "", ""],
    ["", "", ""],
    [schoolInfo.principalName, "", "___________________"],
  ];
  
  // Combine monthly data
  const allMonthlyData = [...monthlyHeaderData, ...monthlyAttendanceRows, ...footerData];
  
  // Combine weekly data
  const allWeeklyData = [...weeklyHeaderData, ...weeklyRows, ...footerData];
  
  // Combine student data
  const allStudentData = [...studentHeaderData, ...studentRows, ...footerData];
  
  // Create worksheets
  const monthlyWs = XLSX.utils.aoa_to_sheet(allMonthlyData);
  const weeklyWs = XLSX.utils.aoa_to_sheet(allWeeklyData);
  const studentWs = XLSX.utils.aoa_to_sheet(allStudentData);
  
  // Set column widths
  const monthlyColWidths = [{ wch: 20 }, { wch: 15 }, { wch: 15 }];
  const weeklyColWidths = [{ wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
  const studentColWidths = [{ wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
  
  monthlyWs['!cols'] = monthlyColWidths;
  weeklyWs['!cols'] = weeklyColWidths;
  studentWs['!cols'] = studentColWidths;
  
  // Add worksheets to workbook
  XLSX.utils.book_append_sheet(wb, monthlyWs, "Bulanan");
  XLSX.utils.book_append_sheet(wb, weeklyWs, "Mingguan");
  XLSX.utils.book_append_sheet(wb, studentWs, "Per Siswa");
  
  // Generate Excel file
  const fileName = `Laporan_Komprehensif_${format(new Date(), "dd-MM-yyyy")}.xlsx`;
  XLSX.writeFile(wb, fileName);
  
  return fileName;
}

export const generateExcel = async (
  schoolInfo: SchoolInfo,
  attendanceData: AttendanceData,
  reportType: "monthly" | "class" | "student" | "custom",
  additionalInfo?: { className?: string; studentName?: string; teacherName?: string; schoolId?: string; studentId?: string; dateRange?: { start: string; end: string } }
) => {
  // Fetch student data from Firestore
  let studentData: any[] = [];
  let topAttendees: {[status: string]: any[]} = {
    hadir: [],
    sakit: [],
    izin: [],
    alpha: []
  };
  
  if (additionalInfo?.schoolId) {
    try {
      const { db } = await import('@/lib/firebase');
      const { doc, getDoc, collection, getDocs, query, where, orderBy } = await import('firebase/firestore');
      
      // Fetch monthly data for students and attendance
      if (reportType === "monthly") {
        // Get date range for the current month or specified month
        const month = attendanceData.month ? attendanceData.month.split(' ')[0].toLowerCase() : format(new Date(), "MMMM", { locale: id }).toLowerCase();
        const year = attendanceData.month ? attendanceData.month.split(' ')[1] : format(new Date(), "yyyy");
        
        const monthsInIndonesian = [
          "januari", "februari", "maret", "april", "mei", "juni",
          "juli", "agustus", "september", "oktober", "november", "desember"
        ];
        
        const monthIndex = monthsInIndonesian.findIndex(m => m === month);
        if (monthIndex >= 0) {
          const startDate = new Date(parseInt(year), monthIndex, 1);
          const endDate = new Date(parseInt(year), monthIndex + 1, 0);
          
          const startDateStr = startDate.toISOString().split('T')[0];
          const endDateStr = endDate.toISOString().split('T')[0];
          
          // Fetch all students
          const studentsRef = collection(db, `schools/${additionalInfo.schoolId}/students`);
          const studentsSnapshot = await getDocs(studentsRef);
          
          const students: any[] = [];
          studentsSnapshot.forEach(doc => {
            students.push({
              id: doc.id,
              ...doc.data(),
              hadir: 0,
              sakit: 0,
              izin: 0,
              alpha: 0,
              total: 0
            });
          });
          
          // Fetch all attendance records for the month
          const attendanceRef = collection(db, `schools/${additionalInfo.schoolId}/attendance`);
          const attendanceQuery = query(
            attendanceRef,
            where("date", ">=", startDateStr),
            where("date", "<=", endDateStr)
          );
          
          const attendanceSnapshot = await getDocs(attendanceQuery);
          
          // Count each student's attendance
          let totalHadir = 0, totalSakit = 0, totalIzin = 0, totalAlpha = 0;
          
          attendanceSnapshot.forEach(doc => {
            const data = doc.data();
            const studentIndex = students.findIndex(s => s.id === data.studentId);
            
            if (studentIndex !== -1) {
              if (data.status === "present" || data.status === "hadir") {
                students[studentIndex].hadir++;
                totalHadir++;
              }
              else if (data.status === "sick" || data.status === "sakit") {
                students[studentIndex].sakit++;
                totalSakit++;
              }
              else if (data.status === "permitted" || data.status === "izin") {
                students[studentIndex].izin++;
                totalIzin++;
              }
              else if (data.status === "absent" || data.status === "alpha") {
                students[studentIndex].alpha++;
                totalAlpha++;
              }
              
              students[studentIndex].total++;
            }
          });
          
          // Sort students for top attendees in each category
          const sortedByHadir = [...students].sort((a, b) => b.hadir - a.hadir);
          const sortedBySakit = [...students].sort((a, b) => b.sakit - a.sakit);
          const sortedByIzin = [...students].sort((a, b) => b.izin - a.izin);
          const sortedByAlpha = [...students].sort((a, b) => b.alpha - a.alpha);
          
          topAttendees = {
            hadir: sortedByHadir.slice(0, 3),
            sakit: sortedBySakit.slice(0, 3),
            izin: sortedByIzin.slice(0, 3),
            alpha: sortedByAlpha.slice(0, 3)
          };
          
          attendanceData.present = totalHadir;
          attendanceData.sick = totalSakit;
          attendanceData.permitted = totalIzin;
          attendanceData.absent = totalAlpha;
          attendanceData.total = totalHadir + totalSakit + totalIzin + totalAlpha;
          
          studentData = students;
        }
      }
      
      // Special handling for student reports
      else if (reportType === "student" && additionalInfo?.studentId) {
        // Get student data
        const studentRef = doc(db, `schools/${additionalInfo.schoolId}/students`, additionalInfo.studentId);
        const studentSnap = await getDoc(studentRef);
        
        if (studentSnap.exists()) {
          const studentData = studentSnap.data();
          additionalInfo.className = studentData.class || additionalInfo.className;
          additionalInfo.studentName = studentData.name || additionalInfo.studentName;
        }
      }
    } catch (error) {
      console.error("Error fetching data for Excel:", error);
    }
  }
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // For monthly reports with student data
  if (reportType === "monthly" && studentData.length > 0) {
    // Header data
    const headerData = [
      [schoolInfo.name],
      [schoolInfo.address],
      [`NPSN ${schoolInfo.npsn}`],
      [""],
      ["REKAPITULASI LAPORAN ABSENSI PESERTA DIDIK"],
      [`BULAN: ${attendanceData.month?.toUpperCase() || format(new Date(), "MMMM yyyy", { locale: id }).toUpperCase()}`],
      [""]
    ];
    
    // Create main worksheet with all students
    const mainData = [
      ...headerData,
      ["No.", "Nama Siswa", "NISN", "Kelas", "Hadir", "Sakit", "Izin", "Alpha", "Total"]
    ];
    
    // Add student rows
    studentData.forEach((student, index) => {
      mainData.push([
        index + 1,
        student.name || "nama siswa",
        student.nisn || "nisn",
        student.class || "kelas",
        student.hadir,
        student.sakit,
        student.izin,
        student.alpha,
        student.total
      ]);
    });
    
    // Add total row
    mainData.push([
      "Total", "", "", "",
      attendanceData.present.toString(),
      attendanceData.sick.toString(),
      attendanceData.permitted.toString(),
      attendanceData.absent.toString(),
      attendanceData.total.toString()
    ]);
    
    // Create top attendee sheets
    const hadirData = [
      ["Siswa dengan Hadir Terbanyak :"],
      ["No.", "Nama Siswa", "NISN", "Kelas", "Jumlah Hadir"]
    ];
    
    topAttendees.hadir.forEach((student, index) => {
      if (student.hadir > 0) {
        hadirData.push([
          index + 1,
          student.name || "nama siswa",
          student.nisn || "nisn",
          student.class || "kelas",
          student.hadir
        ]);
      }
    });
    
    const sakitData = [
      ["Siswa dengan Sakit Terbanyak :"],
      ["No.", "Nama Siswa", "NISN", "Kelas", "Jumlah Sakit"]
    ];
    
    topAttendees.sakit.forEach((student, index) => {
      if (student.sakit > 0) {
        sakitData.push([
          index + 1,
          student.name || "nama siswa",
          student.nisn || "nisn",
          student.class || "kelas",
          student.sakit
        ]);
      }
    });
    
    const izinData = [
      ["Siswa dengan Izin Terbanyak :"],
      ["No.", "Nama Siswa", "NISN", "Kelas", "Jumlah Izin"]
    ];
    
    topAttendees.izin.forEach((student, index) => {
      if (student.izin > 0) {
        izinData.push([
          index + 1,
          student.name || "nama siswa",
          student.nisn || "nisn",
          student.class || "kelas",
          student.izin
        ]);
      }
    });
    
    const alphaData = [
      ["Siswa dengan Alpha Terbanyak :"],
      ["No.", "Nama Siswa", "NISN", "Kelas", "Jumlah Alpha"]
    ];
    
    topAttendees.alpha.forEach((student, index) => {
      if (student.alpha > 0) {
        alphaData.push([
          index + 1,
          student.name || "nama siswa",
          student.nisn || "nisn",
          student.class || "kelas",
          student.alpha
        ]);
      }
    });
    
    // Add signature section
    const signatureData = [
      [""],
      ["Mengetahui"],
      ["KEPALA SEKOLAH,", "", "", "", "Pengelola Data"],
      ["", "", "", "", "Administrator Sekolah,"],
      ["", "", "", "", ""],
      ["", "", "", "", ""],
      ["", "", "", "", ""],
      [`NIP. ${schoolInfo.principalNip || "..........................."}`, "", "", "", "NIP. ..........................."]
    ];
    
    // Add signatures to the main data
    mainData.push([""], ...signatureData);
    
    // Create worksheets
    const mainWs = XLSX.utils.aoa_to_sheet(mainData);
    const hadirWs = XLSX.utils.aoa_to_sheet([...hadirData, [""], ...signatureData]);
    const sakitWs = XLSX.utils.aoa_to_sheet([...sakitData, [""], ...signatureData]);
    const izinWs = XLSX.utils.aoa_to_sheet([...izinData, [""], ...signatureData]);
    const alphaWs = XLSX.utils.aoa_to_sheet([...alphaData, [""], ...signatureData]);
    
    // Set column widths for main sheet
    const mainColWidths = [
      { wch: 5 }, // No.
      { wch: 30 }, // Nama Siswa
      { wch: 15 }, // NISN
      { wch: 10 }, // Kelas
      { wch: 8 }, // Hadir
      { wch: 8 }, // Sakit
      { wch: 8 }, // Izin
      { wch: 8 }, // Alpha
      { wch: 8 } // Total
    ];
    
    mainWs['!cols'] = mainColWidths;
    
    // Set column widths for other sheets
    const topColWidths = [
      { wch: 5 }, // No.
      { wch: 30 }, // Nama Siswa
      { wch: 15 }, // NISN
      { wch: 10 }, // Kelas
      { wch: 15 } // Jumlah
    ];
    
    hadirWs['!cols'] = topColWidths;
    sakitWs['!cols'] = topColWidths;
    izinWs['!cols'] = topColWidths;
    alphaWs['!cols'] = topColWidths;
    
    // Add worksheets to workbook
    XLSX.utils.book_append_sheet(wb, mainWs, "Semua Siswa");
    XLSX.utils.book_append_sheet(wb, hadirWs, "Hadir Terbanyak");
    XLSX.utils.book_append_sheet(wb, sakitWs, "Sakit Terbanyak");
    XLSX.utils.book_append_sheet(wb, izinWs, "Izin Terbanyak");
    XLSX.utils.book_append_sheet(wb, alphaWs, "Alpha Terbanyak");
  }
  else {
    // Standard report format (fallback for non-monthly reports)
    // Header data
    const headerData = [
      [schoolInfo.name],
      [schoolInfo.address],
      [`NPSN ${schoolInfo.npsn}`],
      [""],
      ["REKAPITULASI LAPORAN ABSENSI PESERTA DIDIK"]
    ];
    
    if (reportType === "monthly") {
      headerData.push([`BULAN: ${attendanceData.month?.toUpperCase() || format(new Date(), "MMMM yyyy", { locale: id }).toUpperCase()}`]);
    } else if (reportType === "class") {
      headerData.push([`KELAS: ${additionalInfo?.className?.toUpperCase() || ""}`]);
    } else if (reportType === "student") {
      headerData.push([`BULAN: ${format(new Date(), "MMMM yyyy", { locale: id }).toUpperCase()}`]);
      headerData.push([`NAMA SISWA: ${additionalInfo?.studentName?.toUpperCase() || ""}`]);
    }
    
    headerData.push([""], ["Rekapitulasi Kehadiran:"]);
    
    // Calculate total
    const total = attendanceData.total || 
      (attendanceData.present + attendanceData.sick + attendanceData.permitted + attendanceData.absent);
    
    // Attendance data
    const attendanceRows = [
      ["Status", "Jumlah", "Persentase"],
      ["Hadir", attendanceData.present, `${((attendanceData.present / total) * 100).toFixed(1)}%`],
      ["Sakit", attendanceData.sick, `${((attendanceData.sick / total) * 100).toFixed(1)}%`],
      ["Izin", attendanceData.permitted, `${((attendanceData.permitted / total) * 100).toFixed(1)}%`],
      ["Alpha", attendanceData.absent, `${((attendanceData.absent / total) * 100).toFixed(1)}%`],
      ["Total", total, "100%"]
    ];
    
    // Add signature section
    const signatureData = [
      [""],
      [""],
      [`Tanggal: ${format(new Date(), "d MMMM yyyy", { locale: id })}`],
      [""],
      ["Mengetahui,", "", "", "", "Pengelola Data"],
      ["KEPALA SEKOLAH,", "", "", "", "Administrator Sekolah,"],
      ["", "", "", "", ""],
      ["", "", "", "", ""],
      ["_________________", "", "", "", "_________________"],
      [`NIP. ${schoolInfo.principalNip || "..........................."}`, "", "", "", "NIP. ..........................."],
    ];
    
    // Combine all data
    const allData = [...headerData, ...attendanceRows, ...signatureData];
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(allData);
    
    // Set column widths
    const colWidths = [{ wch: 20 }, { wch: 15 }, { wch: 15 }];
    ws['!cols'] = colWidths;
    
    // Add worksheet to workbook
    const sheetName = reportType === "monthly" 
      ? "Laporan Bulanan" 
      : reportType === "class" 
        ? `Laporan Kelas ${additionalInfo?.className}` 
        : `Laporan Siswa`;
    
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
  
  // Generate Excel file
  const fileName = `Laporan_${reportType}_${format(new Date(), "dd-MM-yyyy")}.xlsx`;
  XLSX.writeFile(wb, fileName);
  
  return fileName;
};
