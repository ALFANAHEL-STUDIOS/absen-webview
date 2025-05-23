"use client";

import React, { useState, useEffect } from "react";
import { Save, Plus, Trash2, MoveUp, MoveDown, Layout, BarChart2, PieChart, CheckCircle, Loader2, X } from "lucide-react";
import { motion } from "framer-motion";
interface ReportTemplateDesignerProps {
  initialTemplate?: any;
  onSave: (templateData: any) => void;
  onCancel: () => void;
  saving: boolean;
  saveSuccess: boolean;
}
const availableFields = [{
  id: "studentName",
  label: "Nama Siswa"
}, {
  id: "class",
  label: "Kelas"
}, {
  id: "attendance",
  label: "Kehadiran"
}, {
  id: "date",
  label: "Tanggal"
}, {
  id: "time",
  label: "Waktu"
}, {
  id: "status",
  label: "Status"
}, {
  id: "note",
  label: "Catatan"
}];
const layoutOptions = [{
  id: "standard",
  label: "Standar"
}, {
  id: "compact",
  label: "Kompak"
}, {
  id: "detailed",
  label: "Detail"
}];
export default function ReportTemplateDesigner({
  initialTemplate,
  onSave,
  onCancel,
  saving,
  saveSuccess
}: ReportTemplateDesignerProps) {
  const [templateData, setTemplateData] = useState({
    name: "",
    description: "",
    fields: [] as string[],
    layout: "standard",
    includeCharts: true,
    includeStatistics: true
  });

  // Initialize with initial template data if provided
  useEffect(() => {
    if (initialTemplate) {
      setTemplateData({
        name: initialTemplate.name || "",
        description: initialTemplate.description || "",
        fields: initialTemplate.fields || [],
        layout: initialTemplate.layout || "standard",
        includeCharts: initialTemplate.includeCharts !== undefined ? initialTemplate.includeCharts : true,
        includeStatistics: initialTemplate.includeStatistics !== undefined ? initialTemplate.includeStatistics : true
      });
    }
  }, [initialTemplate]);

  // Handle text input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const {
      name,
      value
    } = e.target;
    setTemplateData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle checkbox changes
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {
      name,
      checked
    } = e.target;
    setTemplateData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  // Handle select changes
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const {
      name,
      value
    } = e.target;
    setTemplateData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add a field to the template
  const addField = (fieldId: string) => {
    if (!templateData.fields.includes(fieldId)) {
      setTemplateData(prev => ({
        ...prev,
        fields: [...prev.fields, fieldId]
      }));
    }
  };

  // Remove a field from the template
  const removeField = (fieldId: string) => {
    setTemplateData(prev => ({
      ...prev,
      fields: prev.fields.filter(id => id !== fieldId)
    }));
  };

  // Move a field up in the order
  const moveFieldUp = (index: number) => {
    if (index > 0) {
      const newFields = [...templateData.fields];
      [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
      setTemplateData(prev => ({
        ...prev,
        fields: newFields
      }));
    }
  };

  // Move a field down in the order
  const moveFieldDown = (index: number) => {
    if (index < templateData.fields.length - 1) {
      const newFields = [...templateData.fields];
      [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
      setTemplateData(prev => ({
        ...prev,
        fields: newFields
      }));
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(templateData);
  };

  // Get field label by ID
  const getFieldLabel = (fieldId: string) => {
    const field = availableFields.find(f => f.id === fieldId);
    return field ? field.label : fieldId;
  };
  return <form onSubmit={handleSubmit} data-unique-id="28243583-654d-4584-870c-3df65d68632e" data-file-name="components/ReportTemplateDesigner.tsx">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-unique-id="36104356-6ccd-4a6b-b626-ce328eb62ffc" data-file-name="components/ReportTemplateDesigner.tsx" data-dynamic-text="true">
        {/* Basic Template Information */}
        <div data-unique-id="1db4730d-9946-4e88-9738-b18c4fc46b8f" data-file-name="components/ReportTemplateDesigner.tsx">
          <div className="mb-4" data-unique-id="d23aee14-ed3e-4d12-b70f-310af0ca6f41" data-file-name="components/ReportTemplateDesigner.tsx">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="d5293f7f-ca45-4117-bdd7-4686bd343c41" data-file-name="components/ReportTemplateDesigner.tsx"><span className="editable-text" data-unique-id="1659059e-4201-44fc-be28-9f0b8daeb3f7" data-file-name="components/ReportTemplateDesigner.tsx">
              Nama Template
            </span></label>
            <input type="text" id="name" name="name" value={templateData.name} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" placeholder="Masukkan nama template" required data-unique-id="84e7b8a8-d0f6-42e1-a10e-2891bd6cc021" data-file-name="components/ReportTemplateDesigner.tsx" />
          </div>
          
          <div className="mb-4" data-unique-id="0db10684-9f67-431d-9d87-2d693e2b376a" data-file-name="components/ReportTemplateDesigner.tsx">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="db113cf0-0134-42a6-b5b9-97ff6de65d0d" data-file-name="components/ReportTemplateDesigner.tsx"><span className="editable-text" data-unique-id="b5560d58-1672-4579-ade5-2dae4fc31f82" data-file-name="components/ReportTemplateDesigner.tsx">
              Deskripsi
            </span></label>
            <textarea id="description" name="description" value={templateData.description} onChange={handleInputChange} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" placeholder="Deskripsi singkat tentang template ini" data-unique-id="a8bba53c-8245-46a5-9916-03ed0dd93939" data-file-name="components/ReportTemplateDesigner.tsx" />
          </div>
          
          <div className="mb-4" data-unique-id="eb28ee49-6824-4eea-b629-7771dfffa5af" data-file-name="components/ReportTemplateDesigner.tsx">
            <label htmlFor="layout" className="block text-sm font-medium text-gray-700 mb-1" data-unique-id="97560107-63bf-4782-960e-3046f3048946" data-file-name="components/ReportTemplateDesigner.tsx"><span className="editable-text" data-unique-id="83b3e46f-1177-4fff-bbd9-0ca121a29334" data-file-name="components/ReportTemplateDesigner.tsx">
              Layout
            </span></label>
            <div className="flex items-center" data-unique-id="cdd3458a-eee6-4c46-996f-0165ebcf8c56" data-file-name="components/ReportTemplateDesigner.tsx">
              <Layout className="h-5 w-5 text-gray-400 absolute ml-3" />
              <select id="layout" name="layout" value={templateData.layout} onChange={handleSelectChange} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary" data-unique-id="c7560b18-afe9-4e79-bdcd-2b2a6052d9ae" data-file-name="components/ReportTemplateDesigner.tsx" data-dynamic-text="true">
                {layoutOptions.map(option => <option key={option.id} value={option.id} data-unique-id="70102866-7234-42c9-9e38-d01cf93e4e75" data-file-name="components/ReportTemplateDesigner.tsx" data-dynamic-text="true">
                    {option.label}
                  </option>)}
              </select>
            </div>
          </div>
          
          <div className="mb-4" data-unique-id="be3a10bb-42e9-4038-ad23-90871d157274" data-file-name="components/ReportTemplateDesigner.tsx">
            <div className="flex items-center mb-2" data-unique-id="455ca23a-1488-4a1d-b96b-48bf590f8cf9" data-file-name="components/ReportTemplateDesigner.tsx">
              <input type="checkbox" id="includeCharts" name="includeCharts" checked={templateData.includeCharts} onChange={handleCheckboxChange} className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" data-unique-id="726a01b8-2987-464c-9a9c-dba7f6db36ba" data-file-name="components/ReportTemplateDesigner.tsx" />
              <label htmlFor="includeCharts" className="ml-2 block text-sm text-gray-700 flex items-center" data-unique-id="919b971c-da1c-4aee-a5a3-7ed3f7117ebc" data-file-name="components/ReportTemplateDesigner.tsx">
                <BarChart2 className="h-4 w-4 mr-1 text-gray-500" /><span className="editable-text" data-unique-id="500ebc86-bd50-4703-9e9b-2269b47dbaea" data-file-name="components/ReportTemplateDesigner.tsx">
                Sertakan Grafik
              </span></label>
            </div>
            
            <div className="flex items-center" data-unique-id="03dbe104-b039-4eeb-8265-3e66caf04c9e" data-file-name="components/ReportTemplateDesigner.tsx">
              <input type="checkbox" id="includeStatistics" name="includeStatistics" checked={templateData.includeStatistics} onChange={handleCheckboxChange} className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" data-unique-id="331acad7-853b-4155-b322-cc23dc71196d" data-file-name="components/ReportTemplateDesigner.tsx" />
              <label htmlFor="includeStatistics" className="ml-2 block text-sm text-gray-700 flex items-center" data-unique-id="100b1427-4fe8-4498-bf4c-1fc9ad38a6a2" data-file-name="components/ReportTemplateDesigner.tsx">
                <PieChart className="h-4 w-4 mr-1 text-gray-500" /><span className="editable-text" data-unique-id="8218e2a6-2486-4b82-8077-1eec2a722c64" data-file-name="components/ReportTemplateDesigner.tsx">
                Sertakan Statistik
              </span></label>
            </div>
          </div>
        </div>
        
        {/* Field Selection */}
        <div data-unique-id="77b8d733-972e-4ecb-bcee-06947abef932" data-file-name="components/ReportTemplateDesigner.tsx">
          <div className="mb-4" data-unique-id="0ed08bf5-f90b-484f-ac00-ee6d69abfc4d" data-file-name="components/ReportTemplateDesigner.tsx">
            <h3 className="text-sm font-medium text-gray-700 mb-2" data-unique-id="f99a4219-1a06-4d2a-b0c3-f0c47e44f7e4" data-file-name="components/ReportTemplateDesigner.tsx"><span className="editable-text" data-unique-id="e27b1cad-26ce-4fff-9959-fe71770bfc3d" data-file-name="components/ReportTemplateDesigner.tsx">Bidang yang Tersedia</span></h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-unique-id="9f48c2e5-b39a-46d2-bc3a-187b6cf96bbf" data-file-name="components/ReportTemplateDesigner.tsx" data-dynamic-text="true">
              {availableFields.map(field => <button key={field.id} type="button" onClick={() => addField(field.id)} disabled={templateData.fields.includes(field.id)} className={`flex items-center justify-between px-3 py-2 border rounded-lg text-sm ${templateData.fields.includes(field.id) ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 active:bg-gray-100"}`} data-unique-id="e13df6b4-a0db-4f28-be47-e062730d48ba" data-file-name="components/ReportTemplateDesigner.tsx">
                  <span data-unique-id="22a71387-d3c6-4881-9766-bae313ad9aed" data-file-name="components/ReportTemplateDesigner.tsx" data-dynamic-text="true">{field.label}</span>
                  <Plus size={16} className={templateData.fields.includes(field.id) ? "text-gray-300" : "text-blue-500"} />
                </button>)}
            </div>
          </div>
          
          <div data-unique-id="3ab4baa8-80da-4f34-9c42-330eec5ece09" data-file-name="components/ReportTemplateDesigner.tsx" data-dynamic-text="true">
            <h3 className="text-sm font-medium text-gray-700 mb-2" data-unique-id="7f9e19a2-78ac-417f-b3b2-0ed72b6b5b5e" data-file-name="components/ReportTemplateDesigner.tsx"><span className="editable-text" data-unique-id="3dccfef3-999e-47c6-b5f3-2dfb83834025" data-file-name="components/ReportTemplateDesigner.tsx">Bidang yang Dipilih</span></h3>
            {templateData.fields.length > 0 ? <div className="space-y-2 border border-gray-200 rounded-lg p-3 bg-gray-50" data-unique-id="e0dce2b5-c5cb-4247-b8d4-fa1765ca7654" data-file-name="components/ReportTemplateDesigner.tsx" data-dynamic-text="true">
                {templateData.fields.map((fieldId, index) => <div key={fieldId} className="flex items-center justify-between bg-white p-2 rounded border border-blue-200" data-unique-id="12c369cb-ebb5-403d-a0c0-5e362610c000" data-file-name="components/ReportTemplateDesigner.tsx">
                    <span className="text-sm font-medium text-gray-800" data-unique-id="9f0e1c67-3719-407d-9f51-0b517c7716eb" data-file-name="components/ReportTemplateDesigner.tsx" data-dynamic-text="true">{getFieldLabel(fieldId)}</span>
                    <div className="flex items-center space-x-1" data-unique-id="776b167b-3f07-4c83-aaf7-dadeaa374c04" data-file-name="components/ReportTemplateDesigner.tsx">
                      <button type="button" onClick={() => moveFieldUp(index)} disabled={index === 0} className={`p-1 rounded ${index === 0 ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:bg-gray-100"}`} data-unique-id="14910ea5-4822-4f38-a3b4-2bd1c52b0992" data-file-name="components/ReportTemplateDesigner.tsx">
                        <MoveUp size={16} data-unique-id={`77b118d7-b3de-46bd-809c-6de020d93275_${index}`} data-file-name="components/ReportTemplateDesigner.tsx" data-dynamic-text="true" />
                      </button>
                      <button type="button" onClick={() => moveFieldDown(index)} disabled={index === templateData.fields.length - 1} className={`p-1 rounded ${index === templateData.fields.length - 1 ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:bg-gray-100"}`} data-unique-id="9c15d01e-8604-4b23-9f20-b15028827ef8" data-file-name="components/ReportTemplateDesigner.tsx">
                        <MoveDown size={16} data-unique-id={`a95b24bf-b9b6-41f4-a3d4-42d96c6244b1_${index}`} data-file-name="components/ReportTemplateDesigner.tsx" data-dynamic-text="true" />
                      </button>
                      <button type="button" onClick={() => removeField(fieldId)} className="p-1 text-red-500 hover:bg-red-50 rounded" data-unique-id="3c5ce4fa-5469-4101-ac81-3041f2c104bb" data-file-name="components/ReportTemplateDesigner.tsx">
                        <Trash2 size={16} data-unique-id={`f1a8a774-79dc-437a-a6f6-4cb9a333f11f_${index}`} data-file-name="components/ReportTemplateDesigner.tsx" data-dynamic-text="true" />
                      </button>
                    </div>
                  </div>)}
              </div> : <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center" data-unique-id="3dab7504-5606-4a08-b609-ec3739488219" data-file-name="components/ReportTemplateDesigner.tsx">
                <p className="text-gray-500 text-sm" data-unique-id="c810be52-4dad-4c84-9259-fe7b5007d800" data-file-name="components/ReportTemplateDesigner.tsx"><span className="editable-text" data-unique-id="9f629167-cd7c-4b00-80cd-4f837de71763" data-file-name="components/ReportTemplateDesigner.tsx">
                  Belum ada bidang yang dipilih. Pilih bidang dari daftar di atas dengan mengklik tombol </span><Plus size={14} className="text-blue-500 inline" /><span className="editable-text" data-unique-id="60636519-a772-452f-ad52-260a127a8959" data-file-name="components/ReportTemplateDesigner.tsx">.
                </span></p>
              </div>}
          </div>
        </div>
      </div>
      
      <div className="flex justify-end mt-6 space-x-3" data-unique-id="7128946a-ae4c-4f77-951f-f18884a7f38f" data-file-name="components/ReportTemplateDesigner.tsx">
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50" data-unique-id="4750cae1-46c5-4d57-b491-772b9e5b1db4" data-file-name="components/ReportTemplateDesigner.tsx"><span className="editable-text" data-unique-id="41abc83e-21c6-4c9b-8032-1b49f4efa3a4" data-file-name="components/ReportTemplateDesigner.tsx">
          Batal
        </span></button>
        <motion.button type="submit" disabled={saving || saveSuccess} className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary hover:bg-opacity-90 transition-colors" whileTap={{
        scale: 0.95
      }} data-unique-id="129e1556-b553-4cc0-b96a-e039e1a7cbe1" data-file-name="components/ReportTemplateDesigner.tsx" data-dynamic-text="true">
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : saveSuccess ? <CheckCircle size={20} /> : <Save size={20} />}
          {saveSuccess ? "Tersimpan" : "Simpan Template"}
        </motion.button>
      </div>
    </form>;
}