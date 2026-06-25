'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Leaf, Camera, UploadCloud } from 'lucide-react';
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
  const [city, setCity] = useState('');
  const [location, setLocation] = useState(''); // Endereço
  const [cnpj, setCnpj] = useState('');
  const [managerName, setManagerName] = useState('');
  const [cpfManager, setCpfManager] = useState('');

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
        const res = await fetch('http://localhost:4000/schools');
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
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    const newErrors: Record<string, string> = {};

    if (!isLogin) {
      if (!validateFullName(name)) {
        newErrors.name = 'Insira seu nome completo.';
      }

      if (phone && !validatePhone(phone)) {
        newErrors.phone = 'Insira um telefone válido com DDD.';
      }

      if (password !== confirmPassword) {
        newErrors.confirmPassword = 'As senhas não coincidem.';
      }

      if (role === 'SCHOOL_MANAGER') {
        if (!schoolName.trim()) {
          newErrors.schoolName = 'O nome da escola é obrigatório.';
        }
        if (!city.trim()) {
          newErrors.city = 'A cidade é obrigatória.';
        }
        if (!location.trim()) {
          newErrors.location = 'O endereço é obrigatório.';
        }
        if (cnpj && !validateCNPJ(cnpj)) {
          newErrors.cnpj = 'Insira um CNPJ válido.';
        }
        if (cpfManager && !validateCPF(cpfManager)) {
          newErrors.cpfManager = 'Insira um CPF válido.';
        }
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setIsLoading(false);
        setMessage({ type: 'error', text: 'Por favor, corrija os erros apontados no formulário.' });
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
        // Register via API directly, then use signIn to establish session
        const formData = new FormData();
        formData.append('name', name);
        formData.append('email', email);
        formData.append('password', password);
        formData.append('role', role);

        if (phone) formData.append('phone', phone);
        if (profileImage) formData.append('profileImage', profileImage);

        if (role === 'SCHOOL_MANAGER') {
          formData.append('schoolName', schoolName);
          formData.append('city', city);
          formData.append('location', location);
          if (cnpj) formData.append('cnpj', cnpj);
          if (managerName) formData.append('managerName', managerName);
          if (cpfManager) formData.append('cpfManager', cpfManager);
        } else {
          if (schoolId) formData.append('schoolId', schoolId);
        }

        const res = await fetch(`http://localhost:4000/auth/register`, {
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
          throw new Error(errorMsg);
        }

        userData = data.user;

        // After successful register, use signIn to establish NextAuth session
        await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        // Redirect to trilhas
        router.push('/trilhas');
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 py-12">
      {/* Header outside the modal */}
      <div className="text-center mb-8 flex flex-col items-center">
        <div className="bg-primary/10 p-3 rounded-full mb-4 shadow-sm border border-primary/20">
          <Leaf className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-primary mb-2 tracking-tight">
          Ecotech
        </h1>
        <p className="text-base text-foreground/80 max-w-sm font-medium">
          Plataforma Educacional Socioambiental
        </p>
      </div>

      <div className="bg-card w-full max-w-xl p-8 rounded-3xl shadow-xl border border-border-custom relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-secondary"></div>

        {message.text && (
          <div className={`p-4 mb-6 rounded-xl text-sm font-medium ${message.type === 'success'
            ? 'bg-secondary/10 text-primary border border-secondary/20'
            : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* FOTO DE PERFIL (Comentado - será adicionado em outra página)
          {!isLogin && (
            <div className="flex flex-col items-center mb-6">
              <div 
                className="w-24 h-24 rounded-full bg-background border-2 border-dashed border-border-custom flex flex-col items-center justify-center cursor-pointer overflow-hidden relative hover:border-secondary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {previewImage ? (
                  <img src={previewImage} alt="Profile preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-foreground/50">
                    <Camera className="w-8 h-8 mb-1" />
                    <span className="text-[10px] font-medium uppercase tracking-wider">Foto</span>
                  </div>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                className="hidden" 
                accept="image/*"
              />
            </div>
          )}
          */}

          {/* PERFIL (Role) (Apenas Cadastro) */}
          {!isLogin && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-sm font-medium mb-1.5 text-foreground">Eu sou um(a)</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border-custom bg-background focus:outline-none focus:ring-2 focus:ring-secondary transition-all text-foreground font-medium appearance-none"
              >
                <option value="STUDENT">Estudante</option>
                <option value="TEACHER">Professor</option>
                <option value="SCHOOL_MANAGER">Escola (Gestor)</option>
              </select>
            </div>
          )}

          {!isLogin && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground">Nome Completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors(prev => { const c = { ...prev }; delete c.name; return c; });
                  }}
                  className={`w-full px-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 transition-all ${errors.name ? 'border-red-500 focus:ring-red-500' : 'border-border-custom focus:ring-secondary'}`}
                  placeholder="Seu nome"
                  required={!isLogin}
                />
                {errors.name && (
                  <p className="text-xs text-red-500 font-medium mt-1 animate-in fade-in duration-200">
                    {errors.name}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground">Telefone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(formatPhone(e.target.value));
                    if (errors.phone) setErrors(prev => { const c = { ...prev }; delete c.phone; return c; });
                  }}
                  className={`w-full px-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 transition-all ${errors.phone ? 'border-red-500 focus:ring-red-500' : 'border-border-custom focus:ring-secondary'}`}
                  placeholder="(00) 00000-0000"
                />
                {errors.phone && (
                  <p className="text-xs text-red-500 font-medium mt-1 animate-in fade-in duration-200">
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border-custom bg-background focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
              placeholder="seu@email.com"
              required
            />
          </div>

          {!isLogin && role !== 'SCHOOL_MANAGER' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-sm font-medium mb-1.5 text-foreground">Vincular a uma Escola</label>
              <select
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border-custom bg-background focus:outline-none focus:ring-2 focus:ring-secondary transition-all text-foreground appearance-none"
              >
                <option value="">Nenhuma (ou procurar depois)</option>
                {schools.map(school => (
                  <option key={school.id} value={school.id}>{school.name} ({school.city})</option>
                ))}
              </select>
            </div>
          )}

          {/* CAMPOS DE ESCOLA */}
          {!isLogin && role === 'SCHOOL_MANAGER' && (
            <div className="space-y-4 pt-2 border-t border-border-custom animate-in fade-in slide-in-from-top-2 duration-300">
              <h3 className="font-semibold text-primary text-sm uppercase tracking-wider">Dados da Escola</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1.5 text-foreground">Nome da Escola</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => {
                      setSchoolName(e.target.value);
                      if (errors.schoolName) setErrors(prev => { const c = { ...prev }; delete c.schoolName; return c; });
                    }}
                    className={`w-full px-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 transition-all ${errors.schoolName ? 'border-red-500 focus:ring-red-500' : 'border-border-custom focus:ring-secondary'}`}
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
                  <label className="block text-sm font-medium mb-1.5 text-foreground">CNPJ</label>
                  <input
                    type="text"
                    value={cnpj}
                    onChange={(e) => {
                      setCnpj(formatCNPJ(e.target.value));
                      if (errors.cnpj) setErrors(prev => { const c = { ...prev }; delete c.cnpj; return c; });
                    }}
                    className={`w-full px-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 transition-all ${errors.cnpj ? 'border-red-500 focus:ring-red-500' : 'border-border-custom focus:ring-secondary'}`}
                    placeholder="00.000.000/0000-00"
                  />
                  {errors.cnpj && (
                    <p className="text-xs text-red-500 font-medium mt-1 animate-in fade-in duration-200">
                      {errors.cnpj}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-foreground">Cidade</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      if (errors.city) setErrors(prev => { const c = { ...prev }; delete c.city; return c; });
                    }}
                    className={`w-full px-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 transition-all ${errors.city ? 'border-red-500 focus:ring-red-500' : 'border-border-custom focus:ring-secondary'}`}
                    placeholder="Sua Cidade"
                    required
                  />
                  {errors.city && (
                    <p className="text-xs text-red-500 font-medium mt-1 animate-in fade-in duration-200">
                      {errors.city}
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1.5 text-foreground">Endereço (Rua e Número)</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      if (errors.location) setErrors(prev => { const c = { ...prev }; delete c.location; return c; });
                    }}
                    className={`w-full px-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 transition-all ${errors.location ? 'border-red-500 focus:ring-red-500' : 'border-border-custom focus:ring-secondary'}`}
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
                  <label className="block text-sm font-medium mb-1.5 text-foreground">Gestor Responsável</label>
                  <input
                    type="text"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border-custom bg-background focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
                    placeholder="Nome do Gestor"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-foreground">CPF do Gestor</label>
                  <input
                    type="text"
                    value={cpfManager}
                    onChange={(e) => {
                      setCpfManager(formatCPF(e.target.value));
                      if (errors.cpfManager) setErrors(prev => { const c = { ...prev }; delete c.cpfManager; return c; });
                    }}
                    className={`w-full px-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 transition-all ${errors.cpfManager ? 'border-red-500 focus:ring-red-500' : 'border-border-custom focus:ring-secondary'}`}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={isLogin ? 'md:col-span-2' : ''}>
              <label className="block text-sm font-medium mb-1.5 text-foreground">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border-custom bg-background focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground">Confirmar Senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors(prev => { const c = { ...prev }; delete c.confirmPassword; return c; });
                  }}
                  className={`w-full px-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 transition-all ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-border-custom focus:ring-secondary'}`}
                  placeholder="••••••••"
                  required={!isLogin}
                  minLength={6}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500 font-medium mt-1 animate-in fade-in duration-200">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-8 shadow-md flex items-center justify-center"
          >
            {isLoading
              ? 'Processando...'
              : (isLogin ? 'Entrar na Plataforma' : 'Criar minha Conta')}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-border-custom text-center text-sm">
          <p className="text-foreground/80 font-medium">
            {isLogin ? 'Ainda não faz parte da rede?' : 'Já possui uma conta?'}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setMessage({ type: '', text: '' });
                setErrors({});
              }}
              className="ml-2 font-bold text-secondary hover:text-primary transition-colors focus:outline-none"
            >
              {isLogin ? 'Cadastre-se agora' : 'Faça login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
