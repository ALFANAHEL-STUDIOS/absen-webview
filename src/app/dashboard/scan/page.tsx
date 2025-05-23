"use client";
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, limit } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { QrCode, Camera, UserCheck, UserX, Loader2, Clock, Calendar as CalendarIcon, AlertCircle, Bell, Volume2, VolumeX, RefreshCw, Zap } from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { motion } from "framer-motion";
import Link from "next/link";
import { Scanner as QrScanner } from "@yudiel/react-qr-scanner";
// Helper function to detect Android WebView
const isAndroidWebView = () => {
 if (typeof window === 'undefined') return false;

 const userAgent = navigator.userAgent || '';
 const isAndroid = /Android/i.test(userAgent);
 const isWebView = /; wv|Version\/[0-9.]+Chrome/.test(userAgent); // WebView detection patterns
 const isAppSpecificWebView = userAgent.includes('AbsensiDigital'); // Replace with your app's WebView identifier if applicable

 return isAndroid && (isWebView || isAppSpecificWebView);
};
// Function to request camera permissions with explicit handling for WebView
const requestCameraPermission = async () => {
 try {
   // For modern browsers and WebViews with proper permissions support
   const stream = await navigator.mediaDevices.getUserMedia({ video: true });

   // Stop stream immediately - we just wanted to trigger the permission request
   stream.getTracks().forEach(track => track.stop());
   return true;
 } catch (err) {
   console.error("Camera permission error:", err);
   return false;
 }
};
export default function ScanQR() {
 const {
   schoolId,
   userRole
 } = useAuth();
 const router = useRouter();
 const [scanning, setScanning] = useState(false);
 const [detectedCode, setDetectedCode] = useState<string | null>(null);
 const [student, setStudent] = useState<any | null>(null);
 const [loading, setLoading] = useState(false);
 const [submitted, setSubmitted] = useState(false);
 const [currentDateTime, setCurrentDateTime] = useState(new Date());
 const [scanError, setScanError] = useState<string | null>(null);
 const [muted, setMuted] = useState<boolean>(false);
 const [attendanceStatus, setAttendanceStatus] = useState<string>('hadir');
 const [attendanceNotes, setAttendanceNotes] = useState<string>('');
 const audioRef = useRef<HTMLAudioElement | null>(null);
 const [cameraError, setCameraError] = useState<string | null>(null);
 const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
 const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
 const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
 const [isCameraInitializing, setIsCameraInitializing] = useState<boolean>(false);
 const [isWebView, setIsWebView] = useState<boolean>(false);
 const [webViewRetryCount, setWebViewRetryCount] = useState(0);
 // Redirect if not admin or teacher
 useEffect(() => {
   if (userRole !== 'admin' && userRole !== 'teacher') {
     router.push('/dashboard');
   }
 }, [userRole, router]);
 // Check if we're in WebView
 useEffect(() => {
   setIsWebView(isAndroidWebView());
 }, []);
 // Check camera permissions and available devices
 useEffect(() => {
   const checkCameraPermission = async () => {
     try {
       setIsCameraInitializing(true);

       // Check if browser supports mediaDevices API
       if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
         setCameraError("Browser doesn't support camera access");
         setCameraPermission(false);
         return;
       }
       // Handle WebView differently
       if (isWebView) {
         const permissionGranted = await requestCameraPermission();
         setCameraPermission(permissionGranted);

         if (!permissionGranted && webViewRetryCount < 3) {
           // For WebView, sometimes we need multiple attempts
           setTimeout(() => {
             setWebViewRetryCount(count => count + 1);
           }, 1000);
           return;
         }

         if (!permissionGranted) {
           setCameraError("Kamera tidak tersedia di WebView. Pastikan aplikasi memiliki izin kamera.");
           return;
         }
       }
       // Request camera permission
       const stream = await navigator.mediaDevices.getUserMedia({
         video: {
           facingMode: 'environment' // Prefer back camera
         }
       });
       setCameraPermission(true);
       // Get available cameras
       const devices = await navigator.mediaDevices.enumerateDevices();
       const videoDevices = devices.filter(device => device.kind === 'videoinput');
       setAvailableCameras(videoDevices);
       // Select the first camera by default, or the back camera if available
       const backCamera = videoDevices.find(device =>
         device.label.toLowerCase().includes('back') ||
         device.label.toLowerCase().includes('rear') ||
         device.label.toLowerCase().includes('belakang')
       );

       if (backCamera) {
         setSelectedCamera(backCamera.deviceId);
       } else if (videoDevices.length > 0) {
         setSelectedCamera(videoDevices[0].deviceId);
       }
       // Stop the stream after permission check
       stream.getTracks().forEach(track => track.stop());
     } catch (err) {
       console.error("Error accessing camera:", err);
       setCameraPermission(false);

       // More specific error messages
       if (err instanceof Error) {
         if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
           setCameraError("Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan perangkat Anda.");
         } else if (err.name === 'NotFoundError') {
           setCameraError("Tidak ada kamera yang ditemukan pada perangkat ini.");
         } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
           setCameraError("Kamera sudah digunakan oleh aplikasi lain atau tidak tersedia.");
         } else if (err.name === 'OverconstrainedError') {
           setCameraError("Kamera yang dipilih tidak didukung perangkat ini.");
         } else {
           setCameraError(`Kesalahan kamera: ${err.message}`);
         }
       } else {
         setCameraError("Terjadi kesalahan yang tidak diketahui saat mengakses kamera");
       }
     } finally {
       setIsCameraInitializing(false);
     }
   };

   if (scanning) {
     checkCameraPermission();
   }
 }, [scanning, webViewRetryCount, isWebView]);
 // Initialize audio
 useEffect(() => {
   audioRef.current = new Audio('/sounds/beep.mp3');
 }, []);
 // Switch camera function
 const switchCamera = async () => {
   if (availableCameras.length <= 1) return;
   const currentIndex = availableCameras.findIndex(camera => camera.deviceId === selectedCamera);
   const nextIndex = (currentIndex + 1) % availableCameras.length;
   setSelectedCamera(availableCameras[nextIndex].deviceId);
   // Reset scanning to reinitialize with new camera
   setScanning(false);
   setTimeout(() => setScanning(true), 100);
 };
 // Update current date and time every second
 useEffect(() => {
   const interval = setInterval(() => {
     setCurrentDateTime(new Date());
   }, 1000);
   return () => clearInterval(interval);
 }, []);

 const formattedDay = format(currentDateTime, "EEEE", {
   locale: id
 });
 const formattedDate = format(currentDateTime, "d MMMM yyyy", {
   locale: id
 });
 const formattedTime = format(currentDateTime, "HH:mm:ss");
 // Toggle sound
 const toggleMute = () => {
   setMuted(!muted);
 };
 // Handle QR code detection
 const handleScan = async (data: string) => {
   if (data && !loading) {
     // Play sound if not muted
     if (audioRef.current && !muted) {
       audioRef.current.play().catch(e => console.error("Error playing sound:", e));
     }
     setScanning(false);
     setDetectedCode(data);
     fetchStudentByNISN(data);
   }
 };

 const fetchStudentByNISN = async (nisn: string) => {
   if (!schoolId) return;
   try {
     setLoading(true);
     // Query students collection for the given NISN
     // Search by NISN
     const studentsRef = collection(db, "schools", schoolId, "students");
     const q = query(studentsRef, where("nisn", "==", nisn), limit(1));
     const snapshot = await getDocs(q);
     if (!snapshot.empty) {
       const studentDoc = snapshot.docs[0];
       setStudent({
         id: studentDoc.id,
         ...studentDoc.data()
       });
     } else {
       setScanError("Siswa tidak ditemukan dalam database");
       setStudent(null);
     }
   } catch (error) {
     console.error("Error fetching student:", error);
     toast.error("Gagal mengambil data siswa");
   } finally {
     setLoading(false);
   }
 };

 const handleAttendance = async () => {
   if (!schoolId || !student) return;
   try {
     setLoading(true);
     // Check if student already has attendance today
     const today = format(currentDateTime, "yyyy-MM-dd");
     const attendanceRef = collection(db, `schools/${schoolId}/attendance`);
     const todayAttendanceQuery = query(attendanceRef, where("studentId", "==", student.id), where("date", "==", today));
     const todayAttendanceSnapshot = await getDocs(todayAttendanceQuery);
     if (!todayAttendanceSnapshot.empty) {
       setScanError(`Siswa ${student.name} sudah melakukan absensi hari ini`);
       setLoading(false);
       return;
     }
     // Prepare attendance data
     const attendanceData = {
       studentId: student.id,
       studentName: student.name,
       nisn: student.nisn,
       class: student.class,
       status: attendanceStatus,
       notes: attendanceStatus !== 'hadir' ? attendanceNotes : '',
       note: attendanceStatus !== 'hadir' ? attendanceNotes : '',
       catatan: attendanceStatus !== 'hadir' ? attendanceNotes : '',
       date: today,
       time: format(currentDateTime, "HH:mm:ss"),
       day: formattedDay,
       timestamp: serverTimestamp(),
       month: format(currentDateTime, "MM-yyyy") // Add month field for easier querying
     };
     // Record attendance in Firestore
     await addDoc(collection(db, `schools/${schoolId}/attendance`), attendanceData);
     // Send Telegram notification
     if (student.telegramNumber) {
       try {
         // Create different messages based on attendance status
         let message = "";
         if (attendanceStatus === 'hadir' || attendanceStatus === 'present') {
           message = `Ananda ${student.name} telah hadir di sekolah pada ${formattedDate} pukul ${format(currentDateTime, "HH:mm")} WIB.`;
         } else if (attendanceStatus === 'sakit' || attendanceStatus === 'sick') {
           message = `Ananda ${student.name} tidak hadir di sekolah pada ${formattedDate} dengan status SAKIT.${attendanceNotes ? `\n\nKeterangan: ${attendanceNotes}` : ''}`;
         } else if (attendanceStatus === 'izin' || attendanceStatus === 'permitted') {
           message = `Ananda ${student.name} tidak hadir di sekolah pada ${formattedDate} dengan status IZIN.${attendanceNotes ? `\n\nKeterangan: ${attendanceNotes}` : ''}`;
         } else if (attendanceStatus === 'alpha' || attendanceStatus === 'absent') {
           message = `Ananda ${student.name} tidak hadir di sekolah pada ${formattedDate} dengan status ALPHA (tanpa keterangan).${attendanceNotes ? `\n\nKeterangan: ${attendanceNotes}` : ''}`;
         }
         // Send notification using the Telegram API
         const BOT_TOKEN = "7662377324:AAEFhwY-y1q3IrX4OEJAUG8VLa8DqNndH6E";
         await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json'
           },
           body: JSON.stringify({
             chat_id: student.telegramNumber,
             text: message
           })
         });
         console.log("Telegram notification sent successfully");
       } catch (telegramError) {
         console.error("Error sending Telegram notification:", telegramError);
       }
     }
     setSubmitted(true);
     toast.success("Absensi berhasil disimpan dan notifikasi dikirim");
   } catch (error) {
     console.error("Error recording attendance:", error);
     toast.error("Gagal menyimpan data absensi");
   } finally {
     setLoading(false);
   }
 };

 const resetScan = () => {
   setDetectedCode(null);
   setStudent(null);
   setSubmitted(false);
   setScanError(null);
   setScanning(true);
   setAttendanceStatus('hadir');
   setAttendanceNotes('');
   setCameraError(null);
 };
 // Start camera with retry capability
 const startCamera = () => {
   setIsCameraInitializing(true);
   setScanning(true);
   setTimeout(() => {
     setIsCameraInitializing(false);
   }, 2000); // Give camera time to initialize
 };
 // Retry camera access specifically for WebView
 const retryWebViewCamera = async () => {
   setCameraError(null);
   setIsCameraInitializing(true);

   try {
     // Force permissions dialog in WebView
     const permissionResult = await requestCameraPermission();
     if (permissionResult) {
       setCameraPermission(true);
       setScanning(true);
     } else {
       setCameraError("Izin kamera masih ditolak. Cek pengaturan aplikasi di perangkat Anda.");
     }
   } catch (err) {
     console.error("WebView camera retry failed:", err);
     setCameraError("Gagal mengakses kamera dalam WebView. Coba tutup aplikasi dan buka kembali.");
   } finally {
     setIsCameraInitializing(false);
   }
 };

 return <div className="max-w-2xl mx-auto pb-20 md:pb-6 px-3 sm:px-4 md:px-6">
     <div className="flex justify-between items-center mb-6">
       <div className="flex items-center">
         <QrCode className="h-7 w-7 text-primary mr-3" />
         <h1 className="text-2xl font-bold text-gray-800"><span className="editable-text">Scan QR Code Siswa</span></h1>
       </div>

       <button onClick={toggleMute} className="p-2 rounded-full hover:bg-gray-100">
         {muted ? <VolumeX className="h-5 w-5 text-gray-500" /> : <Volume2 className="h-5 w-5 text-primary" />}
       </button>
     </div>

     {/* Date and Time Display */}
     <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-3 sm:mb-5 flex flex-col space-y-2 md:space-y-0 md:flex-row md:justify-between md:items-center">
       <div className="flex items-center mb-3 md:mb-0">
         <CalendarIcon className="h-5 w-5 text-primary mr-2" />
         <span className="font-medium">{formattedDay}<span className="editable-text">, </span>{formattedDate}</span>
       </div>
       <div className="flex items-center">
         <Clock className="h-5 w-5 text-primary mr-2" />
         <span className="font-medium">{formattedTime}</span>
       </div>
     </div>

     <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
       {cameraPermission === false && <div className="p-6 text-center">
           <motion.div
             className="flex flex-col items-center p-8"
             initial={{ scale: 0.8, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             transition={{ duration: 0.3 }}
           >
             <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
               <AlertCircle className="h-10 w-10 text-red-600" />
             </div>

             <h3 className="text-xl font-bold text-red-600 mb-4"><span className="editable-text">Akses Kamera Ditolak</span></h3>
             <p className="text-gray-700 text-center mb-4">{cameraError || "Izin kamera ditolak. Silakan berikan akses ke kamera agar dapat melakukan scan."}</p>

             <div className="space-y-4 w-full">
               <p className="text-sm text-gray-500">
                 <span className="editable-text">Untuk mengaktifkan kamera di perangkat Android:</span>
               </p>
               <ol className="text-sm text-left list-decimal pl-5 space-y-2">
                 <li><span className="editable-text">Buka Pengaturan perangkat</span></li>
                 <li><span className="editable-text">Pilih Aplikasi atau Pengelola Aplikasi</span></li>
                 <li><span className="editable-text">Cari dan pilih aplikasi ini</span></li>
                 <li><span className="editable-text">Pilih Izin atau Permissions</span></li>
                 <li><span className="editable-text">Aktifkan izin Kamera</span></li>
               </ol>
             </div>
           </motion.div>

           <div className="flex gap-3 justify-center">
             <button
               onClick={() => {
                 setCameraPermission(null);
                 setCameraError(null);
                 startCamera();
               }}
               className="bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-colors mt-4"
             >
               <RefreshCw size={16} className="inline-block mr-2" />
               <span className="editable-text">Coba Lagi</span>
             </button>

             {isWebView && (
               <button
                 onClick={retryWebViewCamera}
                 className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors mt-4"
               >
                 <Zap size={16} className="inline-block mr-2" />
                 <span className="editable-text">Reset Kamera WebView</span>
               </button>
             )}
           </div>
         </div>}

         {detectedCode && student ? <div className="p-6">
           {loading ? <div className="flex justify-center items-center py-10">
               <Loader2 className="h-8 w-8 text-primary animate-spin" />
             </div> : submitted ? <motion.div
               className="text-center py-8"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.5 }}
             >
               <motion.div
                 className={`rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 ${
                   attendanceStatus === 'hadir' ? 'bg-green-100' :
                   attendanceStatus === 'sakit' ? 'bg-orange-100' :
                   attendanceStatus === 'izin' ? 'bg-blue-100' : 'bg-red-100'
                 }`}
                 initial={{ scale: 0.5 }}
                 animate={{ scale: 1 }}
                 transition={{ type: "spring", stiffness: 300, damping: 15 }}
               >
                 {attendanceStatus === 'hadir' ?
                   <UserCheck className="h-10 w-10 text-green-600" /> :
                   attendanceStatus === 'sakit' ?
                   <UserCheck className="h-10 w-10 text-orange-600" /> :
                   attendanceStatus === 'izin' ?
                   <UserCheck className="h-10 w-10 text-blue-600" /> :
                   <UserCheck className="h-10 w-10 text-red-600" />
                 }
               </motion.div>
               <h2 className="text-xl font-semibold text-gray-800 mb-2"><span className="editable-text">Absensi Berhasil</span></h2>
               <p className="text-gray-600 mb-6">
                 <span className="editable-text">Absensi untuk </span>
                 <span className="font-semibold">{student?.name}</span>
                 <span className="editable-text"> telah berhasil dicatat.</span>
               </p>
               <p className="text-sm text-gray-500 mb-6">
                 <span className="editable-text">Status: </span>
                 <span className={`font-medium ${
                   attendanceStatus === 'hadir' ? 'text-emerald-600' :
                   attendanceStatus === 'sakit' ? 'text-orange-600' :
                   attendanceStatus === 'izin' ? 'text-blue-600' : 'text-red-600'
                 }`}>
                   {attendanceStatus === 'hadir' ? 'Hadir' :
                    attendanceStatus === 'sakit' ? 'Sakit' :
                    attendanceStatus === 'izin' ? 'Izin' : 'Alpha'}
                 </span>
               </p>
               <button
                 onClick={resetScan}
                 className="bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary hover:bg-opacity-90 transition-colors"
               >
                 <span className="editable-text">Scan Siswa Lain</span>
               </button>
             </motion.div> : <div>
               <div className="flex items-center mb-6">
                 <div className="bg-blue-100 rounded-full p-3">
                   <QrCode className="h-6 w-6 text-blue-600" />
                 </div>
                 <div className="ml-4">
                   <h2 className="font-semibold text-lg"><span className="editable-text">QR Code Terdeteksi</span></h2>
                   <p className="text-sm text-gray-500"><span className="editable-text">NISN: </span>{detectedCode}</p>
                 </div>
               </div>

               {/* Student Information */}
               <div className="bg-blue-50 rounded-lg p-5 mb-6 border border-blue-100">
                 <h3 className="font-semibold text-lg mb-2 text-blue-800">{student.name}</h3>
                 <div className="grid grid-cols-2 gap-4 text-sm">
                   <div className="bg-white p-3 rounded-md border border-blue-100">
                     <p className="text-gray-500 text-xs"><span className="editable-text">Kelas</span></p>
                     <p className="font-medium text-gray-700">{student.class}</p>
                   </div>
                   <div className="bg-white p-3 rounded-md border border-blue-100">
                     <p className="text-gray-500 text-xs"><span className="editable-text">Jenis Kelamin</span></p>
                     <p className="font-medium text-gray-700">{student.gender === "male" ? "Laki-laki" : "Perempuan"}</p>
                   </div>
                 </div>
               </div>

               {/* Attendance Form */}
               <div className="mb-6">
                 <div className="bg-white p-4 rounded-lg border border-gray-200">
                   <div className="mb-4">
                     <p className="text-sm font-medium text-gray-700 mb-1"><span className="editable-text">Tanggal & Waktu</span></p>
                     <p className="text-base font-semibold">{formattedDay}<span className="editable-text">, </span>{formattedDate}<span className="editable-text"> - </span>{formattedTime}</p>
                   </div>

                   <div className="mb-4">
                     <label className="block text-sm font-medium text-gray-700 mb-2"><span className="editable-text">Status Kehadiran</span></label>
                     <div className="grid grid-cols-4 gap-2">
                       {['hadir', 'sakit', 'izin', 'alpha'].map(status => <button
                         key={status}
                         type="button"
                         onClick={() => setAttendanceStatus(status)}
                         className={`py-2 px-3 rounded-lg border ${
                           attendanceStatus === status ?
                           status === 'hadir' ? 'bg-green-100 border-green-500 text-green-800' :
                           status === 'sakit' ? 'bg-orange-100 border-orange-500 text-orange-800' :
                           status === 'izin' ? 'bg-blue-100 border-blue-500 text-blue-800' :
                           'bg-red-100 border-red-500 text-red-800'
                           : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                         } transition-colors text-sm font-medium`}
                       >
                         {status === 'hadir' ? 'Hadir' :
                          status === 'sakit' ? 'Sakit' :
                          status === 'izin' ? 'Izin' : 'Alpha'}
                       </button>)}
                     </div>
                   </div>

                   {attendanceStatus !== 'hadir' && <div className="mb-4">
                       <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1"><span className="editable-text">
                         Keterangan
                       </span></label>
                       <textarea
                         id="notes"
                         rows={3}
                         value={attendanceNotes}
                         onChange={e => setAttendanceNotes(e.target.value)}
                         className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                         placeholder="Masukkan keterangan..."
                       />
                     </div>}
                 </div>
               </div>

               <div className="flex justify-between">
                 <button
                   type="button"
                   onClick={resetScan}
                   className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50"
                 >
                   <span className="editable-text">Batal</span>
                 </button>
                 <button
                   type="button"
                   onClick={handleAttendance}
                   disabled={loading || !attendanceStatus}
                   className={`flex items-center gap-2 text-white px-5 py-2.5 rounded-lg transition-colors ${
                     loading || !attendanceStatus ? "bg-gray-400 cursor-not-allowed" : "bg-primary hover:bg-primary/90"
                   }`}
                 >
                   {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <UserCheck className="h-5 w-5 mr-2" />}
                   <span className="editable-text">Simpan Absensi</span>
                 </button>
               </div>
             </div>}
         </div> : scanError ? <div className="p-6 text-center">
           <motion.div
             className="flex flex-col items-center p-8"
             initial={{ scale: 0.8, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             transition={{ duration: 0.3 }}
           >
             <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
               <AlertCircle className="h-10 w-10 text-red-600" />
             </div>

             <h3 className="text-xl font-bold text-red-600 mb-4"><span className="editable-text">Error</span></h3>
             <p className="text-gray-700 text-center mb-4">{scanError}</p>
           </motion.div>

           <button
             onClick={resetScan}
             className="bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-colors mt-4"
           >
             <span className="editable-text">Scan Ulang</span>
           </button>
         </div> : <div>
           <div className="relative">
             {/* Scanner viewport using QrScanner component */}
             <div className="aspect-video bg-black w-full">
               {scanning ? <QrScanner
                 onScan={detectedCodes => {
                   if (detectedCodes && detectedCodes.length > 0) {
                     handleScan(detectedCodes[0].rawValue);
                   }
                 }}
                 onError={error => {
                   console.error(error instanceof Error ? error.message : "Unknown error");
                   const errorMessage = error instanceof Error ? error.message : "Unknown error";
                   // Handle common WebView camera access errors
                   if (errorMessage.includes("NotAllowedError") || errorMessage.includes("PermissionDeniedError")) {
                     setCameraError("Izin kamera ditolak. Silakan berikan akses ke kamera.");
                     setCameraPermission(false);
                   } else if (errorMessage.includes("NotFoundError") || errorMessage.includes("OverconstrainedError")) {
                     setCameraError("Kamera tidak ditemukan atau tidak tersedia.");
                     setCameraPermission(false);
                   } else if (errorMessage.includes("NotReadableError")) {
                     setCameraError("Kamera sedang digunakan oleh aplikasi lain.");
                     setCameraPermission(false);
                   }
                 }}
                 constraints={{
                   ...(selectedCamera ? {
                     deviceId: {
                       exact: selectedCamera
                     }
                   } : {
                     facingMode: "environment"
                   }),
                   width: { ideal: 1280 },
                   height: { ideal: 720 },
                 }}
                 scanDelay={500}
                 classNames={{
                   container: "rounded-lg",
                   video: "rounded-lg object-cover"
                 }}
                 /> : <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                 {isCameraInitializing ? <Loader2 className="h-20 w-20 text-gray-400 animate-spin" /> : <Camera className="h-20 w-20 text-gray-400" />}
               </div>}

             {/* Camera selector for devices with multiple cameras */}
             {availableCameras.length > 1 && scanning && <div className="absolute bottom-4 right-4">
                 <button
                   onClick={switchCamera}
                   className="bg-black/50 backdrop-blur-sm text-white p-3 rounded-full"
                   title="Switch Camera"
                 >
                   <RefreshCw size={24} />
                 </button>
               </div>}

               {scanning && <>
                   {/* Scanning overlay with animation */}
                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <motion.div
                       className="border-2 border-white rounded-lg w-48 h-48 shadow-lg"
                       initial={{ borderColor: "rgba(255,255,255,0.3)" }}
                       animate={{
                         borderColor: ["rgba(255,255,255,0.3)", "rgba(255,255,255,0.9)", "rgba(255,255,255,0.3)"]
                       }}
                       transition={{ duration: 2, repeat: Infinity }}
                     >
                       <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500"></div>
                       <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-500"></div>
                       <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-500"></div>
                       <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-500"></div>
                     </motion.div>
                   </div>

                   {/* Scanning animation line */}
                   <motion.div
                     className="absolute left-0 right-0 h-0.5 bg-blue-500"
                     initial={{ top: "20%", opacity: 0.7 }}
                     animate={{ top: "80%", opacity: 1 }}
                     transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
                   />
                 </>}
             </div>
           </div>

           <div className="p-6 text-center">
             {scanError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                 <AlertCircle className="h-5 w-5 inline-block mr-2" />
                 {scanError}
               </div>}

             {!scanning ? <>
                 <h2 className="text-lg font-semibold text-gray-800 mb-2"><span className="editable-text">Siap untuk Scan</span></h2>
                 <p className="text-gray-500 mb-6 text-sm"><span className="editable-text">
                   Tekan Tombol Di Bawah Untuk Mengaktifkan Kamera
                 </span></p>
                 <motion.button
                   onClick={startCamera}
                   className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-500 transition-colors"
                   whileTap={{ scale: 0.95 }}
                 >
                   <QrCode className="h-5 w-5 inline-block mr-2" />
                   <span className="editable-text">Mulai Scan QR Code</span>
                 </motion.button>
               </> : <>
                 <h2 className="text-lg font-semibold text-gray-800 mb-2"><span className="editable-text">Scanning...</span></h2>
                 <p className="text-gray-500 mb-4"><span className="editable-text">
                   Arahkan Kamera ke QR Code
                 </span></p>
                 <motion.div
                   className="inline-block"
                   initial={{ scale: 0.5, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                 >
                   <button
                     onClick={() => setScanning(false)}
                     className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
                   >
                     <span className="editable-text">Batalkan Scan</span>
                   </button>
                 </motion.div>
               </>}

               {isWebView && !cameraPermission && !scanning && (
                 <div className="mt-4">
                   <button
                     onClick={retryWebViewCamera}
                     className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
                   >
                     <Zap size={18} className="inline-block mr-2" />
                     <span className="editable-text">Aktifkan Kamera WebView</span>
                   </button>
                   <p className="text-xs text-gray-500 mt-2">
                     <span className="editable-text">
                       Gunakan ini jika kamera tidak muncul pada WebView Android
                     </span>
                   </p>
                 </div>
               )}
           </div>
         </div>}
     </div>
   </div>;
}
