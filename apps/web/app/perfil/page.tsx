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
        await update(); 
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
      <div className="bg-white rounded-3xl border border-border-custom shadow-sm overflow-hidden mb-6">
        <div className="h-32 bg-primary w-full relative">
          <div className="absolute -bottom-16 left-8 flex items-end gap-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full border-4 border-white bg-beige flex items-center justify-center overflow-hidden shadow-md">
                {previewImage ? (
                  <img src={previewImage} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-16 h-16 text-primary/30" />
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
            
            <div className="mb-2">
              <h1 className="text-2xl font-bold text-primary">{profileData.name}</h1>
              <div className="flex items-center gap-2 mt-1">
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
        </div>
        
        {/* Empty space to compensate for absolute positioned avatar */}
        <div className="h-20 flex justify-end px-8 pt-4">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-beige text-primary rounded-xl font-semibold hover:bg-beige/80 transition-colors h-10"
            >
              <Edit2 className="w-4 h-4" />
              Editar Perfil
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors h-10 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors h-10 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Alterações
              </button>
            </div>
          )}
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
        <div className="bg-white rounded-2xl border border-border-custom shadow-sm p-6">
          <h2 className="text-lg font-bold text-primary mb-6 flex items-center gap-2 border-b border-border-custom pb-4">
            <User className="w-5 h-5 text-secondary" />
            Informações Básicas
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground/70 mb-1">Nome Completo</label>
              {isEditing ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-border-custom px-4 py-2.5 outline-none focus:border-secondary transition-colors"
                  required
                />
              ) : (
                <p className="px-4 py-2.5 bg-beige/30 rounded-xl text-primary font-medium">{profileData.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground/70 mb-1">E-mail</label>
              {isEditing ? (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-border-custom px-4 py-2.5 outline-none focus:border-secondary transition-colors"
                  required
                />
              ) : (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-beige/30 rounded-xl text-primary font-medium">
                  <Mail className="w-4 h-4 text-foreground/50" />
                  {profileData.email}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground/70 mb-1">Telefone</label>
              {isEditing ? (
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full rounded-xl border border-border-custom px-4 py-2.5 outline-none focus:border-secondary transition-colors"
                />
              ) : (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-beige/30 rounded-xl text-primary font-medium">
                  <Phone className="w-4 h-4 text-foreground/50" />
                  {profileData.phone || 'Não informado'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Informações da Conta e Complementares */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-border-custom shadow-sm p-6">
            <h2 className="text-lg font-bold text-primary mb-6 flex items-center gap-2 border-b border-border-custom pb-4">
              <Shield className="w-5 h-5 text-secondary" />
              Detalhes da Conta
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground/70 mb-1">Status da Conta</label>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 rounded-xl text-emerald-700 font-medium border border-emerald-100">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  {profileData.status ? 'Ativa' : 'Inativa'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground/70 mb-1">Data de Cadastro</label>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl text-gray-700 font-medium border border-gray-100">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  {new Date(profileData.createdAt).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          </div>

          {profileData.school && (
            <div className="bg-white rounded-2xl border border-border-custom shadow-sm p-6">
              <h2 className="text-lg font-bold text-primary mb-6 flex items-center gap-2 border-b border-border-custom pb-4">
                <School className="w-5 h-5 text-secondary" />
                Instituição Vinculada
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground/70 mb-1">Nome da Escola</label>
                  <p className="px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-gray-700 font-medium">
                    {profileData.school.name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground/70 mb-1">Localização</label>
                  <p className="px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-gray-700 font-medium">
                    {profileData.school.location}
                  </p>
                </div>
                <p className="text-xs text-foreground/50 mt-2 italic">
                  * A vinculação com a escola é gerenciada pelo administrador.
                </p>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
