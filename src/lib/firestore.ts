"use client";

import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  DocumentReference,
  CollectionReference,
  QueryConstraint,
  DocumentData,
  WithFieldValue,
  setDoc,
  limit,
  QueryDocumentSnapshot,
  DocumentSnapshot,
  WhereFilterOp,
  writeBatch,
} from "firebase/firestore";
import { toast } from "react-hot-toast";

// Generic type for Firestore documents
export type FirestoreDocument<T> = T & {
  id: string;
};

// Error handling wrapper
const handleFirestoreError = (error: unknown, operation: string) => {
  console.error(`Error ${operation}:`, error);
  let errorMessage = 'Terjadi kesalahan pada database';
  
  if (error instanceof Error) {
    // Parse Firestore error codes
    if (error.message.includes('permission-denied')) {
      errorMessage = 'Anda tidak memiliki izin untuk operasi ini';
    } else if (error.message.includes('not-found')) {
      errorMessage = 'Data tidak ditemukan';
    } else if (error.message.includes('already-exists')) {
      errorMessage = 'Data sudah ada';
    }
  }
  
  toast.error(errorMessage);
  throw error;
};

/**
 * Create a new document in a collection
 * @param collectionPath Path to the collection
 * @param data Document data to add
 * @returns Promise with the newly created document reference
 */
export const createDocument = async <T extends object>(
  collectionPath: string,
  data: WithFieldValue<T>
) => {
  try {
    const collectionRef = collection(db, collectionPath);
    
    // Ensure data is properly formatted for Firestore
    // Remove any undefined values that can cause Firestore errors
    const cleanData = Object.entries(data as Record<string, any>).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    
    const docWithTimestamp = {
      ...cleanData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collectionRef, docWithTimestamp);
    return docRef;
  } catch (error) {
    handleFirestoreError(error, "creating document");
    throw error;
  }
};

/**
 * Create a document with a specific ID
 * @param collectionPath Path to the collection
 * @param id Document ID
 * @param data Document data
 */
export const createDocumentWithId = async <T extends object>(
  collectionPath: string,
  id: string,
  data: WithFieldValue<T>
) => {
  try {
    const docRef = doc(db, collectionPath, id);
    
    const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    
    const docWithTimestamp = {
      ...cleanData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    await setDoc(docRef, docWithTimestamp);
    return docRef;
  } catch (error) {
    handleFirestoreError(error, "creating document with ID");
    throw error;
  }
};

/**
 * Read a document by ID
 * @param collectionPath Path to the collection
 * @param id Document ID
 * @returns Promise with the document data
 */
export const readDocument = async <T>(
  collectionPath: string,
  id: string
): Promise<FirestoreDocument<T> | null> => {
  try {
    const docRef = doc(db, collectionPath, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as FirestoreDocument<T>;
    } else {
      return null;
    }
  } catch (error) {
    handleFirestoreError(error, "reading document");
    throw error;
  }
};

/**
 * Read all documents from a collection with optional query constraints
 * @param collectionPath Path to the collection
 * @param queryConstraints Array of query constraints (where, orderBy, etc.)
 * @returns Promise with array of document data
 */
export const readDocuments = async <T>(
  collectionPath: string,
  queryConstraints: QueryConstraint[] = []
): Promise<FirestoreDocument<T>[]> => {
  try {
    const collectionRef = collection(db, collectionPath);
    const q = query(collectionRef, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    
    const documents: FirestoreDocument<T>[] = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() } as FirestoreDocument<T>);
    });
    
    return documents;
  } catch (error) {
    handleFirestoreError(error, "reading documents");
    throw error;
  }
};

/**
 * Read documents with pagination support
 * @param collectionPath Path to the collection
 * @param pageSize Number of documents per page
 * @param lastDoc Last document of the previous page (for pagination)
 * @param queryConstraints Additional query constraints
 */
export const readPaginatedDocuments = async <T>(
  collectionPath: string,
  pageSize: number,
  lastDoc?: DocumentSnapshot | null,
  queryConstraints: QueryConstraint[] = []
): Promise<{
  documents: FirestoreDocument<T>[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}> => {
  try {
    const collectionRef = collection(db, collectionPath);
    let q;
    
    if (lastDoc) {
      q = query(
        collectionRef,
        ...queryConstraints,
        limit(pageSize + 1) // Get one extra to check if there are more
      );
    } else {
      q = query(
        collectionRef,
        ...queryConstraints,
        limit(pageSize + 1) // Get one extra to check if there are more
      );
    }
    
    const querySnapshot = await getDocs(q);
    const documents: FirestoreDocument<T>[] = [];
    
    let newLastDoc: DocumentSnapshot | null = null;
    let hasMore = false;
    
    if (!querySnapshot.empty) {
      // Check if we have more results
      if (querySnapshot.docs.length > pageSize) {
        hasMore = true;
        querySnapshot.docs.pop(); // Remove the extra document
      }
      
      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        documents.push({ id: doc.id, ...(docData as object) } as FirestoreDocument<T>);
      });
      
      newLastDoc = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
    }
    
    return { documents, lastDoc: newLastDoc, hasMore };
  } catch (error) {
    handleFirestoreError(error, "reading paginated documents");
    throw error;
  }
};

/**
 * Search documents by field
 * @param collectionPath Path to the collection
 * @param field Field to search in
 * @param operator Comparison operator ('==', '>', '<', etc.)
 * @param value Value to compare against
 */
export const searchDocuments = async <T>(
  collectionPath: string,
  field: string,
  operator: WhereFilterOp,
  value: any,
  additionalConstraints: QueryConstraint[] = []
): Promise<FirestoreDocument<T>[]> => {
  try {
    const collectionRef = collection(db, collectionPath);
    const searchQuery = query(
      collectionRef,
      where(field, operator, value),
      ...additionalConstraints
    );
    
    const querySnapshot = await getDocs(searchQuery);
    
    const documents: FirestoreDocument<T>[] = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() } as FirestoreDocument<T>);
    });
    
    return documents;
  } catch (error) {
    handleFirestoreError(error, "searching documents");
    throw error;
  }
};

/**
 * Update a document by ID
 * @param collectionPath Path to the collection
 * @param id Document ID
 * @param data Updated document data
 * @returns Promise that resolves when the update is complete
 */
export const updateDocument = async <T extends object>(
  collectionPath: string,
  id: string,
  data: Partial<T>
) => {
  try {
    const docRef = doc(db, collectionPath, id);
    const updatedData = {
      ...data,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(docRef, updatedData);
    return true;
  } catch (error) {
    handleFirestoreError(error, "updating document");
    throw error;
  }
};

/**
 * Delete a document by ID
 * @param collectionPath Path to the collection
 * @param id Document ID
 * @returns Promise that resolves when the delete is complete
 */
export const deleteDocument = async (
  collectionPath: string,
  id: string
) => {
  try {
    const docRef = doc(db, collectionPath, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    handleFirestoreError(error, "deleting document");
    throw error;
  }
};

/**
 * Batch write operations
 * @param operations Array of operations to perform
 * @returns Promise that resolves when all operations are complete
 */
export const batchOperations = async (operations: {
  type: 'set' | 'update' | 'delete';
  path: string;
  id: string;
  data?: any;
}[]) => {
  try {
    const batch = writeBatch(db);
    
    operations.forEach(operation => {
      const docRef = doc(db, operation.path, operation.id);
      
      switch (operation.type) {
        case 'set':
          batch.set(docRef, {
            ...operation.data,
            updatedAt: serverTimestamp(),
          });
          break;
        case 'update':
          batch.update(docRef, {
            ...operation.data,
            updatedAt: serverTimestamp(),
          });
          break;
        case 'delete':
          batch.delete(docRef);
          break;
      }
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, "batch operations");
    throw error;
  }
};

/**
 * Get a collection reference
 * @param collectionPath Path to the collection
 * @returns Collection reference
 */
export const getCollectionRef = (collectionPath: string): CollectionReference => {
  return collection(db, collectionPath);
};

/**
 * Get a document reference
 * @param collectionPath Path to the collection
 * @param id Document ID
 * @returns Document reference
 */
export const getDocumentRef = (collectionPath: string, id: string): DocumentReference => {
  return doc(db, collectionPath, id);
};

// Entity-specific helpers

/**
 * Student CRUD Operations
 */
export const StudentService = {
  create: async (schoolId: string, studentData: any) => {
    try {
      const collectionPath = `schools/${schoolId}/students`;
      return await createDocument(collectionPath, studentData);
    } catch (error) {
      handleFirestoreError(error, "creating student");
      throw error;
    }
  },
  
  getById: async (schoolId: string, studentId: string) => {
    try {
      const docPath = `schools/${schoolId}/students`;
      return await readDocument(docPath, studentId);
    } catch (error) {
      handleFirestoreError(error, "fetching student");
      throw error;
    }
  },
  
  getAll: async (schoolId: string, constraints: QueryConstraint[] = []) => {
    try {
      const collectionPath = `schools/${schoolId}/students`;
      return await readDocuments(collectionPath, constraints);
    } catch (error) {
      handleFirestoreError(error, "fetching students");
      throw error;
    }
  },
  
  update: async (schoolId: string, studentId: string, data: any) => {
    try {
      const docPath = `schools/${schoolId}/students`;
      return await updateDocument(docPath, studentId, data);
    } catch (error) {
      handleFirestoreError(error, "updating student");
      throw error;
    }
  },
  
  delete: async (schoolId: string, studentId: string) => {
    try {
      const docPath = `schools/${schoolId}/students`;
      return await deleteDocument(docPath, studentId);
    } catch (error) {
      handleFirestoreError(error, "deleting student");
      throw error;
    }
  },
  
  search: async (schoolId: string, field: string, operator: WhereFilterOp, value: any, additionalConstraints: QueryConstraint[] = []) => {
    try {
      const collectionPath = `schools/${schoolId}/students`;
      return await searchDocuments(collectionPath, field, operator, value, additionalConstraints);
    } catch (error) {
      handleFirestoreError(error, "searching students");
      throw error;
    }
  }
};

/**
 * Class CRUD Operations
 */
export const ClassService = {
  create: async (schoolId: string, classData: any) => {
    try {
      const collectionPath = `schools/${schoolId}/classes`;
      return await createDocument(collectionPath, classData);
    } catch (error) {
      handleFirestoreError(error, "creating class");
      throw error;
    }
  },
  
  getById: async (schoolId: string, classId: string) => {
    try {
      const docPath = `schools/${schoolId}/classes`;
      return await readDocument(docPath, classId);
    } catch (error) {
      handleFirestoreError(error, "fetching class");
      throw error;
    }
  },
  
  getAll: async (schoolId: string, constraints: QueryConstraint[] = []) => {
    try {
      const collectionPath = `schools/${schoolId}/classes`;
      return await readDocuments(collectionPath, constraints);
    } catch (error) {
      handleFirestoreError(error, "fetching classes");
      throw error;
    }
  },
  
  update: async (schoolId: string, classId: string, data: any) => {
    try {
      const docPath = `schools/${schoolId}/classes`;
      return await updateDocument(docPath, classId, data);
    } catch (error) {
      handleFirestoreError(error, "updating class");
      throw error;
    }
  },
  
  delete: async (schoolId: string, classId: string) => {
    try {
      const docPath = `schools/${schoolId}/classes`;
      return await deleteDocument(docPath, classId);
    } catch (error) {
      handleFirestoreError(error, "deleting class");
      throw error;
    }
  }
};

/**
 * Attendance CRUD Operations
 */
export const AttendanceService = {
  create: async (schoolId: string, attendanceData: any) => {
    try {
      const collectionPath = `schools/${schoolId}/attendance`;
      return await createDocument(collectionPath, attendanceData);
    } catch (error) {
      handleFirestoreError(error, "creating attendance record");
      throw error;
    }
  },
  
  getById: async (schoolId: string, attendanceId: string) => {
    try {
      const docPath = `schools/${schoolId}/attendance`;
      return await readDocument(docPath, attendanceId);
    } catch (error) {
      handleFirestoreError(error, "fetching attendance record");
      throw error;
    }
  },
  
  getAll: async (schoolId: string, constraints: QueryConstraint[] = []) => {
    try {
      const collectionPath = `schools/${schoolId}/attendance`;
      return await readDocuments(collectionPath, constraints);
    } catch (error) {
      handleFirestoreError(error, "fetching attendance records");
      throw error;
    }
  },
  
  update: async (schoolId: string, attendanceId: string, data: any) => {
    try {
      const docPath = `schools/${schoolId}/attendance`;
      return await updateDocument(docPath, attendanceId, data);
    } catch (error) {
      handleFirestoreError(error, "updating attendance record");
      throw error;
    }
  },
  
  delete: async (schoolId: string, attendanceId: string) => {
    try {
      const docPath = `schools/${schoolId}/attendance`;
      return await deleteDocument(docPath, attendanceId);
    } catch (error) {
      handleFirestoreError(error, "deleting attendance record");
      throw error;
    }
  },
  
  getByStudentId: async (schoolId: string, studentId: string) => {
    try {
      const collectionPath = `schools/${schoolId}/attendance`;
      return await searchDocuments(collectionPath, "studentId", "==", studentId, [orderBy("timestamp", "desc")]);
    } catch (error) {
      handleFirestoreError(error, "fetching student attendance");
      throw error;
    }
  },
  
  getByDate: async (schoolId: string, date: string) => {
    try {
      const collectionPath = `schools/${schoolId}/attendance`;
      return await searchDocuments(collectionPath, "date", "==", date, [orderBy("timestamp", "desc")]);
    } catch (error) {
      handleFirestoreError(error, "fetching attendance by date");
      throw error;
    }
  }
};

/**
 * School CRUD Operations
 */
export const SchoolService = {
  create: async (schoolData: any, schoolId?: string) => {
    try {
      if (schoolId) {
        return await createDocumentWithId("schools", schoolId, schoolData);
      } else {
        return await createDocument("schools", schoolData);
      }
    } catch (error) {
      handleFirestoreError(error, "creating school");
      throw error;
    }
  },
  
  getById: async (schoolId: string) => {
    try {
      return await readDocument("schools", schoolId);
    } catch (error) {
      handleFirestoreError(error, "fetching school");
      throw error;
    }
  },
  
  update: async (schoolId: string, data: any) => {
    try {
      return await updateDocument("schools", schoolId, data);
    } catch (error) {
      handleFirestoreError(error, "updating school");
      throw error;
    }
  },
  
  delete: async (schoolId: string) => {
    try {
      return await deleteDocument("schools", schoolId);
    } catch (error) {
      handleFirestoreError(error, "deleting school");
      throw error;
    }
  }
};

/**
 * User CRUD Operations
 */
export const UserService = {
  create: async (userId: string, userData: any) => {
    try {
      return await createDocumentWithId("users", userId, userData);
    } catch (error) {
      handleFirestoreError(error, "creating user");
      throw error;
    }
  },
  
  getById: async (userId: string) => {
    try {
      return await readDocument("users", userId);
    } catch (error) {
      handleFirestoreError(error, "fetching user");
      throw error;
    }
  },
  
  update: async (userId: string, data: any) => {
    try {
      return await updateDocument("users", userId, data);
    } catch (error) {
      handleFirestoreError(error, "updating user");
      throw error;
    }
  },
  
  delete: async (userId: string) => {
    try {
      return await deleteDocument("users", userId);
    } catch (error) {
      handleFirestoreError(error, "deleting user");
      throw error;
    }
  },
  
  getBySchoolId: async (schoolId: string) => {
    try {
      return await searchDocuments("users", "schoolId", "==", schoolId);
    } catch (error) {
      handleFirestoreError(error, "fetching school users");
      throw error;
    }
  },
  
  getByRole: async (role: string) => {
    try {
      return await searchDocuments("users", "role", "==", role);
    } catch (error) {
      handleFirestoreError(error, "fetching users by role");
      throw error;
    }
  }
};
