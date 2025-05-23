"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  QrCode, 
  Check, 
  Clock, 
  Bell, 
  Shield, 
  School,
  ChevronUp,
  Download,
  BarChart3,
  Users,
  Mail,
  Phone,
  Facebook,
  Twitter,
  Instagram,
  ArrowRight,
  LogIn
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const [isVisible, setIsVisible] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if we're scrolled down enough to show back-to-top button
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary text-white py-2 sm:py-4 fixed top-0 left-0 right-0 z-50 shadow-md">
        <div className="container-custom px-3 sm:px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <QrCode className="h-7 w-7" />
            <span className="font-bold text-xl">ABSENSI DIGITAL</span>
          </div>
          <div className="hidden md:flex space-x-3">
            <Link href="/login" className="px-4 py-1.5 rounded-md border border-white/50 text-white text-sm font-medium hover:bg-orange-500 transition-colors flex items-center gap-2 backdrop-blur-sm">
              <LogIn className="h-4 w-4" />
              LOGIN
            </Link>
            <Link href="/register" className="px-4 py-1.5 rounded-md border border-white/50 text-white text-sm font-medium hover:bg-orange-500 transition-colors backdrop-blur-sm">
              DAFTAR
            </Link>
          </div>
          <div className="md:hidden">
            <button 
              className="p-2 rounded-md border border-white text-white hover:bg-white/20"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {mobileMenuOpen && (
              <motion.div 
                className="absolute top-full right-0 mt-2 mr-3 sm:mr-4 w-[calc(100vw-24px)] max-w-[192px] py-2 bg-white rounded-md shadow-lg z-50"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Link 
                  href="/login" 
                  className="block px-4 py-2 text-white hover:bg-primary hover:text-white transition-colors border border-blue-500 m-2 rounded-md text-sm bg-blue-500"
                >
                  LOGIN
                </Link>
                <Link 
                  href="/register" 
                  className="block px-4 py-2 text-white hover:bg-primary hover:text-white transition-colors border border-orange-500 m-2 rounded-md text-sm bg-orange-500"
                >
                  DAFTAR
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content with padding for fixed header */}
      <div className="mt-12 bg-gradient-to-br from-[#f6ea41]/30 to-[#f048c6]/30 pt-6">
        {/* Hero Section */}
        <section className="py-6 sm:py-8 md:py-12 bg-transparent backdrop-blur-sm">
          <div className="container-custom px-3 sm:px-4">
            <div className="flex items-center justify-center mb-4">
              <Check className="h-6 w-6 text-primary mr-2" />
              <p className="font-semibold text-primary">Solusi Terbaik untuk Absensi Lembaga</p>
            </div>
            
            <h1 className="text-center font-bold text-3xl md:text-5xl mb-4 leading-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-600 to-secondary">
                ABSENSI DIGITAL MODERN DENGAN<br />QR CODE
              </span>
            </h1>
            
            <p className="text-center max-w-3xl mx-auto mb-5 text-slate-600 text-base md:text-lg lg:text-xl">
              Sistem Absensi Digital dengan QR Code yang menghubungkan informasi kehadiran secara real-time.
              Pantau kehadiran dan dapatkan notifikasi otomatis yang terkirim langsung ke
              Aplikasi Telegram, dan akses laporan lengkap kapan saja.
            </p>
            
            {/* Smartphone illustration - Enhanced mobile responsiveness */}
            <div className="flex justify-center mb-5">
              <div className="relative w-[280px] xs:w-[300px] sm:w-[320px] md:w-[340px] lg:w-[360px] h-auto aspect-[9/16] max-h-[560px]">
                <div className="relative bg-gray-900 rounded-[36px] p-2 shadow-xl h-full transform transition-all duration-300 hover:scale-[1.02]">
                  {/* Phone frame with top notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-gray-900 rounded-b-xl"></div>
                  
                  {/* Home button/indicator at bottom */}
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-gray-500 rounded-full"></div>
                  
                  <div className="bg-white rounded-[32px] overflow-hidden h-full">
                    {/* Telegram chat interface - Better styled for mobile */}
                    <div className="bg-[#0088cc] text-white py-3 px-4 mt-6 flex items-center justify-between">
                      <div className="text-base font-medium">Notifikasi Kehadiran</div>
                      <div className="h-2 w-2 rounded-full bg-white/70"></div>
                    </div>
                    <div className="p-2 xs:p-3 bg-[#e6ebf2] h-full overflow-y-auto">
                      <div className="bg-white rounded-lg p-2.5 xs:p-3 shadow-sm mb-3 border border-gray-100">
                        <div className="font-medium text-[#0088cc] flex items-center text-sm xs:text-base">
                          <span className="mr-2">🤖</span>
                          Bot Absensi Digital
                        </div>
                        <div className="text-xs xs:text-sm mt-1.5">
                          <p className="font-bold text-gray-800">👨‍🎓 INFO KEHADIRAN PEGAWAI</p>
                          <div className="mt-1.5 space-y-0.5 text-gray-700">
                            <p><span className="text-gray-500">Nama:</span> Ahmad Farhan</p>
                            <p><span className="text-gray-500">Jenis Kelamin:</span> Laki-laki</p>
                            <p><span className="text-gray-500">NIK:</span> 1802030984**</p>
                            <p><span className="text-gray-500">Kepegawaian:</span> Sekretaris Desa</p>
                            <p><span className="text-gray-500">Status:</span> <span className="text-green-500 font-medium">✅ Hadir</span></p>
                            <p><span className="text-gray-500">Waktu:</span> 07:15 WIB</p>
                            <p><span className="text-gray-500">Tanggal:</span> 6 Mei 2025</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-2.5 xs:p-3 shadow-sm border border-gray-100">
                        <div className="font-medium text-[#0088cc] flex items-center text-sm xs:text-base">
                          <span className="mr-2">🤖</span>
                          Bot Absensi Digital
                        </div>
                        <div className="text-xs xs:text-sm mt-1.5">
                          <p className="font-bold text-gray-800">👩‍🎓 INFO KEHADIRAN PEGAWAI</p>
                          <div className="mt-1.5 space-y-0.5 text-gray-700">
                            <p><span className="text-gray-500">Nama:</span> Siti Aisyah</p>
                            <p><span className="text-gray-500">Jenis Kelamin:</span> Perempuan</p>
                            <p><span className="text-gray-500">NIK:</span> 1802030098**</p>
                            <p><span className="text-gray-500">Kepegawaian:</span> Kepala Dusun 1</p>
                            <p><span className="text-gray-500">Status:</span> <span className="text-green-500 font-medium">✅ Hadir</span></p>
                            <p><span className="text-gray-500">Waktu:</span> 07:08 WIB</p>
                            <p><span className="text-gray-500">Tanggal:</span> 6 Mei 2025</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Advantages */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
              <motion.div 
                className="card flex flex-col items-center text-center p-4 bg-blue-400/90"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <Clock className="h-12 w-12 mb-4 text-primary" />
                <h3 className="font-semibold text-lg mb-2">Hemat Waktu</h3>
                <p className="text-gray-600">Proses absensi dalam hitungan detik</p>
              </motion.div>
              
              <motion.div 
                className="card flex flex-col items-center text-center p-4 bg-purple-400/90"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <Bell className="h-12 w-12 mb-4 text-primary" />
                <h3 className="font-semibold text-lg mb-2">Notifikasi Instan</h3>
                <p className="text-gray-600">Kirim pemberitahuan ke Telegram</p>
              </motion.div>
              
              <motion.div 
                className="card flex flex-col items-center text-center p-4 bg-green-400/90"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <Shield className="h-12 w-12 mb-4 text-primary" />
                <h3 className="font-semibold text-lg mb-2">Keamanan Tinggi</h3>
                <p className="text-gray-600">Data Pegawai terlindungi dengan baik</p>
              </motion.div>
              
              <motion.div 
                className="card flex flex-col items-center text-center p-4 bg-yellow-400/90"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                viewport={{ once: true }}
              >
                <School className="h-12 w-12 mb-4 text-primary" />
                <h3 className="font-semibold text-lg mb-2">Untuk Semua Lembaga</h3>
                <p className="text-gray-600">TK, SD, SMP, SMA, dan Instansi Pemerintah</p>
              </motion.div>
            </div>
            
            <div className="flex justify-center">
              <Link href="/login" className="btn-primary text-lg group flex items-center gap-2 hover:bg-orange-500">
                MULAI SEKARANG
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>

        {/* Guarantees Section */}
        <section className="py-8 bg-white">
          <div className="container-custom">
            <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 md:gap-6">
              <motion.div 
                className="card bg-[#4ECDC4] flex items-center justify-center p-5 text-white shadow-lg"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="bg-white/20 p-4 rounded-full mb-4 shadow-inner">
                    <Check className="h-14 w-14 text-white" />
                  </div>
                  <h3 className="font-bold text-xl mb-1">Gratis 1 Bulan</h3>
                  <p className="text-white/85">Akses penuh ke semua fitur</p>
                </div>
              </motion.div>
              
              <motion.div 
                className="card bg-[#FF6B6B] flex items-center justify-center p-5 text-white shadow-lg"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="bg-white/20 p-4 rounded-full mb-4 shadow-inner">
                    <Phone className="h-14 w-14 text-white" />
                  </div>
                  <h3 className="font-bold text-xl mb-1">Dukungan Teknis</h3>
                  <p className="text-white/85">Bantuan teknis untuk semua pengguna</p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
        
        {/* Features Section */}
        <section className="py-10 bg-slate-100">
          <div className="container-custom">
            <h2 className="section-title text-center mb-12">Fitur Unggulan Aplikasi</h2>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
              <motion.div 
                className="card bg-pink-400/90"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <QrCode className="h-12 w-12 text-primary mb-4" />
                <h3 className="font-semibold text-xl mb-3">Absensi QR Code</h3>
                <p className="text-gray-600">Scan cepat kartu QR Code untuk absensi</p>
              </motion.div>
              
              <motion.div 
                className="card bg-teal-400/90"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <Bell className="h-12 w-12 text-primary mb-4" />
                <h3 className="font-semibold text-xl mb-3">Notifikasi Real-time</h3>
                <p className="text-gray-600">Kirim info kehadiran langsung ke Telegram</p>
              </motion.div>
              
              <motion.div 
                className="card bg-blue-400/90"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <Users className="h-12 w-12 text-primary mb-4" />
                <h3 className="font-semibold text-xl mb-3">Kelola Data Pegawai</h3>
                <p className="text-gray-600">Simpan & kelola informasi dengan lengkap</p>
              </motion.div>
              
              <motion.div 
                className="card bg-orange-400/90"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                viewport={{ once: true }}
              >
                <BarChart3 className="h-12 w-12 text-primary mb-4" />
                <h3 className="font-semibold text-xl mb-3">Visualisasi Data</h3>
                <p className="text-gray-600">Lihat grafik kehadiran per bulan dengan jelas</p>
              </motion.div>
              
              <motion.div 
                className="card bg-violet-400/90"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                viewport={{ once: true }}
              >
                <Download className="h-12 w-12 text-primary mb-4" />
                <h3 className="font-semibold text-xl mb-3">Ekspor Laporan</h3>
                <p className="text-gray-600">Download laporan dalam format PDF dan Excel</p>
              </motion.div>
              
              <motion.div 
                className="card bg-emerald-400/90"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                viewport={{ once: true }}
              >
                <Shield className="h-12 w-12 text-primary mb-4" />
                <h3 className="font-semibold text-xl mb-3">Aman dan Terpercaya</h3>
                <p className="text-gray-600">Keamanan data Pegawai terjamin sepenuhnya</p>
              </motion.div>
            </div>
          </div>
        </section>
        
        {/* Testimonials Section */}
        <section className="py-10 bg-white">
          <div className="container-custom">
            <h2 className="section-title text-center mb-10">Testimoni Pengguna Aplikasi</h2>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 sm:gap-5">
              <motion.div 
                className="card bg-cyan-400/90"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <h3 className="font-bold text-primary text-lg mb-3">MAT TASLIM</h3>
                <p className="text-gray-600 text-base mb-2">Kepala Desa Sendang Ayu :</p>
                <p className="text-gray-700">
                  "Absensi QR-CODE mempermudah pemantauan kehadiran pegawai di kantor desa. 
                  Dan mengirim info ke Telegram."
                </p>
              </motion.div>
              
              <motion.div 
                className="card bg-amber-400/90"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <h3 className="font-bold text-primary text-lg mb-3">EDI PURWANTO</h3>
                <p className="text-gray-600 text-base mb-2">Sekretaris Desa :</p>
                <p className="text-gray-700">
                  "Saya selalu tahu kapan pegawai tiba di kantor berkat notifikasi Telegram. 
                  Aplikasi yang sangat membantu!"
                </p>
              </motion.div>
              
              <motion.div 
                className="card bg-lime-400/90"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                viewport={{ once: true }}
              >
                <h3 className="font-bold text-primary text-lg mb-3">THIA DWI CAHYANTI</h3>
                <p className="text-gray-600 text-base mb-2">Administrator Desa :</p>
                <p className="text-gray-700">
                  "Pembuatan laporan kehadiran jadi lebih efisien. Hemat waktu dan 
                  lebih akurat dibanding sistem manual."
                </p>
              </motion.div>
            </div>
          </div>
        </section>
        
        {/* App Showcase Section */}
        <section className="py-10 bg-[#051243] text-white">
          <div className="container-custom">
            <div className="flex flex-col gap-6 sm:gap-8 lg:flex-row lg:items-center lg:gap-10">
              <div className="lg:w-1/2">
                <h2 className="section-title mb-6">Aplikasi Pilihan Instansi Modern</h2>
                <p className="text-white mb-6">
                  ABSENSI QR-CODE adalah solusi modern untuk sistem absensi yang 
                  menggabungkan teknologi QR Code dengan notifikasi real-time untuk 
                  memberikan pengalaman terbaik bagi Lembaga atau Instansi.
                </p>
              </div>
              
              <div className="lg:w-1/2">
                <div className="relative">
                  {/* Laptop Frame */}
                  <div className="bg-gray-300 rounded-t-lg h-[20px] w-full max-w-[500px] mx-auto"></div>
                  <div className="bg-gray-300 h-[300px] w-full max-w-[500px] pt-0 pb-4 px-2 rounded-b-lg flex items-center justify-center mx-auto">
                    <div className="bg-white h-full w-full rounded">
                      {/* Dashboard Preview */}
                      <div className="w-full h-[40px] bg-primary flex items-center px-4">
                        <div className="text-white font-medium">Dashboard Absensi</div>
                      </div>
                      <div className="p-4">
                        <div className="mb-4">
                          <div className="text-sm font-medium text-gray-500 mb-1">Kehadiran Mingguan</div>
                          <div className="h-[120px] bg-blue-50 rounded-lg relative overflow-hidden">
                            {/* Simulated Bar Chart */}
                            <div className="absolute bottom-0 left-[10%] w-[10%] h-[70%] bg-primary rounded-t-sm"></div>
                            <div className="absolute bottom-0 left-[25%] w-[10%] h-[85%] bg-primary rounded-t-sm"></div>
                            <div className="absolute bottom-0 left-[40%] w-[10%] h-[65%] bg-primary rounded-t-sm"></div>
                            <div className="absolute bottom-0 left-[55%] w-[10%] h-[90%] bg-primary rounded-t-sm"></div>
                            <div className="absolute bottom-0 left-[70%] w-[10%] h-[80%] bg-primary rounded-t-sm"></div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="text-xs text-gray-500">Hadir</div>
                            <div className="font-bold text-primary text-lg">94%</div>
                          </div>
                          <div className="bg-orange-50 p-3 rounded-lg">
                            <div className="text-xs text-gray-500">Izin</div>
                            <div className="font-bold text-secondary text-lg">4%</div>
                          </div>
                          <div className="bg-red-50 p-3 rounded-lg">
                            <div className="text-xs text-gray-500">Absen</div>
                            <div className="font-bold text-red-500 text-lg">2%</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Call To Action Section */}
        <section className="py-10 bg-slate-50">
          <div className="container-custom text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Siap Meningkatkan Sistem Absensi?</h2>
            <p className="max-w-2xl mx-auto mb-8 text-gray-700">
              Daftar sekarang juga dan rasakan kemudahan sistem Absensi Digital dengan QR-CODE.
            </p>
            <Link 
              href="/register" 
              className="btn-primary text-base px-6 py-2 flex items-center justify-center gap-1.5 group mx-auto hover:bg-secondary transition-colors w-auto"
            >
              <span className="inline-block">Daftar Sekarang</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </section>
        
        {/* Footer */}
        <footer className="bg-primary text-white py-12">
          <div className="container-custom">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
              <div>
                <h3 className="font-bold text-base mb-3">ABSENSI DIGITAL</h3>
                <p className="max-w-md mb-4 text-gray-200 text-sm">
                  Solusi Absensi Digital untuk Instansi Pendidikan yang Bermutu.
                </p>
                <div className="flex space-x-3">
                  <a href="#" className="hover:text-secondary transition-colors">
                    <Instagram className="h-5 w-5" />
                  </a>
                  <a href="#" className="hover:text-secondary transition-colors">
                    <Facebook className="h-5 w-5" />
                  </a>
                  <a href="#" className="hover:text-secondary transition-colors">
                    <Twitter className="h-5 w-5" />
                  </a>
                </div>
              </div>
              
              <div>
                <h3 className="font-bold text-base mb-3">Kontak Kami</h3>
                <div className="flex items-center mb-2">
                  <Mail className="h-4 w-4 mr-2" />
                  <span className="text-sm">lehan.virtual@gmail.com</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  <span className="text-sm">+62 812 7240 5881</span>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-700 mt-6 pt-4 text-center text-gray-300">
              <p className="text-xs">&copy; {new Date().getFullYear()} ALFANAHEL STUDIO'S.</p>
            </div>
          </div>
        </footer>
      </div>
      
      {/* Back to Top Button */}
      {isVisible && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 right-8 bg-red-500 text-white p-2.5 rounded-full shadow-lg hover:bg-orange-600 transition-all z-50"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}
    </main>
  );
}
