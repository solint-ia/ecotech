'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Camera, User, Mail, Phone, Calendar, School, Shield, Save, X, Edit2, Loader2, UploadCloud } from 'lucide-react';
import { getImageUrl } from '../../lib/image-url';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function PerfilPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const user = session?.user as any;

  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated' && user?.accessToken) {
      fetchProfile();
    }
  }, [status, user, router]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${user.accessToken}` }
      });
      if (!res.ok) throw new Error('Falha ao carregar perfil.');
      const data = await res.json();
      setProfileData(data);
      resetForm(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = (data: any = profileData) => {
    if (data) {
      setName(data.name || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
      setPreviewImage(data.profileImage ? getImageUrl(data.profileImage) : null);
      setProfileImageFile(null);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    resetForm();
    setError('');
    setSuccess('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfileImageFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('phone', phone);
      if (profileImageFile) {
        formData.append('profileImage', profileImageFile);
      }

      const res = await fetch(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${user.accessToken}`
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Erro ao atualizar perfil.');
      }

      const updatedUser = await res.json();
      setProfileData(updatedUser);
      setIsEditing(false);
      setSuccess('Perfil atualizado com sucesso!');
      
      // Force next-auth to update session if name/email changed (needs page reload to reflect smoothly)
      if (updatedUser.name !== user.name || updatedUser.email !== user.email || profileImageFile) {
        await update({
          name: updatedUser.name,
          email: updatedUser.email,
          profileImage: updatedUser.profileImage
        }); 
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profileData) return null;

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrador',
    SCHOOL_MANAGER: 'Gestor de Escola',
    TEACHER: 'Professor',
    STUDENT: 'Estudante'
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Header Profile Area */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        <div className="h-32 bg-primary w-full relative overflow-hidden">
          {/* Textura Topográfica */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-5">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="trail-pattern" width="160" height="160" patternUnits="userSpaceOnUse">
                  <path d="M0,40 Q40,60 80,40 T160,40" fill="none" className="stroke-white" strokeWidth="2" />
                  <path d="M0,80 Q40,100 80,80 T160,80" fill="none" className="stroke-white" strokeWidth="2" />
                  <path d="M0,120 Q40,140 80,120 T160,120" fill="none" className="stroke-white" strokeWidth="2" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#trail-pattern)" />
            </svg>
          </div>
        </div>
        
        {/* Container que sobe sobre o banner */}
        <div className="relative px-4 sm:px-8 pb-6 sm:pb-6">
          <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end -mt-12 sm:-mt-16 relative z-10">
            
            {/* Bloco: Foto + Nome */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-6 w-full sm:w-auto text-center sm:text-left">
              <div className="relative group shrink-0">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white bg-beige flex items-center justify-center overflow-hidden shadow-md">
                  {previewImage ? (
                    <img src={previewImage} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 sm:w-16 sm:h-16 text-primary/30" />
                  )}
                </div>
                
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Camera className="w-8 h-8 mb-1" />
                    <span className="text-xs font-bold">Alterar</span>
                  </button>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                />
              </div>
              
              <div className="mt-2 sm:mt-0 sm:mb-2">
                <h1 className="text-xl sm:text-2xl font-bold text-primary truncate capitalize">{profileData.name}</h1>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
                    <Shield className="w-3 h-3" />
                    {roleLabels[profileData.role] || profileData.role}
                  </span>
                  {profileData.school && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      <School className="w-3 h-3" />
                      {profileData.school.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bloco: Botões */}
            <div className="mt-6 sm:mt-0 w-full sm:w-auto flex flex-col sm:flex-row justify-end gap-3 sm:mb-2">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-beige text-primary rounded-xl font-semibold hover:bg-beige/80 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar Perfil
                </button>
              ) : (
                <div className="w-full flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={saving}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar Alterações
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-6 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 mb-6 text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Informações Básicas */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-primary mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
            <User className="w-5 h-5 text-secondary" />
            Informações Básicas
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className={isEditing ? "block text-sm font-semibold text-foreground/70 mb-1" : "block text-sm font-medium text-gray-500 mb-1"}>
                Nome Completo
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-border-custom px-4 py-2.5 outline-none focus:border-secondary transition-colors"
                  required
                />
              ) : (
                <p className="text-base font-semibold text-gray-900 capitalize">{profileData.name}</p>
              )}
            </div>

            <div>
              <label className={isEditing ? "block text-sm font-semibold text-foreground/70 mb-1" : "block text-sm font-medium text-gray-500 mb-1"}>
                E-mail
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-border-custom px-4 py-2.5 outline-none focus:border-secondary transition-colors"
                  required
                />
              ) : (
                <p className="text-base font-semibold text-gray-900">{profileData.email}</p>
              )}
            </div>

            <div>
              <label className={isEditing ? "block text-sm font-semibold text-foreground/70 mb-1" : "block text-sm font-medium text-gray-500 mb-1"}>
                Telefone
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full rounded-xl border border-border-custom px-4 py-2.5 outline-none focus:border-secondary transition-colors"
                />
              ) : (
                <p className="text-base font-semibold text-gray-900">{profileData.phone || 'Não informado'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Informações da Conta e Complementares */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-primary mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
              <Shield className="w-5 h-5 text-secondary" />
              Detalhes da Conta
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Status da Conta</label>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full text-emerald-700 text-sm font-medium border border-emerald-100">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  {profileData.status ? 'Ativa' : 'Inativa'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Data de Cadastro</label>
                <p className="text-base font-semibold text-gray-900">
                  {new Date(profileData.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>

          {profileData.school && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-primary mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                <School className="w-5 h-5 text-secondary" />
                Instituição Vinculada
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Nome da Escola</label>
                  <p className="text-base font-semibold text-gray-900 capitalize">
                    {profileData.school.name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Localização</label>
                  <p className="text-base font-semibold text-gray-900">
                    {profileData.school.location}
                  </p>
                </div>
                <p className="text-xs text-gray-400 mt-2 italic border-t border-gray-100 pt-3">
                  * O vínculo escolar é gerenciado pelo administrador.
                </p>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
