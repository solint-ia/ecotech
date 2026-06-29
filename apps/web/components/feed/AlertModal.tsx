'use client';

import { AlertCircle } from 'lucide-react';

interface AlertModalProps {
  title: string;
  message: string;
  onClose: () => void;
}

export default function AlertModal({ title, message, onClose }: AlertModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl border border-border-custom shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center p-6 pt-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-2">
            <AlertCircle className="w-8 h-8 text-orange-500" />
          </div>
          
          <h2 className="text-xl font-bold text-primary">{title}</h2>
          <p className="text-sm text-foreground/70 leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex items-center gap-3 p-4 pt-2 bg-beige/30 border-t border-border-custom">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-colors shadow-sm"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
