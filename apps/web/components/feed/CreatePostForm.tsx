'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { ImagePlus, Send, X, Loader2 } from 'lucide-react';
import AlertModal from './AlertModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface School { id: string; name: string; }
interface Trail  { id: string; title: string; slug: string; }

interface CreatePostFormProps {
  accessToken: string;
  userName: string;
  userImage?: string | null;
  userSchoolId?: string | null;
  userRole?: string;
  onCreated: () => void;
}

export default function CreatePostForm({
  accessToken,
  userName,
  userImage,
  userSchoolId,
  userRole,
  onCreated,
}: CreatePostFormProps) {
  // Only USER and ADMIN can pick a school for the post; every other role
  // (SCHOOL_MANAGER, TEACHER, STUDENT) is tied to their own school already.
  const lockedToOwnSchool = userRole !== 'USER' && userRole !== 'ADMIN';
  const [description, setDescription] = useState('');
  const [schoolId, setSchoolId] = useState(userSchoolId || '');
  const [trailId, setTrailId] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = userName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  // Fetch schools and trails for dropdowns
  useEffect(() => {
    fetch(`${API_URL}/schools`)
      .then((r) => r.json())
      .then((data) => setSchools(Array.isArray(data) ? data : data.data || []))
      .catch(() => {});

    fetch(`${API_URL}/trails`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.items || data?.data || [];
        setTrails(list);
      })
      .catch(() => {});
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const validFiles: File[] = [];
      const promises = files.map(file => {
        return new Promise<void>((resolve) => {
          if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
              URL.revokeObjectURL(video.src);
              if (video.duration <= 60) {
                validFiles.push(file);
              } else {
                setAlertMessage(`O vídeo "${file.name}" possui mais de 1 minuto e foi ignorado.`);
              }
              resolve();
            };
            video.src = URL.createObjectURL(file);
          } else {
            validFiles.push(file);
            resolve();
          }
        });
      });

      Promise.all(promises).then(() => {
        if (validFiles.length > 0) {
          const newFiles = [...imageFiles, ...validFiles].slice(0, 5);
          setImageFiles(newFiles);
          const newPreviews = newFiles.map(f => URL.createObjectURL(f));
          setImagePreviews(newPreviews);
        }
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
  };

  const clearImages = () => {
    setImageFiles([]);
    setImagePreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('description', description.trim());
      if (schoolId) formData.append('schoolId', schoolId);
      if (trailId) formData.append('trailId', trailId);
      imageFiles.forEach((file) => {
        formData.append('images', file);
      });

      const res = await fetch(`${API_URL}/feed`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });

      if (res.ok) {
        setDescription('');
        setTrailId('');
        clearImages();
        setExpanded(false);
        onCreated();
      } else {
        const errData = await res.json().catch(() => null);
        console.error('Erro retornado pela API:', errData);
        alert(`Erro ao publicar: ${errData?.message || 'Falha no servidor'}`);
      }
    } catch (e) {
      console.error('Erro de conexão:', e);
      alert('Erro de conexão ao publicar.');
    } finally {
      setLoading(false);
    }
  };

  // Users without an approved membership (role USER — which also covers pending
  // students/teachers whose session role is downgraded) cannot publish. The API
  // enforces this too; this is the matching UX gate.
  if (userRole === 'USER') {
    return (
      <div className="bg-white rounded-2xl border border-border-custom shadow-sm p-4 flex items-center gap-3 text-sm text-foreground/70">
        <Loader2 className="w-5 h-5 text-forest shrink-0" />
        <span>
          Seu vínculo com a escola ainda está em análise. Você poderá publicar e interagir no feed assim que for aprovado.
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-border-custom shadow-sm overflow-hidden transition-all duration-300">
      {/* Collapsed trigger */}
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-beige/50 transition-colors"
        >
          {userImage ? (
            <img
              src={userImage.startsWith('http') ? userImage : `${API_URL}${userImage}`}
              alt={userName}
              className="w-10 h-10 rounded-full object-cover border-2 border-secondary/30"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center text-sm font-bold">
              {initials}
            </div>
          )}
          <span className="text-sm text-foreground/50 flex-1">
            Compartilhe algo com a comunidade...
          </span>
          <ImagePlus className="w-5 h-5 text-secondary/60" />
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {userImage ? (
                <img
                  src={userImage.startsWith('http') ? userImage : `${API_URL}${userImage}`}
                  alt={userName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-secondary/30"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center text-sm font-bold">
                  {initials}
                </div>
              )}
              <span className="font-semibold text-sm text-primary">{userName}</span>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="p-1.5 rounded-full hover:bg-black/5 transition-colors group"
            >
              <X className="w-5 h-5 text-foreground/40 group-hover:text-forest transition-colors" />
            </button>
          </div>

          {/* Description */}
          <textarea
            placeholder="O que você gostaria de compartilhar? *"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-black/5 bg-white focus:ring-1 focus:ring-forest focus:border-forest focus:outline-none text-sm placeholder:text-foreground/40 resize-none transition-all shadow-sm"
            required
          />

          {/* Dropdowns row */}
          <div className={`grid grid-cols-1 gap-3 ${lockedToOwnSchool ? '' : 'sm:grid-cols-2'}`}>
            {!lockedToOwnSchool && (
              <div className="relative">
                <select
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-black/5 bg-white focus:ring-1 focus:ring-forest focus:border-forest focus:outline-none text-sm text-foreground/60 transition-all shadow-sm appearance-none pr-10"
                >
                  <option value="">Escola do autor (opcional)</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-foreground/40">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            )}

            <div className="relative">
              <select
                value={trailId}
                onChange={(e) => setTrailId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-black/5 bg-white focus:ring-1 focus:ring-forest focus:border-forest focus:outline-none text-sm text-foreground/60 transition-all shadow-sm appearance-none pr-10"
              >
                <option value="">Trilha mencionada (opcional)</option>
                {trails.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-foreground/40">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          {/* Image preview grid */}
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
              {imagePreviews.map((preview, index) => {
                const isVideo = imageFiles[index]?.type.startsWith('video/');
                return (
                  <div key={index} className="relative rounded-xl overflow-hidden border border-border-custom aspect-square group shadow-sm">
                    {isVideo ? (
                      <video src={preview} className="w-full h-full object-cover" />
                    ) : (
                      <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                    )}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 shadow-sm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom actions */}
          <div className="flex items-center justify-between pt-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-sm text-forest font-medium border border-forest/20 rounded-full px-4 py-2 hover:bg-[#EAF4EE] transition-colors"
            >
              <ImagePlus className="w-4 h-4" />
              Mídia
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              className="hidden"
              onChange={handleImageChange}
            />

            <button
              type="submit"
              disabled={loading || !description.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-forest text-white rounded-full text-sm font-bold hover:bg-forest/90 hover:-translate-y-0.5 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none shadow-sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Publicar
            </button>
          </div>
        </form>
      )}

      {alertMessage && (
        <AlertModal
          title="Aviso"
          message={alertMessage}
          onClose={() => setAlertMessage('')}
        />
      )}
    </div>
  );
}
