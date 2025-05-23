"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Users, Plus, Search, Filter, Edit, Trash2, ArrowLeft, Loader2, AlertTriangle, CheckCircle, X } from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
interface TeacherData {
  id: string;
  name: string;
  nik: string;
  gender: string;
  email: string;
  phone: string;
  birthDate: string;
  telegramId: string;
  role: string;
}
export default function TeacherDataPage() {
  const {
    user,
    userRole,
    schoolId
  } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<TeacherData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentTeacher, setCurrentTeacher] = useState<TeacherData | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    nik: "",
    gender: "male",
    email: "",
    phone: "",
    birthDate: "",
    telegramId: "",
    role: "teacher"
  });

  // Load teacher data
  useEffect(() => {
    // Check authorization
    if (userRole !== 'admin') {
      toast.error("Anda tidak memiliki akses ke halaman ini");
      router.push('/dashboard');
      return;
    }
    const loadTeachers = async () => {
      if (!schoolId) return;
      try {
        setLoading(true);
        const {
          collection,
          query,
          where,
          getDocs
        } = await import('firebase/firestore');
        const {
          db
        } = await import('@/lib/firebase');
        const teachersRef = collection(db, "users");
        const teachersQuery = query(teachersRef, where("schoolId", "==", schoolId), where("role", "in", ["teacher", "staff"]));
        const snapshot = await getDocs(teachersQuery);
        const teachersList: TeacherData[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          teachersList.push({
            id: doc.id,
            name: data.name || "",
            nik: data.nik || "",
            gender: data.gender || "male",
            email: data.email || "",
            phone: data.phone || "",
            birthDate: data.birthDate || "",
            telegramId: data.telegramId || "",
            role: data.role || "teacher"
          });
        });
        setTeachers(teachersList);
        setFilteredTeachers(teachersList);
      } catch (error) {
        console.error("Error loading teachers:", error);
        toast.error("Gagal memuat data guru");
      } finally {
        setLoading(false);
      }
    };
    loadTeachers();
  }, [schoolId, userRole, router]);

  // Apply filters when search or role filter changes
  useEffect(() => {
    let filtered = [...teachers];

    // Apply role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(teacher => teacher.role === roleFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(teacher => teacher.name.toLowerCase().includes(query) || teacher.nik.includes(query) || teacher.email.toLowerCase().includes(query));
    }
    setFilteredTeachers(filtered);
  }, [teachers, searchQuery, roleFilter]);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const {
      name,
      value
    } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add new teacher
  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) {
      toast.error("ID sekolah tidak ditemukan");
      return;
    }
    try {
      const {
        collection,
        addDoc,
        serverTimestamp
      } = await import('firebase/firestore');
      const {
        db
      } = await import('@/lib/firebase');
      const newTeacherData = {
        ...formData,
        schoolId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await addDoc(collection(db, "users"), newTeacherData);

      // Reset form and close modal
      setFormData({
        name: "",
        nik: "",
        gender: "male",
        email: "",
        phone: "",
        birthDate: "",
        telegramId: "",
        role: "teacher"
      });
      setShowAddModal(false);

      // Reload teachers
      const {
        getDocs,
        query,
        where
      } = await import('firebase/firestore');
      const teachersRef = collection(db, "users");
      const teachersQuery = query(teachersRef, where("schoolId", "==", schoolId), where("role", "in", ["teacher", "staff"]));
      const snapshot = await getDocs(teachersQuery);
      const teachersList: TeacherData[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        teachersList.push({
          id: doc.id,
          name: data.name || "",
          nik: data.nik || "",
          gender: data.gender || "male",
          email: data.email || "",
          phone: data.phone || "",
          birthDate: data.birthDate || "",
          telegramId: data.telegramId || "",
          role: data.role || "teacher"
        });
      });
      setTeachers(teachersList);
      toast.success("Data guru berhasil ditambahkan");
    } catch (error) {
      console.error("Error adding teacher:", error);
      toast.error("Gagal menambahkan data guru");
    }
  };

  // Edit teacher
  const handleEditTeacher = (teacher: TeacherData) => {
    setCurrentTeacher(teacher);
    setFormData({
      name: teacher.name,
      nik: teacher.nik,
      gender: teacher.gender,
      email: teacher.email,
      phone: teacher.phone,
      birthDate: teacher.birthDate,
      telegramId: teacher.telegramId,
      role: teacher.role
    });
    setShowEditModal(true);
  };

  // Update teacher
  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !currentTeacher) {
      toast.error("Data tidak lengkap");
      return;
    }
    try {
      const {
        doc,
        updateDoc,
        serverTimestamp
      } = await import('firebase/firestore');
      const {
        db
      } = await import('@/lib/firebase');
      const teacherRef = doc(db, "users", currentTeacher.id);
      const updatedData = {
        ...formData,
        updatedAt: serverTimestamp()
      };
      await updateDoc(teacherRef, updatedData);

      // Close modal
      setShowEditModal(false);
      setCurrentTeacher(null);

      // Reload teachers
      const {
        collection,
        getDocs,
        query,
        where
      } = await import('firebase/firestore');
      const teachersRef = collection(db, "users");
      const teachersQuery = query(teachersRef, where("schoolId", "==", schoolId), where("role", "in", ["teacher", "staff"]));
      const snapshot = await getDocs(teachersQuery);
      const teachersList: TeacherData[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        teachersList.push({
          id: doc.id,
          name: data.name || "",
          nik: data.nik || "",
          gender: data.gender || "male",
          email: data.email || "",
          phone: data.phone || "",
          birthDate: data.birthDate || "",
          telegramId: data.telegramId || "",
          role: data.role || "teacher"
        });
      });
      setTeachers(teachersList);
      toast.success("Data guru berhasil diperbarui");
    } catch (error) {
      console.error("Error updating teacher:", error);
      toast.error("Gagal memperbarui data guru");
    }
  };

  // Delete teacher confirmation
  const handleDeleteConfirmation = (teacher: TeacherData) => {
    setCurrentTeacher(teacher);
    setShowDeleteModal(true);
  };

  // Delete teacher
  const handleDeleteTeacher = async () => {
    if (!currentTeacher) {
      toast.error("Data tidak lengkap");
      return;
    }
    try {
      const {
        doc,
        deleteDoc
      } = await import('firebase/firestore');
      const {
        db
      } = await import('@/lib/firebase');
      await deleteDoc(doc(db, "users", currentTeacher.id));

      // Close modal
      setShowDeleteModal(false);
      setCurrentTeacher(null);

      // Update local state
      setTeachers(prev => prev.filter(t => t.id !== currentTeacher.id));
      toast.success("Data guru berhasil dihapus");
    } catch (error) {
      console.error("Error deleting teacher:", error);
      toast.error("Gagal menghapus data guru");
    }
  };
  return <div className="pb-20 md:pb-6" data-unique-id="aea7ed76-67fa-4577-8ee4-eb332f956d20" data-file-name="app/dashboard/absensi-guru/data/page.tsx" data-dynamic-text="true">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6" data-unique-id="77465f9a-a5f3-4527-8be7-430d02387ee2" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
        <div className="flex items-center mb-4 md:mb-0" data-unique-id="c2b2ec83-8982-425f-a9c9-d9968ac7665b" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
          <Link href="/dashboard/absensi-guru" className="p-2 mr-2 hover:bg-gray-100 rounded-full" data-unique-id="f3e53a66-5b09-44fd-9630-a0431a6b94d8" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-800" data-unique-id="8628873d-8d56-4dba-862d-e261dfec3e03" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="16029354-3920-40f7-af5a-e22e7c81f499" data-file-name="app/dashboard/absensi-guru/data/page.tsx">Data Akun Absensi GTK</span></h1>
        </div>
        
        {/*<button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary hover:bg-opacity-90 transition-colors w-full md:w-auto justify-center" data-unique-id="900b3954-1450-44c7-a5d2-a30ca2d7c6fa" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
          <Plus size={18} />
          <span data-unique-id="079db0f1-ac7e-4720-9cd4-043448e0a0c2" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="50062e7a-20f0-4eaa-926a-333923fbd305" data-file-name="app/dashboard/absensi-guru/data/page.tsx">Tambah Data</span></span>
        </button>*/}
      </div>
      
      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6" data-unique-id="dce44a1d-dbf2-4517-b3e9-9ff61eea956f" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-unique-id="4b62e445-b0a3-4ef2-a72d-f55eef73d16a" data-file-name="app/dashboard/absensi-guru/data/page.tsx" data-dynamic-text="true">
          {/* Search */}
          <div className="md:col-span-2" data-unique-id="a3aba4f4-6b93-46ff-a985-d60eac5a6a9e" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
            <div className="relative" data-unique-id="01fb57b8-ee9d-40e3-9bdc-8733d21aff66" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input type="text" placeholder="Cari nama, NIK, atau email..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} data-unique-id="eab7d619-a869-454c-baff-6f04405611a5" data-file-name="app/dashboard/absensi-guru/data/page.tsx" />
            </div>
          </div>
          
          {/* Role Filter */}
          <div data-unique-id="0eed63d5-dd90-47f5-bb0b-363578fb8ad3" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
            <div className="relative" data-unique-id="9e595e9a-8cbc-4f38-9d20-4ffcfbcb5ad2" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <select className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary appearance-none bg-white" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} data-unique-id="082a634f-74e2-4a96-a4c3-8653e0688fe8" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                <option value="all" data-unique-id="c33f615f-8e4a-40bb-a04e-a08ee581e5a0" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="953a08b4-669e-4a57-855f-6e76bdc6ccab" data-file-name="app/dashboard/absensi-guru/data/page.tsx">Semua Peran</span></option>
                <option value="teacher" data-unique-id="190c6cb1-1468-4f66-918e-ba4054134490" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="ca571f9e-6f79-4153-962f-2143865dc875" data-file-name="app/dashboard/absensi-guru/data/page.tsx">Guru</span></option>
                <option value="staff" data-unique-id="cceea4dd-4b6d-456d-aaef-d599f7efc15a" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="18f28f8c-dd42-4f4d-bbaa-c06a039a7f25" data-file-name="app/dashboard/absensi-guru/data/page.tsx">Tenaga Kependidikan</span></option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Teacher List */}
      {loading ? <div className="flex justify-center items-center h-64" data-unique-id="0d113769-b562-4148-a36a-c2f8a674e48c" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
        </div> : filteredTeachers.length > 0 ? <div className="bg-white rounded-xl shadow-sm overflow-hidden" data-unique-id="b91340fb-4ddf-4258-9a6f-28e952e299c0" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
          <div className="overflow-x-auto" data-unique-id="d4bd94c6-f828-4e8b-b4a1-4c3732a38d44" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
            <table className="w-full" data-unique-id="60ae1695-30ca-415e-9744-c8948f596964" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
              <thead data-unique-id="367937e5-be72-4481-ae33-62399ded424a" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                <tr className="bg-gray-50 text-left" data-unique-id="6e8ca1c2-6801-4d0e-9014-60cd6f7da254" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider" data-unique-id="c0896649-dbde-4777-bb15-e9894227cea7" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="b96d650a-368e-418d-bad7-16c0a770a77f" data-file-name="app/dashboard/absensi-guru/data/page.tsx">Nama</span></th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider" data-unique-id="a2fef97c-10c7-4df2-9a26-4ec93a791431" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="cbafd7eb-3acd-4f08-9f38-6d042545ed50" data-file-name="app/dashboard/absensi-guru/data/page.tsx">NIK</span></th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider" data-unique-id="859d80a7-2bca-48e3-bdba-bf4fe44a4865" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="16ad8ca7-d128-4132-9416-e2d306ef90f8" data-file-name="app/dashboard/absensi-guru/data/page.tsx">Jabatan</span></th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider" data-unique-id="1e17b8f8-d481-4004-98c5-4cbe7b352187" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="40f7e692-db03-44dd-a49a-58a09ed93935" data-file-name="app/dashboard/absensi-guru/data/page.tsx">Email</span></th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider" data-unique-id="3ad92d60-6f13-46db-b010-5d18b9f205c9" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="3eb32dd2-9a0d-48fe-bc94-756a05f99313" data-file-name="app/dashboard/absensi-guru/data/page.tsx">No. Telepon</span></th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider" data-unique-id="d746d15a-8cbc-44a7-b827-8b8dae483ad4" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="15f3cdcd-4b69-4669-9a49-47801634a393" data-file-name="app/dashboard/absensi-guru/data/page.tsx">Aksi</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200" data-unique-id="bed9b96d-c4ac-4fcd-83a3-d2bb0e859207" data-file-name="app/dashboard/absensi-guru/data/page.tsx" data-dynamic-text="true">
                {filteredTeachers.map(teacher => <tr key={teacher.id} className="hover:bg-gray-50" data-unique-id="39472593-0477-4b60-aaa8-94b4bf9c3dfe" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                    <td className="px-6 py-4 whitespace-nowrap" data-unique-id="0b1d819d-1e66-41e1-ae2e-271512a0c6fc" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                      <div className="flex items-center" data-unique-id="a4c5a8bc-05e5-462e-ab61-ae15a2caf3ba" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                        <div data-unique-id="96f3dba8-fbfe-4d1f-a6d1-387f01583c9c" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                          <div className="text-sm font-medium text-gray-900" data-unique-id="d9f3eff5-688b-477d-90fd-83479dd0d3d0" data-file-name="app/dashboard/absensi-guru/data/page.tsx" data-dynamic-text="true">{teacher.name}</div>
                          <div className="text-xs text-gray-500" data-unique-id="321bae58-057d-4596-ab3e-60339bec1108" data-file-name="app/dashboard/absensi-guru/data/page.tsx" data-dynamic-text="true">
                            {teacher.gender === 'male' ? 'Laki-laki' : 'Perempuan'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-unique-id="9c6fc700-5b9b-4c2a-b2df-d6d2a4768058" data-file-name="app/dashboard/absensi-guru/data/page.tsx" data-dynamic-text="true">{teacher.nik}</td>
                    <td className="px-6 py-4 whitespace-nowrap" data-unique-id="97899ca1-15dd-4ac6-89b0-db83050feed0" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${teacher.role === 'teacher' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`} data-unique-id="9bce9150-23bb-443a-a365-b962b4e67cff" data-file-name="app/dashboard/absensi-guru/data/page.tsx" data-dynamic-text="true">
                        {teacher.role === 'teacher' ? 'Guru' : 'Tendik'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-unique-id="c108ddb6-ef9c-42e7-b2d5-59c5ee159f7b" data-file-name="app/dashboard/absensi-guru/data/page.tsx" data-dynamic-text="true">{teacher.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-unique-id="3265c353-f99d-44f9-ab3a-6b7e2a79a452" data-file-name="app/dashboard/absensi-guru/data/page.tsx" data-dynamic-text="true">{teacher.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" data-unique-id="b322eddb-43e0-4a7b-b562-119104c48866" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                      <div className="flex space-x-2" data-unique-id="8ac78c22-4fa9-4d41-bc34-0ee64204e92d" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                        <button onClick={() => handleEditTeacher(teacher)} className="text-blue-600 hover:text-blue-900" data-unique-id="5697a2b7-2695-4333-b2ae-18f301578ea9" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDeleteConfirmation(teacher)} className="text-red-600 hover:text-red-900" data-unique-id="e8d95216-ba1c-4a41-a0a2-478ab5d9fd1b" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </div> : <div className="bg-white rounded-xl shadow-sm p-10 text-center" data-unique-id="0528479f-1935-4708-a2e8-ad27be1d0d8a" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
          <div className="flex flex-col items-center" data-unique-id="8c440565-c53c-4215-9b06-913c752cdbac" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4" data-unique-id="4d3f2eaf-291e-4e7a-a47d-ff143e28a41a" data-file-name="app/dashboard/absensi-guru/data/page.tsx" data-dynamic-text="true">
              {searchQuery || roleFilter !== "all" ? "Tidak ada guru yang sesuai dengan pencarian atau filter" : "Belum ada data guru. Tambahkan data guru baru."}
            </p>
            <button onClick={() => setShowAddModal(true)} className="bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary hover:bg-opacity-90 transition-colors" data-unique-id="48f9a46d-409d-4dd3-87cd-59eea73890f5" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
              <Plus className="h-5 w-5 inline-block mr-2" /><span className="editable-text" data-unique-id="02480ce4-0ba4-490c-a6b6-2ff9b6dbb386" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
              Tambah Data Guru
            </span></button>
          </div>
        </div>}
      
      {/* Add Teacher Modal */}
      {showAddModal && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" data-unique-id="324100fb-d26f-44d8-8b01-c5bac7a0573e" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
          <motion.div className="bg-white rounded-xl shadow-lg max-w-2xl w-full" initial={{
        opacity: 0,
        scale: 0.9
      }} animate={{
        opacity: 1,
        scale: 1
      }} exit={{
        opacity: 0,
        scale: 0.9
      }} data-unique-id="812d5d84-6831-4c7a-b8e2-8e024ce11273" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
            <div className="flex items-center justify-between p-6 border-b" data-unique-id="465edaaa-3d06-4f0e-bac4-fddab9b80772" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
              <h3 className="text-lg font-semibold" data-unique-id="77b47a6d-e5aa-4d97-ab66-5c4f5f95fe4b" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="c93e2fad-73a8-4436-92a2-2e9255ed82f0" data-file-name="app/dashboard/absensi-guru/data/page.tsx">Tambah Data Guru/Tendik</span></h3>
              <button onClick={() => setShowAddModal(false)} data-unique-id="d369ec5f-fee2-4e1d-96a6-2da1bd1107da" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                <X size={24} className="text-gray-500 hover:text-gray-700" />
              </button>
            </div>
            
            <form onSubmit={handleAddTeacher} data-unique-id="fb127a23-e5e9-460f-805d-e729d37be917" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4" data-unique-id="fb517e4c-9618-447a-baca-0274c0628d81" data-file-name="app/dashboard/absensi-guru/data/page.tsx" data-dynamic-text="true">
                {/* Name */}
                <div data-unique-id="ec89d8ec-8fdd-4c45-9350-5936f2596fbc" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="8e86163f-f8a1-4d9e-8331-25a1ecd32371" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="88fe497c-ab86-4f23-98ad-210e0396acc3" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                    Nama Lengkap
                  </span></label>
                  <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" required data-unique-id="5265c50c-6011-4d55-a3c1-baa1eadb0e55" data-file-name="app/dashboard/absensi-guru/data/page.tsx" />
                </div>
                
                {/* NIK */}
                <div data-unique-id="56998c76-e945-4f81-a284-28e23444e7ea" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                  <label htmlFor="nik" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="a28f8b4b-aea7-43dc-91a9-aa684405098b" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="9650d73b-35eb-45b7-95b3-ff8a48875531" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                    NIK/NIP
                  </span></label>
                  <input type="text" id="nik" name="nik" value={formData.nik} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" required data-unique-id="808ca01e-3176-4433-b440-77f6a971209a" data-file-name="app/dashboard/absensi-guru/data/page.tsx" />
                </div>
                
                {/* Gender */}
                <div data-unique-id="7ae9ab85-7977-4c81-8356-9083d427b20e" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="79bcfe8e-7b3b-4797-a837-3755bcaff2b0" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="db7bccba-f17f-4103-b131-884f27ab98f7" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                    Jenis Kelamin
                  </span></label>
                  <select id="gender" name="gender" value={formData.gender} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" required data-unique-id="4af0fed7-40a9-4a84-87fe-596611883136" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                    <option value="male" data-unique-id="1078de84-7b02-464e-8b8f-ca93e95bab91" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="a5f85c5c-e10f-4428-9b7a-93be3d3b15ab" data-file-name="app/dashboard/absensi-guru/data/page.tsx">Laki-laki</span></option>
                    <option value="female" data-unique-id="6d4bef74-e1a5-4ed2-a6ad-a9bfb5f8b92e" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="670c4b0f-5a2a-4970-be94-80675c3d9cd6" data-file-name="app/dashboard/absensi-guru/data/page.tsx">Perempuan</span></option>
                  </select>
                </div>
                
                {/* Email */}
                <div data-unique-id="5f6a98a0-84d9-4fdb-af4e-83a2f0d7008c" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="8b294f80-8d58-4784-961a-1c3217663128" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="fe2db275-9166-4ea2-8ff9-145cba875dce" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                    Email
                  </span></label>
                  <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" required data-unique-id="76788a7c-c098-470e-828f-6f2638b865d5" data-file-name="app/dashboard/absensi-guru/data/page.tsx" />
                </div>
                
                {/* Phone */}
                <div data-unique-id="ea7a617a-025f-4da4-8e58-484972f624ec" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="e60bb236-efef-4d22-a2b9-8a6e324dff56" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="d4e472ec-f2e0-478d-b002-59e8c57be952" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                    No. Telepon
                  </span></label>
                  <input type="text" id="phone" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" data-unique-id="bec2a40c-6c3f-402f-a30e-be05a3587c80" data-file-name="app/dashboard/absensi-guru/data/page.tsx" />
                </div>
                
                {/* Birth Date */}
                <div data-unique-id="c687719f-ef0d-45d1-83ee-8329c4a49c4c" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                  <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="5940e97f-20bf-4176-a173-9a1b44e3e74f" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="4da892ad-0d95-4337-991f-fbec5409195f" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                    Tanggal Lahir
                  </span></label>
                  <input type="date" id="birthDate" name="birthDate" value={formData.birthDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" data-unique-id="6e65cae1-6f77-45b4-81e3-c0a0d5480423" data-file-name="app/dashboard/absensi-guru/data/page.tsx" />
                </div>
                
                {/* Telegram ID */}
                <div data-unique-id="475421e6-cec7-484f-957a-94a9ef3ebc57" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                  <label htmlFor="telegramId" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="0dde0610-77a3-4024-86f9-bc4d8d2e062f" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="898f4466-8767-4199-b440-e076d428cc2b" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                    ID Telegram
                  </span></label>
                  <input type="text" id="telegramId" name="telegramId" value={formData.telegramId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" data-unique-id="bf296297-bbcc-4c84-81b7-61508918d10d" data-file-name="app/dashboard/absensi-guru/data/page.tsx" />
                </div>
                
                {/* Role */}
                <div data-unique-id="047774de-2b2d-4976-b4be-efb7b8d7c70d" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="7bc82bad-e96f-4ff1-98e8-6c4d475c52fa" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="36a845d8-4d0c-4cc3-aa14-baecb33ff98d" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                    Jabatan
                  </span></label>
                  <select id="role" name="role" value={formData.role} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" required data-unique-id="c02adea9-11b0-472b-831f-9d10ff5a19cf" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                    <option value="teacher" data-unique-id="c3df694e-7237-49bb-8b35-2040ed190273" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="c33912e8-3eba-4da9-a41f-b3a5c567e723" data-file-name="app/dashboard/absensi-guru/data/page.tsx">Guru</span></option>
                    <option value="staff" data-unique-id="6da167f2-7130-4cae-88f6-514a12807373" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="a2067de6-da27-4de0-bf9c-f0ed7cba833f" data-file-name="app/dashboard/absensi-guru/data/page.tsx">Tenaga Kependidikan</span></option>
                  </select>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 flex justify-end" data-unique-id="48792b74-2410-4072-bf9f-3ecb9c43c440" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 mr-3 hover:bg-gray-50" data-unique-id="e0fdc24e-dee0-4756-84ca-5a62276689e2" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="bf7a07dd-1acb-452d-a900-1bdf76862712" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                  Batal
                </span></button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary hover:bg-opacity-90" data-unique-id="4d42a932-8162-466b-ace6-6f2ef2472303" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="c43c3d5c-28ab-4e93-9916-fc28da3ebfa9" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                  Simpan
                </span></button>
              </div>
            </form>
          </motion.div>
        </div>}
      
      {/* Edit Teacher Modal */}
      {showEditModal && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" data-unique-id="85ed550a-b69b-48cb-b3e6-585b363d4caa" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
          <motion.div className="bg-white rounded-xl shadow-lg max-w-2xl w-full" initial={{
        opacity: 0,
        scale: 0.9
      }} animate={{
        opacity: 1,
        scale: 1
      }} exit={{
        opacity: 0,
        scale: 0.9
      }} data-unique-id="b6a24c57-30c6-4f26-83be-5dd4c5781990" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
            <div className="flex items-center justify-between p-6 border-b" data-unique-id="a05ddbb3-249a-44af-a7f3-5baba846c58b" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
              <h3 className="text-lg font-semibold" data-unique-id="ce54bf4e-9ab4-4f5a-b1ee-6baa061c7828" data-file-name="app/dashboard/absensi-guru/data/page.tsx" data-dynamic-text="true"><span className="editable-text" data-unique-id="bc44c7ef-be36-4792-a114-fc0b2008d789" data-file-name="app/dashboard/absensi-guru/data/page.tsx">Edit Data </span>{currentTeacher?.name}</h3>
              <button onClick={() => setShowEditModal(false)} data-unique-id="341483a7-92f8-4297-b7d3-bd1ff1b81d34" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                <X size={24} className="text-gray-500 hover:text-gray-700" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateTeacher} data-unique-id="1501725a-ec2a-4e9b-8d2f-2e17b7bd0290" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4" data-unique-id="057599ac-734b-4793-9ed9-5e8817ccfa00" data-file-name="app/dashboard/absensi-guru/data/page.tsx" data-dynamic-text="true">
                {/* Name */}
                <div data-unique-id="658d19ac-566e-4b81-92a5-93402b62b8d4" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                  <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="5954b7da-29df-47a6-a735-793e2cf5835a" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="fc06e025-f24a-483a-8065-d0e71620a6f1" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                    Nama Lengkap
                  </span></label>
                  <input type="text" id="edit-name" name="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" required data-unique-id="468f3771-40d0-4351-a515-ab89b9e3dd00" data-file-name="app/dashboard/absensi-guru/data/page.tsx" />
                </div>
                
                {/* NIK */}
                <div data-unique-id="75b608e0-7ec3-4a9e-911f-97ee6a937c01" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                  <label htmlFor="edit-nik" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="bafa0138-b045-4dd1-8372-fe10d6e1dd2a" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="5ca85bb4-60aa-41a2-a3f2-0404f39937e0" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                    NIK/NIP
                  </span></label>
                  <input type="text" id="edit-nik" name="nik" value={formData.nik} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" required data-unique-id="99754ce6-8a66-4a61-9c96-af11d2c39e24" data-file-name="app/dashboard/absensi-guru/data/page.tsx" />
                </div>
                
                {/* Gender */}
                <div data-unique-id="ab18defc-27f0-4de1-af39-9168a60a9a87" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                  <label htmlFor="edit-gender" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="d082d13d-21e9-4e75-ac9c-e92d29afb0de" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="fb866bda-ba4a-4039-859e-b5c763aef8fb" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                    Jenis Kelamin
                  </span></label>
                  <select id="edit-gender" name="gender" value={formData.gender} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" required data-unique-id="5c4d4fed-0afd-431f-ba3f-5380c7b02b06" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                    <option value="male" data-unique-id="80cbde64-4a7c-4d31-95d7-857935db4b87" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="c9303d20-50f9-4e08-9aa1-c6c1f524e5d9" data-file-name="app/dashboard/absensi-guru/data/page.tsx">Laki-laki</span></option>
                    <option value="female" data-unique-id="fac70f94-dbfb-48bc-bcdb-aa32d7c52606" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="4c87db44-d601-48fe-a193-599ecb3ec5d9" data-file-name="app/dashboard/absensi-guru/data/page.tsx">Perempuan</span></option>
                  </select>
                </div>
                
                {/* Email */}
                <div data-unique-id="47b58606-53e6-4af0-a401-9617f06e5e6a" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                  <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="7d50bdfe-670e-4127-8f33-e41d7e966fc8" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="24acf31d-5f2c-4050-a6e6-b1532a7f62f9" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                    Email
                  </span></label>
                  <input type="email" id="edit-email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" required data-unique-id="ccd17d80-5bd4-4742-b289-2aaa67530a42" data-file-name="app/dashboard/absensi-guru/data/page.tsx" />
                </div>
                
                {/* Phone */}
                <div data-unique-id="188221fb-49be-4078-b6e6-9cfcbf46d346" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                  <label htmlFor="edit-phone" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="151c38ce-bf0e-4da0-91a7-0ec04cc1ad20" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="9e505a0e-fc9c-4f9d-a8a5-6a8bca867610" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                    No. Telepon
                  </span></label>
                  <input type="text" id="edit-phone" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" data-unique-id="bc9fb2bf-ca42-487c-b195-1f7533f88072" data-file-name="app/dashboard/absensi-guru/data/page.tsx" />
                </div>
                
                {/* Birth Date */}
                <div data-unique-id="57021235-6503-4540-8bc5-5fd5865c9757" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                  <label htmlFor="edit-birthDate" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="071ef931-67cc-4e43-befe-4539d1a9fcc4" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="f63e0e73-9310-4c7e-8caf-897d51839314" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                    Tanggal Lahir
                  </span></label>
                  <input type="date" id="edit-birthDate" name="birthDate" value={formData.birthDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" data-unique-id="f9cbda07-6565-447e-90a2-c76fa2da9583" data-file-name="app/dashboard/absensi-guru/data/page.tsx" />
                </div>
                
                {/* Telegram ID */}
                <div data-unique-id="f06a24a7-f779-426e-bf5b-4d522143d6a6" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                  <label htmlFor="edit-telegramId" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="bd50fbfc-d6f9-4a52-af14-d79f857fe818" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="c1676c37-62b3-4699-ab5c-9c8a3135ac8c" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                    ID Telegram
                  </span></label>
                  <input type="text" id="edit-telegramId" name="telegramId" value={formData.telegramId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" data-unique-id="213ebc52-cb8f-42b0-ba3b-3799c857f889" data-file-name="app/dashboard/absensi-guru/data/page.tsx" />
                </div>
                
                {/* Role */}
                <div data-unique-id="205782d8-757e-4920-a090-ad34a600761b" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                  <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="d233cd65-8e95-4170-9d46-a2813e34bf86" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="e87cd296-1020-4772-80b9-5130dfd2f5e8" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                    Jabatan
                  </span></label>
                  <select id="edit-role" name="role" value={formData.role} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" required data-unique-id="16ae6749-0f53-4561-bc53-af8c232541f3" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                    <option value="teacher" data-unique-id="26874f4e-093d-47b6-b399-ffe71086bf1a" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="6ee62ef7-0b47-4de2-ba15-24967178b36b" data-file-name="app/dashboard/absensi-guru/data/page.tsx">Guru</span></option>
                    <option value="staff" data-unique-id="d77fa34a-1987-42f7-8031-5acbfd7e5876" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="468ab59e-106f-4718-906d-7840feb41540" data-file-name="app/dashboard/absensi-guru/data/page.tsx">Tenaga Kependidikan</span></option>
                  </select>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 flex justify-end" data-unique-id="a6d32900-3f05-43bb-a3ac-adcd267a95f0" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 mr-3 hover:bg-gray-50" data-unique-id="39f9436a-8b18-40e5-a55d-c006e7f9e98b" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="6e25c895-ca22-4a7d-ac2a-7370fbcd4a2b" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                  Batal
                </span></button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary hover:bg-opacity-90" data-unique-id="cfbe7491-b7d4-448c-8d9a-732b8eecdf43" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="56552830-0fe9-45cb-b653-55c8822d36d0" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                  Perbarui
                </span></button>
              </div>
            </form>
          </motion.div>
        </div>}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" data-unique-id="57f8af41-062d-4652-93b8-46545401e116" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
          <motion.div className="bg-white rounded-xl shadow-lg max-w-md w-full" initial={{
        opacity: 0,
        scale: 0.9
      }} animate={{
        opacity: 1,
        scale: 1
      }} exit={{
        opacity: 0,
        scale: 0.9
      }} data-unique-id="00154079-54c1-4aad-b38a-72d0d2907f41" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
            <div className="p-6" data-unique-id="f0c1a57c-1a4a-42bc-a341-ca2e518731f3" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
              <div className="flex items-center mb-4" data-unique-id="62d2e4f3-3887-401e-8c83-03ea21b775b7" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                <div className="bg-red-100 p-2 rounded-full mr-4" data-unique-id="34eac12f-8bcf-40e0-a494-c544712f6e82" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold" data-unique-id="fbb7af50-f160-4c5d-8a07-a3f2cc674c53" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="bc7ca87a-f34a-4767-b6bc-2379dc128701" data-file-name="app/dashboard/absensi-guru/data/page.tsx">Konfirmasi Hapus</span></h3>
              </div>
              
              <p className="text-gray-600 mb-6" data-unique-id="150d08fd-fdbf-42f6-8619-0a918b5e590b" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="aca35c16-c0f4-435c-8352-417423b30a32" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                Apakah Anda yakin ingin menghapus data guru </span><strong data-unique-id="b98964ff-6d8b-469f-b993-d6affe160e39" data-file-name="app/dashboard/absensi-guru/data/page.tsx" data-dynamic-text="true">{currentTeacher?.name}</strong><span className="editable-text" data-unique-id="c32b10c4-fb92-4d94-9760-0f27d95284bc" data-file-name="app/dashboard/absensi-guru/data/page.tsx">? 
                Tindakan ini tidak dapat dibatalkan.
              </span></p>
              
              <div className="flex justify-end gap-3" data-unique-id="1d4e35ad-53f3-4484-8fbb-2b22fd0a4ef7" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                <button type="button" onClick={() => setShowDeleteModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50" data-unique-id="4d766879-2ffa-409a-a2cc-a79b4aaa7957" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="79f6bbbe-e760-4892-a7ce-0047ed619d51" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                  Batal
                </span></button>
                <button type="button" onClick={handleDeleteTeacher} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700" data-unique-id="cbc0c649-e82e-4d9c-834e-db415e4be9cb" data-file-name="app/dashboard/absensi-guru/data/page.tsx"><span className="editable-text" data-unique-id="bac6fb3f-0172-43f3-8e7e-16b8314c366d" data-file-name="app/dashboard/absensi-guru/data/page.tsx">
                  Hapus
                </span></button>
              </div>
            </div>
          </motion.div>
        </div>}
    </div>;
}
