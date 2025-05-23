"use client";

import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { Calendar, FileText, Download, Filter, Users, BookOpen, User, Loader2, ChevronDown, Check, X } from "lucide-react";
import { format, subDays, subMonths } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import * as ChartJS from "chart.js/auto";
interface ReportGeneratorProps {
  schoolId: string | null;
  userRole: string | null;
}
interface ReportOptions {
  reportType: "summary" | "detailed" | "attendance" | "absence";
  dateRange: "today" | "week" | "month" | "custom";
  startDate: string;
  endDate: string;
  includeCharts: boolean;
  includeStatistics: boolean;
  selectedClasses: string[];
  selectedStudents: string[];
  orientation: "portrait" | "landscape";
  paperSize: "a4" | "letter";
  templateId?: string;
}
const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  schoolId,
  userRole
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [showClassSelector, setShowClassSelector] = useState(false);
  const [showStudentSelector, setShowStudentSelector] = useState(false);
  const [options, setOptions] = useState<ReportOptions>({
    reportType: "summary",
    dateRange: "month",
    startDate: format(subMonths(new Date(), 1), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    includeCharts: true,
    includeStatistics: true,
    selectedClasses: [],
    selectedStudents: [],
    orientation: "portrait",
    paperSize: "a4",
    templateId: ""
  });

  // Fetch classes and students when component mounts
  useEffect(() => {
    const fetchData = async () => {
      if (!schoolId) return;
      try {
        // Fetch classes
        const {
          classApi
        } = await import('@/lib/api');
        const classesData = await classApi.getAll(schoolId);
        setClasses(classesData || []);

        // Fetch students
        const {
          studentApi
        } = await import('@/lib/api');
        const studentsData = await studentApi.getAll(schoolId);
        setStudents(studentsData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [schoolId]);
  const handleOptionChange = (key: keyof ReportOptions, value: any) => {
    setOptions(prev => ({
      ...prev,
      [key]: value
    }));

    // Handle date range changes
    if (key === "dateRange") {
      const today = new Date();
      let startDate = "";
      switch (value) {
        case "today":
          startDate = format(today, "yyyy-MM-dd");
          break;
        case "week":
          startDate = format(subDays(today, 7), "yyyy-MM-dd");
          break;
        case "month":
          startDate = format(subMonths(today, 1), "yyyy-MM-dd");
          break;
        case "custom":
          // Keep current dates for custom range
          return;
      }
      setOptions(prev => ({
        ...prev,
        startDate,
        endDate: format(today, "yyyy-MM-dd")
      }));
    }
  };
  const toggleClassSelection = (classId: string) => {
    setOptions(prev => {
      const isSelected = prev.selectedClasses.includes(classId);
      return {
        ...prev,
        selectedClasses: isSelected ? prev.selectedClasses.filter(id => id !== classId) : [...prev.selectedClasses, classId]
      };
    });
  };
  const toggleStudentSelection = (studentId: string) => {
    setOptions(prev => {
      const isSelected = prev.selectedStudents.includes(studentId);
      return {
        ...prev,
        selectedStudents: isSelected ? prev.selectedStudents.filter(id => id !== studentId) : [...prev.selectedStudents, studentId]
      };
    });
  };
  const [templates, setTemplates] = useState<any[]>([]);

  // Fetch available templates
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!schoolId) return;
      try {
        // Try to get templates from localStorage first
        const storedTemplates = localStorage.getItem(`reportTemplates_${schoolId}`);
        if (storedTemplates) {
          setTemplates(JSON.parse(storedTemplates));
          return;
        }

        // If no templates in localStorage, try Firestore
        const {
          collection,
          query,
          getDocs,
          orderBy
        } = await import('firebase/firestore');
        const {
          db
        } = await import('@/lib/firebase');
        const templatesRef = collection(db, `schools/${schoolId}/reportTemplates`);
        const templatesQuery = query(templatesRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(templatesQuery);
        const fetchedTemplates: any[] = [];
        snapshot.forEach(doc => {
          fetchedTemplates.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setTemplates(fetchedTemplates);

        // Save to localStorage for faster access next time
        localStorage.setItem(`reportTemplates_${schoolId}`, JSON.stringify(fetchedTemplates));
      } catch (error) {
        console.error("Error fetching templates:", error);
      }
    };
    fetchTemplates();
  }, [schoolId]);
  const generateReport = async () => {
    setIsGenerating(true);
    try {
      // Get school info
      const {
        db
      } = await import('@/lib/firebase');
      const {
        doc,
        getDoc
      } = await import('firebase/firestore');
      let schoolInfo = {
        name: "School Name",
        address: "School Address",
        npsn: "12345678",
        principalName: "Principal Name"
      };
      if (schoolId) {
        const schoolDoc = await getDoc(doc(db, "schools", schoolId));
        if (schoolDoc.exists()) {
          const data = schoolDoc.data();
          schoolInfo = {
            name: data.name || schoolInfo.name,
            address: data.address || schoolInfo.address,
            npsn: data.npsn || schoolInfo.npsn,
            principalName: data.principalName || schoolInfo.principalName
          };
        }
      }

      // If using a template, redirect to the template generation page
      if (options.templateId) {
        window.location.href = `/dashboard/reports/generate?templateId=${options.templateId}`;
        return;
      }

      // Create PDF document
      const pdfDoc = new jsPDF({
        orientation: options.orientation,
        unit: "mm",
        format: options.paperSize
      });
      const pageWidth = pdfDoc.internal.pageSize.getWidth();
      const pageHeight = pdfDoc.internal.pageSize.getHeight();
      const margin = 15;

      // Add header
      pdfDoc.setFontSize(16);
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.text(schoolInfo.name, pageWidth / 2, margin, {
        align: "center"
      });
      pdfDoc.setFontSize(10);
      pdfDoc.setFont("helvetica", "normal");
      pdfDoc.text(schoolInfo.address, pageWidth / 2, margin + 7, {
        align: "center"
      });
      pdfDoc.text(`NPSN: ${schoolInfo.npsn}`, pageWidth / 2, margin + 12, {
        align: "center"
      });

      // Add title
      pdfDoc.setFontSize(14);
      pdfDoc.setFont("helvetica", "bold");
      const reportTitle = `LAPORAN ${options.reportType.toUpperCase()} KEHADIRAN SISWA`;
      pdfDoc.text(reportTitle, pageWidth / 2, margin + 25, {
        align: "center"
      });

      // Add date range
      pdfDoc.setFontSize(10);
      pdfDoc.setFont("helvetica", "normal");
      const startDateFormatted = format(new Date(options.startDate), "d MMMM yyyy", {
        locale: id
      });
      const endDateFormatted = format(new Date(options.endDate), "d MMMM yyyy", {
        locale: id
      });
      pdfDoc.text(`Periode: ${startDateFormatted} - ${endDateFormatted}`, pageWidth / 2, margin + 32, {
        align: "center"
      });

      // Add filter information
      let currentY = margin + 40;
      if (options.selectedClasses.length > 0) {
        const selectedClassNames = options.selectedClasses.map(classId => {
          const classObj = classes.find(c => c.id === classId);
          return classObj ? classObj.name : classId;
        }).join(", ");
        pdfDoc.text(`Kelas: ${selectedClassNames}`, margin, currentY);
        currentY += 6;
      }
      if (options.selectedStudents.length > 0) {
        const selectedStudentNames = options.selectedStudents.map(studentId => {
          const student = students.find(s => s.id === studentId);
          return student ? student.name : studentId;
        }).join(", ");
        pdfDoc.text(`Siswa: ${selectedStudentNames}`, margin, currentY);
        currentY += 6;
      }

      // Add attendance data
      currentY += 10;
      pdfDoc.setFontSize(12);
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.text("Rekapitulasi Kehadiran", margin, currentY);
      currentY += 8;

      // Create table headers
      const tableHeaders = ["Status", "Jumlah", "Persentase"];
      const columnWidths = [40, 30, 30];
      const rowHeight = 8;

      // Draw table header
      pdfDoc.setFillColor(240, 240, 240);
      pdfDoc.rect(margin, currentY, columnWidths.reduce((a, b) => a + b, 0), rowHeight, "F");
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.setFontSize(10);
      let currentX = margin;
      tableHeaders.forEach((header, index) => {
        pdfDoc.text(header, currentX + columnWidths[index] / 2, currentY + 5.5, {
          align: "center"
        });
        currentX += columnWidths[index];
      });
      currentY += rowHeight;

      // Sample attendance data - in a real app, this would come from your database
      const attendanceData = [{
        status: "Hadir",
        count: 450,
        percentage: "90%"
      }, {
        status: "Sakit",
        count: 25,
        percentage: "5%"
      }, {
        status: "Izin",
        count: 15,
        percentage: "3%"
      }, {
        status: "Alpha",
        count: 10,
        percentage: "2%"
      }];

      // Draw table rows
      pdfDoc.setFont("helvetica", "normal");
      attendanceData.forEach((row, rowIndex) => {
        // Alternate row background
        if (rowIndex % 2 === 0) {
          pdfDoc.setFillColor(250, 250, 250);
          pdfDoc.rect(margin, currentY, columnWidths.reduce((a, b) => a + b, 0), rowHeight, "F");
        }
        currentX = margin;
        pdfDoc.text(row.status, currentX + columnWidths[0] / 2, currentY + 5.5, {
          align: "center"
        });
        currentX += columnWidths[0];
        pdfDoc.text(row.count.toString(), currentX + columnWidths[1] / 2, currentY + 5.5, {
          align: "center"
        });
        currentX += columnWidths[1];
        pdfDoc.text(row.percentage, currentX + columnWidths[2] / 2, currentY + 5.5, {
          align: "center"
        });
        currentY += rowHeight;
      });

      // Add total row
      pdfDoc.setFillColor(240, 240, 240);
      pdfDoc.rect(margin, currentY, columnWidths.reduce((a, b) => a + b, 0), rowHeight, "F");
      pdfDoc.setFont("helvetica", "bold");
      currentX = margin;
      pdfDoc.text("Total", currentX + columnWidths[0] / 2, currentY + 5.5, {
        align: "center"
      });
      currentX += columnWidths[0];
      const totalCount = attendanceData.reduce((sum, row) => sum + row.count, 0);
      pdfDoc.text(totalCount.toString(), currentX + columnWidths[1] / 2, currentY + 5.5, {
        align: "center"
      });
      currentX += columnWidths[1];
      pdfDoc.text("100%", currentX + columnWidths[2] / 2, currentY + 5.5, {
        align: "center"
      });
      currentY += rowHeight + 15;

      // Add charts if requested
      if (options.includeCharts) {
        // Create a canvas for the chart
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 200;
        document.body.appendChild(canvas);

        // Create pie chart
        const ctx = canvas.getContext('2d');
        if (ctx) {
          new ChartJS.Chart(ctx, {
            type: 'pie',
            data: {
              labels: attendanceData.map(item => item.status),
              datasets: [{
                data: attendanceData.map(item => item.count),
                backgroundColor: ['#4C6FFF',
                // Hadir - Blue
                '#FF9800',
                // Sakit - Orange
                '#8BC34A',
                // Izin - Green
                '#F44336' // Alpha - Red
                ]
              }]
            },
            options: {
              responsive: false,
              plugins: {
                legend: {
                  position: 'right'
                }
              }
            }
          });

          // Add chart to PDF
          pdfDoc.text("Grafik Kehadiran", margin, currentY);
          currentY += 8;

          // Convert canvas to image
          const imgData = canvas.toDataURL('image/png');
          pdfDoc.addImage(imgData, 'PNG', margin, currentY, 100, 50);

          // Clean up
          document.body.removeChild(canvas);
        }
      }

      // Add footer
      const currentDate = format(new Date(), "d MMMM yyyy", {
        locale: id
      });
      pdfDoc.setFontSize(10);
      pdfDoc.setFont("helvetica", "normal");
      pdfDoc.text(`Dicetak pada: ${currentDate}`, pageWidth - margin, pageHeight - 20, {
        align: "right"
      });

      // Add signatures
      pdfDoc.text("Mengetahui,", margin, pageHeight - 30);
      pdfDoc.text("Kepala Sekolah", margin, pageHeight - 25);
      pdfDoc.text(schoolInfo.principalName, margin, pageHeight - 10);

      // Save the PDF
      const fileName = `Laporan_Kehadiran_${format(new Date(), "dd-MM-yyyy")}.pdf`;
      pdfDoc.save(fileName);
      toast.success(`Laporan berhasil dibuat: ${fileName}`);
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Gagal membuat laporan");
    } finally {
      setIsGenerating(false);
    }
  };
  return <div className="bg-white rounded-xl shadow-sm p-6 mb-6" data-unique-id="274ddbc5-93b9-4b56-a948-076f638e4e74" data-file-name="components/ReportGenerator.tsx">
      <div className="flex items-center justify-between mb-4" data-unique-id="f748fb7a-2554-4703-ad50-7e2b86546a38" data-file-name="components/ReportGenerator.tsx">
        <div className="flex items-center" data-unique-id="5d9751a3-79aa-46d1-931c-689952cf5f31" data-file-name="components/ReportGenerator.tsx">
          <div className="bg-blue-100 p-2 rounded-lg mr-3" data-unique-id="a61f9b57-1c81-4195-a5c0-ee81296c7a2b" data-file-name="components/ReportGenerator.tsx">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold" data-unique-id="59d7440d-aff3-4365-96db-da0465fdeb35" data-file-name="components/ReportGenerator.tsx"><span className="editable-text" data-unique-id="33a34165-2b2e-4f74-acfc-c861fefe46eb" data-file-name="components/ReportGenerator.tsx">Generator Laporan Kustom</span></h2>
        </div>
        <button onClick={() => setShowOptions(!showOptions)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900" data-unique-id="b3254891-3c85-4fad-8433-e845fe1a1a5d" data-file-name="components/ReportGenerator.tsx" data-dynamic-text="true">
          {showOptions ? "Sembunyikan Opsi" : "Tampilkan Opsi"}
          <ChevronDown className={`h-4 w-4 transition-transform ${showOptions ? "rotate-180" : ""}`} />
        </button>
      </div>
      
      <AnimatePresence>
        {showOptions && <motion.div initial={{
        height: 0,
        opacity: 0
      }} animate={{
        height: "auto",
        opacity: 1
      }} exit={{
        height: 0,
        opacity: 0
      }} transition={{
        duration: 0.3
      }} className="overflow-hidden" data-unique-id="5fc5c1cc-d7a6-4260-8e9a-0b70644185d9" data-file-name="components/ReportGenerator.tsx">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6" data-unique-id="2194e2de-03c5-4390-af35-d60087cbe181" data-file-name="components/ReportGenerator.tsx" data-dynamic-text="true">
              {/* Report Type */}
              <div data-unique-id="8d9f8164-0678-4748-bd29-f68dbbe9bd47" data-file-name="components/ReportGenerator.tsx">
                <label className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="4bc6c6ae-ab4b-4c59-9161-3599dda807f5" data-file-name="components/ReportGenerator.tsx"><span className="editable-text" data-unique-id="5f7bd308-12cd-4e63-bdae-c38390aabf9f" data-file-name="components/ReportGenerator.tsx">
                  Jenis Laporan
                </span></label>
                <select value={options.reportType} onChange={e => handleOptionChange("reportType", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" data-unique-id="224f5c7a-2b6a-40bb-9e80-3ae51a8449bd" data-file-name="components/ReportGenerator.tsx">
                  <option value="summary" data-unique-id="c79001e8-42fa-40ac-8c77-3a3de4ce1728" data-file-name="components/ReportGenerator.tsx"><span className="editable-text" data-unique-id="8ca836bc-c94c-4dfd-bbcd-4b3d491ac19a" data-file-name="components/ReportGenerator.tsx">Ringkasan</span></option>
                  <option value="detailed" data-unique-id="735056fb-24b6-40d0-899e-3d4f946acdfc" data-file-name="components/ReportGenerator.tsx"><span className="editable-text" data-unique-id="51787738-f595-4b3a-8752-8548ebc106a1" data-file-name="components/ReportGenerator.tsx">Detail</span></option>
                  <option value="attendance" data-unique-id="8fc9212c-cdfd-4156-bb81-1af467ff46e2" data-file-name="components/ReportGenerator.tsx"><span className="editable-text" data-unique-id="b5075064-adea-426e-a6cd-b7f18b73a073" data-file-name="components/ReportGenerator.tsx">Kehadiran</span></option>
                  <option value="absence" data-unique-id="2319f4cc-77f4-444b-8df1-0a668d1da340" data-file-name="components/ReportGenerator.tsx"><span className="editable-text" data-unique-id="e48f98f2-9b07-435b-8d6f-1827cc45381c" data-file-name="components/ReportGenerator.tsx">Ketidakhadiran</span></option>
                </select>
              </div>
              
              {/* Date Range */}
              <div data-unique-id="45ce40eb-cd0d-4be4-9864-4fc6d73dc9cc" data-file-name="components/ReportGenerator.tsx">
                <label className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="e067b077-3310-401e-9cab-0a9e6886e7de" data-file-name="components/ReportGenerator.tsx"><span className="editable-text" data-unique-id="4a3fcff2-28ee-4580-85df-51ea849d1a2a" data-file-name="components/ReportGenerator.tsx">
                  Rentang Waktu
                </span></label>
                <select value={options.dateRange} onChange={e => handleOptionChange("dateRange", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" data-unique-id="5b7513b5-b6f0-4e9f-963b-3d8ff9a5098b" data-file-name="components/ReportGenerator.tsx">
                  <option value="today" data-unique-id="40e3f6a8-ff74-4600-9dd8-3fc20a37d899" data-file-name="components/ReportGenerator.tsx"><span className="editable-text" data-unique-id="db93144d-8617-4bf7-b9f1-39cb0838ae90" data-file-name="components/ReportGenerator.tsx">Hari Ini</span></option>
                  <option value="week" data-unique-id="7574fb38-7fb0-4bad-997b-a003731e1b6b" data-file-name="components/ReportGenerator.tsx"><span className="editable-text" data-unique-id="562d1c56-2686-4055-9d6e-c1bb3726e272" data-file-name="components/ReportGenerator.tsx">Minggu Ini</span></option>
                  <option value="month" data-unique-id="3b6e92ee-0137-49a0-af91-ee26ccf8691d" data-file-name="components/ReportGenerator.tsx"><span className="editable-text" data-unique-id="9ae8d82a-bdc3-4328-81cf-ef604006afbd" data-file-name="components/ReportGenerator.tsx">Bulan Ini</span></option>
                  <option value="custom" data-unique-id="51887ae5-40ba-4e49-8218-ba2be55db4d4" data-file-name="components/ReportGenerator.tsx"><span className="editable-text" data-unique-id="0e729bb4-f591-42d3-9fe8-59f7cf86d37e" data-file-name="components/ReportGenerator.tsx">Kustom</span></option>
                </select>
              </div>
              
              {/* Custom Date Range */}
              {options.dateRange === "custom" && <>
                  <div data-unique-id="231d36df-83e9-4bc6-b1f8-523827b41840" data-file-name="components/ReportGenerator.tsx">
                    <label className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="16475398-ec88-429c-a4a8-dc0c1ef5d438" data-file-name="components/ReportGenerator.tsx"><span className="editable-text" data-unique-id="94af0821-1930-4bcb-b0bb-ff7afcf4f290" data-file-name="components/ReportGenerator.tsx">
                      Tanggal Mulai
                    </span></label>
                    <input type="date" value={options.startDate} onChange={e => handleOptionChange("startDate", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" data-unique-id="2deb77a0-0180-428e-a659-ca6d6224b530" data-file-name="components/ReportGenerator.tsx" />
                  </div>
                  
                  <div data-unique-id="9d43cd71-6e2c-44dd-9ce9-cbebc86c9d12" data-file-name="components/ReportGenerator.tsx">
                    <label className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="d7a3e360-e13d-4dfd-9e99-0c3f68da088c" data-file-name="components/ReportGenerator.tsx"><span className="editable-text" data-unique-id="7b58e57c-2066-4419-9563-544b073002b2" data-file-name="components/ReportGenerator.tsx">
                      Tanggal Akhir
                    </span></label>
                    <input type="date" value={options.endDate} onChange={e => handleOptionChange("endDate", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" data-unique-id="984e402c-ea34-454e-95d1-a632a1cde753" data-file-name="components/ReportGenerator.tsx" />
                  </div>
                </>}
              
              {/* Class Selector */}
              <div className="relative" data-unique-id="cb397156-c621-4da5-b6e2-f33380a11d3d" data-file-name="components/ReportGenerator.tsx" data-dynamic-text="true">
                <label className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="171f9194-4918-409c-8428-1772ba1b479a" data-file-name="components/ReportGenerator.tsx"><span className="editable-text" data-unique-id="3b5d1273-7078-433f-9062-f2e143a35512" data-file-name="components/ReportGenerator.tsx">
                  Pilih Kelas
                </span></label>
                <button type="button" onClick={() => setShowClassSelector(!showClassSelector)} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left flex justify-between items-center" data-unique-id="5c45b4a2-3b64-4275-9c88-eadb3a4ab593" data-file-name="components/ReportGenerator.tsx">
                  <span data-unique-id="8a27076a-4a4b-45f3-892a-b64418ac1e8d" data-file-name="components/ReportGenerator.tsx" data-dynamic-text="true">
                    {options.selectedClasses.length === 0 ? "Semua Kelas" : `${options.selectedClasses.length} Kelas Dipilih`}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                
                {showClassSelector && <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto" data-unique-id="85e7056a-f0f8-4369-8530-833cee85492e" data-file-name="components/ReportGenerator.tsx">
                    <div className="p-2" data-unique-id="12362f9b-f515-4001-b7d1-197fad072673" data-file-name="components/ReportGenerator.tsx" data-dynamic-text="true">
                      {classes.length > 0 ? classes.map(cls => <div key={cls.id} className="flex items-center px-3 py-2 hover:bg-gray-100 rounded-md cursor-pointer" onClick={() => toggleClassSelection(cls.id)} data-unique-id="7ba9da8e-9ce7-4109-bbcc-f1295bb0b442" data-file-name="components/ReportGenerator.tsx">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${options.selectedClasses.includes(cls.id) ? "bg-primary border-primary" : "border-gray-300"}`} data-unique-id="49ac616a-40a9-48b2-9beb-30f310e95372" data-file-name="components/ReportGenerator.tsx" data-dynamic-text="true">
                              {options.selectedClasses.includes(cls.id) && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <span className="ml-2" data-unique-id="eda92fc4-e203-424b-90cf-b62d351ec923" data-file-name="components/ReportGenerator.tsx" data-dynamic-text="true">{cls.name}</span>
                          </div>) : <div className="px-3 py-2 text-gray-500" data-unique-id="10985404-c522-45d3-b8de-38c8986bedc9" data-file-name="components/ReportGenerator.tsx"><span className="editable-text" data-unique-id="aadfc5e5-eca9-419d-b02a-bac24ceed078" data-file-name="components/ReportGenerator.tsx">Tidak ada kelas</span></div>}
                    </div>
                  </div>}
              </div>
              
              {/* Student Selector */}
              <div className="relative" data-unique-id="0600177c-8801-4bf7-9498-10904f9566bd" data-file-name="components/ReportGenerator.tsx" data-dynamic-text="true">
                <label className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="17504523-e112-433d-84c6-f5cd3ed69ac8" data-file-name="components/ReportGenerator.tsx"><span className="editable-text" data-unique-id="d264d1f3-6ad7-4b08-b5a5-4d50d7645ad8" data-file-name="components/ReportGenerator.tsx">
                  Pilih Siswa
                </span></label>
                <button type="button" onClick={() => setShowStudentSelector(!showStudentSelector)} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left flex justify-between items-center" data-unique-id="d8e5e8b9-045f-4e3d-aac6-127e57759d52" data-file-name="components/ReportGenerator.tsx">
                  <span data-unique-id="a51da5e8-73bf-4554-aa89-c7315a948fe0" data-file-name="components/ReportGenerator.tsx" data-dynamic-text="true">
                    {options.selectedStudents.length === 0 ? "Semua Siswa" : `${options.selectedStudents.length} Siswa Dipilih`}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                
                {showStudentSelector && <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto" data-unique-id="83ed9f89-b79a-435b-a0b4-9e8a95b633ef" data-file-name="components/ReportGenerator.tsx">
                    <div className="p-2" data-unique-id="dc5c989a-7e68-4e5f-a30e-43b64ce6ba0c" data-file-name="components/ReportGenerator.tsx" data-dynamic-text="true">
                      {students.length > 0 ? students.map(student => <div key={student.id} className="flex items-center px-3 py-2 hover:bg-gray-100 rounded-md cursor-pointer" onClick={() => toggleStudentSelection(student.id)} data-unique-id="9baf4912-7295-49ae-9161-224354d03522" data-file-name="components/ReportGenerator.tsx">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${options.selectedStudents.includes(student.id) ? "bg-primary border-primary" : "border-gray-300"}`} data-unique-id="a5afd946-2cf6-4cdd-8a24-4b7eb5be1a7a" data-file-name="components/ReportGenerator.tsx" data-dynamic-text="true">
                              {options.selectedStudents.includes(student.id) && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <span className="ml-2" data-unique-id="25771a27-214e-4686-bdcd-4d2d90fcdbd8" data-file-name="components/ReportGenerator.tsx" data-dynamic-text="true">{student.name}</span>
                          </div>) : <div className="px-3 py-2 text-gray-500" data-unique-id="f2d79ac3-2c97-452a-b521-65add3c4e2ae" data-file-name="components/ReportGenerator.tsx"><span className="editable-text" data-unique-id="6c63cc33-309b-470c-b93d-8ad14883683a" data-file-name="components/ReportGenerator.tsx">Tidak ada siswa</span></div>}
                    </div>
                  </div>}
              </div>
              
              {/* Include Charts */}
              <div className="flex items-center" data-unique-id="7c250978-597f-4806-a6a2-cf868bcd1f2c" data-file-name="components/ReportGenerator.tsx">
                <input type="checkbox" id="includeCharts" checked={options.includeCharts} onChange={e => handleOptionChange("includeCharts", e.target.checked)} className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" data-unique-id="92cc5fd7-2962-4934-bf19-eeb3bf66bd55" data-file-name="components/ReportGenerator.tsx" />
                <label htmlFor="includeCharts" className="ml-2 block text-sm text-gray-700" data-unique-id="da4f5d8c-1bbb-4528-bcea-879f4ab55e2f" data-file-name="components/ReportGenerator.tsx"><span className="editable-text" data-unique-id="bf58245e-709c-45b1-9388-c28d868821a0" data-file-name="components/ReportGenerator.tsx">
                  Sertakan Grafik
                </span></label>
              </div>
              
              {/* Include Statistics */}
              <div className="flex items-center" data-unique-id="8cbce8d5-41e8-43af-b03e-06d35d95dbc0" data-file-name="components/ReportGenerator.tsx">
                <input type="checkbox" id="includeStatistics" checked={options.includeStatistics} onChange={e => handleOptionChange("includeStatistics", e.target.checked)} className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" data-unique-id="0ac0eec5-7817-466c-b6ee-97b823bffc19" data-file-name="components/ReportGenerator.tsx" />
                <label htmlFor="includeStatistics" className="ml-2 block text-sm text-gray-700" data-unique-id="480640e9-4266-4543-9cb5-f425cac518d5" data-file-name="components/ReportGenerator.tsx"><span className="editable-text" data-unique-id="c881a036-8b24-4293-88db-cce34ae99b2d" data-file-name="components/ReportGenerator.tsx">
                  Sertakan Statistik
                </span></label>
              </div>
              
              {/* Page Orientation */}
              <div data-unique-id="0db44b1b-5ab5-4a53-b0e6-f02b60de4c5f" data-file-name="components/ReportGenerator.tsx">
                <label className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="045a61a9-92d3-4d9a-8e11-eeb78bb0ec2d" data-file-name="components/ReportGenerator.tsx"><span className="editable-text" data-unique-id="cd3b1a41-d853-42e8-9480-3eb5ba3483c5" data-file-name="components/ReportGenerator.tsx">
                  Orientasi Halaman
                </span></label>
                <select value={options.orientation} onChange={e => handleOptionChange("orientation", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" data-unique-id="5e9fafb8-8d9d-457b-a2d2-825d06331728" data-file-name="components/ReportGenerator.tsx">
                  <option value="portrait" data-unique-id="f9d8a1a0-d324-4510-9a17-63a267223b3f" data-file-name="components/ReportGenerator.tsx"><span className="editable-text" data-unique-id="4a1e8196-a5e9-4192-b17e-65b3fde155bf" data-file-name="components/ReportGenerator.tsx">Potrait</span></option>
                  <option value="landscape" data-unique-id="790d7b29-ee58-46ae-93fb-1f89179a435c" data-file-name="components/ReportGenerator.tsx"><span className="editable-text" data-unique-id="7c690481-9541-43b1-8f2d-6627959edcc8" data-file-name="components/ReportGenerator.tsx">Landscape</span></option>
                </select>
              </div>
              
              {/* Paper Size */}
              <div data-unique-id="54fa2406-8ea1-456f-a801-7ba5ba1ebaf4" data-file-name="components/ReportGenerator.tsx">
                <label className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="8b11f8a1-dc54-41ae-9fb0-08df17058f22" data-file-name="components/ReportGenerator.tsx"><span className="editable-text" data-unique-id="c002e913-445e-42b5-999c-6c4125115710" data-file-name="components/ReportGenerator.tsx">
                  Ukuran Kertas
                </span></label>
                <select value={options.paperSize} onChange={e => handleOptionChange("paperSize", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" data-unique-id="3bb5c455-e531-4538-930e-7dafd0cef89b" data-file-name="components/ReportGenerator.tsx">
                  <option value="a4" data-unique-id="57b254ba-ae37-4b1c-ba29-425d6e8632f6" data-file-name="components/ReportGenerator.tsx"><span className="editable-text" data-unique-id="58747379-966c-408f-931f-b6041bd54752" data-file-name="components/ReportGenerator.tsx">A4</span></option>
                  <option value="letter" data-unique-id="dd27a844-faea-4a5b-9723-e021e6ebf487" data-file-name="components/ReportGenerator.tsx"><span className="editable-text" data-unique-id="de6556f3-65e0-4647-8bb1-31c8a8af59fa" data-file-name="components/ReportGenerator.tsx">Letter</span></option>
                </select>
              </div>
            
              {/* Template Selection */}
              <div data-unique-id="9e5def8d-6489-42b2-b7cd-e47f5df62359" data-file-name="components/ReportGenerator.tsx">
                <label className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="0dc5417b-e89e-4190-b329-51c8417cf9d3" data-file-name="components/ReportGenerator.tsx"><span className="editable-text" data-unique-id="69b2f031-ccf1-417f-802a-bbfb81d82084" data-file-name="components/ReportGenerator.tsx">
                  Template Laporan
                </span></label>
                <select value={options.templateId} onChange={e => handleOptionChange("templateId", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" data-unique-id="5b0e7738-1d78-4a4d-b0ba-a2b17e8497d8" data-file-name="components/ReportGenerator.tsx" data-dynamic-text="true">
                  <option value="" data-unique-id="74dadc17-4259-4e2a-8b45-3d955e658f0d" data-file-name="components/ReportGenerator.tsx"><span className="editable-text" data-unique-id="82aa8319-a391-4882-ac7e-368f6a723ea0" data-file-name="components/ReportGenerator.tsx">Gunakan Template Default</span></option>
                  {templates.map(template => <option key={template.id} value={template.id} data-unique-id="141a01ea-7a45-4907-9b95-498d33786aa4" data-file-name="components/ReportGenerator.tsx" data-dynamic-text="true">
                      {template.name}
                    </option>)}
                </select>
              </div>
            </div>
          </motion.div>}
      </AnimatePresence>
      
      <div className="flex justify-end" data-unique-id="5119721c-28ef-4077-81a6-5254d81c8efa" data-file-name="components/ReportGenerator.tsx">
        <button onClick={generateReport} disabled={isGenerating} className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors" data-unique-id="a24ea121-a685-4630-9b33-2980c24d6907" data-file-name="components/ReportGenerator.tsx" data-dynamic-text="true">
          {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
          {isGenerating ? "Membuat Laporan..." : "Buat Laporan"}
        </button>
      </div>
    </div>;
};
export default ReportGenerator;