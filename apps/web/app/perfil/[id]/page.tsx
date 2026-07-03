'use client';

import { useEffect, useState, useRef, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Camera, User, Mail, Phone, Calendar, School, Save, Edit2, Loader2, Image as ImageIcon } from 'lucide-react';
import { getImageUrl } from '../../../lib/image-url';
import FeedPostCard, { FeedPost } from '../../../components/feed/FeedPostCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function PerfilPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const user = session?.user as any;
  const resolvedParams = use(params);
  const profileId = resolvedParams.id;

  const isOwner = status === 'authenticated' && user?.id === profileId;

  const [profileData, setProfileData] = useState<any>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [schools, setSchools] = useState<any[]>([]);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Email Update Flow States
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [showOtpPrompt, setShowOtpPrompt] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated' && user?.accessToken) {
      fetchProfile();
      fetchPosts();
      if (isOwner) fetchSchools();
    }
  }, [status, user, router, profileId, isOwner]);

  const fetchSchools = async () => {
    try {
      const res = await fetch(`${API_URL}/schools?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setSchools(data || []);
      }
    } catch (err) {
      console.error('Erro ao buscar escolas:', err);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/users/${profileId}`, {
        headers: { Authorization: `Bearer ${user.accessToken}` }
      });
      if (!res.ok) {
        if (res.status === 404) {
          router.push('/feed');
        }
        throw new Error('Falha ao carregar perfil.');
      }
      const data = await res.json();
      setProfileData(data);
      if (isOwner) {
        resetForm(data);
      } else {
        setPreviewImage(data.profileImage ? getImageUrl(data.profileImage) : null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoadingPosts(true);
      const res = await fetch(`${API_URL}/feed?userId=${profileId}`, {
        headers: { Authorization: `Bearer ${user.accessToken}` }
      });
      if (!res.ok) throw new Error('Falha ao carregar posts');
      const data = await res.json();
      setPosts(data.items || []);
    } catch (err) {
      console.error('Erro ao carregar posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const resetForm = (data: any = profileData) => {
    if (data) {
      setName(data.name || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
      setSchoolId(data.schoolId || '');
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
    if (!isOwner) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('phone', phone);
      if (schoolId !== undefined) {
        formData.append('schoolId', schoolId);
      }
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
      
      // Always refresh the session with latest data from the API
      await update({
        name: updatedUser.name,
        profileImage: updatedUser.profileImage,
        role: updatedUser.role,
        roleStatus: updatedUser.roleStatus,
        schoolId: updatedUser.schoolId,
      });

      // Check if email was changed
      if (email.trim() !== user.email && email.trim() !== '') {
        setPendingEmail(email.trim());
        setShowPasswordPrompt(true);
        // Do not close editing mode yet
      } else {
        setIsEditing(false);
        setSuccess('Perfil atualizado com sucesso!');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRequestEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    
    try {
      const res = await fetch(`${API_URL}/auth/request-email-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.accessToken}`
        },
        body: JSON.stringify({ newEmail: pendingEmail, currentPassword })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Erro ao solicitar alteração de e-mail.');
      }

      setShowPasswordPrompt(false);
      setShowOtpPrompt(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    
    try {
      const res = await fetch(`${API_URL}/auth/verify-email-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.accessToken}`
        },
        body: JSON.stringify({ newEmail: pendingEmail, otp: otpCode })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Código inválido ou expirado.');
      }

      // Update session with new email
      await update({
        email: pendingEmail
      });
      
      setProfileData({ ...profileData, email: pendingEmail });
      setShowOtpPrompt(false);
      setIsEditing(false);
      setSuccess('E-mail atualizado com sucesso!');
      setPendingEmail('');
      setOtpCode('');
      setCurrentPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePost = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
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
    STUDENT: 'Estudante',
    USER: 'Usuário'
  };

  const initials = profileData.name
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="max-w-5xl mx-auto pb-12">
      {/* Hero Banner */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-8">
        <div className="h-40 bg-[#0B3B24] w-full relative overflow-hidden">
          <div className="absolute inset-0 z-0 pointer-events-none opacity-10">
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
        
        <div className="relative px-6 sm:px-10 pb-8">
          <div className="flex flex-col md:flex-row justify-between items-center md:items-end -mt-16 md:-mt-20 relative z-10">
            
            <div className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 w-full md:w-auto text-center md:text-left">
              <div className="relative group shrink-0">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white bg-beige flex items-center justify-center overflow-hidden shadow-md">
                  {previewImage ? (
                    <img src={previewImage} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-16 h-16 text-primary/30" />
                  )}
                </div>
                
                {isEditing && isOwner && (
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
              
              <div className="flex flex-col items-center md:items-start md:pb-2">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">{profileData.name}</h1>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <span className="bg-forest/10 text-forest border border-forest/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                    {profileData.roleStatus === 'PENDENTE' 
                      ? 'Aprovação Pendente' 
                      : roleLabels[profileData.role] || profileData.role}
                  </span>
                  {profileData.roleStatus !== 'PENDENTE' && profileData.school && (
                    <span className="bg-sky-100 text-sky-800 border border-sky-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                      <School className="w-3 h-3" />
                      {profileData.school.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {isOwner && !isEditing && (
              <div className="mt-6 md:mt-0 md:pb-2 w-full md:w-auto">
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar Perfil
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 text-sm">
          {success}
        </div>
      )}

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Info */}
        <div className="lg:col-span-1">
          {isEditing && isOwner ? (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Editar Informações</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  type="tel"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>

              {profileData.role !== 'SCHOOL_MANAGER' && profileData.role !== 'ADMIN' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Escola Vinculada</label>
                  <select
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                    value={schoolId || ''}
                    onChange={(e) => setSchoolId(e.target.value)}
                  >
                    <option value="">Nenhuma escola</option>
                    {schools.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  {schoolId !== profileData.schoolId && (
                    <p className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-100">
                      ⚠️ Ao alterar sua escola, seus acessos de professor (se houver) serão revogados e seu perfil entrará em status <b>Pendente</b> até que o novo gestor escolar o aprove.
                    </p>
                  )}
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 px-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6 sticky top-24">
              <h2 className="text-lg font-bold text-slate-900 border-b border-gray-100 pb-3">Sobre</h2>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Mail className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">Email</span>
                  </div>
                  <p className="font-medium text-slate-800">{profileData.email}</p>
                </div>

                {(isOwner && profileData.phone) && (
                  <div>
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Phone className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase tracking-wider">Telefone</span>
                    </div>
                    <p className="font-medium text-slate-800">{profileData.phone}</p>
                  </div>
                )}
                
                <div>
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">Membro desde</span>
                  </div>
                  <p className="font-medium text-slate-800">
                    {new Date(profileData.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Posts Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Publicações <span className="text-sm font-normal text-gray-500">({posts.length})</span>
            </h2>
          </div>

          {loadingPosts ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : posts.length > 0 ? (
            <div className="space-y-6">
              {posts.map(post => (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  currentUserId={user?.id}
                  currentUserRole={user?.role}
                  accessToken={user?.accessToken}
                  onDelete={handleDeletePost}
                />
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl py-16 px-6 text-center border border-gray-100 flex flex-col items-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 text-gray-400">
                <ImageIcon className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Nenhuma publicação encontrada</h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                {isOwner 
                  ? "Você ainda não fez nenhuma postagem. Compartilhe sua primeira aventura na trilha!" 
                  : "Este usuário ainda não compartilhou nenhuma aventura."}
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Password Prompt Modal for Email Update */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Confirme sua senha</h3>
              <p className="text-sm text-gray-500 mb-4">
                Para alterar seu e-mail para <strong className="text-slate-700">{pendingEmail}</strong>, por favor insira sua senha atual.
              </p>
              <form onSubmit={handleRequestEmailUpdate}>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">
                    {error}
                  </div>
                )}
                <input
                  type="password"
                  required
                  placeholder="Senha atual"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 mb-4"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordPrompt(false);
                      setPendingEmail('');
                      setCurrentPassword('');
                      setError('');
                    }}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2.5 bg-forest text-white font-bold rounded-xl hover:bg-forest/90 transition-colors disabled:opacity-70 flex justify-center items-center"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* OTP Prompt Modal for Email Update */}
      {showOtpPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <Mail className="w-12 h-12 text-forest mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Código enviado!</h3>
              <p className="text-sm text-gray-500 mb-6">
                Enviamos um código de 6 dígitos para <strong>{pendingEmail}</strong>. Insira-o abaixo para concluir a alteração.
              </p>
              <form onSubmit={handleVerifyEmailUpdate}>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm text-left">
                    {error}
                  </div>
                )}
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="000000"
                  className="w-full text-center tracking-[0.5em] text-2xl px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 mb-6 font-mono"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowOtpPrompt(false);
                      setPendingEmail('');
                      setOtpCode('');
                      setError('');
                    }}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving || otpCode.length !== 6}
                    className="flex-1 py-2.5 bg-forest text-white font-bold rounded-xl hover:bg-forest/90 transition-colors disabled:opacity-70 flex justify-center items-center"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verificar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
