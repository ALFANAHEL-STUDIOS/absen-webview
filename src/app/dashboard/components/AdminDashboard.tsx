"use client";

import React, { useState, useEffect } from "react";
import { collection, query, getDocs, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { TrendingUp, Users, BookOpen, Settings, FileText, PlusCircle, School, Scan, UserPlus, Loader2 } from "lucide-react";
import DynamicDashboard from "@/components/DynamicDashboard";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
interface AdminDashboardProps {
  schoolName: string;
  principalName?: string;
  principalNip?: string;
  stats: {
    totalStudents: number;
    totalClasses: number;
    attendanceRate: number;
    totalTeachers: number;
  };
  recentAttendance: any[];
  loading: boolean;
}
export default function AdminDashboard({
  schoolName,
  principalName,
  principalNip,
  stats,
  recentAttendance,
  loading
}: AdminDashboardProps) {
  const [attendanceData, setAttendanceData] = useState([{
    name: "Hadir",
    value: 85,
    color: "#4C6FFF"
  }, {
    name: "Sakit",
    value: 7,
    color: "#FF9800"
  }, {
    name: "Izin",
    value: 5,
    color: "#8BC34A"
  }, {
    name: "Alpha",
    value: 3,
    color: "#F44336"
  }]);
  const [classData, setClassData] = useState([]);
  const {
    schoolId,
    userRole
  } = useAuth();
  const [weeklyData, setWeeklyData] = useState([{
    name: "Senin",
    hadir: 95,
    sakit: 3,
    izin: 1,
    alpha: 1
  }, {
    name: "Selasa",
    hadir: 92,
    sakit: 4,
    izin: 2,
    alpha: 2
  }, {
    name: "Rabu",
    hadir: 88,
    sakit: 6,
    izin: 3,
    alpha: 3
  }, {
    name: "Kamis",
    hadir: 90,
    sakit: 5,
    izin: 3,
    alpha: 2
  }, {
    name: "Jumat",
    hadir: 93,
    sakit: 3,
    izin: 2,
    alpha: 2
  }]);

  // State to toggle between static and dynamic dashboard
  const [showDynamicDashboard, setShowDynamicDashboard] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('showDynamicDashboard') === 'true';
    }
    return false;
  });
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('showDynamicDashboard', showDynamicDashboard.toString());
    }
  }, [showDynamicDashboard]);

  // Fetch class data with student counts
  useEffect(() => {
    const fetchClassData = async () => {
      if (!schoolId) return;
      try {
        // Get classes with student counts
        const classesRef = collection(db, `schools/${schoolId}/classes`);
        const classesQuery = query(classesRef, orderBy("name"));
        const classesSnapshot = await getDocs(classesQuery);
        const classesData = [];
        const classMap = {};
        classesSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.name) {
            const classItem = {
              name: data.name,
              students: 0
            };
            classesData.push(classItem);
            classMap[data.name] = classItem;
          }
        });

        // Count students per class
        const studentsRef = collection(db, `schools/${schoolId}/students`);
        const studentsSnapshot = await getDocs(studentsRef);
        studentsSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.class && classMap[data.class]) {
            classMap[data.class].students++;
          }
        });
        if (classesData.length > 0) {
          setClassData(classesData);
        }
      } catch (error) {
        console.error("Error fetching class data:", error);
      }
    };
    fetchClassData();
  }, [schoolId]);

  // Calculate attendance distribution
  useEffect(() => {
    if (stats && stats.attendanceRate) {
      // Create attendance distribution based on stats
      const present = stats.attendanceRate;
      const remaining = 100 - present;

      // Distribute the remaining percentage among sick, izin, and alpha
      // This is an approximation - in a real app you'd get actual data
      const sick = Math.round(remaining * 0.5);
      const izin = Math.round(remaining * 0.3);
      const alpha = remaining - sick - izin;
      setAttendanceData([{
        name: "Hadir",
        value: present,
        color: "#4C6FFF"
      }, {
        name: "Sakit",
        value: sick,
        color: "#FF9800"
      }, {
        name: "Izin",
        value: izin,
        color: "#8BC34A"
      }, {
        name: "Alpha",
        value: alpha,
        color: "#F44336"
      }]);
    }
  }, [stats]);
  return <div data-unique-id="4c330145-19ce-4d68-9429-2c2a50a319cd" data-file-name="app/dashboard/components/AdminDashboard.tsx" data-dynamic-text="true">
      {showDynamicDashboard ?
    // Dynamic Dashboard
    <div className="mb-6" data-unique-id="dc06f2df-c5bd-4b50-a322-43d3c3582a7a" data-file-name="app/dashboard/components/AdminDashboard.tsx">
          <DynamicDashboard userRole={userRole} schoolId={schoolId} />
        </div> : <>
          {/* School Information */}
          <div className="bg-blue-600 text-white p-4 sm:p-5 mb-4 sm:mb-6 rounded-xl" data-unique-id="59344716-902a-4cda-8eed-2584ac35c320" data-file-name="app/dashboard/components/AdminDashboard.tsx">
            <div className="flex items-center mb-1" data-unique-id="4a3aceff-ac3c-421d-a1ed-ed3c29a87167" data-file-name="app/dashboard/components/AdminDashboard.tsx">
              <School className="h-4 w-4 text-white mr-1.5" />
              <h3 className="text-sm font-medium text-white" data-unique-id="a4eae31a-89d1-43d9-831f-896ab7948dda" data-file-name="app/dashboard/components/AdminDashboard.tsx"><span className="editable-text" data-unique-id="5e7e657b-e7cc-49cc-aefd-346204668fc2" data-file-name="app/dashboard/components/AdminDashboard.tsx">DATA SEKOLAH</span></h3>
            </div>
            <p className="text-lg font-bold text-white" data-unique-id="2ed812b7-6943-456f-acd6-ac12adc090d0" data-file-name="app/dashboard/components/AdminDashboard.tsx" data-dynamic-text="true">{schoolName}</p>
            <div className="flex flex-wrap items-center mt-2 text-xs text-white" data-unique-id="f94d21d1-f9a2-4ad3-94cd-13e32c301fa1" data-file-name="app/dashboard/components/AdminDashboard.tsx">
              <span data-unique-id="b3a96374-7017-4242-a929-b00d3fa96c4e" data-file-name="app/dashboard/components/AdminDashboard.tsx"><span className="editable-text" data-unique-id="2abfa45a-ff95-407c-9257-d47372a79b4f" data-file-name="app/dashboard/components/AdminDashboard.tsx">Tahun Pelajaran 2024/2025</span></span>
              <span className="mx-2" data-unique-id="a66449e7-d447-41d0-b147-ff0064213182" data-file-name="app/dashboard/components/AdminDashboard.tsx"><span className="editable-text" data-unique-id="3acc1bd1-30be-4d55-a951-23eaf01acc6a" data-file-name="app/dashboard/components/AdminDashboard.tsx">•</span></span>
              <span className="flex items-center" data-unique-id="caeac326-b3fb-4fe9-8bc9-f570ad976bc9" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                <span className="mr-1 h-2 w-2 bg-green-300 rounded-full inline-block animate-pulse" data-unique-id="838db49c-a7c5-42ba-8c74-9c27f1c25a0d" data-file-name="app/dashboard/components/AdminDashboard.tsx"></span><span className="editable-text" data-unique-id="15e602b6-18c6-427a-940e-4f26e49c768a" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                Aktif
              </span></span>
            </div>
          </div>

          {/* Admin-specific stats overview */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6" data-unique-id="716d8405-8f51-4d24-8696-b56675196496" data-file-name="app/dashboard/components/AdminDashboard.tsx">
            <div className="bg-blue-500 rounded-xl p-3 sm:p-5 text-white" data-unique-id="9df62497-e8b3-4363-904b-42f0df3c79e9" data-file-name="app/dashboard/components/AdminDashboard.tsx">
              <div className="flex items-center mb-1" data-unique-id="799a0f5a-cfaf-4426-8cb1-94ddfc171646" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                <Users className="h-4 sm:h-5 w-4 sm:w-5 text-white mr-1.5 sm:mr-2" />
                <h3 className="text-xs sm:text-sm font-medium text-white" data-unique-id="e7125e3d-bc36-4dd9-8b73-8ca35f38886c" data-file-name="app/dashboard/components/AdminDashboard.tsx"><span className="editable-text" data-unique-id="8b274c6d-45eb-4d76-933a-55fa47fed3fa" data-file-name="app/dashboard/components/AdminDashboard.tsx">Total Siswa</span></h3>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-white" data-unique-id="99678225-f424-4db8-84e9-9a8cc3734936" data-file-name="app/dashboard/components/AdminDashboard.tsx" data-dynamic-text="true">{stats.totalStudents}</p>
              <div className="text-xs text-white mt-1 sm:mt-2" data-unique-id="5d1f8b48-fa03-4662-b910-53311a4e63e7" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                <span data-unique-id="543f140e-60c5-44cc-85b4-cfbae7c5d39b" data-file-name="app/dashboard/components/AdminDashboard.tsx"><span className="editable-text" data-unique-id="2d10e8d2-50fb-490e-b9ef-9a0893bd017c" data-file-name="app/dashboard/components/AdminDashboard.tsx">Pada Semester ini</span></span>
              </div>
            </div>
            
            <div className="bg-purple-500 rounded-xl p-3 sm:p-5 text-white" data-unique-id="b9b9cfa9-911a-4821-9f56-1ae85d30c2c7" data-file-name="app/dashboard/components/AdminDashboard.tsx">
              <div className="flex items-center mb-1" data-unique-id="ab4c7e69-d615-4aaf-bbb2-ae813b435c54" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                <BookOpen className="h-4 sm:h-5 w-4 sm:w-5 text-white mr-1.5 sm:mr-2" />
                <h3 className="text-xs sm:text-sm font-medium text-white" data-unique-id="1b68968a-0f11-448b-8263-ec30551c6e22" data-file-name="app/dashboard/components/AdminDashboard.tsx"><span className="editable-text" data-unique-id="d1826ed8-8c01-4def-94c2-ba73f2812a9d" data-file-name="app/dashboard/components/AdminDashboard.tsx">Total Kelas</span></h3>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-white" data-unique-id="b371d8c8-8dc0-4e9d-a5ff-97fd74d7ba0c" data-file-name="app/dashboard/components/AdminDashboard.tsx" data-dynamic-text="true">{stats.totalClasses}</p>
              <div className="text-xs text-white mt-1 sm:mt-2" data-unique-id="21d71e80-a533-4607-b527-ed6c44123b30" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                <span data-unique-id="40ea2913-c2f7-4bae-a8a5-07de243d066c" data-file-name="app/dashboard/components/AdminDashboard.tsx"><span className="editable-text" data-unique-id="9b84292f-96d7-4943-8186-30a3ad0da367" data-file-name="app/dashboard/components/AdminDashboard.tsx">Pada Semester ini</span></span>
              </div>
            </div>
            
            <div className="bg-orange-500 rounded-xl p-3 sm:p-5 text-white" data-unique-id="c208399a-df94-40dd-bb47-8b52791a1b5e" data-file-name="app/dashboard/components/AdminDashboard.tsx">
              <div className="flex items-center mb-1" data-unique-id="090e7764-f737-4da1-9b8e-7bea00d2f5d0" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                <TrendingUp className="h-4 sm:h-5 w-4 sm:w-5 text-white mr-1.5 sm:mr-2" />
                <h3 className="text-xs sm:text-sm font-medium text-white" data-unique-id="491f491b-8707-442e-be15-9199766a4b62" data-file-name="app/dashboard/components/AdminDashboard.tsx"><span className="editable-text" data-unique-id="136e78a9-37a2-402a-9475-f22949cb1403" data-file-name="app/dashboard/components/AdminDashboard.tsx">Kehadiran</span></h3>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-white" data-unique-id="ec79a61d-9bb6-4992-b540-682233de9b64" data-file-name="app/dashboard/components/AdminDashboard.tsx" data-dynamic-text="true">{stats.attendanceRate}<span className="editable-text" data-unique-id="a6abf679-3ed4-4a6c-ba20-4253553cdd4a" data-file-name="app/dashboard/components/AdminDashboard.tsx">%</span></p>
              <div className="text-xs text-white mt-1 sm:mt-2" data-unique-id="f691e477-e236-4a29-bba9-53f632cab64e" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                <span data-unique-id="afba4783-be11-49f6-82de-6325683d94a0" data-file-name="app/dashboard/components/AdminDashboard.tsx"><span className="editable-text" data-unique-id="f87f79c4-56db-44a8-9a12-a59093f6b839" data-file-name="app/dashboard/components/AdminDashboard.tsx">Pada Bulan ini</span></span>
              </div>
            </div>
            
            <div className="bg-green-500 rounded-xl p-3 sm:p-5 text-white" data-unique-id="c9dc6acc-033a-4746-9670-455d0b37e272" data-file-name="app/dashboard/components/AdminDashboard.tsx">
              <div className="flex items-center mb-1" data-unique-id="08da4c4f-4c58-4bf4-ba3a-25039a8bd722" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                <Users className="h-4 sm:h-5 w-4 sm:w-5 text-white mr-1.5 sm:mr-2" />
                <h3 className="text-xs sm:text-sm font-medium text-white" data-unique-id="02e24840-7a92-44aa-abdc-9fed7a825429" data-file-name="app/dashboard/components/AdminDashboard.tsx"><span className="editable-text" data-unique-id="58ab39ad-192b-4cfd-9620-9e86e2fbf4dc" data-file-name="app/dashboard/components/AdminDashboard.tsx">Guru Aktif</span></h3>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-white" data-unique-id="a1e2dbfd-d5dc-425f-934b-4546d064e3ea" data-file-name="app/dashboard/components/AdminDashboard.tsx" data-dynamic-text="true">{stats.totalTeachers}</p>
              <div className="text-xs text-white mt-1 sm:mt-2" data-unique-id="2157f08a-77ca-4ea1-8579-eb423ea2c840" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                <span data-unique-id="afe88064-d635-457f-893f-bf304ee54b8b" data-file-name="app/dashboard/components/AdminDashboard.tsx"><span className="editable-text" data-unique-id="3bd0910f-7219-4b96-8cdf-b48912c2081a" data-file-name="app/dashboard/components/AdminDashboard.tsx">Pada Semester ini</span></span>
              </div>
            </div>
          </div>

          {/* Recent Attendance */}
          <div className="mb-6 bg-yellow-50 p-4 sm:p-6 rounded-xl" data-unique-id="5a19c8bc-5858-4b92-904f-4eb7ced58ca2" data-file-name="app/dashboard/components/AdminDashboard.tsx" data-dynamic-text="true">
            <div className="flex items-center mb-3 sm:mb-4" data-unique-id="a354b8aa-7713-44ee-a3c0-e2d53540b4dd" data-file-name="app/dashboard/components/AdminDashboard.tsx">
              <div className="bg-yellow-100 p-1.5 sm:p-2 rounded-lg mr-2 sm:mr-3" data-unique-id="89704915-8eb7-476d-9900-5ecd287a7aa4" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                <Users className="h-5 sm:h-6 w-5 sm:w-6 text-yellow-600" />
              </div>
              <h2 className="text-base sm:text-lg font-semibold" data-unique-id="08e6f2aa-3bb2-4248-b168-856c648fb732" data-file-name="app/dashboard/components/AdminDashboard.tsx"><span className="editable-text" data-unique-id="1cf2e58f-6c1d-4cf6-a638-7e3d5a4a6a0b" data-file-name="app/dashboard/components/AdminDashboard.tsx">Riwayat Kehadiran</span></h2>
            </div>
            
            {loading ? <div className="flex justify-center items-center py-8 sm:py-10" data-unique-id="ecb707fe-f727-43ad-bc91-07ac9444d95b" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                <Loader2 className="h-7 sm:h-8 w-7 sm:w-8 text-primary animate-spin" />
              </div> : <div className="overflow-x-auto -mx-4 sm:mx-0" data-unique-id="89eee1fa-40e0-465f-96cd-afbf4a54fecf" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                <table className="min-w-full divide-y divide-gray-200" data-unique-id="ce0de36f-e75f-4463-a903-c1018ef438b3" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                  <thead className="bg-gray-50" data-unique-id="d37a9e41-ae72-4fcc-8a77-24b53e5b9785" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                    <tr data-unique-id="15c0a54a-ae8e-4747-9744-c969a753e781" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                      <th scope="col" className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-unique-id="b6f4f36c-445d-4889-a435-6173231224d7" data-file-name="app/dashboard/components/AdminDashboard.tsx"><span className="editable-text" data-unique-id="d03f1833-2b1b-4e16-bcde-9819106a5bfa" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                        Nama
                      </span></th>
                      <th scope="col" className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-unique-id="c1f9f21b-2b29-420c-b259-09a8efe293c5" data-file-name="app/dashboard/components/AdminDashboard.tsx"><span className="editable-text" data-unique-id="8b0ce2d2-2845-41b1-9eca-dc86384b99b4" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                        Kelas
                      </span></th>
                      <th scope="col" className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-unique-id="b7499d61-ad9b-4076-b6c8-5d27ceb6299d" data-file-name="app/dashboard/components/AdminDashboard.tsx"><span className="editable-text" data-unique-id="7d25a02e-b2ab-458a-b5c1-28c94bec99a5" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                        Status
                      </span></th>
                      <th scope="col" className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-unique-id="a2782432-9248-4b77-a440-26f8ebe89843" data-file-name="app/dashboard/components/AdminDashboard.tsx"><span className="editable-text" data-unique-id="b5d6d0bb-7ee5-4443-a50d-4f8972c68cf4" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                        Tanggal
                      </span></th>
                      <th scope="col" className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-unique-id="5d87fed0-ec0f-4e2b-b298-0b5e32c4dd91" data-file-name="app/dashboard/components/AdminDashboard.tsx"><span className="editable-text" data-unique-id="b45cac72-aced-43a1-b1e5-29e83fdeaeb9" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                        Waktu
                      </span></th>
                      <th scope="col" className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-unique-id="848c5ed4-b910-49ea-827f-71b05ac5bd14" data-file-name="app/dashboard/components/AdminDashboard.tsx"><span className="editable-text" data-unique-id="f9f1df37-905e-47ef-9d7a-fc7f6b989e31" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                        Catatan
                      </span></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200" data-unique-id="31319821-1079-471f-885b-8c5d9523363c" data-file-name="app/dashboard/components/AdminDashboard.tsx" data-dynamic-text="true">
                    {recentAttendance.length > 0 ? recentAttendance.map(record => <tr key={record.id} data-unique-id="b7abb3d9-3ada-4185-b47e-90f813f52c54" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                          <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap" data-unique-id="c49c4f67-9867-48df-a2e1-eb1d7b30ce81" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                            <div className="font-medium text-gray-900 text-xs" data-unique-id="a47288b5-7b91-49c8-95c4-80df948ae892" data-file-name="app/dashboard/components/AdminDashboard.tsx" data-dynamic-text="true">{record.studentName}</div>
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-500" data-unique-id="f4658536-5f1d-4018-a6e4-b33bdaad71ab" data-file-name="app/dashboard/components/AdminDashboard.tsx" data-dynamic-text="true">
                            {record.class}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap" data-unique-id="93cfd7d8-1635-4ec8-8997-bbc956d76619" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                            <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${record.status === 'hadir' || record.status === 'present' ? 'bg-green-100 text-green-800' : record.status === 'sakit' || record.status === 'sick' ? 'bg-orange-100 text-orange-800' : record.status === 'izin' || record.status === 'permitted' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`} data-unique-id="1ebd0c2f-1db4-4637-bc11-5db305b69dc1" data-file-name="app/dashboard/components/AdminDashboard.tsx" data-dynamic-text="true">
                              {record.status === 'hadir' || record.status === 'present' ? 'Hadir' : record.status === 'sakit' || record.status === 'sick' ? 'Sakit' : record.status === 'izin' || record.status === 'permitted' ? 'Izin' : 'Alpha'}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-500" data-unique-id="4bc71480-71e9-450d-b918-d9fab90aac1b" data-file-name="app/dashboard/components/AdminDashboard.tsx" data-dynamic-text="true">
                            {record.date ? record.date.split('-').reverse().join('-') : '-'}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-500" data-unique-id="6e00ada7-b130-4d44-9449-a1596f8f6aa2" data-file-name="app/dashboard/components/AdminDashboard.tsx" data-dynamic-text="true">
                            {record.time}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-500" data-unique-id="6ebb97dc-8436-49da-a583-ed715833498a" data-file-name="app/dashboard/components/AdminDashboard.tsx" data-dynamic-text="true">
                            {record.notes || record.note || record.catatan || '-'}
                          </td>
                        </tr>) : <tr data-unique-id="1aa200ab-0e62-4ee3-acba-7343bfd43233" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                        <td colSpan={4} className="px-4 py-3 text-center text-gray-500" data-unique-id="bd0f3bf4-e60a-47ee-9acf-f1c2d2e14c29" data-file-name="app/dashboard/components/AdminDashboard.tsx"><span className="editable-text" data-unique-id="9ce5d9db-45d8-4c81-9f43-4b75c7de09f8" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                          Belum ada data kehadiran
                        </span></td>
                      </tr>}
                  </tbody>
                </table>
              </div>}
          </div>

          {/* Admin Quick Access */}
          <div className="mb-6" data-unique-id="f7eef669-b831-4a34-8513-17d86b757785" data-file-name="app/dashboard/components/AdminDashboard.tsx">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center" data-unique-id="95e18c22-8a0c-4dc1-9a82-e34a46245424" data-file-name="app/dashboard/components/AdminDashboard.tsx">
              <Settings className="h-4 sm:h-5 w-4 sm:w-5 text-primary mr-1.5 sm:mr-2" /><span className="editable-text" data-unique-id="17c3cedd-df91-44e6-a4af-c05c42d872eb" data-file-name="app/dashboard/components/AdminDashboard.tsx">
              Akses Cepat Admin
            </span></h2>
            
            <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4" data-unique-id="64da1abf-70bb-49ba-bdff-e22fc037f992" data-file-name="app/dashboard/components/AdminDashboard.tsx">
              <Link href="/dashboard/students/add" className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl shadow-sm p-5 hover:shadow-md transition-all text-white" data-unique-id="412842aa-713a-46b1-b8cb-5d9633d992c4" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                <div className="flex flex-col items-center justify-center" data-unique-id="7e394060-2ec8-4bd0-a888-f453860bd70f" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                  <div className="bg-blue-400 bg-opacity-30 p-3 rounded-full mb-3" data-unique-id="ce8da073-c5ed-4910-af55-723bec69995f" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                    <PlusCircle className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-medium text-white text-center" data-unique-id="984f4eb9-4564-4bb4-906d-54e85f5d0981" data-file-name="app/dashboard/components/AdminDashboard.tsx"><span className="editable-text" data-unique-id="8a895f56-37f8-47de-9535-9ebd5c11ef65" data-file-name="app/dashboard/components/AdminDashboard.tsx">Tambah Siswa</span></h3>
                </div>
              </Link>
              
              <Link href="/dashboard/classes" className="bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl shadow-sm p-5 hover:shadow-md transition-all text-white" data-unique-id="1f131ffe-4045-4647-8f6f-dd492ca9ed69" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                <div className="flex flex-col items-center justify-center" data-unique-id="97a2c7a6-a532-43ef-a0ef-e3048212778c" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                  <div className="bg-purple-400 bg-opacity-30 p-3 rounded-full mb-3" data-unique-id="82236736-5d3c-4482-9352-c2fa247a9a66" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-medium text-white text-center" data-unique-id="56e734d8-494c-4ed5-81a0-d98fb4eb52ae" data-file-name="app/dashboard/components/AdminDashboard.tsx"><span className="editable-text" data-unique-id="57b2a96d-0c91-4db8-aecb-f990e1054d40" data-file-name="app/dashboard/components/AdminDashboard.tsx">Kelola Kelas</span></h3>
                </div>
              </Link>
              
              <Link href="/dashboard/attendance-history" className="bg-gradient-to-r from-amber-500 to-yellow-600 rounded-xl shadow-sm p-5 hover:shadow-md transition-all text-white" data-unique-id="657eccaa-7009-4f2a-9957-51f7a0d2dd17" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                <div className="flex flex-col items-center justify-center" data-unique-id="f6d1400e-deaa-4205-badf-eb7d1c83af83" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                  <div className="bg-amber-400 bg-opacity-30 p-3 rounded-full mb-3" data-unique-id="de299df5-c9a4-45c0-8b0e-d394bb4d3130" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                    <Settings className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-medium text-white text-center" data-unique-id="b1e1cffb-0e28-49e0-b1bc-50b6daef6027" data-file-name="app/dashboard/components/AdminDashboard.tsx"><span className="editable-text" data-unique-id="b5bc0e70-9fb2-4a75-a24e-83497e0aa058" data-file-name="app/dashboard/components/AdminDashboard.tsx">Riwayat Absen</span></h3>
                </div>
              </Link>
              
              <Link href="/dashboard/user-management" className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-sm p-5 hover:shadow-md transition-all text-white" data-unique-id="4bcb6d9c-7e32-4be1-885c-6dd607a41b4a" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                <div className="flex flex-col items-center justify-center" data-unique-id="62785fc7-743f-4200-af84-1902508e21ef" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                  <div className="bg-green-400 bg-opacity-30 p-3 rounded-full mb-3" data-unique-id="ad1f4f66-3824-4453-a309-64fe58701666" data-file-name="app/dashboard/components/AdminDashboard.tsx">
                    <UserPlus className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-medium text-white text-center" data-unique-id="af78e54a-bafa-4583-8969-bc92f06ade78" data-file-name="app/dashboard/components/AdminDashboard.tsx"><span className="editable-text" data-unique-id="439f11f1-7d87-4dc5-984c-55be6a39e1dd" data-file-name="app/dashboard/components/AdminDashboard.tsx">Manajemen User</span></h3>
                </div>
              </Link>
            </div>
          </div>
        </>}
    </div>;
}
