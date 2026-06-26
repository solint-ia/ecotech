'use client';

import { X, Trash2, Loader2, AlertTriangle } from 'lucide-react';

interface ConfirmDeleteModalProps {
  title: string;
  description: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDeleteModal({
  title,
  description,
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDeleteModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl border border-border-custom shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center p-6 pt-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-2">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          
          <h2 className="text-xl font-bold text-primary">{title}</h2>
          <p className="text-sm text-foreground/60 leading-relaxed">
            {description}
          </p>
        </div>

        <div className="flex items-center gap-3 p-4 pt-2 bg-beige/30 border-t border-border-custom">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-foreground/70 bg-white border border-border-custom hover:bg-beige transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}
