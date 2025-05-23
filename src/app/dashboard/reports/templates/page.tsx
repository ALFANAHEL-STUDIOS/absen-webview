"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  ArrowLeft, 
  Copy, 
  Eye, 
  Settings,
  Loader2,
  CheckCircle,
  AlertTriangle,
  X
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import ReportTemplateDesigner from "@/components/ReportTemplateDesigner";

export default function ReportTemplatesPage() {
  const { schoolId, userRole } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDesigner, setShowDesigner] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch templates from localStorage or Firestore
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        
        // Try to get templates from localStorage first
        const storedTemplates = localStorage.getItem(`reportTemplates_${schoolId}`);
        if (storedTemplates) {
          setTemplates(JSON.parse(storedTemplates));
          setLoading(false);
          return;
        }
        
        // If no templates in localStorage, try Firestore
        if (schoolId) {
          const { collection, query, getDocs, orderBy } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');
          
          const templatesRef = collection(db, `schools/${schoolId}/reportTemplates`);
          const templatesQuery = query(templatesRef, orderBy('createdAt', 'desc'));
          const snapshot = await getDocs(templatesQuery);
          
          const fetchedTemplates: any[] = [];
          snapshot.forEach((doc) => {
            fetchedTemplates.push({
              id: doc.id,
              ...doc.data()
            });
          });
          
          setTemplates(fetchedTemplates);
          
          // Save to localStorage for faster access next time
          localStorage.setItem(`reportTemplates_${schoolId}`, JSON.stringify(fetchedTemplates));
        }
      } catch (error) {
        console.error("Error fetching templates:", error);
        toast.error("Gagal mengambil template laporan");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTemplates();
  }, [schoolId]);

  // Create a new template
  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setShowDesigner(true);
  };

  // Edit an existing template
  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setShowDesigner(true);
  };

  // Save template (new or edited)
  const handleSaveTemplate = async (templateData: any) => {
    try {
      setSaving(true);
      
      const isEditing = !!editingTemplate;
      const templateId = isEditing ? editingTemplate.id : `template_${Date.now()}`;
      const newTemplate = {
        id: templateId,
        ...templateData,
        updatedAt: new Date().toISOString(),
        createdAt: isEditing ? editingTemplate.createdAt : new Date().toISOString()
      };
      
      // Save to Firestore if available
      if (schoolId) {
        try {
          const { doc, setDoc, collection } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');
          
          await setDoc(doc(db, `schools/${schoolId}/reportTemplates`, templateId), newTemplate);
        } catch (firestoreError) {
          console.error("Error saving to Firestore:", firestoreError);
          // Continue with localStorage save even if Firestore fails
        }
      }
      
      // Update local state
      setTemplates(prev => {
        const updatedTemplates = isEditing
          ? prev.map(t => t.id === templateId ? newTemplate : t)
          : [...prev, newTemplate];
          
        // Save to localStorage
        localStorage.setItem(`reportTemplates_${schoolId}`, JSON.stringify(updatedTemplates));
        
        return updatedTemplates;
      });
      
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setShowDesigner(false);
      }, 1500);
      
      toast.success(isEditing ? "Template berhasil diperbarui" : "Template baru berhasil dibuat");
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Gagal menyimpan template");
    } finally {
      setSaving(false);
    }
  };

  // Delete a template
  const handleDeleteTemplate = async (templateId: string) => {
    try {
      // Delete from Firestore if available
      if (schoolId) {
        try {
          const { doc, deleteDoc } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');
          
          await deleteDoc(doc(db, `schools/${schoolId}/reportTemplates`, templateId));
        } catch (firestoreError) {
          console.error("Error deleting from Firestore:", firestoreError);
          // Continue with localStorage delete even if Firestore fails
        }
      }
      
      // Update local state
      setTemplates(prev => {
        const updatedTemplates = prev.filter(t => t.id !== templateId);
        
        // Save to localStorage
        localStorage.setItem(`reportTemplates_${schoolId}`, JSON.stringify(updatedTemplates));
        
        return updatedTemplates;
      });
      
      toast.success("Template berhasil dihapus");
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Gagal menghapus template");
    }
  };

  // Duplicate a template
  const handleDuplicateTemplate = (template: any) => {
    const duplicatedTemplate = {
      ...template,
      id: `template_${Date.now()}`,
      name: `${template.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setTemplates(prev => {
      const updatedTemplates = [...prev, duplicatedTemplate];
      
      // Save to localStorage
      localStorage.setItem(`reportTemplates_${schoolId}`, JSON.stringify(updatedTemplates));
      
      return updatedTemplates;
    });
    
    // Save to Firestore if available
    if (schoolId) {
      const saveToFirestore = async () => {
        try {
          const { doc, setDoc } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');
          
          await setDoc(doc(db, `schools/${schoolId}/reportTemplates`, duplicatedTemplate.id), duplicatedTemplate);
        } catch (firestoreError) {
          console.error("Error saving duplicate to Firestore:", firestoreError);
        }
      };
      
      saveToFirestore();
    }
    
    toast.success("Template berhasil diduplikasi");
  };

  // Use a template to generate a report
  const handleUseTemplate = (templateId: string) => {
    router.push(`/dashboard/reports/generate?templateId=${templateId}`);
  };

  // Confirm delete dialog
  const openDeleteDialog = (templateId: string) => {
    setTemplateToDelete(templateId);
    setDeleteDialogOpen(true);
  };

  // Cancel template editing/creation
  const handleCancelDesign = () => {
    setShowDesigner(false);
    setEditingTemplate(null);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6 pb-24 md:pb-6">
      <div className="flex items-center mb-6">
        <Link href="/dashboard/reports" className="p-2 mr-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Template Laporan</h1>
      </div>
      
      {showDesigner ? (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">
              {editingTemplate ? "Edit Template" : "Buat Template Baru"}
            </h2>
            <button
              onClick={handleCancelDesign}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          
          <ReportTemplateDesigner
            initialTemplate={editingTemplate}
            onSave={handleSaveTemplate}
            onCancel={handleCancelDesign}
            saving={saving}
            saveSuccess={saveSuccess}
          />
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
            <p className="text-gray-600">
              Buat dan kelola template laporan kustom untuk kebutuhan spesifik Anda.
            </p>
            <button
              onClick={handleCreateTemplate}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary hover:bg-opacity-90 transition-colors"
            >
              <Plus size={18} />
              Template Baru
            </button>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
          ) : templates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16 sm:mb-6">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white rounded-xl shadow-sm p-5 border border-gray-200"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{template.name}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(template.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit Template"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDuplicateTemplate(template)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                        title="Duplicate Template"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => openDeleteDialog(template.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="Delete Template"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-4">
                    <p>{template.description || "No description"}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {template.fields?.map((field: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => handleUseTemplate(template.id)}
                    className="w-full flex items-center justify-center gap-2 bg-primary bg-opacity-10 text-primary px-4 py-2.5 rounded-lg hover:bg-opacity-20 transition-colors"
                  >
                    <Eye size={16} />
                    Gunakan Template
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-10 text-center">
              <div className="flex flex-col items-center">
                <div className="bg-gray-100 rounded-full p-3 mb-4">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Belum Ada Template</h3>
                <p className="text-gray-500 mb-6">
                  Buat template laporan kustom pertama Anda untuk mempermudah pembuatan laporan.
                </p>
                <button
                  onClick={handleCreateTemplate}
                  className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary hover:bg-opacity-90 transition-colors"
                >
                  <Plus size={18} />
                  Buat Template Baru
                </button>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-3" />
              <h3 className="text-lg font-semibold">Konfirmasi Hapus</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Apakah Anda yakin ingin menghapus template ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
              <button
                onClick={() => setDeleteDialogOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (templateToDelete) {
                    handleDeleteTemplate(templateToDelete);
                    setDeleteDialogOpen(false);
                  }
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
