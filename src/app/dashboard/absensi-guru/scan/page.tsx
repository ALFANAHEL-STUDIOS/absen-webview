"use client";
// Impor ini di bagian atas file Anda 
import { format } from "date-fns"; 
import { id } from "date-fns/locale"; 

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Camera, MapPin, User, AlertCircle, ArrowLeft, Loader2, CheckCircle, Timer, LogIn, LogOut, X } from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
export default function TeacherAttendanceScan() {
  const {
    user,
    userRole,
    schoolId
  } = useAuth();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [processingCapture, setProcessingCapture] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [photoTaken, setPhotoTaken] = useState(false);
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [attendanceType, setAttendanceType] = useState<"in" | "out">("in");
  const [recognizedTeacher, setRecognizedTeacher] = useState<any>(null);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState({
    radius: 100,
    schoolLocation: {
      lat: 0,
      lng: 0
    }
  });

  // Handle page initialization and cleanup
  useEffect(() => {
    // Check authorization
    if (userRole !== 'admin' && userRole !== 'teacher' && userRole !== 'staff') {
      toast.error("Anda tidak memiliki akses ke halaman ini");
      router.push('/dashboard');
      return;
    }

    // Load settings
    const loadSettings = async () => {
      if (!schoolId) return;
      try {
        const {
          doc,
          getDoc
        } = await import('firebase/firestore');
        const {
          db
        } = await import('@/lib/firebase');
        const settingsDoc = await getDoc(doc(db, "settings", "location"));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setSettings({
            radius: data.radius || 100,
            schoolLocation: {
              lat: data.latitude || 0,
              lng: data.longitude || 0
            }
          });
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };
    loadSettings();
    setLoading(false);

    // Clean up function to stop camera when component unmounts
    return () => {
      if (streamRef.current) {
        const tracks = streamRef.current.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [router, schoolId, userRole]);

  // Start camera for scanning
  const startCamera = async () => {
    try {
      setScanning(true);

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: "user"
        }
      });

      // Store stream in ref for later cleanup
      streamRef.current = stream;

      // Connect stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // No need for face detection initialization anymore

      // Get location
      navigator.geolocation.getCurrentPosition(
      // Success callback
      position => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setLocation(userLocation);

        // Calculate distance from school
        if (settings.schoolLocation.lat && settings.schoolLocation.lng) {
          const distance = calculateDistance(userLocation.lat, userLocation.lng, settings.schoolLocation.lat, settings.schoolLocation.lng);
          if (distance <= settings.radius) {
            setLocationMessage("Lokasi terdeteksi di Area Sekolah");
          } else {
            setLocationMessage(`Lokasi diluar area sekolah (${Math.round(distance)} meter)`);
          }
        } else {
          setLocationMessage("Posisi terdeteksi, tapi lokasi sekolah belum diatur");
        }
      },
      // Error callback
      error => {
        console.error("Geolocation error:", error);
        setLocationMessage("Gagal mendapatkan lokasi. Pastikan GPS diaktifkan.");
        toast.error("Tidak dapat mengakses lokasi. Pastikan GPS diaktifkan.");
      });
    } catch (error) {
      console.error("Error starting camera:", error);
      toast.error("Gagal mengakses kamera");
      setScanning(false);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
    setPhotoTaken(false);
  };

  // Capture image
  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    try {
      setCapturing(true);

      // Draw video frame to canvas
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      // Set canvas dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get image data as base64
      const imageData = canvas.toDataURL('image/jpeg');
      setCapturedImage(imageData);

      // Process the image (detect face and identify)
      await processImage(imageData);
    } catch (error) {
      console.error("Error capturing image:", error);
      toast.error("Gagal mengambil gambar");
      setCapturing(false);
    }
  };

  // Process the captured image
  const processImage = async (imageData: string) => {
    try {
      setProcessingCapture(true);
      setPhotoTaken(true);

      // Get teacher data from the current user or fetch from database
      const {
        db
      } = await import('@/lib/firebase');
      const {
        doc,
        getDoc,
        collection,
        query,
        where,
        getDocs
      } = await import('firebase/firestore');
      if (userRole === 'teacher' || userRole === 'staff') {
        // If the current user is a teacher or staff, use their data
        if (user && user.uid) {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setRecognizedTeacher({
              id: user.uid,
              name: userData.name || user.displayName || "Nama tidak diketahui",
              nik: userData.nik || "NIP tidak tersedia",
              role: userData.role === 'teacher' ? 'Guru' : 'Tenaga Kependidikan'
            });
          } else {
            toast.error("Data pengguna tidak ditemukan");
          }
        }
      } else if (userRole === 'admin') {
        // If the user is an admin, use their data for simplicity
        // In a real app, you might want to let admin select which teacher to mark attendance for
        if (user && user.uid) {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setRecognizedTeacher({
              id: user.uid,
              name: userData.name || user.displayName || "Administrator",
              nik: userData.nik || "NIP tidak tersedia",
              role: "Administrator"
            });
          }
        }
      }
      setProcessingCapture(false);
      setCapturing(false);
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error("Gagal memproses gambar");
      setProcessingCapture(false);
      setCapturing(false);
    }
  };

  // Submit attendance
  const submitAttendance = async () => {
    if (!schoolId || !recognizedTeacher || !location) {
      toast.error("Data tidak lengkap");
      return;
    }
    try {
      setProcessingCapture(true);
      const currentDate = new Date();
      const dateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = currentDate.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      // Check if within allowed distance
      if (!location || !settings.schoolLocation) {
        toast.error("Data lokasi tidak lengkap");
        setProcessingCapture(false);
        return;
      }
      const distance = calculateDistance(location.lat, location.lng, settings.schoolLocation.lat, settings.schoolLocation.lng);
      if (distance > settings.radius) {
        toast.error(`Anda berada di luar area Absensi Sekolah, dengan jarak (${Math.round(distance)} meter)`);
        setProcessingCapture(false);
        return;
      }

      // Check if already submitted for today
      const {
        collection,
        query,
        where,
        getDocs,
        addDoc,
        serverTimestamp
      } = await import('firebase/firestore');
      const {
        db
      } = await import('@/lib/firebase');
      const attendanceRef = collection(db, "teacherAttendance");
      const existingAttendanceQuery = query(attendanceRef, where("teacherId", "==", recognizedTeacher.id), where("date", "==", dateStr), where("type", "==", attendanceType));
      const existingSnapshot = await getDocs(existingAttendanceQuery);
      if (!existingSnapshot.empty) {
        toast.error(`Anda sudah melakukan absensi ${attendanceType === 'in' ? 'masuk' : 'pulang'} hari ini`);
        setProcessingCapture(false);
        return;
      }

      // Determine status based on allowed time (mock, in real app should check against settings)
      let status = "present"; // Default status
      const hour = currentDate.getHours();
      if (attendanceType === 'in' && hour >= 8) {
        // If checking in after 8 AM
        status = "late";
      }

      // Save attendance record
      const attendanceData = {
        teacherId: recognizedTeacher.id,
        teacherName: recognizedTeacher.name,
        teacherNik: recognizedTeacher.nik,
        date: dateStr,
        time: timeStr,
        timestamp: serverTimestamp(),
        type: attendanceType,
        status: status,
        location: {
          lat: location.lat,
          lng: location.lng
        },
        schoolId: schoolId
      };
      await addDoc(attendanceRef, attendanceData);

      // Send Telegram notification
      await sendTelegramNotification(recognizedTeacher.name, attendanceType, dateStr, timeStr);
      setSuccess(true);
      toast.success(`Absensi ${attendanceType === 'in' ? 'Masuk' : 'Pulang'} berhasil tercatat!`);
    } catch (error) {
      console.error("Error submitting attendance:", error);
      toast.error("Gagal mencatat absensi");
    } finally {
      setProcessingCapture(false);
    }
  };

  // Reset the process
  const resetProcess = () => {
    setCapturedImage(null);
    setPhotoTaken(false);
    setRecognizedTeacher(null);
    setSuccess(false);
    stopCamera();
  };

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  };

  // Send Telegram notification
  const sendTelegramNotification = async (teacherName: string, attendanceType: string, date: string, time: string) => {
    try {
      const {
        doc,
        getDoc
      } = await import('firebase/firestore');
      const {
        db
      } = await import('@/lib/firebase');

      // Get Telegram settings
      const telegramSettingsDoc = await getDoc(doc(db, "settings", "telegram"));
      if (!telegramSettingsDoc.exists()) {
        console.error("Telegram settings not found");
        return;
      }
      const telegramSettings = telegramSettingsDoc.data();
      const token = telegramSettings.token || "7702797779:AAELhARB3HkvB9hh5e5D64DCC4faDfcW9IM";
      const chatId = telegramSettings.chatId || ""; // Should be the school principal's chat ID

      if (!chatId) {
        console.error("No chat ID found for notification");
        return;
      }


      
const currentDateTime = new Date(); 
const formattedDate = format(currentDateTime, "EEEE, d MMMM yyyy", { locale: id }); 
const formattedTime = format(currentDateTime, "HH:mm:ss"); 

      
      // Format message
    const messageType = attendanceType === 'in' ? 'MASUK' : 'PULANG';
    const message = `Guru dengan nama ${teacherName} telah melakukan Absensi "${messageType}" pada hari ini ${formattedDate} pukul ${formattedTime} WIB.`;
    // Send notification
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
        body: JSON.stringify({
          chat_id: chatId,
          text: message
        })
      });
    } catch (error) {
      console.error("Error sending Telegram notification :", error);
    }
  };

  const currentDateTime = new Date(); 
const formattedDate = format(currentDateTime, "EEEE, d MMMM yyyy", { locale: id }); 
const formattedTime = format(currentDateTime, "HH:mm:ss"); 

  
  return <div className="max-w-3xl mx-auto pb-20 md:pb-6 px-3 sm:px-4 md:px-6" data-unique-id="e7d7d9cf-285f-4e30-b642-41618ec495eb" data-file-name="app/dashboard/absensi-guru/scan/page.tsx" data-dynamic-text="true">
      <div className="flex items-center justify-between mb-6" data-unique-id="78d4601e-fb30-478d-9c9c-7154c30ca677" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
        <div className="flex items-center" data-unique-id="eab2c760-eb69-4fb3-a4ab-6a36cbada17e" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
          <Link href="/dashboard/absensi-guru" className="p-2 mr-2 hover:bg-gray-100 rounded-full" data-unique-id="0cdfe06b-05ba-437c-aba6-688c31ce9fa7" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-800" data-unique-id="d36fb74b-8b02-4652-87fd-30af2c5de32d" data-file-name="app/dashboard/absensi-guru/scan/page.tsx"><span className="editable-text" data-unique-id="7366c998-b51b-4af5-ad40-fa979a4d9f54" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">Scan Absensi GTK</span></h1>
        </div>
      </div>
      
      {loading ? <div className="flex justify-center items-center h-64" data-unique-id="9bee9de6-4baa-4388-aadd-a244906b0332" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
        </div> : success ? <motion.div className="bg-white rounded-xl shadow-md p-8 text-center" initial={{
      opacity: 0,
      scale: 0.9
    }} animate={{
      opacity: 1,
      scale: 1
    }} transition={{
      duration: 0.3
    }} data-unique-id="80a871a6-5d18-4c27-8b46-329c8c826e4d" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6" data-unique-id="605e6523-c077-45af-a581-15210ee9cc69" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-2" data-unique-id="5dd794d1-4816-42b6-85ae-fb73b3244e41" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
            <span className="editable-text" data-unique-id="25c960ba-f7d3-48a2-a3ef-62fe5acd0234" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">Absensi Berhasil!</span></h2>
          <p className="text-gray-600 mb-6" data-unique-id="7d960c80-b028-4bad-9f3d-6bebe47e690b" data-file-name="app/dashboard/absensi-guru/scan/page.tsx" data-dynamic-text="true">
           {recognizedTeacher?.name} <span className="editable-text" data-unique-id="747dde10-4f66-4bef-aee0-b40328684309" data-file-name="app/dashboard/absensi-guru/scan/page.tsx"> 
             telah melakukan Absensi</span> "{attendanceType === 'in' ? 'MASUK' : 'PULANG'}" pada hari ini  {formattedDate} pukul {formattedTime} WIB.
            <span className="editable-text" data-unique-id="26f29e7d-558a-4cb8-8fc0-874fcdf7a59f" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
          </span></p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-unique-id="3a31698a-0e73-4cfe-b5cd-5461c54a24af" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
            {/*<button onClick={resetProcess} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" data-unique-id="ab94985c-1582-4532-9d2a-8a7c196c8aa1" data-file-name="app/dashboard/absensi-guru/scan/page.tsx"><span className="editable-text" data-unique-id="97399fef-c22f-4132-b97c-b9d89ad26fd9" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
              Absen Lagi
            </span></button>*/}
            <Link href="https://t.me/AbsenModernBot" target="_blank" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center" data-unique-id="e44ce7c5-e2b2-4cda-bb93-d75bb8ae21ba" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
              <span className="editable-text" data-unique-id="271dcb13-3785-4c2e-abe2-d0df598e858d" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">Lihat Hasil Absensi</span>
            </Link>
            <Link href="/dashboard" className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center" data-unique-id="980f8a59-f3d7-4376-8251-802dd82d0aff" data-file-name="app/dashboard/absensi-guru/scan/page.tsx"><span className="editable-text" data-unique-id="14ffee72-2a96-4bd3-a0e6-cbf7e851afb3" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
              Kembali
            </span></Link>
          </div>
        </motion.div> : <div className="bg-white rounded-xl shadow-md overflow-hidden" data-unique-id="f6796bc6-edfa-4594-9e8e-171434a2007e" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
          <div className="p-6 border-b border-gray-200" data-unique-id="5126f0f3-e6a1-4da6-9129-954e72682513" data-file-name="app/dashboard/absensi-guru/scan/page.tsx" data-dynamic-text="true">
            <center><h2 className="text-lg font-semibold mb-4" data-unique-id="f4311397-5296-4eaa-9f18-425b8b968cfa" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
              <span className="editable-text" data-unique-id="3b0f0f36-126f-4734-8dd3-1fa872c95fa2" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">Pilih Jenis Absensi :</span></h2></center>
            
            {/* Attendance type selector */}
            <div className="flex items-center justify-center p-3 bg-gray-50 rounded-lg mb-4" data-unique-id="ef23db88-c069-479a-bc49-482fd9b6fa09" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
              <div className="flex space-x-2 bg-white p-1 rounded-lg shadow-sm" data-unique-id="b59d1dec-66e8-4e27-b633-69ff33924907" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
                <button onClick={() => setAttendanceType("in")} className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${attendanceType === "in" ? "bg-blue-600 text-white" : "bg-white text-gray-700"}`} data-unique-id="fba4c4a4-1161-4f7f-8316-9c8c303810ac" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
                  <LogIn size={16} />
                  <span data-unique-id="01cedca7-345c-4da7-bf16-2b12bde81fda" data-file-name="app/dashboard/absensi-guru/scan/page.tsx"><span className="editable-text" data-unique-id="9d9d5a00-2df7-444c-b3e3-5369595e290f" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">Masuk</span></span>
                </button>
                <button onClick={() => setAttendanceType("out")} className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${attendanceType === "out" ? "bg-blue-600 text-white" : "bg-white text-gray-700"}`} data-unique-id="29393762-afac-4a79-81be-f96f30cf6cca" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
                  <LogOut size={16} />
                  <span data-unique-id="80de53e9-bb70-4695-9df4-ceaab5833755" data-file-name="app/dashboard/absensi-guru/scan/page.tsx"><span className="editable-text" data-unique-id="c04e4b3e-5332-4d0f-8758-ca4f472de5cc" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">Pulang</span></span>
                </button>
              </div>
            </div>
            
            {/* Camera view */}
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden mb-4" data-unique-id="0b07f656-60db-433b-99e1-b29f0124bf07" data-file-name="app/dashboard/absensi-guru/scan/page.tsx" data-dynamic-text="true">
              {scanning ? <>
                  <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted data-unique-id="3af1610f-eb8f-4fa5-99eb-b8047ded70c8" data-file-name="app/dashboard/absensi-guru/scan/page.tsx"></video>
                  
                  {/* Photo capture guide overlay */}
                  <div className="absolute inset-0 flex items-center justify-center" data-unique-id="7c3dd98f-8b00-4c3c-a80a-04c723feb4e2" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
                    <div className="absolute bottom-3 left-0 right-0 text-center" data-unique-id="144b7fe4-fb17-42ad-be1d-4a5c5efe20a4" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
                      <p className="text-gray-500 text-sm bg-black bg-opacity-50 inline-block px-3 py-1 rounded-full" data-unique-id="aec2e790-fd40-4d0e-9945-1fb6d3b56dba" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
                        <span className="editable-text" data-unique-id="9fe61513-9d1f-4b12-a964-3d930d0a3b42" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
                        Posisikan diri Anda dengan tepat
                      </span></p>
                    </div>
                  </div>
                </> : capturedImage ? <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" data-unique-id="e770b419-7f29-4d44-a7fc-67fd6bfa257b" data-file-name="app/dashboard/absensi-guru/scan/page.tsx" /> : <div className="flex flex-col items-center justify-center h-full" data-unique-id="6c925793-3a50-4ac2-b41d-09ab90c62043" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
                  <Camera size={48} className="text-gray-400 mb-4" />
                  <p className="text-gray-400" data-unique-id="dc44cf67-43a0-4010-a788-b2c24d96abd5" data-file-name="app/dashboard/absensi-guru/scan/page.tsx"><span className="editable-text" data-unique-id="6d7a0835-4f58-4bd6-8189-ce71e2039bec" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">Kamera belum diaktifkan</span></p>
                </div>}
              
              {/* Hidden canvas for processing */}
              <canvas ref={canvasRef} className="hidden" data-unique-id="51c60fbb-526d-4802-b280-25e130caf3af" data-file-name="app/dashboard/absensi-guru/scan/page.tsx"></canvas>
            </div>
            
            {/* Location information */}
            <div className={`p-3 mb-4 rounded-lg flex items-center ${!location ? 'bg-gray-100 text-gray-700' : locationMessage.includes('luar area') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`} data-unique-id="1416de25-05ed-4339-828c-4cfa1e865508" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
              <MapPin className="h-5 w-5 mr-2" />
              <p className="text-sm" data-unique-id="932a8874-8da9-4d91-ad71-9cc164890cc6" data-file-name="app/dashboard/absensi-guru/scan/page.tsx" data-dynamic-text="true">{locationMessage || "Mendeteksi lokasi..."}</p>
            </div>
            
            {/* Recognized teacher */}
            {recognizedTeacher && 
              <center><div className="p-4 bg-purple-600 rounded-lg mb-4 border border-purple-200" data-unique-id="079b614b-8eea-4002-8e0c-117536b80737" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
                <h3 className="text-lg font-semibold text-white" data-unique-id="3685f6bc-8cbe-49d8-8954-1e7df183a1a1" data-file-name="app/dashboard/absensi-guru/scan/page.tsx" data-dynamic-text="true">{recognizedTeacher.name}</h3>
                <p className="text-sm text-white" data-unique-id="2011a9ff-236b-44ea-831d-c27ef674a9d9" data-file-name="app/dashboard/absensi-guru/scan/page.tsx" data-dynamic-text="true">
                  <span className="editable-text" data-unique-id="d63d5544-1a6b-41ba-9257-e9457b13f38b" data-file-name="app/dashboard/absensi-guru/scan/page.tsx"></span>{recognizedTeacher.nik}</p>
                <p className="text-sm text-white" data-unique-id="f5a19de5-8351-4ece-8e86-1946ae997569" data-file-name="app/dashboard/absensi-guru/scan/page.tsx" data-dynamic-text="true">
                  <span className="editable-text" data-unique-id="85e40a5d-3d0d-4e2e-b575-70051340847b" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">Status : </span>{recognizedTeacher.role}</p>
              </div></center>}
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4" data-unique-id="584cd3d7-b43f-4246-8616-cbf497b37fac" data-file-name="app/dashboard/absensi-guru/scan/page.tsx" data-dynamic-text="true">
            {!scanning && !capturedImage && <button onClick={startCamera} className="col-span-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2" data-unique-id="ca3e062f-bb9c-42e9-858f-e08a504bfe9e" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
                <Camera size={20} />
                <span className="editable-text" data-unique-id="5507e3aa-849a-4ac2-8b2d-fed711743630" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">Aktifkan Kamera</span>
              </button>}
            
            {scanning && !capturing && <button onClick={captureImage} className="col-span-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2" disabled={capturing} data-unique-id="0db42956-26a5-48c2-a491-c679ec689a5e" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
                <Camera size={20} />
                <span className="editable-text" data-unique-id="f65003cd-47ac-4b16-8bd7-dd91dd217d1a" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">Ambil Gambar</span>
              </button>}
            
            {capturedImage && photoTaken && recognizedTeacher && !processingCapture && <button onClick={submitAttendance} className="py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center justify-center gap-2" disabled={processingCapture} data-unique-id="bc6823cc-4d75-476f-a570-342364029ac8" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
                <CheckCircle size={20} />
                <span className="editable-text" data-unique-id="f6e83de8-2c7c-4bfd-90d6-25e58fd013a4" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">Simpan Absensi</span>
              </button>}
            
            {(scanning || capturedImage) && !processingCapture && <button onClick={resetProcess} className="py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center justify-center gap-2" data-unique-id="8fbff594-65df-4612-abdb-e11ad6adbb59" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
                <X size={20} />
                <span className="editable-text" data-unique-id="5204da7a-e5fa-42d2-bf1c-12ff41a2a30a" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">Batalkan</span>
              </button>}
            
            {processingCapture && <div className="col-span-full flex items-center justify-center py-3 bg-orange-300 text-white rounded-lg font-medium" data-unique-id="a984ae1f-e953-4533-84a7-44908a59759c" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">
                <Loader2 size={20} className="animate-spin mr-2" />
                <span className="editable-text" data-unique-id="ab5b960b-a179-4cb2-96ba-3d439ca09b1a" data-file-name="app/dashboard/absensi-guru/scan/page.tsx">Memproses...</span>
              </div>}
          </div>
        </div>}
      <hr className="border-t border-none mb-5" />
   
      {/* Instructions card */}
    {/*<div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-6 rounded-lg">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800"><span className="editable-text">Petunjuk Absensi</span></h3>
          <div className="mt-2 text-sm text-yellow-700">
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="editable-text">Pastikan foto selfie Anda terlihat jelas</span></li>
              <li><span className="editable-text">Pastikan pencahayaan cukup terang</span></li>
              <li><span className="editable-text">Pastikan Anda berada di area sekolah</span></li>
              <li><span className="editable-text">Aktifkan GPS pada perangkat Anda</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>*/}
  </div>;
  
}
