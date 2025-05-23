"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "next/navigation";
import { 
  FileText, 
  Download, 
  ArrowLeft, 
  Settings, 
  Calendar, 
  Users, 
  BookOpen,
  Loader2,
  Save,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function GenerateReportPage() {
  const { schoolId } = useAuth();
  const searchParams = useSearchParams();
  const templateId = searchParams?.get('templateId');
  
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<any>(null);
  const [reportData, setReportData] = useState<any>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState({
    name: "Sekolah",
    address: "Alamat Sekolah",
    npsn: "12345678",
    principalName: "Kepala Sekolah",
    principalNip: "123456789"
  });
  
  // Date range for report
  const [dateRange, setDateRange] = useState({
    start: format(new Date(new Date().setDate(1)), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd")
  });
  
  // Classes for filtering
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState("all");
  
  // Fetch template and initial data
  useEffect(() => {
    const fetchData = async () => {
      if (!schoolId) return;
      
      try {
        setLoading(true);
        
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
        
        // Fetch classes
        const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
        const classesRef = collection(db, `schools/${schoolId}/classes`);
        const classesQuery = query(classesRef, orderBy("name"));
        const classesSnapshot = await getDocs(classesQuery);
        
        const classesData: string[] = [];
        classesSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.name) {
            classesData.push(data.name);
          }
        });
        setClasses(classesData.sort());
        
        // Fetch template
        if (templateId) {
          // Try localStorage first
          const storedTemplates = localStorage.getItem(`reportTemplates_${schoolId}`);
          if (storedTemplates) {
            const templates = JSON.parse(storedTemplates);
            const foundTemplate = templates.find((t: any) => t.id === templateId);
            if (foundTemplate) {
              setTemplate(foundTemplate);
              setLoading(false);
              return;
            }
          }
          
          // If not in localStorage, try Firestore
          const templateDoc = await getDoc(doc(db, `schools/${schoolId}/reportTemplates`, templateId));
          if (templateDoc.exists()) {
            setTemplate(templateDoc.data());
          } else {
            toast.error("Template tidak ditemukan");
          }
        } else {
          // No template ID provided, use default template
          setTemplate({
            id: "default",
            name: "Default Template",
            description: "Template laporan default",
            fields: ["studentName", "class", "attendance", "date"],
            layout: "standard",
            includeCharts: true,
            includeStatistics: true
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Gagal mengambil data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [schoolId, templateId]);
  
  // Fetch attendance data based on filters
  const fetchAttendanceData = useCallback(async () => {
    if (!schoolId) return;
    
    try {
      setLoading(true);
      
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      // Query for attendance records within date range
      const attendanceRef = collection(db, `schools/${schoolId}/attendance`);
      const attendanceQuery = query(
        attendanceRef,
        where("date", ">=", dateRange.start),
        where("date", "<=", dateRange.end)
      );
      
      const snapshot = await getDocs(attendanceQuery);
      
      // Process attendance records
      const records: any[] = [];
      let present = 0, sick = 0, permitted = 0, absent = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Filter by class if needed
        if (selectedClass !== "all" && data.class !== selectedClass) {
          return;
        }
        
        records.push({
          id: doc.id,
          ...data
        });
        
        // Count by status
        if (data.status === 'present' || data.status === 'hadir') present++;
        else if (data.status === 'sick' || data.status === 'sakit') sick++;
        else if (data.status === 'permitted' || data.status === 'izin') permitted++;
        else if (data.status === 'absent' || data.status === 'alpha') absent++;
      });
      
      // Calculate percentages
      const total = present + sick + permitted + absent || 1; // Prevent division by zero
      
      setReportData({
        records,
        summary: {
          present,
          sick,
          permitted,
          absent,
          total,
          presentPercentage: Math.round((present / total) * 100),
          sickPercentage: Math.round((sick / total) * 100),
          permittedPercentage: Math.round((permitted / total) * 100),
          absentPercentage: Math.round((absent / total) * 100)
        }
      });
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      toast.error("Gagal mengambil data kehadiran");
    } finally {
      setLoading(false);
    }
  }, [schoolId, dateRange, selectedClass]);
  
  // Fetch data when filters change
  useEffect(() => {
    if (template) {
      fetchAttendanceData();
    }
  }, [template, fetchAttendanceData]);
  
  // Handle date range change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle class selection change
  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClass(e.target.value);
  };
  
  // Apply filters
  const handleApplyFilters = () => {
    fetchAttendanceData();
  };
  
  // Generate PDF report
  const handleGeneratePDF = async () => {
    if (!template || !reportData.records) {
      toast.error("Data tidak tersedia untuk membuat laporan");
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Create PDF document
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
      doc.text(`NPSN: ${schoolInfo.npsn}`, pageWidth / 2, margin + 14, { align: "center" });
      
      // Add horizontal line
      doc.setLineWidth(0.5);
      doc.line(margin, margin + 20, pageWidth - margin, margin + 20);
      
      // Add report title
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`LAPORAN KEHADIRAN SISWA - ${template.name}`, pageWidth / 2, margin + 30, { align: "center" });
      
      // Add date range
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const startDateFormatted = format(new Date(dateRange.start), "d MMMM yyyy", { locale: id });
      const endDateFormatted = format(new Date(dateRange.end), "d MMMM yyyy", { locale: id });
      doc.text(`Periode: ${startDateFormatted} - ${endDateFormatted}`, pageWidth / 2, margin + 38, { align: "center" });
      
      if (selectedClass !== "all") {
        doc.text(`Kelas: ${selectedClass}`, pageWidth / 2, margin + 44, { align: "center" });
      }
      
      // Add attendance summary
      let yPos = margin + 55;
      
      if (template.includeStatistics) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Ringkasan Kehadiran", margin, yPos);
        yPos += 8;
        
        // Create summary table
        const summaryHeaders = ["Status", "Jumlah", "Persentase"];
        const summaryData = [
          ["Hadir", reportData.summary.present.toString(), `${reportData.summary.presentPercentage}%`],
          ["Sakit", reportData.summary.sick.toString(), `${reportData.summary.sickPercentage}%`],
          ["Izin", reportData.summary.permitted.toString(), `${reportData.summary.permittedPercentage}%`],
          ["Alpha", reportData.summary.absent.toString(), `${reportData.summary.absentPercentage}%`],
          ["Total", reportData.summary.total.toString(), "100%"]
        ];
        
        // Draw summary table
        const colWidths = [30, 20, 20];
        const rowHeight = 8;
        
        // Draw header row
        doc.setFillColor(220, 220, 220);
        doc.rect(margin, yPos, colWidths.reduce((a, b) => a + b, 0), rowHeight, "F");
        
        let xPos = margin;
        summaryHeaders.forEach((header, i) => {
          doc.text(header, xPos + colWidths[i] / 2, yPos + 5.5, { align: "center" });
          xPos += colWidths[i];
        });
        
        yPos += rowHeight;
        
        // Draw data rows
        doc.setFont("helvetica", "normal");
        summaryData.forEach((row, rowIndex) => {
          // Highlight total row
          if (rowIndex === summaryData.length - 1) {
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, yPos, colWidths.reduce((a, b) => a + b, 0), rowHeight, "F");
            doc.setFont("helvetica", "bold");
          }
          
          xPos = margin;
          row.forEach((cell, cellIndex) => {
            doc.text(cell, xPos + colWidths[cellIndex] / 2, yPos + 5.5, { align: "center" });
            xPos += colWidths[cellIndex];
          });
          
          yPos += rowHeight;
        });
        
        yPos += 10;
      }
      
      // Add attendance records table if included in template
      if (template.fields.includes("attendance")) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Detail Kehadiran", margin, yPos);
        yPos += 8;
        
        // Create records table
        const recordsHeaders = ["Tanggal", "Nama", "Kelas", "Status", "Waktu"];
        const colWidths = [25, 50, 20, 25, 20];
        const rowHeight = 8;
        
        // Draw header row
        doc.setFillColor(220, 220, 220);
        doc.rect(margin, yPos, colWidths.reduce((a, b) => a + b, 0), rowHeight, "F");
        
        let xPos = margin;
        recordsHeaders.forEach((header, i) => {
          doc.text(header, xPos + colWidths[i] / 2, yPos + 5.5, { align: "center" });
          xPos += colWidths[i];
        });
        
        yPos += rowHeight;
        
        // Draw data rows (limit to 20 records per page)
        doc.setFont("helvetica", "normal");
        const recordsPerPage = 20;
        const totalPages = Math.ceil(reportData.records.length / recordsPerPage);
        
        for (let page = 0; page < totalPages; page++) {
          const startIdx = page * recordsPerPage;
          const endIdx = Math.min(startIdx + recordsPerPage, reportData.records.length);
          
          for (let i = startIdx; i < endIdx; i++) {
            const record = reportData.records[i];
            
            // Format date from YYYY-MM-DD to DD-MM-YYYY
            const dateParts = record.date.split('-');
            const formattedDate = dateParts.length === 3 ? 
              `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : 
              record.date;
            
            // Get status text
            const statusText = 
              record.status === 'present' || record.status === 'hadir' ? 'Hadir' :
              record.status === 'sick' || record.status === 'sakit' ? 'Sakit' :
              record.status === 'permitted' || record.status === 'izin' ? 'Izin' :
              record.status === 'absent' || record.status === 'alpha' ? 'Alpha' :
              record.status;
            
            // Draw row with alternating background
            if (i % 2 === 0) {
              doc.setFillColor(245, 245, 245);
              doc.rect(margin, yPos, colWidths.reduce((a, b) => a + b, 0), rowHeight, "F");
            }
            
            xPos = margin;
            
            // Date
            doc.text(formattedDate, xPos + colWidths[0] / 2, yPos + 5.5, { align: "center" });
            xPos += colWidths[0];
            
            // Name (truncate if too long)
            const displayName = record.studentName.length > 20 ? 
              record.studentName.substring(0, 17) + "..." : 
              record.studentName;
            doc.text(displayName, xPos + 3, yPos + 5.5, { align: "left" });
            xPos += colWidths[1];
            
            // Class
            doc.text(record.class, xPos + colWidths[2] / 2, yPos + 5.5, { align: "center" });
            xPos += colWidths[2];
            
            // Status
            doc.text(statusText, xPos + colWidths[3] / 2, yPos + 5.5, { align: "center" });
            xPos += colWidths[3];
            
            // Time
            doc.text(record.time, xPos + colWidths[4] / 2, yPos + 5.5, { align: "center" });
            
            yPos += rowHeight;
            
            // Add a new page if needed
            if (yPos > pageHeight - margin - 40 && i < endIdx - 1) {
              doc.addPage();
              
              // Add header to new page
              doc.setFontSize(10);
              doc.setFont("helvetica", "bold");
              doc.text(schoolInfo.name.toUpperCase(), pageWidth / 2, margin, { align: "center" });
              doc.setFontSize(8);
              doc.setFont("helvetica", "normal");
              doc.text(`LAPORAN KEHADIRAN - ${template.name} (Lanjutan)`, pageWidth / 2, margin + 6, { align: "center" });
              
              // Reset Y position for new page
              yPos = margin + 15;
              
              // Draw header row again
              doc.setFontSize(9);
              doc.setFont("helvetica", "bold");
              doc.setFillColor(220, 220, 220);
              doc.rect(margin, yPos, colWidths.reduce((a, b) => a + b, 0), rowHeight, "F");
              
              xPos = margin;
              recordsHeaders.forEach((header, i) => {
                doc.text(header, xPos + colWidths[i] / 2, yPos + 5.5, { align: "center" });
                xPos += colWidths[i];
              });
              
              yPos += rowHeight;
              doc.setFont("helvetica", "normal");
            }
          }
          
          // Add a new page for the next batch if not the last page
          if (page < totalPages - 1) {
            doc.addPage();
            
            // Add header to new page
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(schoolInfo.name.toUpperCase(), pageWidth / 2, margin, { align: "center" });
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.text(`LAPORAN KEHADIRAN - ${template.name} (Lanjutan)`, pageWidth / 2, margin + 6, { align: "center" });
            
            // Reset Y position for new page
            yPos = margin + 15;
          }
        }
      }
      
      // Add signature section
      const signatureY = Math.min(yPos + 30, pageHeight - margin - 40);
      
      doc.setFontSize(10);
      doc.text(`${schoolInfo.address}, ${format(new Date(), "d MMMM yyyy", { locale: id })}`, pageWidth - margin - 40, signatureY, { align: "right" });
      
      doc.text("Mengetahui,", margin + 30, signatureY + 10, { align: "center" });
      doc.text("Kepala Sekolah", margin + 30, signatureY + 15, { align: "center" });
      
      doc.text("Dibuat oleh,", pageWidth - margin - 30, signatureY + 10, { align: "center" });
      doc.text("Administrator", pageWidth - margin - 30, signatureY + 15, { align: "center" });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(schoolInfo.principalName, margin + 30, signatureY + 35, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.text(`NIP. ${schoolInfo.principalNip}`, margin + 30, signatureY + 40, { align: "center" });
      
      // Save the PDF
      const fileName = `Laporan_${template.name.replace(/\s+/g, '_')}_${format(new Date(), "yyyyMMdd")}.pdf`;
      doc.save(fileName);
      
      toast.success(`Laporan berhasil diunduh sebagai ${fileName}`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Gagal membuat laporan PDF");
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Generate Excel report
  const handleGenerateExcel = async () => {
    if (!template || !reportData.records) {
      toast.error("Data tidak tersedia untuk membuat laporan");
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Create header data with school information
      const headerData = [
        [schoolInfo.name.toUpperCase()],
        [schoolInfo.address],
        [`NPSN: ${schoolInfo.npsn}`],
        [""],
        [`LAPORAN KEHADIRAN SISWA - ${template.name}`],
        [`Periode: ${format(new Date(dateRange.start), "d MMMM yyyy", { locale: id })} - ${format(new Date(dateRange.end), "d MMMM yyyy", { locale: id })}`],
        [selectedClass !== "all" ? `Kelas: ${selectedClass}` : "Semua Kelas"],
        [""]
      ];
      
      // Add summary data if included
      if (template.includeStatistics) {
        headerData.push(["RINGKASAN KEHADIRAN"]);
        headerData.push(["Status", "Jumlah", "Persentase"]);
        headerData.push(["Hadir", reportData.summary.present, `${reportData.summary.presentPercentage}%`]);
        headerData.push(["Sakit", reportData.summary.sick, `${reportData.summary.sickPercentage}%`]);
        headerData.push(["Izin", reportData.summary.permitted, `${reportData.summary.permittedPercentage}%`]);
        headerData.push(["Alpha", reportData.summary.absent, `${reportData.summary.absentPercentage}%`]);
        headerData.push(["Total", reportData.summary.total, "100%"]);
        headerData.push([""]);
      }
      
      // Add attendance records if included
      if (template.fields.includes("attendance")) {
        headerData.push(["DETAIL KEHADIRAN"]);
        headerData.push(["Tanggal", "Nama Siswa", "Kelas", "Status", "Waktu", "Catatan"]);
        
        reportData.records.forEach(record => {
          // Format date from YYYY-MM-DD to DD-MM-YYYY
          const dateParts = record.date.split('-');
          const formattedDate = dateParts.length === 3 ? 
            `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : 
            record.date;
          
          // Get status text
          const statusText = 
            record.status === 'present' || record.status === 'hadir' ? 'Hadir' :
            record.status === 'sick' || record.status === 'sakit' ? 'Sakit' :
            record.status === 'permitted' || record.status === 'izin' ? 'Izin' :
            record.status === 'absent' || record.status === 'alpha' ? 'Alpha' :
            record.status;
          
          headerData.push([
            formattedDate,
            record.studentName,
            record.class,
            statusText,
            record.time,
            record.note || ""
          ]);
        });
      }
      
      // Add signature section
      headerData.push([""]);
      headerData.push([""]);
      headerData.push([`${schoolInfo.address}, ${format(new Date(), "d MMMM yyyy", { locale: id })}`]);
      headerData.push([""]);
      headerData.push(["Mengetahui,", "", "", "", "Dibuat oleh,"]);
      headerData.push(["Kepala Sekolah", "", "", "", "Administrator"]);
      headerData.push([""]);
      headerData.push([""]);
      headerData.push([schoolInfo.principalName, "", "", "", "Administrator"]);
      headerData.push([`NIP. ${schoolInfo.principalNip}`, "", "", "", ""]);
      
      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(headerData);
      
      // Set column widths
      const colWidths = [
        { wch: 15 }, // Date
        { wch: 30 }, // Name
        { wch: 10 }, // Class
        { wch: 10 }, // Status
        { wch: 10 }, // Time
        { wch: 30 }  // Note
      ];
      
      ws['!cols'] = colWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Laporan Kehadiran");
      
      // Save the Excel file
      const fileName = `Laporan_${template.name.replace(/\s+/g, '_')}_${format(new Date(), "yyyyMMdd")}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success(`Laporan berhasil diunduh sebagai ${fileName}`);
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast.error("Gagal membuat laporan Excel");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6">
      <div className="flex items-center mb-6">
        <Link href="/dashboard/reports/templates" className="p-2 mr-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Generate Laporan</h1>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
        </div>
      ) : template ? (
        <>
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 p-2 rounded-lg mr-3">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{template.name}</h2>
                <p className="text-sm text-gray-500">{template.description || "No description"}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Date Range */}
              <div>
                <label htmlFor="start" className="block text-sm font-medium text-gray-700 mb-1">
                  Tanggal Mulai
                </label>
                <input
                  type="date"
                  id="start"
                  name="start"
                  value={dateRange.start}
                  onChange={handleDateChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                />
              </div>
              
              <div>
                <label htmlFor="end" className="block text-sm font-medium text-gray-700 mb-1">
                  Tanggal Akhir
                </label>
                <input
                  type="date"
                  id="end"
                  name="end"
                  value={dateRange.end}
                  onChange={handleDateChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                />
              </div>
              
              {/* Class Selection */}
              <div>
                <label htmlFor="class" className="block text-sm font-medium text-gray-700 mb-1">
                  Pilih Kelas
                </label>
                <select
                  id="class"
                  value={selectedClass}
                  onChange={handleClassChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                >
                  <option value="all">Semua Kelas</option>
                  {classes.map((className) => (
                    <option key={className} value={className}>
                      Kelas {className}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleApplyFilters}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary hover:bg-opacity-90 transition-colors"
              >
                <Settings size={18} />
                Terapkan Filter
              </button>
            </div>
          </div>
          
          {/* Report Preview */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Preview Laporan</h2>
            </div>
            
            {/* School Information */}
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold uppercase">{schoolInfo.name}</h3>
              <p className="text-gray-600">{schoolInfo.address}</p>
              <p className="text-gray-600">NPSN: {schoolInfo.npsn}</p>
            </div>
            
            <div className="text-center mb-6">
              <h3 className="text-lg uppercase font-bold">LAPORAN KEHADIRAN SISWA</h3>
              <p className="text-sm mt-1">
                Periode: {format(new Date(dateRange.start), "d MMMM yyyy", { locale: id })} - {format(new Date(dateRange.end), "d MMMM yyyy", { locale: id })}
              </p>
              {selectedClass !== "all" && (
                <p className="text-sm mt-1">Kelas: {selectedClass}</p>
              )}
            </div>
            
            {/* Summary Statistics */}
            {template.includeStatistics && reportData.summary && (
              <div className="mb-6">
                <h4 className="font-semibold mb-3">Ringkasan Kehadiran</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border px-4 py-2 text-left font-medium text-gray-700">Status</th>
                        <th className="border px-4 py-2 text-center font-medium text-gray-700">Jumlah</th>
                        <th className="border px-4 py-2 text-center font-medium text-gray-700">Persentase</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border px-4 py-2">Hadir</td>
                        <td className="border px-4 py-2 text-center">{reportData.summary.present}</td>
                        <td className="border px-4 py-2 text-center">{reportData.summary.presentPercentage}%</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="border px-4 py-2">Sakit</td>
                        <td className="border px-4 py-2 text-center">{reportData.summary.sick}</td>
                        <td className="border px-4 py-2 text-center">{reportData.summary.sickPercentage}%</td>
                      </tr>
                      <tr>
                        <td className="border px-4 py-2">Izin</td>
                        <td className="border px-4 py-2 text-center">{reportData.summary.permitted}</td>
                        <td className="border px-4 py-2 text-center">{reportData.summary.permittedPercentage}%</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="border px-4 py-2">Alpha</td>
                        <td className="border px-4 py-2 text-center">{reportData.summary.absent}</td>
                        <td className="border px-4 py-2 text-center">{reportData.summary.absentPercentage}%</td>
                      </tr>
                      <tr className="font-semibold">
                        <td className="border px-4 py-2">Total</td>
                        <td className="border px-4 py-2 text-center">{reportData.summary.total}</td>
                        <td className="border px-4 py-2 text-center">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Attendance Records */}
            {template.fields.includes("attendance") && reportData.records && (
              <div>
                <h4 className="font-semibold mb-3">Detail Kehadiran</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border px-4 py-2 text-left font-medium text-gray-700">Tanggal</th>
                        <th className="border px-4 py-2 text-left font-medium text-gray-700">Nama Siswa</th>
                        <th className="border px-4 py-2 text-center font-medium text-gray-700">Kelas</th>
                        <th className="border px-4 py-2 text-center font-medium text-gray-700">Status</th>
                        <th className="border px-4 py-2 text-center font-medium text-gray-700">Waktu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.records.slice(0, 10).map((record: any, index: number) => {
                        // Format date from YYYY-MM-DD to DD-MM-YYYY
                        const dateParts = record.date.split('-');
                        const formattedDate = dateParts.length === 3 ? 
                          `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : 
                          record.date;
                        
                        // Get status text
                        const statusText = 
                          record.status === 'present' || record.status === 'hadir' ? 'Hadir' :
                          record.status === 'sick' || record.status === 'sakit' ? 'Sakit' :
                          record.status === 'permitted' || record.status === 'izin' ? 'Izin' :
                          record.status === 'absent' || record.status === 'alpha' ? 'Alpha' :
                          record.status;
                        
                        return (
                          <tr key={record.id} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                            <td className="border px-4 py-2">{formattedDate}</td>
                            <td className="border px-4 py-2">{record.studentName}</td>
                            <td className="border px-4 py-2 text-center">{record.class}</td>
                            <td className="border px-4 py-2 text-center">{statusText}</td>
                            <td className="border px-4 py-2 text-center">{record.time}</td>
                          </tr>
                        );
                      })}
                      {reportData.records.length > 10 && (
                        <tr>
                          <td colSpan={5} className="border px-4 py-2 text-center text-gray-500">
                            ... dan {reportData.records.length - 10} data lainnya
                          </td>
                        </tr>
                      )}
                      {reportData.records.length === 0 && (
                        <tr>
                          <td colSpan={5} className="border px-4 py-2 text-center text-gray-500">
                            Tidak ada data kehadiran yang ditemukan
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          
          {/* Download Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={handleGeneratePDF}
              disabled={isGenerating}
              className="flex items-center justify-center gap-3 bg-red-600 text-white p-4 rounded-lg hover:bg-red-700 transition-colors"
            >
              {isGenerating ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <FileText className="h-6 w-6" />
              )}
              <span className="font-medium">Download Laporan PDF</span>
            </button>
            
            <button
              onClick={handleGenerateExcel}
              disabled={isGenerating}
              className="flex items-center justify-center gap-3 bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition-colors"
            >
              {isGenerating ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-6 w-6" />
              )}
              <span className="font-medium">Download Laporan Excel</span>
            </button>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center">
          <div className="flex flex-col items-center">
            <div className="bg-gray-100 rounded-full p-3 mb-4">
              <AlertTriangle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Template Tidak Ditemukan</h3>
            <p className="text-gray-500 mb-6">
              Template yang Anda cari tidak ditemukan atau tidak valid.
            </p>
            <Link
              href="/dashboard/reports/templates"
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary hover:bg-opacity-90 transition-colors"
            >
              <ArrowLeft size={18} />
              Kembali ke Daftar Template
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
