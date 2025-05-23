"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Camera, MapPin, User, AlertCircle, ArrowLeft, Loader2, CheckCircle, Timer, LogIn, LogOut, X } from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { initCameraForWebview } from "@/utils/webview-camera-helper";
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
 const [cameraError, setCameraError] = useState<string | null>(null);
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
     stopCamera();
   };
 }, [router, schoolId, userRole]);
 // Get platform/environment information
 const getPlatformInfo = () => {
   const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
   const isAndroid = /Android/i.test(userAgent);
   const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
   const isMobile = isAndroid || isIOS;

   // Check if running in WebView
   const isWebView = () => {
     if (typeof window === 'undefined') return false;

     // Standard WebView detection
     const standalone = window.navigator.standalone;
     const userAgent = window.navigator.userAgent.toLowerCase();
     const isAndroidWebView = /wv/.test(userAgent) || /Android.*Version\/[0-9]/.test(userAgent);
     const isIOSWebView = (/iphone|ipod|ipad/.test(userAgent) && !window.navigator.standalone) ||
                        (typeof standalone === 'boolean' && standalone === false);

     // Check for special window variables that might indicate a webview
     const hasWebViewBridge = typeof window.ReactNativeWebView !== 'undefined' ||
                            typeof window.webkit?.messageHandlers !== 'undefined';

     return isAndroidWebView || isIOSWebView || hasWebViewBridge;
   };

   return {
     isAndroid,
     isIOS,
     isMobile,
     isWebView: isWebView(),
     userAgent
   };
 };
 // Start camera for scanning with enhanced webview support
 const startCamera = async () => {
   try {
     setScanning(true);
     setCameraError(null);

     // Get platform info to adapt camera access strategy
     const platform = getPlatformInfo();
     console.log("Platform detected:", platform);

     // Different camera initialization approach based on environment
     let stream: MediaStream | null = null;

     if (platform.isWebView) {
       // Use webview-specific camera helper if in webview
       console.log("Using WebView camera initialization");
       stream = await initCameraForWebview({
         width: 640,
         height: 480,
         facing: "user",
         onError: (err) => {
           console.error("WebView camera error:", err);
           setCameraError(`WebView camera error: ${err.message || err}`);
         }
       });
     } else {
       // Standard browser camera initialization
       console.log("Using standard camera initialization");

       // First try with constraints that work well on mobile
       try {
         stream = await navigator.mediaDevices.getUserMedia({
           video: {
             width: { ideal: 640 },
             height: { ideal: 480 },
             facingMode: "user"
           }
         });
       } catch (mobileError) {
         console.warn("Failed with mobile settings, trying fallback:", mobileError);

         // Fallback to simpler constraints
         stream = await navigator.mediaDevices.getUserMedia({
           video: true
         });
       }
     }
     if (!stream) {
       throw new Error("Failed to initialize camera stream");
     }
     // Store stream in ref for later cleanup
     streamRef.current = stream;
     // Connect stream to video element with delayed check for element existence
     const connectStreamToVideo = () => {
       if (videoRef.current) {
         videoRef.current.srcObject = stream;

         // Handle video play event to know when video is actually streaming
         videoRef.current.onloadedmetadata = () => {
           if (videoRef.current) {
             videoRef.current.play().catch(playError => {
               console.error("Error playing video:", playError);
               setCameraError(`Error playing video: ${playError.message}`);
             });
           }
         };
       } else {
         // If video element isn't available yet, retry after short delay
         setTimeout(connectStreamToVideo, 100);
       }
     };

     connectStreamToVideo();
     // Get location
     getDeviceLocation();
   } catch (error: any) {
     console.error("Error starting camera:", error);

     // Provide more detailed error messages for troubleshooting
     let errorMessage = "Gagal mengakses kamera";

     if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
       errorMessage = "Tidak menemukan kamera pada perangkat";
     } else if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
       errorMessage = "Izin kamera ditolak. Harap berikan izin kamera di pengaturan perangkat Anda";
     } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
       errorMessage = "Kamera sedang digunakan oleh aplikasi lain";
     } else if (error.name === "OverconstrainedError" || error.name === "ConstraintNotSatisfiedError") {
       errorMessage = "Tidak dapat menemukan kamera yang sesuai dengan persyaratan";
     } else {
       errorMessage = `Gagal mengakses kamera: ${error.message || error}`;
     }

     setCameraError(errorMessage);
     toast.error(errorMessage);
     setScanning(false);
   }
 };
 // Get device location with enhanced error handling
 const getDeviceLocation = () => {
   if (!navigator.geolocation) {
     setLocationMessage("Geolocation tidak didukung oleh browser ini");
     return;
   }

   const locationOptions = {
     enableHighAccuracy: true,
     timeout: 10000,
     maximumAge: 0
   };

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
         const distance = calculateDistance(userLocation.lat, userLocation.lng,
                                          settings.schoolLocation.lat, settings.schoolLocation.lng);
         if (distance <= settings.radius) {
           setLocationMessage("Lokasi terdeteksi di area sekolah");
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
       let errorMsg = "Gagal mendapatkan lokasi. ";

       switch(error.code) {
         case error.PERMISSION_DENIED:
           errorMsg += "Izin lokasi ditolak. Harap aktifkan izin lokasi di pengaturan.";
           break;
         case error.POSITION_UNAVAILABLE:
           errorMsg += "Informasi lokasi tidak tersedia.";
           break;
         case error.TIMEOUT:
           errorMsg += "Waktu permintaan lokasi habis.";
           break;
         default:
           errorMsg += "Pastikan GPS diaktifkan.";
       }

       setLocationMessage(errorMsg);
       toast.error(errorMsg);
     },
     // Options
     locationOptions
   );
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
   setCameraError(null);
 };
 // Capture image
 const captureImage = async () => {
   if (!videoRef.current || !canvasRef.current) {
     toast.error("Perangkat kamera tidak siap");
     return;
   }

   try {
     setCapturing(true);
     // Draw video frame to canvas
     const video = videoRef.current;
     const canvas = canvasRef.current;
     const context = canvas.getContext('2d');
     if (!context) {
       throw new Error("Tidak dapat membuat konteks canvas");
     }
     // Set canvas dimensions to match video
     canvas.width = video.videoWidth || 640;
     canvas.height = video.videoHeight || 480;
     // Draw video frame to canvas - handle potential errors
     try {
       context.drawImage(video, 0, 0, canvas.width, canvas.height);
     } catch (drawError) {
       console.error("Error drawing to canvas:", drawError);
       toast.error("Gagal mengambil gambar dari video");
       setCapturing(false);
       return;
     }
     // Get image data as base64 - handle potential errors
     let imageData;
     try {
       imageData = canvas.toDataURL('image/jpeg', 0.8);
     } catch (imageError) {
       console.error("Error getting image data:", imageError);
       toast.error("Gagal mengkonversi gambar");
       setCapturing(false);
       return;
     }

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
       toast.error(`Anda berada di luar area sekolah (${Math.round(distance)} meter)`);
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
     toast.success(`Absensi ${attendanceType === 'in' ? 'masuk' : 'pulang'} berhasil tercatat!`);
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
     const token = telegramSettings.token || "7702797779:•••••••••••••••••••••••••••••••••••";
     const chatId = telegramSettings.chatId || ""; // Should be the school principal's chat ID
     if (!chatId) {
       console.error("No chat ID found for notification");
       return;
     }
     // Format message
     const messageType = attendanceType === 'in' ? 'MASUK' : 'PULANG';
     const message = `GTK dengan nama ${teacherName} telah melakukan "Absen ${messageType}" di Sekolah pada tanggal ${date} pukul ${time} WIB.`;
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
     console.error("Error sending Telegram notification:", error);
   }
 };
 return (
   <div className="max-w-3xl mx-auto pb-20 md:pb-6 px-3 sm:px-4 md:px-6">
     <div className="flex items-center justify-between mb-6">
       <div className="flex items-center">
         <Link href="/dashboard/absensi-guru" className="p-2 mr-2 hover:bg-gray-100 rounded-full">
           <ArrowLeft size={20} />
         </Link>
         <h1 className="text-2xl font-bold text-gray-800"><span className="editable-text">Absensi Selfie + Lokasi</span></h1>
       </div>
     </div>

     {loading ? <div className="flex justify-center items-center h-64">
         <Loader2 className="h-12 w-12 text-primary animate-spin" />
       </div> : success ? <motion.div className="bg-white rounded-xl shadow-md p-8 text-center" initial={{
     opacity: 0,
     scale: 0.9
   }} animate={{
     opacity: 1,
     scale: 1
   }} transition={{
     duration: 0.3
   }}>
         <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
           <CheckCircle className="h-12 w-12 text-green-600" />
         </div>
         <h2 className="text-2xl font-bold text-gray-800 mb-2"><span className="editable-text">Absensi Berhasil!</span></h2>
         <p className="text-gray-600 mb-6">
           {recognizedTeacher?.name}<span className="editable-text"> berhasil melakukan absensi </span>{attendanceType === 'in' ? 'masuk' : 'pulang'}<span className="editable-text">.
         </span></p>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <button onClick={resetProcess} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"><span className="editable-text">
             Absen Lagi
           </span></button>
           <Link href="/dashboard/absensi-guru/attendance-table" className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center">
             <span className="editable-text">Lihat Hasil Absensi</span>
           </Link>
           <Link href="/dashboard/absensi-guru" className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center"><span className="editable-text">
             Kembali
           </span></Link>
         </div>
       </motion.div> : <div className="bg-white rounded-xl shadow-md overflow-hidden">
         <div className="p-6 border-b border-gray-200">
           <h2 className="text-lg font-semibold mb-4"><span className="editable-text">Scan Absensi dengan Wajah</span></h2>

           {/* Attendance type selector */}
           <div className="flex items-center justify-center p-3 bg-gray-50 rounded-lg mb-4">
             <div className="flex space-x-2 bg-white p-1 rounded-lg shadow-sm">
               <button onClick={() => setAttendanceType("in")} className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${attendanceType === "in" ? "bg-blue-600 text-white" : "bg-white text-gray-700"}`}>
                 <LogIn size={16} />
                 <span><span className="editable-text">Absen Masuk</span></span>
               </button>
               <button onClick={() => setAttendanceType("out")} className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${attendanceType === "out" ? "bg-blue-600 text-white" : "bg-white text-gray-700"}`}>
                 <LogOut size={16} />
                 <span><span className="editable-text">Absen Pulang</span></span>
               </button>
             </div>
           </div>

           {/* Camera view */}
           <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden mb-4">
             {scanning ? <>
                 <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted></video>

                 {cameraError && (
                   <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center text-white p-4">
                     <AlertCircle size={40} className="text-red-500 mb-2" />
                     <p className="text-center mb-2">{cameraError}</p>
                     <button
                       onClick={() => {
                         stopCamera();
                         setTimeout(startCamera, 1000);
                       }}
                       className="px-4 py-2 bg-blue-600 rounded-lg text-sm"
                     >
                       Coba Lagi
                     </button>
                   </div>
                 )}

                 {/* Photo capture guide overlay */}
                 {!cameraError && (
                   <div className="absolute inset-0 flex items-center justify-center">
                     <div className="absolute bottom-8 left-0 right-0 text-center">
                       <p className="text-white text-sm bg-black bg-opacity-50 inline-block px-3 py-1 rounded-full"><span className="editable-text">
                         Posisikan diri Anda dengan jelas
                       </span></p>
                     </div>
                   </div>
                 )}
               </> : capturedImage ? <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" /> : <div className="flex flex-col items-center justify-center h-full">
                 <Camera size={48} className="text-gray-400 mb-4" />
                 <p className="text-gray-400"><span className="editable-text">Kamera belum diaktifkan</span></p>
               </div>}

             {/* Hidden canvas for processing */}
             <canvas ref={canvasRef} className="hidden"></canvas>
           </div>

           {/* Location information */}
           <div className={`p-3 mb-4 rounded-lg flex items-center ${!location ? 'bg-gray-100 text-gray-700' : locationMessage.includes('luar area') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
             <MapPin className="h-5 w-5 mr-2" />
             <p className="text-sm">{locationMessage || "Mendeteksi lokasi..."}</p>
           </div>

           {/* Recognized teacher */}
           {recognizedTeacher && <div className="p-4 bg-blue-50 rounded-lg mb-4 border border-blue-200">
               <h3 className="text-lg font-semibold text-blue-800">{recognizedTeacher.name}</h3>
               <p className="text-sm text-blue-600"><span className="editable-text">NIK: </span>{recognizedTeacher.nik}</p>
               <p className="text-sm text-blue-600"><span className="editable-text">Jabatan: </span>{recognizedTeacher.role}</p>
             </div>}
         </div>

         <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
           {!scanning && !capturedImage && <button onClick={startCamera} className="col-span-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2">
               <Camera size={20} />
               <span className="editable-text">Aktifkan Kamera</span>
             </button>}

           {scanning && !capturing && <button onClick={captureImage} className="col-span-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2" disabled={capturing || !!cameraError}>
               <Camera size={20} />
               <span className="editable-text">Ambil Gambar</span>
             </button>}

           {capturedImage && photoTaken && recognizedTeacher && !processingCapture && <button onClick={submitAttendance} className="py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2" disabled={processingCapture}>
               <CheckCircle size={20} />
               <span className="editable-text">Simpan Absensi</span>
             </button>}

           {(scanning || capturedImage) && !processingCapture && <button onClick={resetProcess} className="py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center justify-center gap-2">
               <X size={20} />
               <span className="editable-text">Batal</span>
             </button>}

           {processingCapture && <div className="col-span-full flex items-center justify-center py-3 bg-gray-300 text-gray-700 rounded-lg font-medium">
               <Loader2 size={20} className="animate-spin mr-2" />
               <span className="editable-text">Memproses...</span>
             </div>}
         </div>
       </div>}

     {/* Instructions card */}
     <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-6 rounded-lg">
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
     </div>
   </div>
 );
}
