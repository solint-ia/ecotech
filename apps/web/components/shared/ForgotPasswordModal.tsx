'use client';

import { useState } from 'react';
import { Mail, Lock, Key, ArrowRight, ArrowLeft } from 'lucide-react';

interface ForgotPasswordModalProps {
  onClose: () => void;
}

export default function ForgotPasswordModal({ onClose }: ForgotPasswordModalProps) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Insira seu e-mail.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${apiBaseUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Erro ao solicitar recuperação.');
      }
      
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Código inválido.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${apiBaseUrl}/auth/verify-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: code })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Código inválido ou expirado.');
      }

      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${apiBaseUrl}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: code, newPassword: password })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Código inválido ou expirado.');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md relative overflow-hidden animate-in zoom-in-95">
        
        {/* Back/Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
        >
          ✕
        </button>

        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-[#0B3B24]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Key className="w-8 h-8 text-[#0B3B24]" />
            </div>
            <h2 className="text-2xl font-bold text-[#0B3B24] mb-2">Senha Redefinida!</h2>
            <p className="text-sm text-gray-600 mb-6">
              Sua senha foi alterada com sucesso. Você já pode fazer login.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#0B3B24]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-[#0B3B24]" />
              </div>
              <h2 className="text-2xl font-bold text-[#0B3B24] mb-2">Recuperar Senha</h2>
              <p className="text-sm text-gray-600">
                {step === 1 && "Informe seu e-mail cadastrado."}
                {step === 2 && "Insira o código enviado para o seu e-mail."}
                {step === 3 && "Crie uma nova senha segura."}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200">
                {error}
              </div>
            )}

            {step === 1 && (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Seu e-mail"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:border-[#0B3B24] focus:ring-1 focus:ring-[#0B3B24] text-gray-800"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-[#0B3B24] text-white py-3 rounded-xl font-semibold hover:bg-[#082a19] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? 'Enviando...' : 'Enviar Código'}
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center text-3xl tracking-[0.5em] font-bold py-4 rounded-xl border border-gray-300 focus:outline-none focus:border-[#0B3B24] focus:ring-1 focus:ring-[#0B3B24]"
                />
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full bg-[#0B3B24] text-white py-3 rounded-xl font-semibold hover:bg-[#082a19] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? 'Verificando...' : 'Avançar'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full text-sm font-medium text-gray-500 hover:text-gray-800 py-2 flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nova senha"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:border-[#0B3B24] focus:ring-1 focus:ring-[#0B3B24] text-gray-800"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme a senha"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:border-[#0B3B24] focus:ring-1 focus:ring-[#0B3B24] text-gray-800"
                />
                <button
                  type="submit"
                  disabled={loading || !password || !confirmPassword}
                  className="w-full bg-[#0B3B24] text-white py-3 rounded-xl font-semibold hover:bg-[#082a19] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? 'Salvando...' : 'Redefinir Senha'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
