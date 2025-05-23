"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { readDocuments, deleteDocument } from "@/lib/firestore";
import { where, orderBy } from "firebase/firestore";
import Link from "next/link";
import { 
  Search, 
  Plus, 
  QrCode, 
  ExternalLink, 
  Filter,
  Upload,
  AlertTriangle,
  Trash2,
  Edit,
  Users
} from "lucide-react";
import Image from "next/image";
import { toast } from "react-hot-toast";
import dynamic from 'next/dynamic';

const ConfirmDialog = dynamic(() => import('@/components/ConfirmDialog'), {
  ssr: false
});

interface Student {
  id: string;
  name: string;
  nisn: string;
  class: string;
  gender: string;
  photoUrl: string;
}

export default function Students() {
  const { schoolId, userRole } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [classes, setClasses] = useState<string[]>([]);
  const [filteredAttendanceData, setFilteredAttendanceData] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!schoolId) return;
      
      try {
        const { studentApi } = await import('@/lib/api');
        const fetchedStudents = await studentApi.getAll(schoolId) as Student[];
        const fetchedClasses = new Set<string>();
        
        fetchedStudents.forEach((student) => {
          fetchedClasses.add(student.class);
        });
        
        // Map to ensure all students have the required fields
        const normalizedStudents = fetchedStudents.map(student => ({
          ...student,
          photoUrl: student.photoUrl || "/placeholder-student.jpg"
        }));
        
        setStudents(normalizedStudents);
        setClasses(Array.from(fetchedClasses).sort());
      } catch (error) {
        console.error("Error fetching students:", error);
      }
    };

    fetchStudents();
  }, [schoolId]);
  
  // Function to delete a student
  const handleDeleteStudent = async (studentId: string) => {
    if (!schoolId) return;
    
    setStudentToDelete(null);
    setDeleteDialogOpen(false);
    
    try {
      const { studentApi } = await import('@/lib/api');
      await studentApi.delete(schoolId, studentId);
      
      // Update the local state to remove the deleted student
      setStudents(students.filter(student => student.id !== studentId));
      
      // Show confirmation toast
      toast.success("Data siswa berhasil dihapus");
    } catch (error) {
      console.error("Error deleting student:", error);
      toast.error("Gagal menghapus data siswa");
    }
  };
  
  const openDeleteDialog = (studentId: string) => {
    setStudentToDelete(studentId);
    setDeleteDialogOpen(true);
  };

  const filteredStudents = students.filter((student) => {
    // Filter by class
    if (selectedClass !== "all" && student.class !== selectedClass) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery) {
      return (
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.nisn.includes(searchQuery)
      );
    }
    
    return true;
  });

  // Loading state removed

  return (
    <div className="pb-20 md:pb-6">
      <div className="flex flex-col items-center mb-6">
        <div className="flex flex-col md:flex-row md:justify-center md:items-center w-full">
          <div className="flex items-center justify-center mb-3">
            <Users className="h-7 w-7 text-primary mr-3" />
            <h1 className="text-2xl font-bold text-gray-800 text-center">DAFTAR PESERTA DIDIK</h1>
          </div>
        </div>
        {userRole === 'admin' && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Link 
              href="/dashboard/students/add"
              className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-2 rounded-lg hover:bg-orange-500 active:bg-orange-600 transition-colors shadow-sm text-sm w-full sm:w-auto"
            >
              <Plus size={16} />
              Tambah Data Siswa
            </Link>
          </div>
        )}
      </div>
      
      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 md:p-5 mb-4 sm:mb-6">
        <div className="flex flex-col space-y-3 md:space-y-0 md:flex-row md:items-center md:gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Cari nama atau NISN siswa..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="md:w-72">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <select
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary appearance-none bg-white"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="all">Semua Kelas</option>
                {classes.map((className) => (
                  <option key={className} value={className}>
                    Kelas {className}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Students Grid */}
      {filteredStudents.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 md:gap-6">
          {filteredStudents.map((student, index) => {
            // Create an array of gradient backgrounds
            const gradients = [
              "bg-gradient-to-r from-blue-50 to-indigo-100",
              "bg-gradient-to-r from-green-50 to-emerald-100",
              "bg-gradient-to-r from-purple-50 to-violet-100",
              "bg-gradient-to-r from-pink-50 to-rose-100",
              "bg-gradient-to-r from-yellow-50 to-amber-100",
              "bg-gradient-to-r from-cyan-50 to-sky-100"
            ];
            
            // Select a gradient based on the index
            const gradientClass = gradients[index % gradients.length];
            
            return (
              <div key={student.id} className={`${gradientClass} rounded-xl shadow-sm overflow-hidden`}>
                <div className="p-4">
                  <div>
                    <h3 className="font-semibold text-sm">{student.name}</h3>
                    <p className="text-gray-500 text-xs">NISN: {student.nisn}</p>
                    <div className="flex items-center mt-1">
                      <span className="inline-block px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                        Kelas {student.class}
                      </span>
                      <span className="inline-block px-1.5 py-0.5 text-xs bg-gray-100 text-gray-700 rounded ml-2">
                        {student.gender === "male" ? "Laki-laki" : "Perempuan"}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-3">
                    <Link 
                      href={`/dashboard/students/${student.id}`}
                      className="p-1.5 text-blue-600 rounded hover:bg-blue-100 hover:bg-opacity-20"
                      title="Detail Siswa"
                    >
                      <ExternalLink size={16} />
                    </Link>
                    <Link 
                      href={`/dashboard/students/edit/${student.id}`}
                      className="p-1.5 text-green-600 rounded hover:bg-green-100 hover:bg-opacity-20"
                      title="Edit Data Siswa"
                    >
                      <Edit size={16} />
                    </Link>
                    {userRole === 'admin' && (
                      <button
                        onClick={() => openDeleteDialog(student.id)}
                        className="p-1.5 text-red-600 rounded hover:bg-red-100 hover:bg-opacity-20"
                        title="Hapus Siswa"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center">
          <div className="flex flex-col items-center">
            <div className="bg-gray-100 rounded-full p-3 mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">
              {searchQuery || selectedClass !== "all"
                ? "Tidak ada siswa yang sesuai dengan pencarian atau filter"
                : "Belum ada data."}
            </p>
            <Link
              href="/dashboard/students/add"
              className="flex items-center justify-center w-full md:w-auto gap-2 bg-blue-500 bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-orange-500 transition-colors"
            >
              Tambah Data Siswa
            </Link>
          </div>
        </div>
      )}
      <hr className="border-t border-none mb-5" />
      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Konfirmasi Hapus Data"
        message="Apakah Anda yakin ingin menghapus data siswa ini? Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        cancelLabel="Batal"
        confirmColor="bg-red-500 hover:bg-red-600"
        onConfirm={() => studentToDelete && handleDeleteStudent(studentToDelete)}
        onCancel={() => setDeleteDialogOpen(false)}
        icon={<AlertTriangle size={20} className="text-red-500" />}
      />
    </div>
  );
}
