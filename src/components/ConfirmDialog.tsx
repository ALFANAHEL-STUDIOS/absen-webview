"use client";

import React from 'react';
import { motion } from "framer-motion";
import { X } from "lucide-react";
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
  icon?: React.ReactNode;
}
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  confirmColor = "bg-red-500 hover:bg-red-600",
  onConfirm,
  onCancel,
  icon
}) => {
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-unique-id="231f6f92-c49b-4e98-9f71-267a2d68956a" data-file-name="components/ConfirmDialog.tsx">
      <div className="fixed inset-0 bg-black/40" onClick={onCancel} data-unique-id="bcda7296-cbc8-42ec-b5a7-1c08e8ea46e8" data-file-name="components/ConfirmDialog.tsx" />
      
      <motion.div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 z-10" initial={{
      opacity: 0,
      scale: 0.9
    }} animate={{
      opacity: 1,
      scale: 1
    }} exit={{
      opacity: 0,
      scale: 0.9
    }} transition={{
      duration: 0.2
    }} onAnimationComplete={() => {
      // This ensures the dialog is fully visible before any action
    }} data-unique-id="10e1ed3d-6057-4a17-a871-5e63ee54ec4a" data-file-name="components/ConfirmDialog.tsx">
        <div className="flex justify-between items-center mb-4" data-unique-id="1ca58f49-f776-431d-8ff8-47aa2073530d" data-file-name="components/ConfirmDialog.tsx">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center" data-unique-id="072e2af8-ba81-43b4-afa5-5b0873eb39e2" data-file-name="components/ConfirmDialog.tsx" data-dynamic-text="true">
            {icon && <span className="mr-2" data-unique-id="c34921e2-c583-4664-8e19-2aaaa3cd3e4e" data-file-name="components/ConfirmDialog.tsx" data-dynamic-text="true">{icon}</span>}
            {title}
          </h3>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 transition-colors" data-unique-id="bed0dbc5-1a4d-4360-b4ca-80b48cc9468f" data-file-name="components/ConfirmDialog.tsx">
            <X size={20} />
          </button>
        </div>
        
        <p className="text-gray-600 mb-6" data-unique-id="5ceff548-4274-49b4-bcc5-ad578c7b4b6c" data-file-name="components/ConfirmDialog.tsx" data-dynamic-text="true">{message}</p>
        
        <div className="flex justify-end space-x-3" data-unique-id="98dccc77-41b7-46e6-8000-d6d335cf7883" data-file-name="components/ConfirmDialog.tsx">
          <button onClick={onCancel} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50" data-unique-id="dd55bf22-2815-48d2-9703-bcb247c24eb8" data-file-name="components/ConfirmDialog.tsx" data-dynamic-text="true">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 text-white rounded-lg ${confirmColor}`} data-unique-id="5e85aafd-854d-4c49-ad08-584454c78231" data-file-name="components/ConfirmDialog.tsx" data-dynamic-text="true">
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>;
};
export default ConfirmDialog;