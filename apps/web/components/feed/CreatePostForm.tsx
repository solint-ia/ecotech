'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { ImagePlus, Send, X, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface School { id: string; name: string; }
interface Trail  { id: string; title: string; slug: string; }

interface CreatePostFormProps {
  accessToken: string;
  userName: string;
  userImage?: string | null;
  userSchoolId?: string | null;
  onCreated: () => void;
}

export default function CreatePostForm({
  accessToken,
  userName,
  userImage,
  userSchoolId,
  onCreated,
}: CreatePostFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [schoolId, setSchoolId] = useState(userSchoolId || '');
  const [trailId, setTrailId] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [expanded, setExpanded] = useState(false);
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
      .then((data) => setSchools(Array.isArray(data) ? data : []))
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
      // Limit to max 5 images
      const newFiles = [...imageFiles, ...files].slice(0, 5);
      setImageFiles(newFiles);
      
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setImagePreviews(newPreviews);
    }
    // reset input
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
    if (!title.trim() || !description.trim()) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
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
        setTitle('');
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
              className="p-1.5 rounded-lg hover:bg-beige transition-colors"
            >
              <X className="w-4 h-4 text-foreground/50" />
            </button>
          </div>

          {/* Title */}
          <input
            type="text"
            placeholder="Título da publicação *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-border-custom bg-beige/30 focus:ring-2 focus:ring-secondary focus:outline-none text-sm placeholder:text-foreground/40"
            required
          />

          {/* Description */}
          <textarea
            placeholder="O que você gostaria de compartilhar? *"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-border-custom bg-beige/30 focus:ring-2 focus:ring-secondary focus:outline-none text-sm placeholder:text-foreground/40 resize-none"
            required
          />

          {/* Dropdowns row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border-custom bg-beige/30 focus:ring-2 focus:ring-secondary focus:outline-none text-sm text-foreground/70"
            >
              <option value="">Escola do autor (opcional)</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <select
              value={trailId}
              onChange={(e) => setTrailId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border-custom bg-beige/30 focus:ring-2 focus:ring-secondary focus:outline-none text-sm text-foreground/70"
            >
              <option value="">Trilha mencionada (opcional)</option>
              {trails.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>

          {/* Image preview grid */}
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative rounded-xl overflow-hidden border border-border-custom aspect-square group">
                  <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Bottom actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border-custom">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-sm text-secondary hover:text-primary transition-colors font-medium"
            >
              <ImagePlus className="w-5 h-5" />
              Imagem
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />

            <button
              type="submit"
              disabled={loading || !title.trim() || !description.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
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
    </div>
  );
}
