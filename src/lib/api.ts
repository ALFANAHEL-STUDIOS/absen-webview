"use client";

import { 
  StudentService, 
  ClassService, 
  AttendanceService, 
  SchoolService,
  UserService
} from './firestore';
import { FirestoreDocument } from './firestore';
import { orderBy, where } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

// Type definitions
interface StudentData {
  name: string;
  nisn: string;
  class: string;
  gender: string;
  photoUrl?: string;
  birthPlace?: string;
  birthDate?: string;
}

interface Student extends FirestoreDocument<StudentData>, StudentData {}

interface ClassData {
  name: string;
  level: string;
  teacherName: string;
  room?: string;
  studentCount?: number;
}

interface Class extends FirestoreDocument<ClassData>, ClassData {
  name: string;
  level: string;
  teacherName: string;
  room?: string;
  studentCount?: number;
}

/**
 * Student API Service
 */
export const studentApi = {
  // Create a new student
  create: async (schoolId: string, studentData: any) => {
    try {
      const result = await StudentService.create(schoolId, studentData);
      toast.success('Siswa berhasil ditambahkan');
      return result;
    } catch (error) {
      toast.error('Gagal menambahkan siswa');
      throw error;
    }
  },

  // Get all students for a school
  getAll: async (schoolId: string) => {
    try {
      const students = await StudentService.getAll(schoolId, [orderBy('name')]);
      return students;
    } catch (error) {
      toast.error('Gagal mengambil data siswa');
      throw error;
    }
  },

  // Get students by class
  getByClass: async (schoolId: string, className: string) => {
    try {
      const students = await StudentService.search(schoolId, 'class', '==', className, [orderBy('name')]);
      return students;
    } catch (error) {
      toast.error('Gagal mengambil data siswa');
      throw error;
    }
  },
  
  // Get all students joined with classes
  getAllWithClass: async (schoolId: string) => {
    try {
      // Get all students
      const students = await StudentService.getAll(schoolId, [orderBy('name')]) as unknown as Student[];
      
      // Get all classes to create a lookup table
      const classes = await ClassService.getAll(schoolId) as unknown as Class[];
      const classLookup = classes.reduce((acc, cls) => {
        acc[cls.name] = cls;
        return acc;
      }, {} as Record<string, any>);
      
      // Join student data with detailed class data
      const studentsWithClass = students.map((student: Student) => {
        const classInfo = classLookup[student.class] || {};
        return {
          ...student,
          classInfo
        };
      });
      
      return studentsWithClass;
    } catch (error) {
      toast.error('Gagal mengambil data siswa dengan kelas');
      throw error;
    }
  },

  // Get a specific student
  getById: async (schoolId: string, studentId: string) => {
    try {
      const student = await StudentService.getById(schoolId, studentId);
      return student;
    } catch (error) {
      toast.error('Gagal mengambil data siswa');
      throw error;
    }
  },

  // Update student information
  update: async (schoolId: string, studentId: string, data: any) => {
    try {
      await StudentService.update(schoolId, studentId, data);
      toast.success('Data siswa berhasil diperbarui');
      return true;
    } catch (error) {
      toast.error('Gagal memperbarui data siswa');
      throw error;
    }
  },

  // Delete a student
  delete: async (schoolId: string, studentId: string) => {
    try {
      await StudentService.delete(schoolId, studentId);
      toast.success('Siswa berhasil dihapus');
      return true;
    } catch (error) {
      toast.error('Gagal menghapus siswa');
      throw error;
    }
  },

  // Search students
  search: async (schoolId: string, term: string) => {
    try {
      // Search by name (approximate)
      const nameResults = await StudentService.search(
        schoolId,
        'name',
        '>=',
        term,
        [where('name', '<=', term + '\uf8ff'), orderBy('name')]
      );

      // Search by NISN (exact match)
      const nisnResults = await StudentService.search(
        schoolId,
        'nisn',
        '==',
        term
      );

      // Combine results and remove duplicates
      const combinedResults = [...nameResults, ...nisnResults];
      const uniqueResults = combinedResults.filter(
        (v, i, a) => a.findIndex(t => t.id === v.id) === i
      );

      return uniqueResults;
    } catch (error) {
      toast.error('Gagal mencari siswa');
      throw error;
    }
  }
};

/**
 * Class API Service
 */
export const classApi = {
  // Create a new class
  create: async (schoolId: string, classData: any) => {
    try {
      const result = await ClassService.create(schoolId, classData);
      toast.success('Kelas berhasil ditambahkan');
      return result;
    } catch (error) {
      toast.error('Gagal menambahkan kelas');
      throw error;
    }
  },

  // Get all classes for a school
  getAll: async (schoolId: string) => {
    try {
      const classes = await ClassService.getAll(schoolId, [orderBy('level'), orderBy('name')]);
      return classes;
    } catch (error) {
      toast.error('Gagal mengambil data kelas');
      throw error;
    }
  },

  // Get a specific class
  getById: async (schoolId: string, classId: string) => {
    try {
      const classData = await ClassService.getById(schoolId, classId);
      return classData;
    } catch (error) {
      toast.error('Gagal mengambil data kelas');
      throw error;
    }
  },
  
  // Get class with students count
  getClassesWithStudents: async (schoolId: string) => {
    try {
      // Get all classes
      const classes = await ClassService.getAll(schoolId, [orderBy('name')]) as unknown as Class[];
      
      // Get all students to count by class
      const students = await StudentService.getAll(schoolId) as unknown as Student[];
      
      // Count students per class
      const studentCountByClass = students.reduce((acc, student: Student) => {
        const className = student.class;
        if (className) {
          acc[className] = (acc[className] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      
      // Combine class data with student counts
      const classesWithStudents = classes.map((cls: Class) => ({
        ...cls,
        studentCount: studentCountByClass[cls.name] || 0
      }));
      
      return classesWithStudents;
    } catch (error) {
      toast.error('Gagal mengambil data kelas dengan jumlah siswa');
      throw error;
    }
  },

  // Update class information
  update: async (schoolId: string, classId: string, data: any) => {
    try {
      await ClassService.update(schoolId, classId, data);
      toast.success('Data kelas berhasil diperbarui');
      return true;
    } catch (error) {
      toast.error('Gagal memperbarui data kelas');
      throw error;
    }
  },

  // Delete a class
  delete: async (schoolId: string, classId: string) => {
    try {
      await ClassService.delete(schoolId, classId);
      toast.success('Kelas berhasil dihapus');
      return true;
    } catch (error) {
      toast.error('Gagal menghapus kelas');
      throw error;
    }
  }
};

/**
 * Attendance API Service
 */
export const attendanceApi = {
  // Create a new attendance record
  create: async (schoolId: string, attendanceData: any) => {
    try {
      const result = await AttendanceService.create(schoolId, attendanceData);
      toast.success('Data absensi berhasil ditambahkan');
      return result;
    } catch (error) {
      toast.error('Gagal menambahkan data absensi');
      throw error;
    }
  },

  // Get all attendance records
  getAll: async (schoolId: string) => {
    try {
      const records = await AttendanceService.getAll(schoolId, [orderBy('timestamp', 'desc')]);
      return records;
    } catch (error) {
      toast.error('Gagal mengambil data absensi');
      throw error;
    }
  },

  // Get attendance by student
  getByStudent: async (schoolId: string, studentId: string) => {
    try {
      const records = await AttendanceService.getByStudentId(schoolId, studentId);
      return records;
    } catch (error) {
      toast.error('Gagal mengambil data absensi siswa');
      throw error;
    }
  },

  // Get attendance by date
  getByDate: async (schoolId: string, date: string) => {
    try {
      const records = await AttendanceService.getByDate(schoolId, date);
      return records;
    } catch (error) {
      toast.error('Gagal mengambil data absensi');
      throw error;
    }
  },

  // Update attendance record
  update: async (schoolId: string, attendanceId: string, data: any) => {
    try {
      await AttendanceService.update(schoolId, attendanceId, data);
      toast.success('Data absensi berhasil diperbarui');
      return true;
    } catch (error) {
      toast.error('Gagal memperbarui data absensi');
      throw error;
    }
  },

  // Delete attendance record
  delete: async (schoolId: string, attendanceId: string) => {
    try {
      await AttendanceService.delete(schoolId, attendanceId);
      toast.success('Data absensi berhasil dihapus');
      return true;
    } catch (error) {
      toast.error('Gagal menghapus data absensi');
      throw error;
    }
  }
};

/**
 * School API Service
 */
export const schoolApi = {
  // Create a new school
  create: async (schoolData: any, schoolId?: string) => {
    try {
      const result = await SchoolService.create(schoolData, schoolId);
      toast.success('Sekolah berhasil didaftarkan');
      return result;
    } catch (error) {
      toast.error('Gagal mendaftarkan sekolah');
      throw error;
    }
  },

  // Get school details
  getById: async (schoolId: string) => {
    try {
      const school = await SchoolService.getById(schoolId);
      return school;
    } catch (error) {
      toast.error('Gagal mengambil data sekolah');
      throw error;
    }
  },

  // Update school information
  update: async (schoolId: string, data: any) => {
    try {
      await SchoolService.update(schoolId, data);
      toast.success('Data sekolah berhasil diperbarui');
      return true;
    } catch (error) {
      toast.error('Gagal memperbarui data sekolah');
      throw error;
    }
  }
};

/**
 * User API Service
 */
export const userApi = {
  // Create a new user
  create: async (userId: string, userData: any) => {
    try {
      const result = await UserService.create(userId, userData);
      return result;
    } catch (error) {
      toast.error('Gagal membuat profil pengguna');
      throw error;
    }
  },

  // Get user details
  getById: async (userId: string) => {
    try {
      const user = await UserService.getById(userId);
      return user;
    } catch (error) {
      toast.error('Gagal mengambil data pengguna');
      throw error;
    }
  },

  // Update user information
  update: async (userId: string, data: any) => {
    try {
      await UserService.update(userId, data);
      toast.success('Data pengguna berhasil diperbarui');
      return true;
    } catch (error) {
      toast.error('Gagal memperbarui data pengguna');
      throw error;
    }
  },

  // Get users by school
  getBySchool: async (schoolId: string) => {
    try {
      const users = await UserService.getBySchoolId(schoolId);
      return users;
    } catch (error) {
      toast.error('Gagal mengambil data pengguna sekolah');
      throw error;
    }
  },

  // Get users by role
  getByRole: async (role: string) => {
    try {
      const users = await UserService.getByRole(role);
      return users;
    } catch (error) {
      toast.error('Gagal mengambil data pengguna');
      throw error;
    }
  },
  
  // Delete a user
  delete: async (userId: string) => {
    try {
      await UserService.delete(userId);
      toast.success('Pengguna berhasil dihapus');
      return true;
    } catch (error) {
      toast.error('Gagal menghapus pengguna');
      throw error;
    }
  }
};
