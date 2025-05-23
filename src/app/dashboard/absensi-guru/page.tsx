"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Users, Calendar, MapPin, Clock, Zap, Camera, Settings, FileText, PlusCircle, Loader2, History } from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
export default function AbsensiGuruPage() {
  const {
    user,
    userRole,
    schoolId
  } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTeachers: 0,
    presentToday: 0,
    lateToday: 0,
    absentToday: 0
  });
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);

  // Load dashboard data
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

        // Get teacher data
        const {
          collection,
          query,
          where,
          getDocs,
          orderBy,
          limit
        } = await import("firebase/firestore");
        const {
          db
        } = await import("@/lib/firebase");

        // Get teachers count
        const teachersRef = collection(db, "users");
        const teachersQuery = query(teachersRef, where("schoolId", "==", schoolId), where("role", "in", ["teacher", "staff"]));
        const teachersSnapshot = await getDocs(teachersQuery);
        const teachersCount = teachersSnapshot.size;

        // Get today's date
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format

        // Get today's attendance
        const attendanceRef = collection(db, "teacherAttendance");
        const attendanceQuery = query(attendanceRef, where("schoolId", "==", schoolId), where("date", "==", todayStr), orderBy("timestamp", "desc"));
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const attendance = attendanceSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Calculate stats
        const presentToday = attendance.filter(a => (a as any).status === "present").length;
        const lateToday = attendance.filter(a => (a as any).status === "late").length;
        const absentToday = teachersCount - presentToday - lateToday;
        setStats({
          totalTeachers: teachersCount,
          presentToday,
          lateToday,
          absentToday
        });

        // Get recent attendance records
        const recentAttendanceRef = collection(db, "teacherAttendance");
        const recentAttendanceQuery = query(recentAttendanceRef, where("schoolId", "==", schoolId), orderBy("timestamp", "desc"), limit(5));
        const recentAttendanceSnapshot = await getDocs(recentAttendanceQuery);
        const recentAttendanceData = recentAttendanceSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRecentAttendance(recentAttendanceData);
      } catch (error) {
        console.error("Error loading teacher attendance data:", error);
        toast.error("Gagal memuat data absensi guru");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [schoolId, userRole, router]);

  // Format date function
  const formatDate = (dateStr: string) => {
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };
    return new Date(dateStr).toLocaleDateString('id-ID', options);
  };
  return <div className="pb-20 md:pb-6" data-unique-id="74f1c604-0e5e-46c1-be32-3294f28c09f9" data-file-name="app/dashboard/absensi-guru/page.tsx" data-dynamic-text="true">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6" data-unique-id="d6b54cf9-3dbe-40ec-b76e-f44ad2d42c09" data-file-name="app/dashboard/absensi-guru/page.tsx">
        <div className="flex items-center mb-4 md:mb-0" data-unique-id="980e9e79-7798-476c-b65f-67eea459dd92" data-file-name="app/dashboard/absensi-guru/page.tsx">
          <Users className="h-7 w-7 text-primary mr-3" />
          <h1 className="text-2xl font-bold text-gray-800" data-unique-id="9e495e71-14fd-4811-a41b-5bc031f9feb0" data-file-name="app/dashboard/absensi-guru/page.tsx"><span className="editable-text" data-unique-id="0a5aae34-6688-456c-aa73-114bfb592a28" data-file-name="app/dashboard/absensi-guru/page.tsx">Absensi Guru & Tenaga Kependidikan</span></h1>
        </div>
        
        <div className="flex gap-3" data-unique-id="dbcaac45-2eda-44b4-9fd3-b62232a92324" data-file-name="app/dashboard/absensi-guru/page.tsx">
          {/*<Link href="/dashboard/absensi-guru/scan" className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary hover:bg-opacity-90 transition-colors" data-unique-id="a24d8062-e8c8-41cd-a50a-068d51443aa7" data-file-name="app/dashboard/absensi-guru/page.tsx">
            <Camera size={18} />
            <span data-unique-id="851849d9-0ff2-469b-a579-5101df0ccca3" data-file-name="app/dashboard/absensi-guru/page.tsx"><span className="editable-text" data-unique-id="57f0304b-0c69-4ac1-a868-7fa218d72a95" data-file-name="app/dashboard/absensi-guru/page.tsx">Scan Absensi</span></span>
          </Link>
          <Link href="/dashboard/absensi-guru/data" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors" data-unique-id="6d0e106b-9547-41d7-afe5-1ddd0500fcf5" data-file-name="app/dashboard/absensi-guru/page.tsx">
            <PlusCircle size={18} />
            <span data-unique-id="7d8aa0a5-731c-45bf-b9fa-42c91527232b" data-file-name="app/dashboard/absensi-guru/page.tsx"><span className="editable-text" data-unique-id="92b509c9-1703-4fd0-8c07-084077eab5fe" data-file-name="app/dashboard/absensi-guru/page.tsx">Kelola Data</span></span>
          </Link>*/}
        </div>
      </div>
      
      {loading ? <div className="flex justify-center items-center h-64" data-unique-id="25ee5bf5-4955-442b-8b81-051c051ca5ac" data-file-name="app/dashboard/absensi-guru/page.tsx">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
        </div> : <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" data-unique-id="b6b88fa7-337e-4f78-800b-643f2235ddbb" data-file-name="app/dashboard/absensi-guru/page.tsx">
            <motion.div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-md" initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.3
        }} data-unique-id="b7cf6153-d92c-48b7-a5e1-4503922eeb0d" data-file-name="app/dashboard/absensi-guru/page.tsx">
              <div className="flex items-center mb-1" data-unique-id="3675f058-3291-49a5-8dc6-7428e706fa5b" data-file-name="app/dashboard/absensi-guru/page.tsx">
                <Users className="h-7 w-7 text-white mr-3" />
                <h3 className="font-semibold text-base" data-unique-id="93b364dc-3f23-4f03-b511-602c1d86363f" data-file-name="app/dashboard/absensi-guru/page.tsx"><span className="editable-text" data-unique-id="450072da-01ca-4352-81db-43f9a961159e" data-file-name="app/dashboard/absensi-guru/page.tsx">Jumlah Guru</span></h3>
              </div>
              <p className="text-2xl font-bold" data-unique-id="2dcf4d3d-10f4-4a99-b1ca-829914626d61" data-file-name="app/dashboard/absensi-guru/page.tsx" data-dynamic-text="true">{stats.totalTeachers}</p>
              <p className="text-xs text-blue-100 mt-1" data-unique-id="98142754-0911-4986-90dc-0aad07d95e29" data-file-name="app/dashboard/absensi-guru/page.tsx"><span className="editable-text" data-unique-id="1bcaddd2-de77-4143-875b-44f51911947f" data-file-name="app/dashboard/absensi-guru/page.tsx">Terdaftar di sistem</span></p>
            </motion.div>
            
            <motion.div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white shadow-md" initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.3,
          delay: 0.1
        }} data-unique-id="2952c903-dc16-409e-9e4e-7e14603af4d9" data-file-name="app/dashboard/absensi-guru/page.tsx">
              <div className="flex items-center mb-1" data-unique-id="c6f05280-99a9-45a4-8559-e8196b615200" data-file-name="app/dashboard/absensi-guru/page.tsx">
                <Zap className="h-7 w-7 text-white mr-3" />
                <h3 className="font-semibold text-base" data-unique-id="e3550935-2419-4fee-94fe-a677f0b0b8f5" data-file-name="app/dashboard/absensi-guru/page.tsx"><span className="editable-text" data-unique-id="8551b6bc-b8ef-4714-a0e5-3da380450944" data-file-name="app/dashboard/absensi-guru/page.tsx">Hadir</span></h3>
              </div>
              <p className="text-2xl font-bold" data-unique-id="a66ef4ce-6dc3-4c26-82b9-371b80d91ef7" data-file-name="app/dashboard/absensi-guru/page.tsx" data-dynamic-text="true">{stats.presentToday}</p>
              <p className="text-xs text-green-100 mt-1" data-unique-id="b831ba99-1ad1-4c1a-89d4-b73a1e03502d" data-file-name="app/dashboard/absensi-guru/page.tsx"><span className="editable-text" data-unique-id="c8497a56-9db0-4871-90c9-0ea075f79a58" data-file-name="app/dashboard/absensi-guru/page.tsx">Guru hadir hari ini</span></p>
            </motion.div>
            
            <motion.div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4 text-white shadow-md" initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.3,
          delay: 0.2
        }} data-unique-id="bd0ac081-ecbc-42ad-a90f-0252e5afec16" data-file-name="app/dashboard/absensi-guru/page.tsx">
              <div className="flex items-center mb-1" data-unique-id="64d7af38-8c6d-48ab-bbea-71ffcf077c9a" data-file-name="app/dashboard/absensi-guru/page.tsx">
                <Clock className="h-7 w-7 text-white mr-3" />
                <h3 className="font-semibold text-base" data-unique-id="41337cfd-dfc5-4603-a4c6-80c9bb0aa7b1" data-file-name="app/dashboard/absensi-guru/page.tsx"><span className="editable-text" data-unique-id="838cdc1e-51c7-4834-9876-1acedb90fa77" data-file-name="app/dashboard/absensi-guru/page.tsx">Terlambat</span></h3>
              </div>
              <p className="text-2xl font-bold" data-unique-id="9d718184-3e2f-4a48-98a1-12bac901babf" data-file-name="app/dashboard/absensi-guru/page.tsx" data-dynamic-text="true">{stats.lateToday}</p>
              <p className="text-xs text-orange-100 mt-1" data-unique-id="0ab214f3-66a5-4cce-a6ef-33cd3424e019" data-file-name="app/dashboard/absensi-guru/page.tsx"><span className="editable-text" data-unique-id="95601146-e7e0-4859-8874-b2aa31e1e53f" data-file-name="app/dashboard/absensi-guru/page.tsx">Guru terlambat hari ini</span></p>
            </motion.div>
            
            <motion.div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-4 text-white shadow-md" initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.3,
          delay: 0.3
        }} data-unique-id="15b4e4cf-0b1b-4d61-b14a-0ee05109dd7b" data-file-name="app/dashboard/absensi-guru/page.tsx">
              <div className="flex items-center mb-1" data-unique-id="9f2cbc5f-a9cb-488b-86a4-8ccb2f607839" data-file-name="app/dashboard/absensi-guru/page.tsx">
                <Calendar className="h-7 w-7 text-white mr-3" data-unique-id="422bbca0-169b-48c7-b77a-4f232fbe5782" data-file-name="app/dashboard/absensi-guru/page.tsx" />
                <h3 className="font-semibold text-base" data-unique-id="eff185df-0d85-487c-97d1-f2641a636c7a" data-file-name="app/dashboard/absensi-guru/page.tsx"><span className="editable-text" data-unique-id="3a81a6bc-af9e-4211-ae0f-6f565e0578be" data-file-name="app/dashboard/absensi-guru/page.tsx">Belum Absen</span></h3>
              </div>
              <p className="text-2xl font-bold" data-unique-id="ffa9393e-3055-4165-9102-37b08a7bf7fd" data-file-name="app/dashboard/absensi-guru/page.tsx" data-dynamic-text="true">{stats.absentToday}</p>
              <p className="text-xs text-red-100 mt-1" data-unique-id="9a1c9c02-58dc-4cdd-af8d-9f62dd09b401" data-file-name="app/dashboard/absensi-guru/page.tsx"><span className="editable-text" data-unique-id="7f6cb009-cae2-4ad1-ab44-ac2c21f4896a" data-file-name="app/dashboard/absensi-guru/page.tsx">Guru belum absen hari ini</span></p>
            </motion.div>
          </div>
          
          
          
          {/* Recent Attendance */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden" data-unique-id="8c974303-3cb7-4960-8c00-0f2aee858ee6" data-file-name="app/dashboard/absensi-guru/page.tsx" data-dynamic-text="true">
            <div className="p-6 border-b border-gray-100" data-unique-id="4bfffb5d-7df6-4f08-983b-79127a50cee4" data-file-name="app/dashboard/absensi-guru/page.tsx">
              <h2 className="text-lg font-semibold flex items-center" data-unique-id="5460e655-a392-4880-b668-1677c52736f0" data-file-name="app/dashboard/absensi-guru/page.tsx">
                <History className="h-5 w-5 text-primary mr-2" />
                <span className="editable-text" data-unique-id="02ceaa5b-9647-4010-aef6-cdd2b4d4c368" data-file-name="app/dashboard/absensi-guru/page.tsx">Riwayat Absensi Terbaru</span>
              </h2>
            </div>
            
            {recentAttendance.length > 0 ? <div className="overflow-x-auto" data-unique-id="049ad848-8c0c-4ab4-b510-e3978b9e07f4" data-file-name="app/dashboard/absensi-guru/page.tsx">
                <table className="w-full" data-unique-id="f81c4173-19a8-4f54-8709-9b2f8ec1740f" data-file-name="app/dashboard/absensi-guru/page.tsx">
                  <thead data-unique-id="1bd0e741-a923-4ace-973e-f0ffa28b1269" data-file-name="app/dashboard/absensi-guru/page.tsx">
                    <tr className="bg-gray-50 text-left" data-unique-id="0c21f8f7-489e-42dd-b5da-79a0196ed8d3" data-file-name="app/dashboard/absensi-guru/page.tsx">
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider" data-unique-id="d1c21a69-2fe9-4c10-9379-510f6eb0d913" data-file-name="app/dashboard/absensi-guru/page.tsx"><span className="editable-text" data-unique-id="37ecd54c-510f-4bda-86d9-26c52104a34c" data-file-name="app/dashboard/absensi-guru/page.tsx">Nama</span></th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider" data-unique-id="bcc6c5f7-5d45-4f4a-9f51-4cea598656c9" data-file-name="app/dashboard/absensi-guru/page.tsx"><span className="editable-text" data-unique-id="4ac88219-35f6-4f63-9892-8d2bbd45d14e" data-file-name="app/dashboard/absensi-guru/page.tsx">Tanggal</span></th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider" data-unique-id="aecfe1a3-58f9-4229-9a42-9da6c8a1edc7" data-file-name="app/dashboard/absensi-guru/page.tsx"><span className="editable-text" data-unique-id="c1e3d480-8c04-4de9-9db3-3b371abb01f7" data-file-name="app/dashboard/absensi-guru/page.tsx">Waktu</span></th>
                      
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider" data-unique-id="701fb816-0252-4636-a175-db4de5a3b1b6" data-file-name="app/dashboard/absensi-guru/page.tsx"><span className="editable-text" data-unique-id="ac51879e-5ec0-4fa7-b7d1-2ace2ba495ee" data-file-name="app/dashboard/absensi-guru/page.tsx">Absensi</span></th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider" data-unique-id="622970de-3890-46be-bebe-ecf78bd380a4" data-file-name="app/dashboard/absensi-guru/page.tsx"><span className="editable-text" data-unique-id="c3fc79c0-4a4b-4162-b81a-378814e1d8d6" data-file-name="app/dashboard/absensi-guru/page.tsx">Status</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200" data-unique-id="e731452e-34af-4a47-b618-e38c4b72177f" data-file-name="app/dashboard/absensi-guru/page.tsx" data-dynamic-text="true">
                    {recentAttendance.map(entry => <tr key={entry.id} className="hover:bg-gray-50" data-is-mapped="true" data-unique-id="33ae3141-b767-49da-a3e5-5cf636a1bb8c" data-file-name="app/dashboard/absensi-guru/page.tsx">
                        <td className="px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600" data-is-mapped="true" data-unique-id="71e63011-fe85-476e-bc3b-583eaf35c90f" data-file-name="app/dashboard/absensi-guru/page.tsx" data-dynamic-text="true">{entry.teacherName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-is-mapped="true" data-unique-id="cab5ff65-6e43-472f-a81d-d1bfe37b3f5c" data-file-name="app/dashboard/absensi-guru/page.tsx" data-dynamic-text="true">{formatDate(entry.date)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-is-mapped="true" data-unique-id="904e5bc7-9d64-47a3-8784-5b49e0a2b8da" data-file-name="app/dashboard/absensi-guru/page.tsx" data-dynamic-text="true">{entry.time}</td>
                        
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-is-mapped="true" data-unique-id="1d6c4ac5-6e25-4e03-bacf-34905ce71040" data-file-name="app/dashboard/absensi-guru/page.tsx" data-dynamic-text="true">
                          {entry.type === "in" ? "Masuk" : "Pulang"}
                        </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap" data-is-mapped="true" data-unique-id="1624f5c9-6187-439f-a636-95ad2417c97c" data-file-name="app/dashboard/absensi-guru/page.tsx">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${entry.status === "present" ? "bg-green-100 text-green-800" : entry.status === "late" ? "bg-orange-100 text-orange-800" : "bg-red-100 text-red-800"}`} data-is-mapped="true" data-unique-id="a28c9abb-e931-4c15-aeb6-6fdcbb0fa8ac" data-file-name="app/dashboard/absensi-guru/page.tsx" data-dynamic-text="true">
                            {entry.status === "present" ? "Hadir" : entry.status === "late" ? "Terlambat" : "Tidak Hadir"}
                          </span>
                        </td>
                        
                      </tr>)}
                  </tbody>
                </table>
              </div> : <div className="text-center py-12 text-gray-500" data-unique-id="2f2ebe17-6d24-4c25-8e58-6b7b15d77123" data-file-name="app/dashboard/absensi-guru/page.tsx"><span className="editable-text" data-unique-id="4d3ba78b-6cba-428d-a404-1dd73f2dc870" data-file-name="app/dashboard/absensi-guru/page.tsx">
                Belum ada data absensi guru
              </span></div>}
            
            <div className="p-4 border-t border-gray-100 flex justify-end" data-unique-id="9eda83bd-154a-4d76-8aec-523138e8d5e5" data-file-name="app/dashboard/absensi-guru/page.tsx">
              <Link href="/dashboard/absensi-guru/reports" className="text-primary font-medium hover:underline text-sm flex items-center" data-unique-id="e760e95f-cd0d-4099-a79f-d81e26f9fde9" data-file-name="app/dashboard/absensi-guru/page.tsx"><span className="editable-text" data-unique-id="08f727a2-c415-411d-8362-16d138315e9f" data-file-name="app/dashboard/absensi-guru/page.tsx">
                Lihat semua riwayat
                </span><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor" data-unique-id="3ab99b06-96c4-4826-8113-2ee630996cd0" data-file-name="app/dashboard/absensi-guru/page.tsx">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>
          </div>

{/* Quick Access */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6" data-unique-id="6d68b07e-ed09-4f31-8cb7-b7c50c4c011f" data-file-name="app/dashboard/absensi-guru/page.tsx">
            <h2 className="text-lg font-semibold mb-4 flex items-center" data-unique-id="14582cc2-b3c2-4d80-9a58-40babe5d4efc" data-file-name="app/dashboard/absensi-guru/page.tsx">
              <Zap className="h-5 w-5 text-primary mr-2" />
              <span className="editable-text" data-unique-id="93574865-2592-4298-89d4-93290fdf2f52" data-file-name="app/dashboard/absensi-guru/page.tsx">Akses Cepat Admin</span>
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-unique-id="d355c194-eea1-48bd-8463-81380bd477ef" data-file-name="app/dashboard/absensi-guru/page.tsx">
              <Link href="/dashboard/absensi-guru/attendance-table" className="flex flex-col items-center p-4 bg-blue-50 rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors" data-unique-id="a159f640-10ed-442f-8a6c-d4848142e984" data-file-name="app/dashboard/absensi-guru/page.tsx">
                <Camera className="h-10 w-10 text-blue-600 mb-2" />
                <span className="font-medium text-blue-800" data-unique-id="39e9fefe-cc59-43ed-87f0-250e3e637179" data-file-name="app/dashboard/absensi-guru/page.tsx"><span className="editable-text" data-unique-id="26c767e3-151f-4b95-8667-c9377d050264" data-file-name="app/dashboard/absensi-guru/page.tsx">Absensi Guru</span></span>
              </Link>
              
              <Link href="/dashboard/absensi-guru/data" className="flex flex-col items-center p-4 bg-green-50 rounded-xl border border-green-100 hover:bg-green-100 transition-colors" data-unique-id="1fa917cc-4622-408e-a531-22bf0b52ba72" data-file-name="app/dashboard/absensi-guru/page.tsx">
                <Users className="h-10 w-10 text-green-600 mb-2" />
                <span className="font-medium text-green-800" data-unique-id="276f7b89-5e19-4484-bb42-29f3035df421" data-file-name="app/dashboard/absensi-guru/page.tsx"><span className="editable-text" data-unique-id="0c06d7a0-ca7b-47e8-9ce0-c04f4c75ac8a" data-file-name="app/dashboard/absensi-guru/page.tsx">Data Guru</span></span>
              </Link>
              
              <Link href="/dashboard/absensi-guru/reports" className="flex flex-col items-center p-4 bg-purple-50 rounded-xl border border-purple-100 hover:bg-purple-100 transition-colors" data-unique-id="99ca3920-348c-4ffe-9246-45e07b739d80" data-file-name="app/dashboard/absensi-guru/page.tsx">
                <FileText className="h-10 w-10 text-purple-600 mb-2" />
                <span className="font-medium text-purple-800" data-unique-id="86519b67-aa5f-4833-ad26-922d75689c9c" data-file-name="app/dashboard/absensi-guru/page.tsx"><span className="editable-text" data-unique-id="6e40f84e-ad06-4c9a-b4be-708f6706a40f" data-file-name="app/dashboard/absensi-guru/page.tsx">Laporan</span></span>
              </Link>
              
              <Link href="/dashboard/absensi-guru/settings" className="flex flex-col items-center p-4 bg-amber-50 rounded-xl border border-amber-100 hover:bg-amber-100 transition-colors" data-unique-id="f7d7c204-59e0-426c-ab57-a7decf7cc923" data-file-name="app/dashboard/absensi-guru/page.tsx">
                <Settings className="h-10 w-10 text-amber-600 mb-2" />
                <span className="font-medium text-amber-800" data-unique-id="81c70602-a39b-48f3-b6d7-db60d2d1434e" data-file-name="app/dashboard/absensi-guru/page.tsx"><span className="editable-text" data-unique-id="168d6934-7ffd-4d87-b2a4-149922e1e9bd" data-file-name="app/dashboard/absensi-guru/page.tsx">Pengaturan</span></span>
              </Link>
            </div>
          </div>

          
        </>}
    </div>;
}
