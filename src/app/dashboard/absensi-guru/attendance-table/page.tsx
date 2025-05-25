"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Calendar, Clock, CalendarClock, ArrowLeft, Loader2, Search, Filter, LogIn, LogOut, Calendar as CalIcon, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { format, subDays, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
export default function AttendanceTablePage() {
 const { user, userRole, schoolId } = useAuth();
 const router = useRouter();
 const [loading, setLoading] = useState(true);
 const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
 const [filteredRecords, setFilteredRecords] = useState<any[]>([]);
 const [searchQuery, setSearchQuery] = useState("");
 const [filterType, setFilterType] = useState("all"); // "all", "in", "out", "izin"
 const [filterDate, setFilterDate] = useState(""); // YYYY-MM-DD
 const [teacherName, setTeacherName] = useState("");
 // Fetch attendance records
 useEffect(() => {
   if (!schoolId) return;
   const fetchTeacherAttendance = async () => {
     try {
       setLoading(true);
       let teacherId = '';
       // If a teacher is viewing their own attendance
       if (userRole === 'teacher' || userRole === 'staff') {
         teacherId = user?.uid || '';

         // Get teacher name
         if (user?.uid) {
           const { doc, getDoc } = await import('firebase/firestore');
           const userDoc = await getDoc(doc(db, "users", user.uid));
           if (userDoc.exists()) {
             const userData = userDoc.data();
             setTeacherName(userData.name || user.displayName || '');
           }
         }
       }
       // Build the query
       const attendanceRef = collection(db, "teacherAttendance");
       let attendanceQuery;

       if (teacherId && userRole !== 'admin') {
         // Teacher viewing their own attendance
         attendanceQuery = query(
           attendanceRef,
           where("teacherId", "==", teacherId),
           orderBy("date", "desc"),
           orderBy("timestamp", "desc")
         );
       } else {
         // Admin viewing all attendance
         attendanceQuery = query(
           attendanceRef,
           orderBy("date", "desc"),
           orderBy("timestamp", "desc")
         );
       }

       const snapshot = await getDocs(attendanceQuery);
       const records: any[] = [];

       snapshot.forEach(doc => {
         records.push({
           id: doc.id,
           ...doc.data()
         });
       });

       setAttendanceRecords(records);
       setFilteredRecords(records);
     } catch (error) {
       console.error("Error fetching attendance records:", error);
     } finally {
       setLoading(false);
     }
   };

   fetchTeacherAttendance();
 }, [schoolId, user, userRole]);
 // Filter records when search or filters change
 useEffect(() => {
   let filtered = [...attendanceRecords];

   // Apply filter by type
   if (filterType !== 'all') {
     filtered = filtered.filter(record => record.type === filterType);
   }

   // Apply filter by date
   if (filterDate) {
     filtered = filtered.filter(record => record.date === filterDate);
   }

   // Apply search query
   if (searchQuery) {
     const query = searchQuery.toLowerCase();
     filtered = filtered.filter(record =>
       record.teacherName.toLowerCase().includes(query) ||
       record.teacherNik.toLowerCase().includes(query) ||
       (record.note && record.note.toLowerCase().includes(query))
     );
   }

   setFilteredRecords(filtered);
 }, [attendanceRecords, filterType, filterDate, searchQuery]);
 // Get status badge style
 const getStatusBadge = (status: string) => {
   switch(status) {
     case 'present':
       return "bg-green-100 text-green-800";
     case 'late':
       return "bg-orange-100 text-orange-800";
     case 'izin':
       return "bg-blue-100 text-blue-800";
     case 'alpha':
       return "bg-red-100 text-red-800";
     default:
       return "bg-gray-100 text-gray-800";
   }
 };
 // Get type icon
 const getTypeIcon = (type: string) => {
   switch(type) {
     case 'in':
       return <LogIn size={16} className="mr-1" />;
     case 'out':
       return <LogOut size={16} className="mr-1" />;
     case 'izin':
       return <CalIcon size={16} className="mr-1" />;
     default:
       return <CalendarClock size={16} className="mr-1" />;
   }
 };
 // Reset filters
 const resetFilters = () => {
   setFilterType("all");
   setFilterDate("");
   setSearchQuery("");
 };
 return (
   <div className="max-w-6xl mx-auto pb-20 md:pb-6 px-3 sm:px-4 md:px-6">
     <div className="flex items-center mb-6">
       <Link href="/dashboard/absensi-guru" className="p-2 mr-2 hover:bg-gray-100 rounded-full">
         <ArrowLeft size={20} />
       </Link>
       <h1 className="text-2xl font-bold text-gray-800">
         {userRole === 'admin' ? "Data Absensi Guru & Tendik" : "Riwayat Absensi"}
       </h1>
     </div>

     {/* Search and Filters */}
     <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         {/* Search */}
         <div className="col-span-1 md:col-span-2">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
             <input
               type="text"
               placeholder="Cari nama atau NIP..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
             />
           </div>
         </div>

         {/* Type filter */}
         <div>
           <div className="relative">
             <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
             <select
               value={filterType}
               onChange={(e) => setFilterType(e.target.value)}
               className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary appearance-none bg-white"
             >
               <option value="all">Semua Jenis</option>
               <option value="in">Absensi Masuk</option>
               <option value="out">Absensi Pulang</option>
               <option value="izin">Izin</option>
               <option value="alpha">Alpha</option>
             </select>
           </div>
         </div>

         {/* Date filter */}
         <div className="md:col-span-2">
           <div className="relative">
             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
             <input
               type="date"
               placeholder="Pilih tanggal"
               value={filterDate}
               onChange={(e) => setFilterDate(e.target.value)}
               className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
             />
           </div>
         </div>

         {/* Reset filters button */}
         <div className="col-span-1 flex items-center">
           <button
             onClick={resetFilters}
             className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
           >
             Reset Filter
           </button>
         </div>
       </div>
     </div>

     {/* Teacher name display if not admin */}
     {userRole !== 'admin' && teacherName && (
       <div className="bg-blue-50 p-4 rounded-xl mb-6 border border-blue-200">
         <h2 className="text-lg font-medium text-blue-800">
           Riwayat Absensi: {teacherName}
         </h2>
       </div>
     )}

     {/* Attendance Records */}
     {loading ? (
       <div className="flex justify-center items-center h-64">
         <Loader2 className="h-12 w-12 text-primary animate-spin" />
       </div>
     ) : filteredRecords.length > 0 ? (
       <div className="bg-white rounded-xl shadow-sm overflow-hidden">
         <div className="overflow-x-auto">
           <table className="min-w-full">
             <thead>
               <tr className="bg-gray-50 text-left">
                 <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Tanggal
                 </th>
                 <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Waktu
                 </th>
                 {userRole === 'admin' && (
                   <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Nama
                   </th>
                 )}
                 <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                   NIP/NIK
                 </th>
                 <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Jenis
                 </th>
                 <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Status
                 </th>
                 <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Catatan
                 </th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-200">
               {filteredRecords.map(record => (
                 <tr key={record.id} className="hover:bg-gray-50">
                   <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                     {format(parseISO(record.date), "dd MMM yyyy", { locale: id })}
                   </td>
                   <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                     {record.time}
                   </td>
                   {userRole === 'admin' && (
                     <td className="px-4 py-4 whitespace-nowrap">
                       <div className="text-sm font-medium text-gray-900">{record.teacherName}</div>
                     </td>
                   )}
                   <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                     {record.teacherNik}
                   </td>
                   <td className="px-4 py-4 whitespace-nowrap">
                     <div className="flex items-center text-sm">
                       {getTypeIcon(record.type)}
                       <span>
                         {record.type === 'in' ? 'Masuk' :
                          record.type === 'out' ? 'Pulang' :
                          record.type === 'izin' ? 'Izin' :
                          record.type === 'alpha' ? 'Alpha' : record.type}
                       </span>
                     </div>
                   </td>
                   <td className="px-4 py-4 whitespace-nowrap">
                     <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(record.status)}`}>
                       {record.status === 'present' ? 'Hadir' :
                        record.status === 'late' ? 'Terlambat' :
                        record.status === 'izin' ? 'Izin' :
                        record.status === 'alpha' ? 'Alpha' : record.status}
                     </span>
                   </td>
                   <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                     {record.note || '-'}
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       </div>
     ) : (
       <div className="bg-white rounded-xl shadow-sm p-10 text-center">
         <div className="flex flex-col items-center">
           <AlertTriangle className="h-12 w-12 text-gray-400 mb-4" />
           <p className="text-gray-500 mb-4">
             {searchQuery || filterType !== "all" || filterDate
               ? "Tidak ada data absensi yang sesuai dengan filter"
               : "Belum ada data absensi"}
           </p>
           {filterType !== "all" || filterDate || searchQuery ? (
             <button
               onClick={resetFilters}
               className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
             >
               Reset Filter
             </button>
           ) : userRole !== 'admin' ? (
             <Link href="/dashboard/absensi-guru/scan" className="bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary hover:bg-opacity-90 transition-colors">
               Lakukan Absensi
             </Link>
           ) : null}
         </div>
       </div>
     )}
   </div>
 );
}
