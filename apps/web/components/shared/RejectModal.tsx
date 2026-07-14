'use client';

import { useState } from 'react';
import { XCircle } from 'lucide-react';

interface RejectModalProps {
  /** What is being rejected, e.g. "Reprovar Parceiro". */
  title: string;
  /** Name of the item, echoed back so the admin can see which row they are acting on. */
  itemName?: string;
  onConfirm: (reason: string) => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  /** Server-side failure to show inline instead of closing the modal. */
  error?: string;
}

// Mirrors the MinLength/MaxLength on the API's UpdateApprovalDto — keep in sync,
// so the admin is never allowed to submit something the server will reject.
const MIN_LENGTH = 10;
const MAX_LENGTH = 1000;

export default function RejectModal({
  title,
  itemName,
  onConfirm,
  onCancel,
  isLoading = false,
  error,
}: RejectModalProps) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  const trimmed = reason.trim();
  const tooShort = trimmed.length < MIN_LENGTH;

  const handleSubmit = () => {
    setTouched(true);
    if (tooShort || isLoading) return;
    onConfirm(trimmed);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-lg relative overflow-hidden animate-in zoom-in-95">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-100">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
          <p className="text-sm text-gray-600">
            {itemName && (
              <>
                Você está reprovando <span className="font-semibold text-slate-800">{itemName}</span>.{' '}
              </>
            )}
            Explique o motivo: quem enviou verá esta justificativa e poderá corrigir o envio.
          </p>
        </div>

        <div className="mb-6 text-left">
          <label
            htmlFor="rejection-reason"
            className="block text-sm font-semibold text-slate-800 mb-1.5"
          >
            Justificativa da reprovação <span className="text-red-600">*</span>
          </label>
          <textarea
            id="rejection-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            disabled={isLoading}
            rows={4}
            maxLength={MAX_LENGTH}
            autoFocus
            placeholder="Ex.: as fotos enviadas não correspondem ao local descrito e a descrição está incompleta."
            className={`w-full rounded-xl border px-4 py-3 text-sm text-slate-800 resize-none transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:bg-slate-50 ${
              touched && tooShort
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/30'
                : 'border-border-custom focus:border-forest focus:ring-forest/30'
            }`}
          />
          <div className="flex items-start justify-between gap-3 mt-1.5">
            <p className={`text-xs ${touched && tooShort ? 'text-red-600' : 'text-foreground/50'}`}>
              {touched && tooShort
                ? `Escreva ao menos ${MIN_LENGTH} caracteres.`
                : `Mínimo de ${MIN_LENGTH} caracteres.`}
            </p>
            <span className="text-xs text-foreground/40 shrink-0 tabular-nums">
              {trimmed.length}/{MAX_LENGTH}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-1/2 py-2.5 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || tooShort}
            className="w-full sm:w-1/2 py-2.5 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-600 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Reprovar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
