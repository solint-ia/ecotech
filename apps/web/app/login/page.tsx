'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Leaf, Camera, UploadCloud, Mail, Lock, Compass } from 'lucide-react';
import { AuthFooter } from '@/components/AuthFooter';
import ActivationModal from '@/components/shared/ActivationModal';
import ForgotPasswordModal from '@/components/shared/ForgotPasswordModal';
import { StateCitySelect } from '@/components/shared/StateCitySelect';
import {
  validateCPF,
  validateCNPJ,
  validatePhone,
  formatPhone,
  formatCPF,
  formatCNPJ,
  validateFullName
} from '@/lib/validation';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  // Base fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Extended fields
  const [role, setRole] = useState('STUDENT'); // STUDENT, TEACHER, SCHOOL_MANAGER
  const [schools, setSchools] = useState<any[]>([]);
  const [schoolId, setSchoolId] = useState('');

  // School Manager specific fields
  const [schoolName, setSchoolName] = useState('');
  const [location, setLocation] = useState(''); // Endereço
  const [cnpj, setCnpj] = useState('');
  const [cpfManager, setCpfManager] = useState('');
  const [stateUF, setStateUF] = useState('');
  const [city, setCity] = useState('');

  // Profile Image
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState({ type: '', text: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Fetch schools on mount
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiBaseUrl}/schools`);
        if (res.ok) {
          const data = await res.json();
          setSchools(data);
        }
      } catch (err) {
        console.error('Failed to fetch schools', err);
      }
    };
    fetchSchools();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfileImage(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    const totalSteps = isLogin ? 1 : (role === 'SCHOOL_MANAGER' ? 4 : 2);
    const newErrors: Record<string, string> = {};

    if (!isLogin && currentStep < totalSteps) {
      if (currentStep === 1) {
        if (!validateFullName(name)) newErrors.name = role === 'SCHOOL_MANAGER' ? 'Insira o nome completo do gestor.' : 'Insira seu nome completo.';
        if (phone && !validatePhone(phone)) newErrors.phone = 'Insira um telefone válido com DDD.';
        if (!email) newErrors.email = 'Insira seu e-mail.';
      } else if (role === 'SCHOOL_MANAGER') {
        if (currentStep === 2) {
          if (!schoolName.trim()) newErrors.schoolName = 'O nome da escola é obrigatório.';
          if (cnpj && !validateCNPJ(cnpj)) newErrors.cnpj = 'Insira um CNPJ válido.';
        } else if (currentStep === 3) {
          if (!stateUF) newErrors.stateUF = 'Selecione um Estado.';
          if (!city) newErrors.city = 'Selecione uma Cidade.';
          if (!location.trim()) newErrors.location = 'O endereço é obrigatório.';
          if (cpfManager && !validateCPF(cpfManager)) newErrors.cpfManager = 'Insira um CPF válido.';
        }
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setMessage({ type: 'error', text: 'Por favor, corrija os erros apontados.' });
        return;
      }

      // Check availability before advancing
      setIsLoading(true);
      try {
        const payload: any = {};
        if (currentStep === 1) {
          payload.email = email;
          if (phone) payload.phone = phone;
        } else if (role === 'SCHOOL_MANAGER' && currentStep === 2) {
          if (cnpj) payload.cnpj = cnpj;
        } else if (role === 'SCHOOL_MANAGER' && currentStep === 3) {
          if (cpfManager) payload.cpfManager = cpfManager;
        }

        if (Object.keys(payload).length > 0) {
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
          const res = await fetch(`${apiBaseUrl}/auth/check-availability`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (data && !data.available && data.errors) {
            setErrors(data.errors);
            setMessage({ type: 'error', text: 'Por favor, corrija os erros apontados.' });
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Error checking availability:', err);
      }
      setIsLoading(false);
      
      setErrors({});
      setCurrentStep(prev => prev + 1);
      return;
    }

    setIsLoading(true);

    if (!isLogin) {
      if (password !== confirmPassword) {
        setErrors({ confirmPassword: 'As senhas não coincidem.' });
        setIsLoading(false);
        setMessage({ type: 'error', text: 'As senhas não coincidem.' });
        return;
      }
    }

    setErrors({});

    try {
      let userData: any = null;

      if (isLogin) {
        // Use NextAuth signIn so the session is established client-side
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          throw new Error('E-mail ou senha incorretos.');
        }

        // Redirect to trilhas
        router.push('/trilhas');
        return;
      } else {
        // Pre-register: send OTP
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiBaseUrl}/auth/send-register-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email, 
            ...(phone ? { phone } : {}), 
            ...(role === 'SCHOOL_MANAGER' && cpfManager ? { cpfManager } : {}), 
            ...(role === 'SCHOOL_MANAGER' && cnpj ? { cnpj } : {}) 
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          let errorMsg = data.message || 'Erro ao processar a solicitação';
          if (Array.isArray(data.message)) {
            errorMsg = data.message.join(', ');
          }
          throw new Error(errorMsg);
        }

        // Open activation modal
        setShowActivationModal(true);
        return;
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Erro inesperado.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterConfirm = async (otp: string) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('role', role);
      formData.append('otp', otp);

      if (phone) formData.append('phone', phone);
      if (profileImage) formData.append('profileImage', profileImage);

      if (role === 'SCHOOL_MANAGER') {
        formData.append('schoolName', schoolName);
        formData.append('state', stateUF);
        formData.append('city', city);
        formData.append('location', location);
        if (cnpj) formData.append('cnpj', cnpj);
        formData.append('managerName', name);
        if (cpfManager) formData.append('cpfManager', cpfManager);
      } else {
        if (schoolId) formData.append('schoolId', schoolId);
      }

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiBaseUrl}/auth/register`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        let errorMsg = data.message || 'Erro ao processar a solicitação';
        if (Array.isArray(data.message)) {
          errorMsg = data.message.join(', ');
        }
        throw new Error(errorMsg); // This will be caught by the modal
      }

      // After successful verify and register, NextAuth auto-login
      await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (data.user?.roleStatus === 'PENDENTE') {
        return { roleStatus: 'PENDENTE' };
      }

      setShowActivationModal(false);
      router.push('/trilhas');
    } catch (error: any) {
      throw error; // Throw so ActivationModal can show the error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#0B5D3B] to-[#07472B] overflow-y-auto">

      {/* Topographic/Trail Texture Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="trail-pattern" width="160" height="160" patternUnits="userSpaceOnUse">
              <path d="M0,40 Q40,60 80,40 T160,40" fill="none" className="stroke-white/20" strokeWidth="1.5" />
              <path d="M0,80 Q40,100 80,80 T160,80" fill="none" className="stroke-white/20" strokeWidth="1.5" />
              <path d="M0,120 Q40,140 80,120 T160,120" fill="none" className="stroke-white/20" strokeWidth="1.5" />
              <path d="M-40,80 Q20,20 80,80 T200,80" fill="none" className="stroke-emerald-400/30" strokeWidth="1.5" strokeDasharray="6 6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#trail-pattern)" />
        </svg>
      </div>

      {/* Main Login Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 pb-12 md:pb-20 relative z-10">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700 py-4 relative z-10">

          {/* The Premium Card */}
          <div className="bg-white/90 backdrop-blur-[12px] rounded-[24px] shadow-2xl shadow-black/20 border border-white/60 p-5 sm:p-8 relative z-10 overflow-hidden">

            {/* Logotipo Centralizado */}
            <div className="flex flex-col items-center mb-8 relative z-10">
              <div className="w-full h-24 flex items-center justify-center">
                <img
                  src="/EcoTechLogo.png"
                  alt="Ecotech"
                  className="w-full h-full object-contain drop-shadow-sm mix-blend-multiply transform scale-[1.25]"
                />
              </div>
              <h1 className="mt-6 text-center text-[0.8rem] font-semibold text-primary/80 tracking-wide leading-snug">
                Conectando pessoas à natureza<br />através da educação
              </h1>
            </div>

            {message.text && (
              <div className={`p-4 mb-6 rounded-xl text-sm font-medium ${message.type === 'success'
                ? 'bg-secondary/10 text-primary border border-secondary/20'
                : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                {message.text}
              </div>
            )}

            {/* Visual Stepper */}
            {!isLogin && (
              <div className="flex justify-center items-center gap-2 mb-6 animate-in fade-in">
                {Array.from({ length: role === 'SCHOOL_MANAGER' ? 4 : 2 }).map((_, idx) => {
                  const step = idx + 1;
                  const isActive = step === currentStep;
                  const isPast = step < currentStep;
                  return (
                    <div 
                      key={step} 
                      className={`h-2 rounded-full transition-all duration-300 ${isActive ? 'w-6 bg-[#0B5D3B]' : (isPast ? 'w-2 bg-[#0B5D3B]/60' : 'w-2 bg-primary/20')}`}
                    />
                  );
                })}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* STEP 1: Basic Info */}
              {(isLogin || (!isLogin && currentStep === 1)) && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  {/* PERFIL (Role) (Apenas Cadastro) */}
                  {!isLogin && (
                    <div>
                      <label className="block text-sm font-semibold text-primary/80 mb-1.5">Eu sou um(a)</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-primary/30 bg-transparent text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none text-sm"
                      >
                        <option value="STUDENT">Estudante</option>
                        <option value="TEACHER">Professor</option>
                        <option value="SCHOOL_MANAGER">Escola (Gestor)</option>
                      </select>
                    </div>
                  )}

                  {!isLogin && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-primary/80 mb-1.5">{role === 'SCHOOL_MANAGER' ? 'Gestor Responsável' : 'Nome Completo'}</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            if (errors.name) setErrors(prev => { const c = { ...prev }; delete c.name; return c; });
                          }}
                          className={`w-full px-4 py-3.5 rounded-xl border bg-transparent text-primary focus:outline-none focus:ring-1 transition-all ${errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-primary/30 focus:border-primary focus:ring-primary'}`}
                          placeholder={role === 'SCHOOL_MANAGER' ? 'Nome do Gestor' : 'Seu nome'}
                          required={!isLogin}
                        />
                        {errors.name && (
                          <p className="text-xs text-red-500 font-medium mt-1 animate-in fade-in duration-200">
                            {errors.name}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-primary/80 mb-1.5">Telefone</label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => {
                            setPhone(formatPhone(e.target.value));
                            if (errors.phone) setErrors(prev => { const c = { ...prev }; delete c.phone; return c; });
                          }}
                          className={`w-full px-4 py-3.5 rounded-xl border bg-transparent text-primary focus:outline-none focus:ring-1 transition-all ${errors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-primary/30 focus:border-primary focus:ring-primary'}`}
                          placeholder="(00) 9 0000-0000"
                        />
                        {errors.phone && (
                          <p className="text-xs text-red-500 font-medium mt-1 animate-in fade-in duration-200">
                            {errors.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="relative z-10">
                    <label className="block text-sm font-semibold text-primary/80 mb-1.5 ml-1">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full pl-11 pr-4 py-3 rounded-xl border bg-white/60 text-primary text-sm focus:bg-white focus:outline-none focus:ring-4 transition-all ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500/12' : 'border-primary/10 focus:border-[#2E8B57] focus:ring-[#2E8B57]/12'}`}
                        placeholder="ex.: usuario@email.com"
                        required
                      />
                    </div>
                    {errors.email && (
                      <p className="text-xs text-red-500 font-medium mt-1 animate-in fade-in duration-200">
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2 (STUDENT/TEACHER) */}
              {!isLogin && role !== 'SCHOOL_MANAGER' && currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <label className="block text-sm font-semibold text-primary/80 mb-1.5">Vincular a uma Escola</label>
                    <select
                      value={schoolId}
                      onChange={(e) => setSchoolId(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl border border-primary/30 bg-transparent text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none"
                    >
                      <option value="">Nenhuma (ou procurar depois)</option>
                      {schools.map(school => (
                        <option key={school.id} value={school.id}>{school.name} ({school.city})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* STEP 2 (SCHOOL_MANAGER) */}
              {!isLogin && role === 'SCHOOL_MANAGER' && currentStep === 2 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="font-bold text-primary text-sm uppercase tracking-widest text-center mb-2">Dados da Escola</h3>
                  <div className="grid grid-cols-1 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-primary/80 mb-1.5">Nome da Escola</label>
                      <input
                        type="text"
                        value={schoolName}
                        onChange={(e) => {
                          setSchoolName(e.target.value);
                          if (errors.schoolName) setErrors(prev => { const c = { ...prev }; delete c.schoolName; return c; });
                        }}
                        className={`w-full px-4 py-3.5 rounded-xl border bg-transparent text-primary focus:outline-none focus:ring-1 transition-all ${errors.schoolName ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-primary/30 focus:border-primary focus:ring-primary'}`}
                        placeholder="Escola Municipal Ecotech"
                        required
                      />
                      {errors.schoolName && (
                        <p className="text-xs text-red-500 font-medium mt-1 animate-in fade-in duration-200">
                          {errors.schoolName}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-primary/80 mb-1.5">CNPJ</label>
                      <input
                        type="text"
                        value={cnpj}
                        onChange={(e) => {
                          setCnpj(formatCNPJ(e.target.value));
                          if (errors.cnpj) setErrors(prev => { const c = { ...prev }; delete c.cnpj; return c; });
                        }}
                        className={`w-full px-4 py-3.5 rounded-xl border bg-transparent text-primary focus:outline-none focus:ring-1 transition-all ${errors.cnpj ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-primary/30 focus:border-primary focus:ring-primary'}`}
                        placeholder="00.000.000/0000-00"
                      />
                      {errors.cnpj && (
                        <p className="text-xs text-red-500 font-medium mt-1 animate-in fade-in duration-200">
                          {errors.cnpj}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3 (SCHOOL_MANAGER) */}
              {!isLogin && role === 'SCHOOL_MANAGER' && currentStep === 3 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="font-bold text-primary text-sm uppercase tracking-widest text-center mb-2">Endereço e Gestor</h3>
                  
                  <StateCitySelect
                    selectedState={stateUF}
                    selectedCity={city}
                    onStateChange={(s) => {
                      setStateUF(s);
                      if (errors.stateUF) setErrors(prev => { const c = { ...prev }; delete c.stateUF; return c; });
                    }}
                    onCityChange={(c) => {
                      setCity(c);
                      if (errors.city) setErrors(prev => { const c = { ...prev }; delete c.city; return c; });
                    }}
                    inline={true}
                  />
                  {(errors.stateUF || errors.city) && (
                    <p className="text-xs text-red-500 font-medium mt-1 animate-in fade-in duration-200 text-center">
                      Por favor, selecione Estado e Cidade.
                    </p>
                  )}

                  <div className="grid grid-cols-1 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-primary/80 mb-1.5">Endereço (Rua e Número)</label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => {
                          setLocation(e.target.value);
                          if (errors.location) setErrors(prev => { const c = { ...prev }; delete c.location; return c; });
                        }}
                        className={`w-full px-4 py-3.5 rounded-xl border bg-transparent text-primary focus:outline-none focus:ring-1 transition-all ${errors.location ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-primary/30 focus:border-primary focus:ring-primary'}`}
                        placeholder="Rua da Natureza, 123"
                        required
                      />
                      {errors.location && (
                        <p className="text-xs text-red-500 font-medium mt-1 animate-in fade-in duration-200">
                          {errors.location}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-primary/80 mb-1.5">CPF do Gestor</label>
                      <input
                        type="text"
                        value={cpfManager}
                        onChange={(e) => {
                          setCpfManager(formatCPF(e.target.value));
                          if (errors.cpfManager) setErrors(prev => { const c = { ...prev }; delete c.cpfManager; return c; });
                        }}
                        className={`w-full px-4 py-3.5 rounded-xl border bg-transparent text-primary focus:outline-none focus:ring-1 transition-all ${errors.cpfManager ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-primary/30 focus:border-primary focus:ring-primary'}`}
                        placeholder="000.000.000-00"
                      />
                      {errors.cpfManager && (
                        <p className="text-xs text-red-500 font-medium mt-1 animate-in fade-in duration-200">
                          {errors.cpfManager}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SECURITY / PASSWORD */}
              {(isLogin || (!isLogin && ((role !== 'SCHOOL_MANAGER' && currentStep === 2) || (role === 'SCHOOL_MANAGER' && currentStep === 4)))) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className={isLogin ? 'md:col-span-2' : ''}>
                    <label className="block text-sm font-semibold text-primary/80 mb-1.5 ml-1">Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-primary/10 bg-white/60 text-primary text-sm focus:bg-white focus:outline-none focus:border-[#2E8B57] focus:ring-4 focus:ring-[#2E8B57]/12 transition-all"
                        placeholder="••••••••"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  {!isLogin && (
                    <div>
                      <label className="block text-sm font-semibold text-primary/80 mb-1.5 ml-1">Confirmar Senha</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            if (errors.confirmPassword) setErrors(prev => { const c = { ...prev }; delete c.confirmPassword; return c; });
                          }}
                          className={`w-full pl-11 pr-4 py-3 rounded-xl border bg-white/60 text-primary text-sm focus:bg-white focus:outline-none focus:ring-4 transition-all ${errors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500/12' : 'border-primary/10 focus:border-[#2E8B57] focus:ring-[#2E8B57]/12'}`}
                          placeholder="••••••••"
                          required={!isLogin}
                          minLength={6}
                        />
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-xs text-red-500 font-medium mt-1 animate-in fade-in duration-200">
                          {errors.confirmPassword}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="flex gap-3 mt-6">
                {!isLogin && currentStep > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(prev => prev - 1);
                      setErrors({});
                      setMessage({ type: '', text: '' });
                    }}
                    className="w-1/3 py-3.5 px-4 text-primary font-bold tracking-wide transition-all rounded-xl border border-primary/20 hover:bg-primary/5 active:scale-[0.98] flex items-center justify-center relative z-10 text-sm"
                  >
                    VOLTAR
                  </button>
                )}
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`flex-1 py-3.5 px-4 text-white rounded-xl font-bold tracking-wide transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(11,93,59,0.15)] hover:shadow-[0_12px_25px_rgba(11,93,59,0.25)] hover:-translate-y-0.5 relative z-10 flex items-center justify-center gap-2
                ${isLogin ? 'bg-gradient-to-br from-[#0B5D3B] to-[#1F7A4D]' : 'bg-gradient-to-br from-[#4F8A4C] to-[#3B6D39]'}`}
                >
                  {isLogin && <Compass className="w-5 h-5 text-white/90" />}
                  {isLoading
                    ? 'PROCESSANDO...'
                    : (isLogin ? 'ENTRAR NA PLATAFORMA' : (currentStep < (role === 'SCHOOL_MANAGER' ? 4 : 2) ? 'PRÓXIMO' : 'CRIAR MINHA CONTA'))}
                </button>
              </div>
            </form>

            <div className="mt-6 flex flex-col items-center gap-3 relative z-10">
              {isLogin && (
                <button 
                  type="button" 
                  onClick={() => setShowForgotPasswordModal(true)}
                  className="text-[0.85rem] text-primary/60 hover:text-primary font-medium transition-colors focus:outline-none"
                >
                  Esqueceu sua senha?
                </button>
              )}
              <p className="text-primary/70 font-medium text-sm mt-1">
                {isLogin ? 'Novo por aqui?' : 'Já possui uma conta?'}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setMessage({ type: '', text: '' });
                    setErrors({});
                    setCurrentStep(1);
                  }}
                  className="ml-2 font-bold text-primary hover:text-primary/80 transition-colors focus:outline-none"
                >
                  {isLogin ? 'Cadastre-se' : 'Faça login'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Macro-Footer */}
      <AuthFooter />
      
      {showActivationModal && (
        <ActivationModal 
          email={email} 
          onClose={() => setShowActivationModal(false)} 
          onConfirm={handleRegisterConfirm}
          isSubmitting={isLoading}
        />
      )}
      {showForgotPasswordModal && (
        <ForgotPasswordModal onClose={() => setShowForgotPasswordModal(false)} />
      )}
    </div>
  );
}
