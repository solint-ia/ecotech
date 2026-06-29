'use client';

import { useState } from 'react';
import { Mail, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

interface ActivationModalProps {
  email: string;
  onClose: () => void;
  onConfirm: (otp: string) => Promise<void> | void;
  isSubmitting?: boolean;
}

export default function ActivationModal({ email, onClose, onConfirm, isSubmitting = false }: ActivationModalProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('O código deve ter 6 dígitos.');
      return;
    }

    setError('');
    try {
      await onConfirm(code);
    } catch (err: any) {
      setError(err.message || 'Código inválido ou erro no servidor.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md relative overflow-hidden animate-in zoom-in-95">
        
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[#0B3B24]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-[#0B3B24]" />
          </div>
          <h2 className="text-2xl font-bold text-[#0B3B24] mb-2">Confirme seu E-mail</h2>
          <p className="text-sm text-gray-600">
            Enviamos um código de 6 dígitos para o e-mail <strong>{email}</strong>. 
            Insira-o abaixo para ativar sua conta.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full text-center text-3xl tracking-[0.5em] font-bold py-4 rounded-xl border border-gray-300 focus:outline-none focus:border-[#0B3B24] focus:ring-1 focus:ring-[#0B3B24]"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || code.length !== 6}
            className="w-full bg-[#0B3B24] text-white py-3 rounded-xl font-semibold hover:bg-[#082a19] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'Verificando...' : 'Confirmar e Entrar'}
            {!isSubmitting && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>

      </div>
    </div>
  );
}
