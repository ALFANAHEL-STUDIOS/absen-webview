"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Calendar, Search, Filter, FileText, Download, Clock, User, MapPin, Check, X, AlertTriangle, Calendar as CalendarIcon, Loader2, Camera } from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { id } from "date-fns/locale";
interface AttendanceRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherNik: string;
  date: string;
  time: string;
  timestamp: any;
  type: 'in' | 'out';
  status: string;
  location: {
    lat: number;
    lng: number;
  };
}
export default function TeacherAttendanceTable() {
  const {
    schoolId,
    userRole
  } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState(format(new Date(), "yyyy-MM-dd"));
  const [typeFilter, setTypeFilter] = useState<"all" | "in" | "out">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "present" | "late">("all");

  // Load attendance data
  useEffect(() => {
    const fetchData = async () => {
      if (!schoolId) return;
      try {
        setLoading(true);
        const {
          collection,
          query,
          getDocs,
          orderBy,
          where
        } = await import('firebase/firestore');
        const {
          db
        } = await import('@/lib/firebase');

        // Query teacher attendance collection
        const attendanceRef = collection(db, "teacherAttendance");
        let attendanceQuery;
        if (dateFilter) {
          attendanceQuery = query(attendanceRef, where("schoolId", "==", schoolId), where("date", "==", dateFilter), orderBy("timestamp", "desc"));
        } else {
          attendanceQuery = query(attendanceRef, where("schoolId", "==", schoolId), orderBy("timestamp", "desc"));
        }
        const snapshot = await getDocs(attendanceQuery);
        const records: AttendanceRecord[] = [];
        snapshot.forEach(doc => {
          records.push({
            id: doc.id,
            ...(doc.data() as Omit<AttendanceRecord, 'id'>)
          });
        });
        setAttendanceRecords(records);
        applyFilters(records);
      } catch (error) {
        console.error("Error fetching attendance records:", error);
        toast.error("Gagal mengambil data absensi");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [schoolId, dateFilter]);

  // Apply filters function
  const applyFilters = (records: AttendanceRecord[]) => {
    let filtered = [...records];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(record => record.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) || record.teacherNik.includes(searchQuery));
    }

    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(record => record.type === typeFilter);
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(record => record.status === statusFilter);
    }
    setFilteredRecords(filtered);
  };

  // Handle filter changes
  useEffect(() => {
    applyFilters(attendanceRecords);
  }, [searchQuery, typeFilter, statusFilter, attendanceRecords]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split("-");
    return `${day}-${month}-${year}`;
  };

  // Export attendance data
  const exportData = () => {
    try {
      // Format data for export
      const csvContent = [["Nama", "NIK", "Tanggal", "Waktu", "Tipe", "Status"].join(","), ...filteredRecords.map(record => [record.teacherName, record.teacherNik, formatDate(record.date), record.time, record.type === "in" ? "Masuk" : "Pulang", record.status === "present" ? "Tepat Waktu" : "Terlambat"].join(","))].join("\n");

      // Create download link
      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;"
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `absensi_guru_${dateFilter}.csv`);
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Data berhasil diekspor ke CSV");
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Gagal mengekspor data");
    }
  };
  return <div className="pb-20 md:pb-6" data-unique-id="185385ca-c8db-45f4-af0a-f03472005e64" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx" data-dynamic-text="true">
      <div className="flex items-center mb-6" data-unique-id="064f8cfb-251b-441c-bc2a-3105c734fa7a" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
        <Link href="/dashboard/absensi-guru" className="p-2 mr-2 hover:bg-gray-100 rounded-full" data-unique-id="4100cb67-cf06-4b32-b3e8-be393573f370" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800" data-unique-id="7fd5727c-eeb7-4ada-ae53-829901652781" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx"><span className="editable-text" data-unique-id="c1b83a7c-704b-4580-9eca-9ec10c063bde" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">Hasil Absensi Guru</span></h1>
      </div>
      
      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6" data-unique-id="720d81c2-7e7d-45d3-ac6f-a9c68af02366" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-unique-id="23630961-48da-4ea2-bc24-b94b24097d84" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx" data-dynamic-text="true">
          {/* Search */}
          <div data-unique-id="876221ee-7b06-40f3-83c4-42f11b1c3657" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
            <label className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="7dc0520c-5bec-4c17-984a-4c0604e267bd" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx"><span className="editable-text" data-unique-id="810f2413-f674-4d5c-930c-3fb3a5a1b64b" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">Cari</span></label>
            <div className="relative" data-unique-id="9ff8e0b3-4551-45fc-bdd6-0f845f1b1eea" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input type="text" placeholder="Cari berdasarkan nama atau NIK..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} data-unique-id="64baf847-ca68-49ca-81e8-b69b4796935e" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx" />
            </div>
          </div>
          
          {/* Date Filter */}
          <div data-unique-id="12b21029-137f-4bbb-82d1-906a744b8629" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
            <label className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="cd282477-d24e-43b7-8788-566bcf728a38" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx"><span className="editable-text" data-unique-id="e0c923d7-d92c-4d50-ba7c-76383d6e4320" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">Tanggal</span></label>
            <div className="relative" data-unique-id="eb7bba1c-83c3-441d-b64b-60aa4968804d" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input type="date" className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" value={dateFilter} onChange={e => setDateFilter(e.target.value)} data-unique-id="39828010-d6e5-42dd-9025-32a976e5e18a" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx" />
            </div>
          </div>
          
          {/* Type Filter */}
          <div data-unique-id="05bc82ab-b30a-41e3-ab27-31b9a8148362" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
            <label className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="628fea26-3fbd-41e5-83c3-e6de6af18021" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx"><span className="editable-text" data-unique-id="f4491399-453a-43c8-9db3-b487f2a58464" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">Tipe Absensi</span></label>
            <div className="relative" data-unique-id="12c447a5-365c-4c47-9187-bb7f4d6613bc" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <select className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary appearance-none bg-white" value={typeFilter} onChange={e => setTypeFilter(e.target.value as "all" | "in" | "out")} data-unique-id="fcd32de3-4fe8-497e-b1fd-b197ed1c29a5" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
                <option value="all" data-unique-id="052a2c55-e7c8-40f6-8921-fb473e804ead" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx"><span className="editable-text" data-unique-id="3a20dc87-307d-43d0-bc2a-07c58e56aabb" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">Semua</span></option>
                <option value="in" data-unique-id="05920f5c-0c5c-4e51-a2f1-50af21893c48" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx"><span className="editable-text" data-unique-id="f38918ff-12e9-4e19-9c6c-dbcebb07e9a1" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">Masuk</span></option>
                <option value="out" data-unique-id="15fbab53-a6f1-441b-bd9c-2f5f34b09ea9" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx"><span className="editable-text" data-unique-id="cd97a975-cfff-4994-bea9-4dd2883859c5" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">Pulang</span></option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end mt-4" data-unique-id="7ac72ffb-9a7e-405a-9770-329024970ff0" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
          <button onClick={exportData} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors" disabled={filteredRecords.length === 0} data-unique-id="296ac4e9-552e-44f9-b1f9-9ba13574d26f" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
            <Download size={18} /><span className="editable-text" data-unique-id="31f2fc49-05d0-4957-9550-029e4617493b" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
            Export CSV
          </span></button>
        </div>
      </div>
      
      {/* Attendance Table */}
      {loading ? <div className="flex justify-center items-center h-64" data-unique-id="023ceacb-810c-4263-ab73-1e053262e5eb" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
        </div> : filteredRecords.length > 0 ? <div className="bg-white rounded-xl shadow-sm overflow-hidden" data-unique-id="ee561a6b-2523-4278-be1b-eb4e4c27353c" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
          <div className="overflow-x-auto" data-unique-id="f259df3b-25e1-4da6-a3ab-98e0174dbdc8" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
            <table className="w-full" data-unique-id="c8c232ba-d91a-4d5f-abd3-1bf73d0c20cc" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
              <thead className="bg-gray-50" data-unique-id="8e8b5c0e-b34a-46c5-8e77-90ec1bb445ab" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
                <tr data-unique-id="bca0c6e0-3d3a-4e90-bb73-eb345a1e7e30" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-unique-id="68d632a7-4c83-4275-bc45-333d6fc68682" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx"><span className="editable-text" data-unique-id="510d49ec-7613-41cb-bf22-c1b472bef010" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">Nama Pegawai</span></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-unique-id="ca9623e3-af56-40ea-bb94-3a7fe63408de" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx"><span className="editable-text" data-unique-id="ee64d7a9-ab27-439f-848c-f7720493a7ee" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">NIK/NIP</span></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-unique-id="86c52fbd-5cc8-4510-8cc1-4e27e891a55d" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx"><span className="editable-text" data-unique-id="987880f9-8bd3-4059-9ca9-4b78e6ce8978" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">Tanggal</span></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-unique-id="e9dadbef-4141-4fbc-8322-236a1c211bde" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx"><span className="editable-text" data-unique-id="cd630bcc-b5d0-477b-940d-09aca5c4293f" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">Waktu</span></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-unique-id="cb9d1aa5-fa21-4632-bb8e-9030fabb1e7f" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx"><span className="editable-text" data-unique-id="5344c7e0-3a33-4966-b12a-cbbe56b9a727" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">Tipe</span></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-unique-id="0411e6ad-1d86-4569-9fc6-be93d579f669" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx"><span className="editable-text" data-unique-id="73a62157-5e8e-46ce-af16-0dd08552a8de" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">Status</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200" data-unique-id="a1da5212-4d7e-4ca4-bc28-c4a4aa4f921a" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx" data-dynamic-text="true">
                {filteredRecords.map((record, index) => <tr key={record.id} className={index % 2 === 0 ? "bg-gray-50" : ""} data-unique-id="a552aa81-12f7-4101-8641-efa58fa48746" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
                    <td className="px-6 py-4 whitespace-nowrap" data-unique-id="e6124b9e-d9ad-4909-8b95-61dbb55a7521" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
                      <div className="flex items-center" data-unique-id="60d80063-bd36-4650-80ce-41fc554e0e51" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium" data-unique-id="e588df2e-cc94-4fd2-b3d5-a96ff7a3c8de" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx" data-dynamic-text="true">
                          {record.teacherName.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4" data-unique-id="4b220fbb-8d8f-450f-9a83-e8cfbd8b4e73" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
                          <div className="text-sm font-medium text-gray-900" data-unique-id="cd8cb4f3-4641-43bc-b49b-32afd33b3f9d" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx" data-dynamic-text="true">{record.teacherName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-unique-id="6c50fda1-fc72-4855-80f2-e806f6955acd" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx" data-dynamic-text="true">{record.teacherNik}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-unique-id="c9d60d2e-6256-493a-81a9-3b007c730c20" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx" data-dynamic-text="true">{formatDate(record.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-unique-id="ca0c61dc-a465-420f-85c0-2e470be3d781" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx" data-dynamic-text="true">{record.time}</td>
                    <td className="px-6 py-4 whitespace-nowrap" data-unique-id="5a4a0095-bb67-4aa6-aef9-76441a732726" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${record.type === 'in' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`} data-unique-id="8a50a729-1b8b-4bac-9741-82768924affd" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx" data-dynamic-text="true">
                        {record.type === 'in' ? 'Masuk' : 'Pulang'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" data-unique-id="74a92b83-b043-496c-95d4-4b12e2920c53" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${record.status === 'present' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`} data-unique-id="356e4910-b77d-42cf-9a0a-8229445c0cfd" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx" data-dynamic-text="true">
                        {record.status === 'present' ? 'Tepat Waktu' : 'Terlambat'}
                      </span>
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </div> : <div className="bg-white rounded-xl shadow-sm p-10 text-center" data-unique-id="bd9519dd-a222-486f-bb69-7e343d832285" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
          <div className="flex flex-col items-center" data-unique-id="85031fee-1f93-402d-88bd-307547619526" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
            <div className="bg-gray-100 rounded-full p-3 mb-4" data-unique-id="052ee9b1-da5e-4d4e-868b-98c9f668d5b5" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
              <AlertTriangle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2" data-unique-id="fc0588d9-d12d-455c-82f7-de01c79edd89" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx"><span className="editable-text" data-unique-id="afcbd096-c4c5-477d-bb2c-308eb1d28176" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">Tidak Ada Data</span></h3>
            <p className="text-gray-500 mb-6" data-unique-id="6a4f20fe-902c-46f2-9431-c870f8651b17" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx" data-dynamic-text="true">
              {searchQuery || typeFilter !== "all" || statusFilter !== "all" ? "Tidak ada data absensi yang sesuai dengan filter" : "Tidak ada data absensi pada tanggal yang dipilih"}
            </p>
            <Link href="/dashboard/absensi-guru/scan" className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary hover:bg-opacity-90 transition-colors" data-unique-id="be8c7446-132c-4f34-8fd8-ad8e251a9999" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
              <Camera size={18} /><span className="editable-text" data-unique-id="d8e07079-0e93-4398-be67-ba270691d71e" data-file-name="app/dashboard/absensi-guru/attendance-table/page.tsx">
              Lakukan Absensi
            </span></Link>
          </div>
        </div>}
    </div>;
}