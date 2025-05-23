"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Users, PlusCircle, Edit, Trash2, Loader2, Mail, User as UserIcon, Lock, UserPlus, CheckCircle, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  schoolId?: string;
  createdAt?: any;
}

export default function UserManagement() {
  const { userRole, schoolId } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'teacher', // Default role
  });
  const [formLoading, setFormLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Redirect if not admin
  useEffect(() => {
    if (userRole !== 'admin') {
      toast.error("Anda tidak memiliki akses ke halaman ini");
      router.push('/dashboard');
    }
  }, [userRole, router]);

  // Fetch users when component mounts
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const { userApi } = await import('@/lib/api');
        
        let usersData: UserData[] = [];
        if (schoolId) {
          // Fetch users belonging to the school
          usersData = await userApi.getBySchool(schoolId) as UserData[];
        }
        
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Gagal mengambil data pengguna');
      } finally {
        setLoading(false);
      }
    };

    if (userRole === 'admin') {
      fetchUsers();
    }
  }, [userRole, schoolId]);

  const handleAddUser = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'teacher',
    });
    setShowAddModal(true);
  };

  const handleEditUser = (user: UserData) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Don't set password when editing
      role: user.role,
    });
    setShowEditModal(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengguna ini? Tindakan ini tidak dapat dibatalkan.')) {
      return;
    }

    try {
      const { auth } = await import('@/lib/firebase');
      const { userApi } = await import('@/lib/api');
      
      // Delete user from Firebase Authentication and Firestore
      await userApi.delete(userId);
      
      // Update local state
      setUsers(users.filter(user => user.id !== userId));
      toast.success('Pengguna berhasil dihapus');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Gagal menghapus pengguna');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmitAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!schoolId) {
      toast.error('Tidak dapat mengakses data sekolah');
      return;
    }

    try {
      setFormLoading(true);
      
      // Import Firebase functions and create user
      const { createUserWithEmailAndPassword, getAuth } = await import('firebase/auth');
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const { serverTimestamp } = await import('firebase/firestore');
      const auth = getAuth();
      
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      
      const user = userCredential.user;
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        schoolId,
        createdAt: serverTimestamp(),
      });
      
      // Add the new user to local state
      setUsers([...users, {
        id: user.uid,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        schoolId,
      }]);
      
      setShowAddModal(false);
      toast.success('Pengguna berhasil ditambahkan');
    } catch (error: any) {
      console.error('Error adding user:', error);
      let errorMessage = 'Gagal menambahkan pengguna';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email sudah digunakan';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password terlalu lemah';
      }
      
      toast.error(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSubmitEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) {
      return;
    }

    try {
      setFormLoading(true);
      
      const { userApi } = await import('@/lib/api');
      
      // Update user data
      await userApi.update(selectedUser.id, {
        name: formData.name,
        role: formData.role,
      });
      
      // Update local state
      setUsers(users.map(user => 
        user.id === selectedUser.id 
          ? { ...user, name: formData.name, role: formData.role }
          : user
      ));
      
      setShowEditModal(false);
      toast.success('Pengguna berhasil diperbarui');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Gagal memperbarui pengguna');
    } finally {
      setFormLoading(false);
    }
  };
  
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="pb-20 md:pb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center mb-4 md:mb-0">
          <Users className="h-7 w-7 text-primary mr-3" />
          <h1 className="text-2xl font-bold text-gray-800">Manajemen Pengguna</h1>
        </div>
        
         <button
          onClick={handleAddUser}
          className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-orange-500 transition-colors shadow-sm"
        >
          <UserPlus size={18} />
          Tambah Akun Pengguna
        </button>
      </div>

      {/* Search bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Cari pengguna berdasarkan nama atau email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <UserIcon size={18} className="text-gray-400" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        </div>
      ) : filteredUsers.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hak Akses</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : ''}
                        ${user.role === 'teacher' ? 'bg-blue-100 text-blue-800' : ''}
                        ${user.role === 'student' ? 'bg-green-100 text-green-800' : ''}
                      `}>
                        {user.role === 'admin' ? 'Administrator' : 
                         user.role === 'teacher' ? 'Guru' : 'Siswa'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50"
                          title="Edit pengguna"
                        >
                          <Edit size={18} />
                        </button>
                        {/*<button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50"
                          title="Hapus pengguna"
                        >
                          <Trash2 size={18} />
                        </button>*/}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center">
          <div className="flex flex-col items-center">
            <div className="bg-gray-100 rounded-full p-3 mb-4">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">
              {searchQuery ? 'Tidak ada pengguna yang sesuai dengan pencarian' : 'Belum ada data pengguna'}
            </p>
            <button
              onClick={handleAddUser}
              className="bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Tambah Pengguna
            </button>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl shadow-lg max-w-md w-full p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 flex items-center">
                <UserPlus className="mr-2 h-5 w-5 text-primary" />
                Tambah Pengguna Baru
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitAddUser}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    placeholder="Masukkan nama lengkap"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      placeholder="Masukkan E-mail"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      placeholder="Masukkan password"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                    Hak Akses
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    required
                  >
                    <option value="admin">Administrator</option>
                    <option value="teacher">Guru</option>
                    <option value="student">Siswa</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg mr-2 hover:bg-gray-50"
                >
                  Batal
                </button>
                
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-orange-500 active:bg-orange-600 flex items-center gap-2"
                >
                  {formLoading ? (
                    <Loader2 className="animate-spin h-4 w-4 mr-1" />
                  ) : (
                    <UserPlus size={16} />
                  )}
                  {formLoading ? "Menambahkan..." : "Tambah Pengguna"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl shadow-lg max-w-md w-full p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 flex items-center">
                <Edit className="mr-2 h-5 w-5 text-primary" />
                Edit Pengguna
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitEditUser}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    id="edit-name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  />
                </div>
                
                <div>
                  <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      id="edit-email"
                      name="email"
                      type="email"
                      disabled
                      value={formData.email}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Email tidak dapat diubah</p>
                </div>
                
                <div>
                  <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700 mb-1">
                    Hak Akses
                  </label>
                  <select
                    id="edit-role"
                    name="role"
                    disabled
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    required
                  >
                    <option value="admin">Administrator</option>
                    <option value="teacher">Guru</option>
                    <option value="student">Siswa</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg mr-2 hover:bg-gray-50"
                >
                  Batal
                </button>
                
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-orange-500 active:bg-orange-600 flex items-center gap-2"
                >
                  {formLoading ? (
                    <Loader2 className="animate-spin h-4 w-4 mr-1" />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                  {formLoading ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
