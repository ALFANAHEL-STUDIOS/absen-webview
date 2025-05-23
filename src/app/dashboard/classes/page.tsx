"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp, 
  query, 
  orderBy 
} from "firebase/firestore";
import { 
  Plus, 
  Edit, 
  Trash2, 
  BookOpen, 
  User, 
  Users, 
  School, 
  Save, 
  X,
  AlertTriangle
} from "lucide-react";
import { toast } from "react-hot-toast";
import dynamic from 'next/dynamic';

const ConfirmDialog = dynamic(() => import('@/components/ConfirmDialog'), {
  ssr: false
});

interface ClassData {
  id: string;
  name: string;
  level: string;
  room: string;
  teacherName: string;
  studentCount: number;
}

export default function Classes() {
  const { schoolId, userRole } = useAuth();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    level: "1",
    room: "",
    teacherName: "",
  });
  
  const levelOptions = Array.from({ length: 12 }, (_, i) => ({
    value: `${i + 1}`,
    label: `${i + 1}`
  }));

  useEffect(() => {
    fetchClasses();
  }, [schoolId]);

  const fetchClasses = async () => {
    if (!schoolId) return;
    
    try {
      setLoading(true);
      const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
      const classesRef = collection(db, `schools/${schoolId}/classes`);
      const classesQuery = query(classesRef, orderBy('name', 'asc'));
      const snapshot = await getDocs(classesQuery);
      
      const fetchedClasses: ClassData[] = [];
      snapshot.forEach((doc) => {
        fetchedClasses.push({
          id: doc.id,
          ...doc.data()
        } as ClassData);
      });
      
      // Calculate student count for each class
      if (fetchedClasses.length > 0) {
        const studentsRef = collection(db, `schools/${schoolId}/students`);
        const studentsSnapshot = await getDocs(studentsRef);
        
        const studentsByClass: {[key: string]: number} = {};
        studentsSnapshot.forEach((doc) => {
          const studentData = doc.data();
          const studentClass = studentData.class;
          
          if (studentClass) {
            studentsByClass[studentClass] = (studentsByClass[studentClass] || 0) + 1;
          }
        });
        
        // Update student count in fetched classes
        fetchedClasses.forEach(classData => {
          classData.studentCount = studentsByClass[classData.name] || 0;
        });
      }
      
      setClasses(fetchedClasses);
    } catch (error) {
      console.error("Error fetching classes:", error);
      toast.error("Gagal mengambil data kelas dari database");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!schoolId) {
      toast.error("Tidak dapat mengakses data sekolah");
      return;
    }
    
    try {
      const { classApi } = await import('@/lib/api');
      await classApi.create(schoolId, {
        ...formData,
        studentCount: 0
      });
      
      setShowAddModal(false);
      setFormData({ name: "", level: "1", room: "", teacherName: "" });
      fetchClasses();
    } catch (error) {
      console.error("Error adding class:", error);
    }
  };

  const handleEditClass = (classData: ClassData) => {
    setEditingClassId(classData.id);
    setFormData({
      name: classData.name,
      level: classData.level,
      room: classData.room,
      teacherName: classData.teacherName,
    });
    setShowAddModal(true);
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!schoolId || !editingClassId) {
      return;
    }
    
    try {
      const { classApi } = await import('@/lib/api');
      await classApi.update(schoolId, editingClassId, formData);
      
      setShowAddModal(false);
      setEditingClassId(null);
      setFormData({ name: "", level: "1", room: "", teacherName: "" });
      fetchClasses();
    } catch (error) {
      console.error("Error updating class:", error);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!schoolId) {
      return;
    }
    
    setClassToDelete(null);
    setDeleteDialogOpen(false);
    
    try {
      const { classApi } = await import('@/lib/api');
      await classApi.delete(schoolId, classId);
      fetchClasses();
      toast.success("Kelas berhasil dihapus");
    } catch (error) {
      console.error("Error deleting class:", error);
      toast.error("Gagal menghapus kelas");
    }
  };
  
  const openDeleteDialog = (classId: string) => {
    setClassToDelete(classId);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="pb-20 md:pb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center mb-4 md:mb-0">
          <BookOpen className="h-7 w-7 text-primary mr-3" />
          <h1 className="text-2xl font-bold text-gray-800 text-center md:text-left">DAFTAR KELAS</h1>
        </div>
        {userRole === 'admin' && (
          <button
            onClick={() => {
              setEditingClassId(null);
              setFormData({ name: "", level: "1", room: "", teacherName: "" });
              setShowAddModal(true);
            }}
            className="flex items-center justify-center w-full md:w-auto gap-2 bg-blue-900 text-white px-5 py-2.5 rounded-lg hover:bg-orange-600 active:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            Tambah Kelas Baru
          </button>
        )}
      </div>

      {classes.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 md:gap-6">
          {classes.map((classData) => (
            <div key={classData.id} className={`${
              classData.id.charCodeAt(0) % 5 === 0 ? "bg-indigo-100" : 
              classData.id.charCodeAt(0) % 5 === 1 ? "bg-emerald-100" : 
              classData.id.charCodeAt(0) % 5 === 2 ? "bg-amber-100" : 
              classData.id.charCodeAt(0) % 5 === 3 ? "bg-rose-100" : 
              "bg-cyan-100"
            } rounded-xl shadow-sm overflow-hidden`}>
              <div className="p-5">
                <div className="flex items-center mb-4">
                  <div className="bg-primary/10 p-2 rounded-full mr-3">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{classData.name}</h3>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">Wali Kelas: {classData.teacherName}</span>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 mt-4">
                  {userRole === 'admin' && (
                    <>
                      <button
                        onClick={() => handleEditClass(classData)}
                        className="p-2 text-blue-600 rounded hover:bg-blue-100 hover:bg-opacity-20"
                        title="Edit Kelas"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => openDeleteDialog(classData.id)}
                        className="p-2 text-red-600 rounded hover:bg-red-100 hover:bg-opacity-20"
                        title="Hapus Kelas"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center">
          <div className="flex flex-col items-center">
            <div className="bg-gray-100 rounded-full p-3 mb-4">
              <BookOpen className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">Belum ada data.</p>
            <button
              onClick={() => {
                setEditingClassId(null);
                setFormData({ name: "", level: "1", room: "", teacherName: "" });
                setShowAddModal(true);
              }}
              className="bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Tambah Kelas
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Class Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-3 sm:mx-auto">
            <div className="flex justify-between items-center p-5 border-b">
              <h3 className="text-lg font-semibold">
                {editingClassId ? "Edit Kelas" : "Tambah Kelas Baru"}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={editingClassId ? handleUpdateClass : handleAddClass}>
              <div className="p-5 space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Kelas
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    placeholder="Contoh: VII A"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-1">
                    Tingkat/Kelas
                  </label>
                  <select
                    id="level"
                    name="level"
                    value={formData.level}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    required
                  >
                    {levelOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        Kelas {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="teacherName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Wali Kelas
                  </label>
                  <input
                    type="text"
                    id="teacherName"
                    name="teacherName"
                    value={formData.teacherName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    placeholder="Nama lengkap wali kelas"
                    required
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 p-5 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-orange-500 active:bg-orange-600 transition-colors"
                >
                  <Save size={18} />
                  {editingClassId ? "Perbarui" : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Konfirmasi Hapus Kelas"
        message="Apakah Anda yakin ingin menghapus kelas ini? Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        cancelLabel="Batal"
        confirmColor="bg-red-500 hover:bg-red-600" 
        onConfirm={() => classToDelete && handleDeleteClass(classToDelete)}
        onCancel={() => setDeleteDialogOpen(false)}
        icon={<AlertTriangle size={20} className="text-red-500" />}
      />
       <hr className="border-t border-none mb-4" />
      <hr className="border-t border-none mb-1" />
    </div>
  );
}
