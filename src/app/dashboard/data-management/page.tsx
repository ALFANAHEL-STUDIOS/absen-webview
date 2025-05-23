"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  Database, 
  Upload, 
  Download, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw,
  Loader2,
  HardDrive,
  FileUp,
  FileDown,
  BarChart,
  FileCog,
  AlertTriangle
} from "lucide-react";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";

export default function DataManagement() {
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  
  // System stats
  const [systemStats, setSystemStats] = useState({
    totalStudents: 342,
    totalClasses: 12,
    totalTeachers: 24,
    databaseSize: "54.2 MB",
    lastBackup: "05/05/2025 08:30",
    storageUsed: 65, // percentage
    dataProcessed: "3.2 GB",
    recordsCount: 12453
  });
  
  // Mock recent backups
  const [backups, setBackups] = useState([
    { id: 1, name: "Full Backup", date: "05/05/2025 08:30", size: "54.2 MB", type: "automatic" },
    { id: 2, name: "Weekly Backup", date: "28/04/2025 10:15", size: "52.8 MB", type: "automatic" },
    { id: 3, name: "Manual Backup", date: "21/04/2025 14:22", size: "51.5 MB", type: "manual" },
    { id: 4, name: "Weekly Backup", date: "21/04/2025 10:00", size: "51.5 MB", type: "automatic" },
    { id: 5, name: "Manual Backup", date: "14/04/2025 09:45", size: "50.9 MB", type: "manual" },
  ]);

  // Handlers for data management actions
  const handleBackupData = async () => {
    setBackupLoading(true);
    try {
      // Simulate backup process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Add new backup to the list
      const newBackup = {
        id: backups.length + 1,
        name: "Manual Backup",
        date: new Date().toLocaleString('id-ID', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }),
        size: systemStats.databaseSize,
        type: "manual"
      };
      
      setBackups([newBackup, ...backups]);
      toast.success("Backup database berhasil dibuat");
    } catch (error) {
      toast.error("Gagal membuat backup database");
    } finally {
      setBackupLoading(false);
    }
  };
  
  const handleRestoreData = (backupId) => {
    if (!confirm("Apakah Anda yakin ingin memulihkan database ke backup ini? Data saat ini akan tergantikan.")) {
      return;
    }
    
    setRestoreLoading(true);
    try {
      // Simulate restore process
      setTimeout(() => {
        toast.success("Database berhasil dipulihkan");
        setRestoreLoading(false);
      }, 2000);
    } catch (error) {
      toast.error("Gagal memulihkan database");
      setRestoreLoading(false);
    }
  };
  
  const handleDeleteBackup = (backupId) => {
    if (!confirm("Apakah Anda yakin ingin menghapus backup ini? Tindakan ini tidak dapat dibatalkan.")) {
      return;
    }
    
    try {
      const updatedBackups = backups.filter(backup => backup.id !== backupId);
      setBackups(updatedBackups);
      toast.success("Backup berhasil dihapus");
    } catch (error) {
      toast.error("Gagal menghapus backup");
    }
  };
  
  const handleExportData = () => {
    setExportLoading(true);
    try {
      // Simulate export process
      setTimeout(() => {
        toast.success("Data berhasil diekspor");
        setExportLoading(false);
      }, 1500);
    } catch (error) {
      toast.error("Gagal mengekspor data");
      setExportLoading(false);
    }
  };
  
  const handleImportData = () => {
    setImportLoading(true);
    try {
      // Simulate import process
      setTimeout(() => {
        toast.success("Data berhasil diimpor");
        setImportLoading(false);
      }, 1500);
    } catch (error) {
      toast.error("Gagal mengimpor data");
      setImportLoading(false);
    }
  };
  
  const handleOptimizeDatabase = () => {
    setLoading(true);
    try {
      // Simulate optimization process
      setTimeout(() => {
        toast.success("Database berhasil dioptimasi");
        setLoading(false);
      }, 2000);
    } catch (error) {
      toast.error("Gagal mengoptimasi database");
      setLoading(false);
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
        <Database className="h-7 w-7 text-primary mr-3" />
        <h1 className="text-2xl font-bold text-gray-800">Manajemen Data</h1>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-cyan-100 rounded-xl shadow-sm border-l-4 border-blue-500 p-4 flex items-center">
          <div className="bg-blue-100 p-3 rounded-lg mr-3">
            <HardDrive className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Ukuran Database</p>
            <p className="text-xl font-bold">{systemStats.databaseSize}</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-emerald-100 rounded-xl shadow-sm border-l-4 border-green-500 p-4 flex items-center">
          <div className="bg-green-100 p-3 rounded-lg mr-3">
            <BarChart className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Data</p>
            <p className="text-xl font-bold">{systemStats.recordsCount.toLocaleString()} record</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-amber-50 to-yellow-100 rounded-xl shadow-sm border-l-4 border-amber-500 p-4 flex items-center">
          <div className="bg-amber-100 p-3 rounded-lg mr-3">
            <RefreshCw className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Backup Terakhir</p>
            <p className="text-xl font-bold">{systemStats.lastBackup}</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backup and Restore Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-100 rounded-xl shadow-sm p-6">
          <div className="flex items-center mb-4">
            <FileCog className="h-5 w-5 text-primary mr-2" />
            <h2 className="text-lg font-semibold">Backup & Restore</h2>
          </div>
          
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={handleBackupData}
              disabled={backupLoading}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {backupLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileUp className="h-4 w-4" />
              )}
              Backup Database
            </button>
            
            <button
              onClick={handleOptimizeDatabase}
              disabled={loading}
              className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Optimasi Database
            </button>
            
            <button
              onClick={handleExportData}
              disabled={exportLoading}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              {exportLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              Export Data
            </button>
            
            <button
              onClick={handleImportData}
              disabled={importLoading}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              {importLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Import Data
            </button>
          </div>
          
          <h3 className="text-sm font-medium text-gray-600 mb-3">Backup Terbaru</h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {backups.length > 0 ? (
              backups.map((backup) => (
                <div key={backup.id} className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${backup.type === 'automatic' ? 'bg-blue-100' : 'bg-green-100'}`}>
                      <Database className={`h-5 w-5 ${backup.type === 'automatic' ? 'text-blue-600' : 'text-green-600'}`} />
                    </div>
                    <div>
                      <p className="font-medium">{backup.name}</p>
                      <p className="text-xs text-gray-500">{backup.date}</p>
                      <div className="flex items-center mt-1">
                        <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full text-gray-700">{backup.size}</span>
                        <span className="text-xs ml-2 bg-gray-200 px-2 py-0.5 rounded-full text-gray-700 capitalize">{backup.type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleRestoreData(backup.id)}
                      className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100"
                      title="Restore backup"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteBackup(backup.id)}
                      className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                      title="Delete backup"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                Belum ada backup tersedia
              </div>
            )}
          </div>
        </div>
        
        {/* Storage Usage Section */}
        <div className="bg-gradient-to-r from-purple-50 to-violet-100 rounded-xl shadow-sm p-6">
          <div className="flex items-center mb-4">
            <HardDrive className="h-5 w-5 text-primary mr-2" />
            <h2 className="text-lg font-semibold">Penggunaan Penyimpanan</h2>
          </div>
          
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Status Penyimpanan</span>
              <span className="text-sm font-medium">{systemStats.storageUsed}% terpakai</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full ${
                  systemStats.storageUsed > 90 ? 'bg-red-600' : 
                  systemStats.storageUsed > 75 ? 'bg-amber-500' : 'bg-green-600'
                }`} 
                style={{ width: `${systemStats.storageUsed}%` }}
              ></div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gradient-to-r from-blue-100 to-blue-200 p-4 rounded-lg">
              <p className="text-xs text-blue-600 font-medium mb-1">Data Siswa</p>
              <p className="text-xl font-bold">{systemStats.totalStudents}</p>
              <p className="text-xs text-gray-500 mt-1">Total siswa tercatat</p>
            </div>
            
            <div className="bg-gradient-to-r from-green-100 to-green-200 p-4 rounded-lg">
              <p className="text-xs text-green-600 font-medium mb-1">Data Kelas</p>
              <p className="text-xl font-bold">{systemStats.totalClasses}</p>
              <p className="text-xs text-gray-500 mt-1">Total kelas tercatat</p>
            </div>
            
            <div className="bg-gradient-to-r from-purple-100 to-purple-200 p-4 rounded-lg">
              <p className="text-xs text-purple-600 font-medium mb-1">Data Guru</p>
              <p className="text-xl font-bold">{systemStats.totalTeachers}</p>
              <p className="text-xs text-gray-500 mt-1">Total guru tercatat</p>
            </div>
            
            <div className="bg-gradient-to-r from-amber-100 to-amber-200 p-4 rounded-lg">
              <p className="text-xs text-amber-600 font-medium mb-1">Data Diproses</p>
              <p className="text-xl font-bold">{systemStats.dataProcessed}</p>
              <p className="text-xs text-gray-500 mt-1">Total data diproses</p>
            </div>
          </div>
          
          {/* System messages */}
          <div className="space-y-3">
            <div className="flex bg-green-50 p-3 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">Sistem berjalan normal</p>
                <p className="text-xs text-green-600">Database dalam kondisi optimal</p>
              </div>
            </div>
            
            <div className="flex bg-amber-50 p-3 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Backup terjadwal dalam 2 hari</p>
                <p className="text-xs text-amber-600">Backup otomatis akan dilakukan pada 08/05/2025</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
