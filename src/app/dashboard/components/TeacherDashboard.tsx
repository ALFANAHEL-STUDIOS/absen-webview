"use client";

import React, { useState, useEffect } from "react";
import { collection, query, orderBy, limit, getDocs, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Users, BookOpen, FileText, Scan, QrCode, Calendar, Clock, CheckCircle, XCircle, BarChart2, PieChart, AlertCircle, Settings, Loader2, School, UserCheck } from "lucide-react";
import DynamicDashboard from "@/components/DynamicDashboard";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
interface TeacherDashboardProps {
  schoolName: string;
  userName: string;
  stats: {
    totalStudents: number;
    totalClasses: number;
    attendanceRate: number;
    totalTeachers: number;
  };
  recentAttendance: any[];
  loading: boolean;
}
export default function TeacherDashboard({
  schoolName,
  userName,
  stats,
  recentAttendance,
  loading
}: TeacherDashboardProps) {
  const {
    schoolId,
    userRole
  } = useAuth();
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    sick: 0,
    permitted: 0,
    absent: 0,
    total: 0
  });

  // Static dashboard only
  const showDynamicDashboard = false;

  // Get current date and time
  const currentDate = new Date();
  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(currentDate);

  // Calculate attendance statistics from recent attendance data
  useEffect(() => {
    if (recentAttendance && recentAttendance.length > 0) {
      const today = new Date().toISOString().split('T')[0];

      // Filter today's attendance
      const todayAttendance = recentAttendance.filter(record => record.date === today);
      const stats = {
        present: 0,
        sick: 0,
        permitted: 0,
        absent: 0,
        total: todayAttendance.length
      };
      todayAttendance.forEach(record => {
        if (record.status === "present" || record.status === "hadir") {
          stats.present++;
        } else if (record.status === "sick" || record.status === "sakit") {
          stats.sick++;
        } else if (record.status === "permitted" || record.status === "izin") {
          stats.permitted++;
        } else if (record.status === "absent" || record.status === "alpha") {
          stats.absent++;
        }
      });
      setAttendanceStats(stats);
    }
  }, [recentAttendance]);
  return <div data-unique-id="ba335e44-5c21-4bef-b879-7f4a83713523" data-file-name="app/dashboard/components/TeacherDashboard.tsx" data-dynamic-text="true">
      {/* Dashboard content */}

      {showDynamicDashboard ?
    // Dynamic Dashboard
    <div className="mb-6" data-unique-id="a67c82d7-594d-4ead-a5b9-6f20e744df9d" data-file-name="app/dashboard/components/TeacherDashboard.tsx">
          <DynamicDashboard userRole={userRole} schoolId={schoolId} />
        </div> : <>
          {/* School Information */}
          <div className="bg-blue-600 text-white p-5 mb-6 rounded-xl" data-unique-id="d0b87a04-d58e-482c-b4aa-a46b9f73fe2d" data-file-name="app/dashboard/components/TeacherDashboard.tsx">
            <div className="flex items-center mb-1" data-unique-id="81cc1aff-9113-40dc-a1bc-bfc5483d1979" data-file-name="app/dashboard/components/TeacherDashboard.tsx">
              <School className="h-4 w-4 text-white mr-1.5" />
              <h3 className="text-sm font-medium text-white" data-unique-id="eec848b7-1c81-4f5e-b48c-4bf1be6ac50b" data-file-name="app/dashboard/components/TeacherDashboard.tsx"><span className="editable-text" data-unique-id="3dc7fc11-6a2d-4766-b159-485a24ccf23b" data-file-name="app/dashboard/components/TeacherDashboard.tsx">DATA SEKOLAH</span></h3>
            </div>
            <p className="text-lg font-bold text-white" data-unique-id="a3626e8f-a13c-46e1-a450-1d1bc6a2e90f" data-file-name="app/dashboard/components/TeacherDashboard.tsx" data-dynamic-text="true">{schoolName}</p>
            <div className="flex items-center mt-2 text-xs text-white" data-unique-id="fe0c0fbe-a92f-4d13-bc62-c2e2d217aac2" data-file-name="app/dashboard/components/TeacherDashboard.tsx">
              <span data-unique-id="32176c72-0751-423e-9a88-2deeed473c33" data-file-name="app/dashboard/components/TeacherDashboard.tsx"><span className="editable-text" data-unique-id="7bf988e0-08da-4b4a-b0aa-28461b83095e" data-file-name="app/dashboard/components/TeacherDashboard.tsx">Tahun Pelajaran 2024/2025</span></span>
              <span className="mx-2" data-unique-id="08ec77f9-6af5-4e6d-b924-1c86cfd37a60" data-file-name="app/dashboard/components/TeacherDashboard.tsx"><span className="editable-text" data-unique-id="3c050f28-39e4-49e4-9fcb-7bc0f919e425" data-file-name="app/dashboard/components/TeacherDashboard.tsx">•</span></span>
              <span className="flex items-center" data-unique-id="79e4df3f-fb50-4f2c-8e13-1f62e4e6113e" data-file-name="app/dashboard/components/TeacherDashboard.tsx">
                <span className="mr-1 h-2 w-2 bg-green-300 rounded-full inline-block animate-pulse" data-unique-id="00f8235a-2f7a-4e34-ab0c-d94b6b0300b6" data-file-name="app/dashboard/components/TeacherDashboard.tsx"></span><span className="editable-text" data-unique-id="939a3632-c1dd-4881-878e-1f92a2549d78" data-file-name="app/dashboard/components/TeacherDashboard.tsx">
                Aktif
              </span></span>
            </div>
          </div>

          {/* Teacher Quick Access */}
          <div className="mb-6" data-unique-id="58212414-57a7-4cde-8179-9d99948af69e" data-file-name="app/dashboard/components/TeacherDashboard.tsx">
            <div className="flex items-center mb-4" data-unique-id="2f59aec0-fc9b-4d5c-afd4-62b6bf0b9d9e" data-file-name="app/dashboard/components/TeacherDashboard.tsx">
              <div className="bg-blue-100 p-2 rounded-lg mr-3" data-unique-id="1bc694b7-65d2-4463-afd9-5c794d1eafc5" data-file-name="app/dashboard/components/TeacherDashboard.tsx">
                <Settings className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800" data-unique-id="68f0eaeb-16bd-4360-8884-99f40d5af566" data-file-name="app/dashboard/components/TeacherDashboard.tsx"><span className="editable-text" data-unique-id="7ae60194-8425-4d35-91cf-931698086f55" data-file-name="app/dashboard/components/TeacherDashboard.tsx">Akses Cepat Guru</span></h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 md:gap-4" data-unique-id="17450c2f-56a9-454f-a58f-9eecda050cb5" data-file-name="app/dashboard/components/TeacherDashboard.tsx">
              <Link href="/dashboard/scan" className="bg-[#4361EE] rounded-xl shadow-sm p-4 sm:p-5 hover:shadow-md transition-all" data-unique-id="e41a49c7-6a89-42bb-acbf-0cdb00ee9716" data-file-name="app/dashboard/components/TeacherDashboard.tsx">
                <div className="flex flex-col items-center justify-center" data-unique-id="19d33a33-a166-4961-b422-a0ca932ce176" data-file-name="app/dashboard/components/TeacherDashboard.tsx">
                  <div className="bg-[#4361EE] bg-opacity-20 p-2 sm:p-3 rounded-full mb-2 sm:mb-3" data-unique-id="0be5bf8e-0a1d-44fd-8e98-62bd60495927" data-file-name="app/dashboard/components/TeacherDashboard.tsx">
                    <Scan className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <h3 className="font-medium text-white text-center text-xs sm:text-sm" data-unique-id="83811814-f37e-427e-9edd-abb8ed47ac59" data-file-name="app/dashboard/components/TeacherDashboard.tsx"><span className="editable-text" data-unique-id="7b4d3f8b-8556-4bd1-a465-0b4f247bcfb1" data-file-name="app/dashboard/components/TeacherDashboard.tsx">Absensi Siswa</span></h3>
                </div>
              </Link>
              
              <Link href="/dashboard/students/qr" className="bg-[#F72585] rounded-xl shadow-sm p-4 sm:p-5 hover:shadow-md transition-all" data-unique-id="6a56326d-327c-4b98-9fd8-eba3af7cee78" data-file-name="app/dashboard/components/TeacherDashboard.tsx">
                <div className="flex flex-col items-center justify-center" data-unique-id="ca6f4372-6f2a-4332-8a55-864d6cd4f07f" data-file-name="app/dashboard/components/TeacherDashboard.tsx">
                  <div className="bg-[#F72585] bg-opacity-20 p-2 sm:p-3 rounded-full mb-2 sm:mb-3" data-unique-id="8c868783-8ba5-459f-af58-f4fec0b872dc" data-file-name="app/dashboard/components/TeacherDashboard.tsx">
                    <QrCode className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <h3 className="font-medium text-white text-center text-xs sm:text-sm" data-unique-id="c9480d4b-4e7f-40ef-9d8e-02e11a4128ac" data-file-name="app/dashboard/components/TeacherDashboard.tsx"><span className="editable-text" data-unique-id="5b8cbd59-3917-47de-b6f2-1583044272d9" data-file-name="app/dashboard/components/TeacherDashboard.tsx">Kartu QR Siswa</span></h3>
                </div>
              </Link>
              
              <Link href="/dashboard/reports" className="bg-[#21A366] rounded-xl shadow-sm p-4 sm:p-5 hover:shadow-md transition-all" data-unique-id="1c1f61fe-c2df-4c6f-8fd8-ba31998edcf7" data-file-name="app/dashboard/components/TeacherDashboard.tsx">
                <div className="flex flex-col items-center justify-center" data-unique-id="1dedc1df-b04c-4135-aff7-4c563859b009" data-file-name="app/dashboard/components/TeacherDashboard.tsx">
                  <div className="bg-[#21A366] bg-opacity-20 p-2 sm:p-3 rounded-full mb-2 sm:mb-3" data-unique-id="1d15c399-56d0-4d6c-a8b6-ed6e01cb5716" data-file-name="app/dashboard/components/TeacherDashboard.tsx">
                    <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <h3 className="font-medium text-white text-center text-xs sm:text-sm" data-unique-id="ad5a99e8-eedd-4271-87de-ea98a2fbf0ad" data-file-name="app/dashboard/components/TeacherDashboard.tsx"><span className="editable-text" data-unique-id="3b63597c-9f7b-48fb-a903-e1ffe2a5b161" data-file-name="app/dashboard/components/TeacherDashboard.tsx">Laporan Siswa</span></h3>
                </div>
              </Link>
              
              <Link href="/dashboard/students" className="bg-[#F77F00] rounded-xl shadow-sm p-4 sm:p-5 hover:shadow-md transition-all" data-unique-id="fc2ef463-2f28-4a3a-a191-0f16c7f899d3" data-file-name="app/dashboard/components/TeacherDashboard.tsx">
                <div className="flex flex-col items-center justify-center" data-unique-id="70ac6c60-11cf-4574-8f92-80f249655687" data-file-name="app/dashboard/components/TeacherDashboard.tsx">
                  <div className="bg-[#F77F00] bg-opacity-20 p-2 sm:p-3 rounded-full mb-2 sm:mb-3" data-unique-id="6121add3-f5a6-40ad-8490-70c4b0d8966b" data-file-name="app/dashboard/components/TeacherDashboard.tsx">
                    <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <h3 className="font-medium text-white text-center text-xs sm:text-sm" data-unique-id="894a506b-70dd-4f67-9bc4-f84829b96311" data-file-name="app/dashboard/components/TeacherDashboard.tsx"><span className="editable-text" data-unique-id="9e57acb2-de9d-4d61-aaf3-bb711badcff8" data-file-name="app/dashboard/components/TeacherDashboard.tsx">Daftar Siswa</span></h3>
                </div>
              </Link>

              <Link href="/dashboard/absensi-guru/scan" className="bg-[#7B2CBF] rounded-xl shadow-sm p-4 sm:p-5 hover:shadow-md transition-all" data-unique-id="dfccf1a7-01a5-45ad-a537-fab66c24a794" data-file-name="app/dashboard/components/TeacherDashboard.tsx">
                <div className="flex flex-col items-center justify-center" data-unique-id="e8ebba56-3ef0-401d-bd31-293c8da80855" data-file-name="app/dashboard/components/TeacherDashboard.tsx">
                  <div className="bg-[#7B2CBF] bg-opacity-20 p-2 sm:p-3 rounded-full mb-2 sm:mb-3" data-unique-id="ec186dd1-4d43-46f4-b71c-552d14aad252" data-file-name="app/dashboard/components/TeacherDashboard.tsx">
                    <Scan className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <h3 className="font-medium text-white text-center text-xs sm:text-sm" data-unique-id="e36245d5-5c12-4735-b3e6-1f6b46eba5c5" data-file-name="app/dashboard/components/TeacherDashboard.tsx"><span className="editable-text" data-unique-id="a534fb32-54ff-4738-929e-ecb7afc55cb5" data-file-name="app/dashboard/components/TeacherDashboard.tsx">Absensi Guru</span></h3>
                </div>
              </Link>
              
              <Link href="/dashboard/profile-user" className="bg-[#4361EE] rounded-xl shadow-sm p-4 sm:p-5 hover:shadow-md transition-all" data-unique-id="9d56790f-5ed5-419b-8809-f415e7fb832f" data-file-name="app/dashboard/components/TeacherDashboard.tsx">
                <div className="flex flex-col items-center justify-center" data-unique-id="d67e1a99-fb89-4289-b835-96eebddd4a47" data-file-name="app/dashboard/components/TeacherDashboard.tsx">
                  <div className="bg-[#4361EE] bg-opacity-20 p-2 sm:p-3 rounded-full mb-2 sm:mb-3" data-unique-id="5359fecb-882f-44c5-8873-a5452e2dcf29" data-file-name="app/dashboard/components/TeacherDashboard.tsx">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <h3 className="font-medium text-white text-center text-xs sm:text-sm" data-unique-id="16805e52-91c4-4a67-b018-3b1961e0b23c" data-file-name="app/dashboard/components/TeacherDashboard.tsx"><span className="editable-text" data-unique-id="44a1374d-6b4d-4b27-babc-0a54ecde4535" data-file-name="app/dashboard/components/TeacherDashboard.tsx">Profile Saya</span></h3>
                </div>
              </Link>
            </div>
          </div>
        </>}
    </div>;
}
