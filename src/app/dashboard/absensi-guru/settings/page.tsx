"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Settings, MapPin, Clock, MessageSquare, Save, Loader2, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
interface LocationSettings {
  latitude: number;
  longitude: number;
  radius: number;
}
interface AttendanceTimeSettings {
  checkInStart: string;
  checkInEnd: string;
  checkOutStart: string;
  checkOutEnd: string;
}
interface TelegramSettings {
  token: string;
  chatId: string;
  botUsername: string;
}
export default function TeacherAttendanceSettings() {
  const {
    user,
    userRole,
    schoolId
  } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Settings state
  const [locationSettings, setLocationSettings] = useState<LocationSettings>({
    latitude: 0,
    longitude: 0,
    radius: 100
  });
  const [attendanceTimeSettings, setAttendanceTimeSettings] = useState<AttendanceTimeSettings>({
   checkInStart: "06:00",
    checkInEnd: "08:00",
    checkOutStart: "15:00",
    checkOutEnd: "17:00"
  });
  const [telegramSettings, setTelegramSettings] = useState<TelegramSettings>({
    token: "7702797779:AAELhARB3HkvB9hh5e5D64DCC4faDfcW9IM",
    chatId: "",
    botUsername: "AbsenModernBot"
  });
  const [activeTab, setActiveTab] = useState<'location' | 'time' | 'telegram'>('location');

  // Load settings
  useEffect(() => {
    // Check authorization
    if (userRole !== 'admin') {
      toast.error("Anda tidak memiliki akses ke halaman ini");
      router.push('/dashboard');
      return;
    }
    const loadSettings = async () => {
      if (!schoolId) return;
      try {
        setLoading(true);
        const {
          doc,
          getDoc
        } = await import('firebase/firestore');
        const {
          db
        } = await import('@/lib/firebase');

        // Load location settings
        const locationDoc = await getDoc(doc(db, "settings", "location"));
        if (locationDoc.exists()) {
          const data = locationDoc.data();
          setLocationSettings({
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
            radius: data.radius || 100
          });
        }

        // Load attendance time settings
        const timeDoc = await getDoc(doc(db, "settings", "attendanceTime"));
        if (timeDoc.exists()) {
          const data = timeDoc.data();
          setAttendanceTimeSettings({
            checkInStart: data.checkInStart || "06:00",
            checkInEnd: data.checkInEnd || "08:00",
            checkOutStart: data.checkOutStart || "15:00",
            checkOutEnd: data.checkOutEnd || "17:00"
          });
        }

        // Load telegram settings
        const telegramDoc = await getDoc(doc(db, "settings", "telegram"));
        if (telegramDoc.exists()) {
          const data = telegramDoc.data();
          setTelegramSettings({
            token: data.token || "7702797779:AAELhARB3HkvB9hh5e5D64DCC4faDfcW9IM",
            chatId: data.chatId || "",
            botUsername: data.botUsername || "AbsenModernBot"
          });
        }
      } catch (error) {
        console.error("Error loading settings:", error);
        toast.error("Gagal memuat pengaturan");
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [schoolId, userRole, router]);

  // Handle location settings change
  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {
      name,
      value
    } = e.target;
    setLocationSettings(prev => ({
      ...prev,
      [name]: name === 'radius' ? parseInt(value) : parseFloat(value)
    }));
  };

  // Handle time settings change
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {
      name,
      value
    } = e.target;
    setAttendanceTimeSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle telegram settings change
  const handleTelegramChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {
      name,
      value
    } = e.target;
    setTelegramSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        setLocationSettings(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
        toast.success("Lokasi saat ini berhasil didapatkan");
      }, error => {
        console.error("Error getting location:", error);
        toast.error("Gagal mendapatkan lokasi. Pastikan GPS diaktifkan.");
      });
    } else {
      toast.error("Geolocation tidak didukung oleh browser ini");
    }
  };

  // Test telegram bot
  const testTelegramBot = async () => {
    try {
      if (!telegramSettings.chatId) {
        toast.error("ID Chat Telegram tidak boleh kosong");
        return;
      }
      const response = await fetch(`https://api.telegram.org/bot${telegramSettings.token}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: telegramSettings.chatId,
          text: "🔔 Ini adalah pesan uji coba dari Aplikasi Absensi Guru. Jika Anda menerima pesan ini, berarti konfigurasi bot telegram berhasil."
        })
      });
      const data = await response.json();
      if (data.ok) {
        toast.success("Test berhasil! Pesan terkirim ke Telegram.");
      } else {
        toast.error(`Gagal mengirim pesan: ${data.description}`);
      }
    } catch (error) {
      console.error("Error testing Telegram bot:", error);
      toast.error("Gagal menghubungi API Telegram");
    }
  };

  // Save all settings
  const saveSettings = async () => {
    if (!schoolId) {
      toast.error("ID sekolah tidak ditemukan");
      return;
    }
    try {
      setSaving(true);
      const {
        doc,
        setDoc,
        serverTimestamp
      } = await import('firebase/firestore');
      const {
        db
      } = await import('@/lib/firebase');

      // Save location settings
      await setDoc(doc(db, "settings", "location"), {
        ...locationSettings,
        schoolId,
        updatedAt: serverTimestamp()
      });

      // Save time settings
      await setDoc(doc(db, "settings", "attendanceTime"), {
        ...attendanceTimeSettings,
        schoolId,
        updatedAt: serverTimestamp()
      });

      // Save telegram settings
      await setDoc(doc(db, "settings", "telegram"), {
        ...telegramSettings,
        schoolId,
        updatedAt: serverTimestamp()
      });
      setSaveSuccess(true);
      toast.success("Pengaturan berhasil disimpan");
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Gagal menyimpan pengaturan");
    } finally {
      setSaving(false);
    }
  };
  return <div className="pb-20 md:pb-6" data-unique-id="a862182a-922f-4562-9b4a-a04087849abb" data-file-name="app/dashboard/absensi-guru/settings/page.tsx" data-dynamic-text="true">
      <div className="flex items-center justify-between mb-6" data-unique-id="716cb1be-2c91-4c9b-8d6a-5079d4c76301" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
        <div className="flex items-center" data-unique-id="9f1cca0d-a417-4564-8f75-754cddfaf11b" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
          <Link href="/dashboard/absensi-guru" className="p-2 mr-2 hover:bg-gray-100 rounded-full" data-unique-id="ef725917-ff17-43f2-b8ec-206d9019b8e7" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-800" data-unique-id="7c284638-2c53-4b7a-b2be-175f63875e0c" data-file-name="app/dashboard/absensi-guru/settings/page.tsx"><span className="editable-text" data-unique-id="065eb292-0ae6-4f9a-84e4-b929ae663558" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">Pengaturan Absensi Guru</span></h1>
        </div>
      </div>
      
      {loading ? <div className="flex justify-center items-center h-64" data-unique-id="06f2b7d3-204f-431d-a75f-e404df4894f2" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
        </div> : <div className="bg-white rounded-xl shadow-sm overflow-hidden" data-unique-id="bd03df40-1671-4f88-b37c-31e71c166a6a" data-file-name="app/dashboard/absensi-guru/settings/page.tsx" data-dynamic-text="true">
          {/* Tabs */}
          <div className="border-b border-gray-200" data-unique-id="ef771ab8-25e9-492f-91c5-a59c18c4375f" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
            <div className="flex" data-unique-id="0e27097f-1435-4903-9c61-484d3e731d8b" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
              <button className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'location' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab('location')} data-unique-id="bf424966-dc97-43d3-82e1-1755e806723a" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                <MapPin size={16} className="inline-block mr-2" /><span className="editable-text" data-unique-id="dfece747-3d4d-4218-8e8e-be67c9aa9247" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                Lokasi
              </span></button>
              <button className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'time' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab('time')} data-unique-id="dd0b038a-54d3-4db9-baf8-36f2b67d7e31" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                <Clock size={16} className="inline-block mr-2" /><span className="editable-text" data-unique-id="9a4e1cff-c3d3-4654-909b-f8c2c31e19ab" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                Jam
              </span></button>
              <button className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'telegram' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab('telegram')} data-unique-id="71bb5a8e-5bf5-46ed-94b1-d09c81b39f06" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                <MessageSquare size={16} className="inline-block mr-2" /><span className="editable-text" data-unique-id="9c72a272-f67e-47a4-9fc2-65cad561672c" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                Telegram
              </span></button>
            </div>
          </div>
          
          {/* Tab Content */}
          <div className="p-6" data-unique-id="9b5dbb82-31d1-4ca7-8b9e-f31329e072c4" data-file-name="app/dashboard/absensi-guru/settings/page.tsx" data-dynamic-text="true">
            {/* Location Settings */}
            {activeTab === 'location' && <div data-unique-id="99f217ce-4fba-4b1a-b844-a23335ec704b" data-file-name="app/dashboard/absensi-guru/settings/page.tsx" data-dynamic-text="true">
                <h2 className="text-lg font-semibold mb-6" data-unique-id="9b63db92-73c2-4956-8c5f-dad2c237ebef" data-file-name="app/dashboard/absensi-guru/settings/page.tsx"><span className="editable-text" data-unique-id="d1a98272-b17e-4eec-a3ef-d708b40b6cc0" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">Pengaturan Lokasi Sekolah</span></h2>
                
                <div className="mb-6" data-unique-id="0e0a9a34-79cb-4b53-925d-faf88f6dffee" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                  <p className="text-gray-600 mb-4" data-unique-id="7ee5ce92-9194-4cdc-92ef-64d9f2443096" data-file-name="app/dashboard/absensi-guru/settings/page.tsx"><span className="editable-text" data-unique-id="1bdc8975-ca6e-4e11-92df-1132085ef266" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                    Tentukan lokasi sekolah dan radius (dalam meter) di mana absensi diizinkan.
                    Guru hanya dapat melakukan absensi jika berada dalam radius yang ditentukan.
                  </span></p>
                  <button onClick={getCurrentLocation} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mb-6" data-unique-id="4a1233ab-d185-45ba-9aea-aae569bc35a7" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                    <MapPin size={16} className="inline-block mr-2" /><span className="editable-text" data-unique-id="320119de-1413-439d-ba54-a66e263fc713" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                    Dapatkan Lokasi Saat Ini
                  </span></button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6" data-unique-id="9c3557e2-ec8d-40e2-ab50-04dd388c2dd4" data-file-name="app/dashboard/absensi-guru/settings/page.tsx" data-dynamic-text="true">
                  {/* Latitude */}
                  <div data-unique-id="b03e9b5a-88fd-4181-bb03-544e7479cd2e" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                    <label htmlFor="latitude" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="10c16466-3798-4168-92ab-7aa92065b779" data-file-name="app/dashboard/absensi-guru/settings/page.tsx"><span className="editable-text" data-unique-id="c5eb50c3-370c-4361-bb54-d1222a82dfed" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                      Garis Lintang (Latitude)
                    </span></label>
                    <input type="number" step="0.000001" id="latitude" name="latitude" value={locationSettings.latitude} onChange={handleLocationChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" required data-unique-id="ae7e4fa7-4026-4739-ad27-b4cbfbe8ba62" data-file-name="app/dashboard/absensi-guru/settings/page.tsx" />
                  </div>
                  
                  {/* Longitude */}
                  <div data-unique-id="4c454ee4-8e78-4662-8c49-009655555206" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                    <label htmlFor="longitude" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="24ed2319-d795-40eb-95d5-d56123bd24ba" data-file-name="app/dashboard/absensi-guru/settings/page.tsx"><span className="editable-text" data-unique-id="614d2002-91d7-4170-873a-069230f5d7dd" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                      Garis Bujur (Longitude)
                    </span></label>
                    <input type="number" step="0.000001" id="longitude" name="longitude" value={locationSettings.longitude} onChange={handleLocationChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" required data-unique-id="f7f1f8fc-d752-469f-9d32-cf9efb341fe0" data-file-name="app/dashboard/absensi-guru/settings/page.tsx" />
                  </div>
                </div>
                
                {/* Radius */}
                <div className="mb-6" data-unique-id="4f6922d6-ccf8-4062-ae4a-32bd438e0649" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                  <label htmlFor="radius" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="d53e3d98-122d-486c-bf0b-59d365f579a2" data-file-name="app/dashboard/absensi-guru/settings/page.tsx"><span className="editable-text" data-unique-id="86b4645e-297d-4f17-8b64-af71f3cc220c" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                    Radius Absensi (dalam meter)
                  </span></label>
                  <input type="range" id="radius" name="radius" min="50" max="500" step="10" value={locationSettings.radius} onChange={handleLocationChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" data-unique-id="d3c267b1-7590-43d0-b43f-4eb68cba3d4f" data-file-name="app/dashboard/absensi-guru/settings/page.tsx" />
                  <div className="flex justify-between mt-2" data-unique-id="14633b9e-1115-4db4-bd7e-166d1de9498d" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                    <span className="text-xs text-gray-500" data-unique-id="a9c6caf3-fa3e-4054-b7b4-178def3f5f0e" data-file-name="app/dashboard/absensi-guru/settings/page.tsx"><span className="editable-text" data-unique-id="22f366ea-4d70-4cec-998a-cd444844986f" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">50m</span></span>
                    <span className="text-sm font-medium" data-unique-id="0f6fa741-b37e-42d2-876d-32efc2b91a22" data-file-name="app/dashboard/absensi-guru/settings/page.tsx" data-dynamic-text="true">{locationSettings.radius}<span className="editable-text" data-unique-id="2c1c180f-4e55-47eb-8525-4cd4b0e88002" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">m</span></span>
                    <span className="text-xs text-gray-500" data-unique-id="7caaf3b4-cc33-4654-8e2d-8136ea01c83f" data-file-name="app/dashboard/absensi-guru/settings/page.tsx"><span className="editable-text" data-unique-id="d31c5756-007c-48ff-acf2-144dd66eb15a" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">500m</span></span>
                  </div>
                </div>
                
                <div data-unique-id="3c288c76-d41e-4642-8a08-17d1c69a15bc" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                  <h3 className="text-md font-semibold mb-1" data-unique-id="0dd17e94-6aef-4318-83c6-cba82b03e0e1" data-file-name="app/dashboard/absensi-guru/settings/page.tsx"><span className="editable-text" data-unique-id="3e5bce27-a869-4542-8149-70f7a448293b" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">Lokasi yang akan diterapkan:</span></h3>
                  <p className="text-gray-600" data-unique-id="c58a1089-8e11-465e-8d3f-ff47f744da81" data-file-name="app/dashboard/absensi-guru/settings/page.tsx" data-dynamic-text="true">
                    {locationSettings.latitude === 0 && locationSettings.longitude === 0 ? "Lokasi belum diatur" : `${locationSettings.latitude}, ${locationSettings.longitude} (Radius: ${locationSettings.radius}m)`}
                  </p>
                </div>
              </div>}
            
            {/* Time Settings */}
            {activeTab === 'time' && <div data-unique-id="5d4a509f-d2d3-433f-a773-ac93b55f9ce5" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                <h2 className="text-lg font-semibold mb-6" data-unique-id="ad49804b-5394-4e63-b567-71b315165aac" data-file-name="app/dashboard/absensi-guru/settings/page.tsx"><span className="editable-text" data-unique-id="f974af7e-ecb1-4f32-8189-09eea0a0e77e" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">Pengaturan Jam Kerja</span></h2>
                
                <div className="mb-6" data-unique-id="2925b35b-07c1-4632-85ef-6981a1ae1298" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                  <p className="text-gray-600 mb-4" data-unique-id="1c7c79df-c844-4175-9559-6a9d231b4ad3" data-file-name="app/dashboard/absensi-guru/settings/page.tsx"><span className="editable-text" data-unique-id="1233e92b-c37a-4e56-8356-5f02de175aa5" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                    Atur jam absensi masuk dan pulang. Guru hanya dapat
                    melakukan absensi dalam rentang waktu yang ditentukan.
                  </span></p>
                </div>
                
                <div className="grid grid-cols-1 gap-6" data-unique-id="fa487a2b-c55c-4f2f-b209-a535ea735d00" data-file-name="app/dashboard/absensi-guru/settings/page.tsx" data-dynamic-text="true">
                  {/* Check-in time */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200" data-unique-id="4c007da2-836c-410a-852d-35840dd83e69" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                    <h3 className="text-md font-semibold mb-2" data-unique-id="3dcfda69-5c96-45b1-b320-e4578f6f38b4" data-file-name="app/dashboard/absensi-guru/settings/page.tsx"><span className="editable-text" data-unique-id="f191dadb-7d20-4fb7-8645-506a3228058a" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">Jam Absensi Masuk</span></h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-unique-id="e43d167e-a7c8-422b-b6d5-b2fe2546f67c" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                      <div data-unique-id="72e4a76b-35c1-4352-ba28-13bd672b0909" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                        <label htmlFor="checkInStart" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="b36d5833-eb6b-4de1-ac4c-e725b58caf95" data-file-name="app/dashboard/absensi-guru/settings/page.tsx"><span className="editable-text" data-unique-id="8fa91982-5c05-44ac-a83a-c9133a253392" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                          Waktu Mulai
                        </span></label>
                        <input type="time" id="checkInStart" name="checkInStart" disabled value={attendanceTimeSettings.checkInStart} onChange={handleTimeChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" data-unique-id="de5ceb4a-2270-48c7-a0fc-03ad8c6939de" data-file-name="app/dashboard/absensi-guru/settings/page.tsx" />
                      </div>
                      <div data-unique-id="5d9ad993-42df-4ad4-9a41-c3546dcd0065" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                        <label htmlFor="checkInEnd" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="b97da800-ce05-4230-b8d9-b6bb9c0502cd" data-file-name="app/dashboard/absensi-guru/settings/page.tsx"><span className="editable-text" data-unique-id="02537f32-58e6-482b-aa02-4023c5a1ad7b" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                          Batas Waktu
                        </span></label>
                        <input type="time" id="checkInEnd" name="checkInEnd" disabled value={attendanceTimeSettings.checkInEnd} onChange={handleTimeChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" data-unique-id="3003eeb7-9a22-4830-a5cf-00e3c0c022f0" data-file-name="app/dashboard/absensi-guru/settings/page.tsx" />
                        <p className="text-xs text-gray-500 mt-1" data-unique-id="6960cb8c-002a-49e7-a42e-639b2eed483e" data-file-name="app/dashboard/absensi-guru/settings/page.tsx"><span className="editable-text" data-unique-id="98681867-31e3-4f3a-9059-bea14e5cc5eb" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                          * Absensi setelah waktu ini akan dianggap terlambat
                        </span></p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Check-out time */}
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200" data-unique-id="9e32dbbe-df68-4314-a92e-7e039f146382" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                    <h3 className="text-md font-semibold mb-2" data-unique-id="0fd9767f-8adc-4305-b25f-891f6b459cb2" data-file-name="app/dashboard/absensi-guru/settings/page.tsx"><span className="editable-text" data-unique-id="c6bd630f-654d-43fd-8cc5-b137415d5472" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">Jam Absensi Pulang</span></h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-unique-id="1643380d-fdc1-4edf-84aa-5f94dfa75bce" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                      <div data-unique-id="02815b76-82b5-4237-bf21-de210070f6fa" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                        <label htmlFor="checkOutStart" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="61f1aef8-5f26-4881-9e18-b2af3e1d360e" data-file-name="app/dashboard/absensi-guru/settings/page.tsx"><span className="editable-text" data-unique-id="0ad69c8e-a3ad-412d-8310-6fcc1393d744" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                          Waktu Mulai
                        </span></label>
                        <input type="time" id="checkOutStart" name="checkOutStart" disabled value={attendanceTimeSettings.checkOutStart} onChange={handleTimeChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" data-unique-id="8367a040-85ec-4530-be2c-263b7c5d383a" data-file-name="app/dashboard/absensi-guru/settings/page.tsx" />
                      </div>
                      <div data-unique-id="cc2f1b2b-f022-49b6-b555-dc4c24204ac4" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                        <label htmlFor="checkOutEnd" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="a03a4478-816c-4c41-adfe-24c47da1dd21" data-file-name="app/dashboard/absensi-guru/settings/page.tsx"><span className="editable-text" data-unique-id="7c2570d5-b799-40c9-8888-9393de1b3058" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                          Batas Waktu
                        </span></label>
                        <input type="time" id="checkOutEnd" name="checkOutEnd" disabled value={attendanceTimeSettings.checkOutEnd} onChange={handleTimeChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" data-unique-id="cc4ca97b-8a6d-4bb2-8d98-b9a1df6b4545" data-file-name="app/dashboard/absensi-guru/settings/page.tsx" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>}
            
            {/* Telegram Settings */}
            {activeTab === 'telegram' && <div data-unique-id="5cdae872-6ead-4913-802d-9cafa7ed417e" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                <h2 className="text-lg font-semibold mb-6" data-unique-id="ba87a4f5-ac49-4bb8-a20f-e1cc89275a88" data-file-name="app/dashboard/absensi-guru/settings/page.tsx"><span className="editable-text" data-unique-id="de5d1f5c-47b8-4413-9d94-963fccf9fa92" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">Pengaturan Telegram</span></h2>
                
                <div className="mb-6" data-unique-id="8c00bd5f-1356-45ad-8615-73633d63f0e9" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                  {/*<div className="flex items-start bg-blue-50 p-4 rounded-lg mb-6" data-unique-id="a70b5fb3-32be-4d72-b796-643d8ccea97a" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                    <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div data-unique-id="5edf4510-071c-4254-baae-4b83f15d7def" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                      <h4 className="font-medium text-blue-700" data-unique-id="aff650cc-e14f-41ee-a71e-28dd9d1f42a9" data-file-name="app/dashboard/absensi-guru/settings/page.tsx"><span className="editable-text" data-unique-id="65b91cb3-4492-4c5d-9181-dc8a32163f4e" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">Informasi Bot Telegram</span></h4>
                      <p className="text-sm text-blue-600 mt-1" data-unique-id="1d4744f8-6a4c-4c42-b2f1-a3ca44fce92e" data-file-name="app/dashboard/absensi-guru/settings/page.tsx"><span className="editable-text" data-unique-id="e5579d78-4104-4aad-8f3a-31640f217246" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                        Untuk mendapatkan ID Chat, silakan kirim pesan ke 
                        </span><a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-blue-700 underline mx-1" data-unique-id="b4a3c910-5415-4c03-9dcb-ac58f71c942f" data-file-name="app/dashboard/absensi-guru/settings/page.tsx"><span className="editable-text" data-unique-id="fc95b12c-730b-4654-82ac-866287521204" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">@userinfobot</span></a><span className="editable-text" data-unique-id="9cf95e31-ac8d-496c-8a24-dc328277bcb1" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                        dan masukkan ID yang diberikan oleh bot.
                      </span></p>
                    </div>
                  </div>*/}
                  
                  <div className="grid grid-cols-1 gap-4 mb-6" data-unique-id="9c5900b0-da84-4caf-bfe6-4b3392813b54" data-file-name="app/dashboard/absensi-guru/settings/page.tsx" data-dynamic-text="true">
                    {/* Bot Token */}
                    {/*<div data-unique-id="9dcb48e4-7aa9-46ae-b353-5ff500545138" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                      <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="1b913997-4d01-4e7f-bfef-3ff9b3b0566d" data-file-name="app/dashboard/absensi-guru/settings/page.tsx"><span className="editable-text" data-unique-id="be6c6365-ea42-4802-b706-890a5c2960a1" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                        Token Bot
                      </span></label>
                      <input type="text" id="token" name="token" disabled value={telegramSettings.token} onChange={handleTelegramChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" data-unique-id="14078faa-936e-4889-a53f-93d97072782a" data-file-name="app/dashboard/absensi-guru/settings/page.tsx" />
                      <p className="text-xs text-gray-500 mt-1" data-unique-id="09ed8827-f85c-48e8-a72d-21d48f281790" data-file-name="app/dashboard/absensi-guru/settings/page.tsx"><span className="editable-text" data-unique-id="f56c291b-1b8f-4717-b558-d9847415cb15" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                        Token default: </span><code data-unique-id="c2a921cc-7436-499d-8c78-36ad5d7b1bc0" data-file-name="app/dashboard/absensi-guru/settings/page.tsx"><span className="editable-text" data-unique-id="67163368-fa7a-48ae-beb9-65aee51d638e" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">7702797779:AAELhARB3HkvB9hh5e5D64DCC4faDfcW9IM</span></code>
                      </p>
                    </div>*/}
                    
                    {/* Chat ID */}
                    <div data-unique-id="a4670cde-f7b7-40f6-bf42-036162326337" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                      <label htmlFor="chatId" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="cd1377d2-ef79-49b7-be34-e1143b778a88" data-file-name="app/dashboard/absensi-guru/settings/page.tsx"><span className="editable-text" data-unique-id="b1662f0e-aa2d-44f6-812b-034dca7065d0" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                        ID Chat Kepala Sekolah
                      </span></label>
                      <input type="text" id="chatId" name="chatId" value={telegramSettings.chatId} onChange={handleTelegramChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" placeholder="Contoh: 123456789" required data-unique-id="78531995-33df-40d5-898b-a358a05ad4e8" data-file-name="app/dashboard/absensi-guru/settings/page.tsx" />
                    </div>
                    
                    {/* Bot Username */}
                    <div data-unique-id="a554b2f7-8447-418f-9623-a2fa081f1461" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                      <label htmlFor="botUsername" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="9333a099-9d34-43de-a52f-f381524c6106" data-file-name="app/dashboard/absensi-guru/settings/page.tsx"><span className="editable-text" data-unique-id="ce669609-dee3-42db-8362-1041ee27d900" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                        Username Bot
                      </span></label>
                      <div className="relative" data-unique-id="fba0a09f-7ef4-4fb2-adf8-9f390e7aaca1" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500" data-unique-id="54653a66-4b5c-466a-8511-6ca2ed96db49" data-file-name="app/dashboard/absensi-guru/settings/page.tsx"><span className="editable-text" data-unique-id="981d2f59-4377-4475-a54d-402079728dc3" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">@</span></span>
                        <input type="text" id="botUsername" name="botUsername" disabled value={telegramSettings.botUsername} onChange={handleTelegramChange} className="w-full pl-8 px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" data-unique-id="613b45d6-8e13-4944-9ea3-36eb34274b2e" data-file-name="app/dashboard/absensi-guru/settings/page.tsx" />
                      </div>
                    </div>
                  </div>
                  
                  <button type="button" onClick={testTelegramBot} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" data-unique-id="044bc501-dee1-4d6a-a191-66cbad115cd8" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                    <MessageSquare size={16} className="inline-block mr-2" /><span className="editable-text" data-unique-id="f5bc4bd7-0ba6-496f-8c41-e0cebbdef172" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
                    Kirim Pesan Test
                  </span></button>
                </div>
              </div>}
          </div>
          
          {/* Action buttons */}
          <div className="px-6 py-4 bg-gray-50 flex justify-end" data-unique-id="dc0dc60d-fc65-4c96-a676-32d1e2a297f2" data-file-name="app/dashboard/absensi-guru/settings/page.tsx">
            <motion.button onClick={saveSettings} disabled={saving || saveSuccess} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-white transition-colors ${saving || saveSuccess ? 'bg-green-600' : 'bg-primary hover:bg-primary hover:bg-opacity-90'}`} whileTap={{
          scale: 0.95
        }} data-unique-id="e4e1b74a-17de-46e7-8d93-ccd2869180e7" data-file-name="app/dashboard/absensi-guru/settings/page.tsx" data-dynamic-text="true">
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : saveSuccess ? <CheckCircle className="h-5 w-5" /> : <Save className="h-5 w-5" />}
              {saving ? "Menyimpan..." : saveSuccess ? "Tersimpan" : "Simpan Pengaturan"}
            </motion.button>
          </div>
        </div>}
    </div>;
}
