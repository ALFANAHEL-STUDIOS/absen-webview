"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Settings as SettingsIcon, Save, Trash2, Bell, Moon, Sun, Globe, Shield, Users, Lock, Database, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";

export default function Settings() {
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Settings state
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    telegramNotifications: true,
    dailySummary: true,
    absenceAlerts: true
  });
  
  const [displaySettings, setDisplaySettings] = useState({
    theme: "light",
    language: "id",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h"
  });
  
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: "30m",
    ipRestriction: false
  });

  const handleNotificationChange = (e) => {
    const { name, checked } = e.target;
    setNotificationSettings(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleDisplayChange = (e) => {
    const { name, value } = e.target;
    setDisplaySettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSecurityChange = (e) => {
    const { name, checked, value, type } = e.target;
    setSecuritySettings(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };
  
  const handleSaveSettings = async () => {
    setSaveLoading(true);
    
    try {
      // Simulating API call to save settings
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Save settings logic would go here
      
      setSaveSuccess(true);
      toast.success("Pengaturan berhasil disimpan");
      
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    } catch (error) {
      toast.error("Gagal menyimpan pengaturan");
    } finally {
      setSaveLoading(false);
    }
  };
  
  const handleResetSettings = () => {
    if (confirm("Apakah Anda yakin ingin mengatur ulang semua pengaturan ke default?")) {
      setNotificationSettings({
        emailNotifications: true,
        smsNotifications: false,
        telegramNotifications: true,
        dailySummary: true,
        absenceAlerts: true
      });
      
      setDisplaySettings({
        theme: "light",
        language: "id",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "24h"
      });
      
      setSecuritySettings({
        twoFactorAuth: false,
        sessionTimeout: "30m",
        ipRestriction: false
      });
      
      toast.success("Pengaturan berhasil diatur ulang");
    }
  };

  // Redirect if not admin
  useEffect(() => {
    if (userRole !== 'admin') {
      toast.error("Anda tidak memiliki akses ke halaman ini");
      window.location.href = '/dashboard';
    }
  }, [userRole]);

  return (
    <div className="pb-20 md:pb-6">
      <div className="flex items-center mb-6">
        <SettingsIcon className="h-7 w-7 text-primary mr-3" />
        <h1 className="text-2xl font-bold text-gray-800">Pengaturan Sistem</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Notification Settings */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-100 rounded-xl shadow-sm p-6 border-t-4 border-blue-500">
          <div className="flex items-center mb-5">
            <Bell className="h-5 w-5 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold">Notifikasi</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="emailNotifications" className="text-sm font-medium">
                Notifikasi Email
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="emailNotifications"
                  name="emailNotifications"
                  className="sr-only peer"
                  checked={notificationSettings.emailNotifications}
                  onChange={handleNotificationChange}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <label htmlFor="smsNotifications" className="text-sm font-medium">
                Notifikasi SMS
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="smsNotifications"
                  name="smsNotifications"
                  className="sr-only peer"
                  checked={notificationSettings.smsNotifications}
                  onChange={handleNotificationChange}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <label htmlFor="telegramNotifications" className="text-sm font-medium">
                Notifikasi Telegram
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="telegramNotifications"
                  name="telegramNotifications"
                  className="sr-only peer"
                  checked={notificationSettings.telegramNotifications}
                  onChange={handleNotificationChange}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <label htmlFor="dailySummary" className="text-sm font-medium">
                Ringkasan Harian
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="dailySummary"
                  name="dailySummary"
                  className="sr-only peer"
                  checked={notificationSettings.dailySummary}
                  onChange={handleNotificationChange}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <label htmlFor="absenceAlerts" className="text-sm font-medium">
                Peringatan Ketidakhadiran
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="absenceAlerts"
                  name="absenceAlerts"
                  className="sr-only peer"
                  checked={notificationSettings.absenceAlerts}
                  onChange={handleNotificationChange}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
        
        {/* Display Settings */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-100 rounded-xl shadow-sm p-6 border-t-4 border-green-500">
          <div className="flex items-center mb-5">
            <div className="flex items-center">
              <Moon className="h-5 w-5 text-green-600 mr-2" />
              <Sun className="h-5 w-5 text-green-600 mr-2" />
            </div>
            <h2 className="text-lg font-semibold">Tampilan</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="theme" className="block text-sm font-medium mb-1">
                Tema
              </label>
              <select
                id="theme"
                name="theme"
                value={displaySettings.theme}
                onChange={handleDisplayChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              >
                <option value="light">Terang</option>
                <option value="dark">Gelap</option>
                <option value="system">Sistem</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="language" className="block text-sm font-medium mb-1">
                Bahasa
              </label>
              <div className="flex items-center">
                <Globe className="h-5 w-5 text-gray-400 absolute ml-3" />
                <select
                  id="language"
                  name="language"
                  value={displaySettings.language}
                  onChange={handleDisplayChange}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                >
                  <option value="id">Indonesia</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
            
            <div>
              <label htmlFor="dateFormat" className="block text-sm font-medium mb-1">
                Format Tanggal
              </label>
              <select
                id="dateFormat"
                name="dateFormat"
                value={displaySettings.dateFormat}
                onChange={handleDisplayChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="timeFormat" className="block text-sm font-medium mb-1">
                Format Waktu
              </label>
              <select
                id="timeFormat"
                name="timeFormat"
                value={displaySettings.timeFormat}
                onChange={handleDisplayChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              >
                <option value="12h">12 Jam (AM/PM)</option>
                <option value="24h">24 Jam</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Security Settings */}
        <div className="bg-gradient-to-r from-red-50 to-rose-100 rounded-xl shadow-sm p-6 border-t-4 border-red-500">
          <div className="flex items-center mb-5">
            <Shield className="h-5 w-5 text-red-600 mr-2" />
            <h2 className="text-lg font-semibold">Keamanan</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="twoFactorAuth" className="text-sm font-medium">
                Autentikasi Dua Faktor
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="twoFactorAuth"
                  name="twoFactorAuth"
                  className="sr-only peer"
                  checked={securitySettings.twoFactorAuth}
                  onChange={handleSecurityChange}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>
            
            <div>
              <label htmlFor="sessionTimeout" className="block text-sm font-medium mb-1">
                Timeout Sesi
              </label>
              <select
                id="sessionTimeout"
                name="sessionTimeout"
                value={securitySettings.sessionTimeout}
                onChange={handleSecurityChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              >
                <option value="15m">15 menit</option>
                <option value="30m">30 menit</option>
                <option value="1h">1 jam</option>
                <option value="3h">3 jam</option>
                <option value="8h">8 jam</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between">
              <label htmlFor="ipRestriction" className="text-sm font-medium">
                Pembatasan IP
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="ipRestriction"
                  name="ipRestriction"
                  className="sr-only peer"
                  checked={securitySettings.ipRestriction}
                  onChange={handleSecurityChange}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>
            
            <div className="pt-4">
              <button
                type="button"
                className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
              >
                <Lock size={16} />
                <span>Ubah Password</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex justify-between mt-6">
        <button
          type="button"
          onClick={handleResetSettings}
          className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          <Trash2 size={18} />
          Reset Default
        </button>
        
        <motion.button
          type="button"
          onClick={handleSaveSettings}
          disabled={saveLoading}
          className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 min-w-[180px]"
          whileTap={{ scale: 0.95 }}
        >
          {saveLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : saveSuccess ? (
            <CheckCircle size={18} />
          ) : (
            <Save size={18} />
          )}
          {saveSuccess ? "Tersimpan" : "Simpan Pengaturan"}
        </motion.button>
      </div>
    </div>
  );
}
