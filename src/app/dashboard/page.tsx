"use client";

import React, { useEffect, useState } from "react";
import { Home, Users, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// Import role-specific dashboard components
import AdminDashboard from "./components/AdminDashboard";
import TeacherDashboard from "./components/TeacherDashboard";
import StudentDashboard from "./components/StudentDashboard";
import DynamicDashboard from "@/components/DynamicDashboard";
export default function Dashboard() {
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [showCustomDashboard, setShowCustomDashboard] = useState(false);
  const {
    user,
    schoolId,
    userRole,
    userData
  } = useAuth();
  const router = useRouter();
  const [schoolName, setSchoolName] = useState("");
  const [userName, setUserName] = useState("");
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalClasses, setTotalClasses] = useState(0);
  const [totalTeachers, setTotalTeachers] = useState(0);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check if this is the user's first login
  useEffect(() => {
    if (user) {
      // Check if this is the first login by looking for a flag in localStorage
      const isFirstLogin = localStorage.getItem(`hasLoggedIn_${user.uid}`) !== 'true';
      if (isFirstLogin) {
        setShowWelcomePopup(true);
        // Mark that the user has logged in
        localStorage.setItem(`hasLoggedIn_${user.uid}`, 'true');
      }
    }
  }, [user]);
  useEffect(() => {
    const fetchSchoolData = async () => {
      if (schoolId) {
        try {
          setLoading(true);
          // Fetch school info
          const schoolDoc = await getDoc(doc(db, "schools", schoolId));
          if (schoolDoc.exists()) {
            setSchoolName(schoolDoc.data().name || "Sekolah Anda");
          }

          // Fetch total students count
          const studentsRef = collection(db, `schools/${schoolId}/students`);
          const studentsSnapshot = await getDocs(studentsRef);
          setTotalStudents(studentsSnapshot.size);

          // Fetch total classes count
          const classesRef = collection(db, `schools/${schoolId}/classes`);
          const classesSnapshot = await getDocs(classesRef);
          setTotalClasses(classesSnapshot.size);

          // Fetch total teachers count
          const teachersRef = collection(db, "users");
          const teachersQuery = query(teachersRef, where("schoolId", "==", schoolId), where("role", "==", "teacher"));
          const teachersSnapshot = await getDocs(teachersQuery);
          setTotalTeachers(teachersSnapshot.size);

          // Calculate attendance rate
          const today = new Date().toISOString().split('T')[0];
          const startOfMonth = today.substring(0, 8) + '01'; // First day of current month

          const attendanceRef = collection(db, `schools/${schoolId}/attendance`);
          const attendanceQuery = query(attendanceRef, where("date", ">=", startOfMonth), where("date", "<=", today));
          const attendanceSnapshot = await getDocs(attendanceQuery);
          let present = 0;
          let total = 0;
          attendanceSnapshot.forEach(doc => {
            total++;
            const status = doc.data().status;
            if (status === 'hadir' || status === 'present') {
              present++;
            }
          });
          setAttendanceRate(total > 0 ? Math.round(present / total * 100) : 0);

          // Fetch recent attendance records
          const recentAttendanceQuery = query(attendanceRef, orderBy("timestamp", "desc"), limit(5));
          const recentAttendanceSnapshot = await getDocs(recentAttendanceQuery);
          const recentAttendanceData = [];
          recentAttendanceSnapshot.forEach(doc => {
            const data = doc.data();
            recentAttendanceData.push({
              id: doc.id,
              ...data,
              // Ensure notes field is available for display
              notes: data.notes || data.note || data.catatan || null
            });
          });
          setRecentAttendance(recentAttendanceData);
          setLoading(false);
        } catch (error) {
          console.error("Error fetching school data:", error);
          setLoading(false);
        }
      }
    };
    fetchSchoolData();
    setUserName(user?.displayName || "Selamat Datang");

    // Check if the user is an admin without school setup
    if (typeof window !== 'undefined' && userRole === 'admin') {
      const needsSetup = localStorage.getItem('needsSchoolSetup');
      if (needsSetup === 'true' && !schoolId) {
        router.push('/dashboard/setup-school');
      }
    }
  }, [user, schoolId, userRole, router]);
  return <div className="pb-20 md:pb-6" data-unique-id="93d61fdb-a2fd-4b3c-af10-9a9cbb951e05" data-file-name="app/dashboard/page.tsx" data-dynamic-text="true">
      {/* Dashboard Header */}
      <div className="mb-6" data-unique-id="d7e0cba0-f0fb-4b8b-af91-437a763d13f0" data-file-name="app/dashboard/page.tsx">
        <h1 className="text-2xl font-bold text-gray-800" data-unique-id="93f0b58f-9765-4dc2-b268-88035baf9188" data-file-name="app/dashboard/page.tsx" data-dynamic-text="true"><span className="editable-text" data-unique-id="0a6efbd4-ff00-48e6-b344-b5248b471a16" data-file-name="app/dashboard/page.tsx">
          Hai, </span>{userName}
          {userRole && <span className="ml-2 text-xs font-normal px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full" data-unique-id="ddb89d0a-00ef-45e5-af1e-d3dbb360cecc" data-file-name="app/dashboard/page.tsx" data-dynamic-text="true">
              {userRole === 'admin' ? 'Administrator' : userRole === 'teacher' ? 'Guru' : 'Siswa'}
            </span>}
        </h1>
        <div className="flex items-center mt-1 text-gray-500" data-unique-id="1950b5b0-fb7b-4aa8-ba9f-d6aa997f5d33" data-file-name="app/dashboard/page.tsx">
          <Home size={14} className="mr-1.5" />
          <span className="font-medium text-xs" data-unique-id="11743eef-f70a-40b2-b0c8-ab113a91932d" data-file-name="app/dashboard/page.tsx"><span className="editable-text" data-unique-id="6c5d7bc0-f711-4096-8b8e-b19233478b23" data-file-name="app/dashboard/page.tsx">SISTEM ABSENSI DIGITAL GURU DAN SISWA</span></span>
        </div>
      </div>

      {/* Render different dashboard based on user role */}
      {userRole === 'admin' && <>
          {showCustomDashboard ? <DynamicDashboard userRole={userRole} schoolId={schoolId} /> : <AdminDashboard schoolName={schoolName} principalName={userData?.principalName || ""} principalNip={userData?.principalNip || ""} stats={{
        totalStudents,
        totalClasses,
        attendanceRate,
        totalTeachers
      }} recentAttendance={recentAttendance} loading={loading} />}
        </>}
      
      {userRole === 'teacher' && <>
          {showCustomDashboard ? <DynamicDashboard userRole={userRole} schoolId={schoolId} /> : <TeacherDashboard schoolName={schoolName} userName={userName} stats={{
        totalStudents,
        totalClasses,
        attendanceRate,
        totalTeachers
      }} recentAttendance={recentAttendance} loading={loading} />}
        </>}
      
      {userRole === 'student' && <StudentDashboard userData={userData} schoolId={schoolId} />}
      
      {/* Fallback if no role is detected */}
      {!userRole && <div className="bg-white rounded-xl shadow-sm p-8 text-center" data-unique-id="9add26be-66bf-44b2-99e3-f9c18bc0f956" data-file-name="app/dashboard/page.tsx">
          <div className="flex flex-col items-center" data-unique-id="a089a9e0-d0ac-4026-a40c-a194c3cdf00f" data-file-name="app/dashboard/page.tsx">
            <div className="bg-blue-100 p-4 rounded-full mb-4" data-unique-id="65678bfa-4010-41fc-af50-a41be8025c0b" data-file-name="app/dashboard/page.tsx">
              <Home className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2" data-unique-id="b990bba3-6d26-47b5-a6e3-47546bc247fd" data-file-name="app/dashboard/page.tsx"><span className="editable-text" data-unique-id="658d6f79-1ede-4a95-b650-ed170ea28e59" data-file-name="app/dashboard/page.tsx">Selamat Datang di Dashboard</span></h2>
            <p className="text-gray-600 mb-4" data-unique-id="94d0a127-7205-4519-8771-5ac7d16d140c" data-file-name="app/dashboard/page.tsx"><span className="editable-text" data-unique-id="4a756c4e-9081-49a9-a07f-16ef53fef11f" data-file-name="app/dashboard/page.tsx">
              Silakan hubungi administrator untuk mengatur peran akses Anda.
            </span></p>
          </div>
        </div>}

      {/* Welcome Popup for First-time Login */}
      <AnimatePresence>
        {showWelcomePopup && <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 p-4" data-unique-id="6836734c-5741-4164-afa8-1b8ce061da08" data-file-name="app/dashboard/page.tsx">
            <motion.div initial={{
          scale: 0.9,
          opacity: 0
        }} animate={{
          scale: 1,
          opacity: 1
        }} exit={{
          scale: 0.9,
          opacity: 0
        }} className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6" data-unique-id="4ef87f4b-f153-4591-bd8b-2baa9c504abe" data-file-name="app/dashboard/page.tsx">
              <div className="flex justify-end" data-unique-id="61bd4bd4-2309-4202-b752-c478b23d8434" data-file-name="app/dashboard/page.tsx">
                <button onClick={() => setShowWelcomePopup(false)} className="text-gray-500 hover:text-gray-700" data-unique-id="07e3c430-8d2e-49f7-8049-cad7c4decf0b" data-file-name="app/dashboard/page.tsx">
                  <X size={20} />
                </button>
              </div>
              <div className="text-center mb-6" data-unique-id="616c7747-85a8-4284-92b7-ecf4d01f26ec" data-file-name="app/dashboard/page.tsx">
                <h2 className="text-xl font-bold mb-1" data-unique-id="07a8ebb5-4312-4df3-8409-dc5d1a9a4e86" data-file-name="app/dashboard/page.tsx"><span className="editable-text" data-unique-id="505156cf-7bc1-49ab-b33d-65d82a235e2d" data-file-name="app/dashboard/page.tsx">SELAMAT DATANG</span></h2>
                <h3 className="text-lg font-bold text-primary mb-4" data-unique-id="9c764b32-d383-4882-a596-48fa360f4527" data-file-name="app/dashboard/page.tsx" data-dynamic-text="true">{userData?.name || userName}</h3>
                <p className="text-gray-700 text-sm sm:text-base" data-unique-id="8b887fd1-8536-4f81-a26e-860f5534596a" data-file-name="app/dashboard/page.tsx"><span className="editable-text" data-unique-id="458d92d2-9d8d-4ab1-9965-846b61096b54" data-file-name="app/dashboard/page.tsx">
                  Jika anda pertama kali login ke Aplikasi ABSENSI DIGITAL, jangan lupa untuk dapat menggunakan aplikasi ini, silahkan lengkapi </span><span className="font-bold" data-unique-id="7a4233ee-ec14-4819-97fd-d21108fcb507" data-file-name="app/dashboard/page.tsx"><span className="editable-text" data-unique-id="19856474-0b7a-4ff0-9623-01ba16bf9266" data-file-name="app/dashboard/page.tsx">Profil Sekolah</span></span><span className="editable-text" data-unique-id="bfe7afce-3cfc-4687-b505-a1e44d5af22d" data-file-name="app/dashboard/page.tsx"> anda dengan cara mengakses Menu yang berada di pojok kanan atas.
                </span></p>
              </div>
              <div className="flex justify-center" data-unique-id="3d6cb2b6-98d6-4d88-8b15-aa51d6c49fd6" data-file-name="app/dashboard/page.tsx">
                <button onClick={() => setShowWelcomePopup(false)} className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary hover:bg-opacity-90 transition-colors" data-unique-id="995e97aa-6e2a-4a7f-a5f1-bbd1df2a57d7" data-file-name="app/dashboard/page.tsx"><span className="editable-text" data-unique-id="de04c802-2eb2-4ff6-89a0-814f79df2147" data-file-name="app/dashboard/page.tsx">
                  Saya Mengerti
                </span></button>
              </div>
            </motion.div>
          </motion.div>}
      </AnimatePresence>
    </div>;
}
