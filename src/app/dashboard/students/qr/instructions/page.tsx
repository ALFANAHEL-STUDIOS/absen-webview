"use client";

import React from "react";
import { QrCode, Info, LinkIcon, ExternalLink, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function QRInstructionsPage() {
  return (
    <div className="max-w-4xl mx-auto pb-20 md:pb-6 px-3 sm:px-4 md:px-6">
      <div className="flex items-center mb-6">
        <Link href="/dashboard/students/qr" className="p-2 mr-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </Link>
        <QrCode className="h-7 w-7 text-primary mr-3" />
        <h1 className="text-2xl font-bold text-gray-800">Panduan QR Code</h1>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center mb-4">
          <div className="bg-blue-100 p-2 rounded-lg mr-3">
            <Info className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold">Cara Membuat QR Code untuk Sistem Absensi</h2>
        </div>
        
        <div className="prose max-w-full">
          <p className="text-gray-700">
            QR Code yang digunakan dalam sistem absensi ini berisi NISN (Nomor Induk Siswa Nasional)
            yang berfungsi sebagai ID unik untuk mengidentifikasi siswa pada saat melakukan absensi.
          </p>
          
          <h3 className="text-lg font-medium mt-6 mb-3">Langkah-langkah membuat QR Code:</h3>
          
          <ol className="space-y-4 list-decimal list-inside">
            <li className="text-gray-700">
              <span className="font-medium">Kunjungi situs pembuat QR Code</span>
              <p className="mt-1 ml-6">
                Buka situs <a href="https://qrcode.tec-it.com/en" target="_blank" rel="noopener noreferrer" className="text-blue-600 flex items-center">
                  QR Code Generator
                  <ExternalLink className="h-3 w-3 ml-1 inline-block" />
                </a>
              </p>
            </li>
            
            <li className="text-gray-700">
              <span className="font-medium">Masukkan NISN siswa di kolom "Your Data"</span>
              <p className="mt-1 ml-6">
                Pada halaman utama, masukkan NISN siswa di kolom input "Your Data" untuk membuat QR Code.
              </p>
            </li>
            
            <li className="text-gray-700">
              <span className="font-medium">Masukkan NISN siswa</span>
              <p className="mt-1 ml-6">
                Masukkan NISN siswa tanpa spasi atau karakter khusus lainnya. Contoh: "0012345678"
              </p>
            </li>
            
            <li className="text-gray-700">
              <span className="font-medium">Sesuaikan pengaturan QR Code (opsional)</span>
              <p className="mt-1 ml-6">
                Anda dapat menyesuaikan ukuran, warna, dan koreksi kesalahan QR Code di bagian "QR Code Settings". 
                Disarankan menggunakan Error Correction Level "H" untuk ketahanan QR Code yang lebih baik.
              </p>
            </li>
            
            <li className="text-gray-700">
              <span className="font-medium">Unduh QR Code</span>
              <p className="mt-1 ml-6">
                Setelah QR Code dibuat, klik tombol "Download" dan pilih format gambar yang diinginkan (PNG atau SVG direkomendasikan untuk kualitas terbaik).
              </p>
            </li>
            
            <li className="text-gray-700">
              <span className="font-medium">Cetak QR Code</span>
              <p className="mt-1 ml-6">
                Cetak QR Code dan tempelkan pada kartu identitas siswa atau buku siswa.
              </p>
            </li>
          </ol>
          
          <div className="bg-yellow-50 p-4 rounded-lg mt-6 border border-yellow-200">
            <h4 className="text-yellow-800 font-medium mb-2">Penting!</h4>
            <p className="text-yellow-700 text-sm">
              Pastikan QR Code dapat dipindai dengan jelas. Untuk hasil terbaik:
            </p>
            <ul className="text-yellow-700 text-sm mt-2 list-disc list-inside">
              <li>Cetak dengan kualitas tinggi</li>
              <li>Hindari menempatkan QR Code pada permukaan yang mengkilap</li>
              <li>Pastikan ukuran QR Code minimal 2x2 cm</li>
              <li>Jangan menekuk atau melipat bagian kertas yang berisi QR Code</li>
            </ul>
          </div>
          
          <h3 className="text-lg font-medium mt-6 mb-3">Integrasi dengan Telegram:</h3>
          <p className="text-gray-700">
            Sistem absensi ini terintegrasi dengan Bot Telegram untuk mengirimkan notifikasi kepada orang tua siswa. 
            Untuk mengaktifkan fitur ini:
          </p>
          
          <ol className="space-y-4 list-decimal list-inside mt-4">
            <li className="text-gray-700">
              <span className="font-medium">Cari Bot Telegram</span>
              <p className="mt-1 ml-6">
                Buka aplikasi Telegram dan cari bot <span className="font-semibold">@AbsensiDigitalBot</span>
              </p>
            </li>
            
            <li className="text-gray-700">
              <span className="font-medium">Mulai percakapan dengan bot</span>
              <p className="mt-1 ml-6">
                Klik "Start" atau ketik "/start" untuk memulai percakapan dengan bot.
              </p>
            </li>
            
            <li className="text-gray-700">
              <span className="font-medium">Dapatkan Telegram Chat ID</span>
              <p className="mt-1 ml-6">
                Ketik "/id" untuk mendapatkan Chat ID Telegram Anda. Ini yang akan digunakan sebagai telegramNumber siswa.
              </p>
            </li>
            
            <li className="text-gray-700">
              <span className="font-medium">Update data siswa</span>
              <p className="mt-1 ml-6">
                Masukkan Chat ID tersebut sebagai nomor Telegram pada profil siswa di sistem.
              </p>
            </li>
          </ol>
          
          <div className="bg-blue-50 p-4 rounded-lg mt-6 border border-blue-200">
            <h4 className="text-blue-800 font-medium mb-2">Link Bot Telegram</h4>
            <div className="flex items-center">
              <LinkIcon className="h-4 w-4 text-blue-600 mr-2" />
              <a 
                href="https://t.me/AbsensiDigitalBot" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                t.me/AbsensiDigitalBot
              </a>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg mt-6 border border-green-200">
            <h4 className="text-green-800 font-medium mb-2">Konfigurasi Bot Telegram</h4>
            <p className="text-green-700 text-sm">
              Bot Telegram yang digunakan:
            </p>
            <ul className="text-green-700 text-sm mt-2 list-disc list-inside">
              <li><span className="font-medium">Nama Bot:</span> AbsensiDigitalBot</li>
              <li><span className="font-medium">Username:</span> @AbsensiDigitalBot</li>
              <li><span className="font-medium">Token Bot:</span> 7662377324:AAEFhwY-y1q3IrX4OEJAUG8VLa8DqNndH6E</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="mt-6 flex justify-center">
        <Link 
          href="/dashboard/scan" 
          className="bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors"
        >
          Kembali ke Halaman Scan
        </Link>
      </div>
    </div>
  );
}
