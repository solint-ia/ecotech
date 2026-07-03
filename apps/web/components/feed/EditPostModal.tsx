'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { ImagePlus, Send, X, Loader2, Save } from 'lucide-react';
import { FeedPost } from './FeedPostCard';
import AlertModal from './AlertModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface School { id: string; name: string; }
interface Trail  { id: string; title: string; slug: string; }

interface EditPostModalProps {
  post: FeedPost;
  accessToken: string;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditPostModal({
  post,
  accessToken,
  onClose,
  onUpdated,
}: EditPostModalProps) {
  const [description, setDescription] = useState(post.description || '');
  const [schoolId, setSchoolId] = useState(post.school?.id || '');
  const [trailId, setTrailId] = useState(post.trail?.id || '');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  
  const currentMediaUrls = post.images?.sort((a, b) => a.order - b.order).map(img => 
    img.url.startsWith('http') ? img.url : `${API_URL}${img.url}`
  ) || [];
    
  const [imagePreviews, setImagePreviews] = useState<string[]>(currentMediaUrls);
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [alertMessage, setAlertMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('description', description.trim());
      if (schoolId) formData.append('schoolId', schoolId);
      if (trailId) formData.append('trailId', trailId);
      
      if (imageFiles.length > 0) {
        imageFiles.forEach(file => formData.append('images', file));
      }

      // Identify retained images (the ones that are still in imagePreviews and are existing URLs)
      const retainedImages = imagePreviews.filter(preview => 
        preview.startsWith('http') || preview.startsWith('/uploads')
      );
      
      // If no images are retained, we still need to send an empty array or signal to backend.
      // But formData only appends strings. If retainedImages is empty, we don't append anything.
      // Wait, if we send nothing, the backend assumes retainedImages is undefined, which means NO images were sent.
      // Let's send them one by one. If it's empty, we send a specific flag or just send an empty string.
      if (retainedImages.length === 0) {
        formData.append('retainedImages', '');
      } else {
        retainedImages.forEach(url => {
          // Send relative URL if it starts with API_URL to match backend DB format
          const dbUrl = url.startsWith(API_URL) ? url.replace(API_URL, '') : url;
          formData.append('retainedImages', dbUrl);
        });
      }

      const res = await fetch(`${API_URL}/feed/${post.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });

      if (res.ok) {
        onUpdated();
      } else {
        const errData = await res.json().catch(() => null);
        alert(`Erro ao salvar: ${errData?.message || 'Falha no servidor'}`);
      }
    } catch (e) {
      console.error('Erro de conexão ao salvar:', e);
      alert('Erro de conexão ao salvar a publicação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl border border-border-custom shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border-custom bg-beige/30">
          <h2 className="text-lg font-bold text-primary">Editar Publicação</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 text-foreground/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-primary">Descrição <span className="text-red-500">*</span></label>
            <textarea
              placeholder="O que você gostaria de compartilhar?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl border border-border-custom bg-white focus:ring-2 focus:ring-secondary focus:outline-none text-sm resize-none"
              required
            />
          </div>

          {/* Dropdowns row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-primary">Escola</label>
              <select
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border-custom bg-white focus:ring-2 focus:ring-secondary focus:outline-none text-sm text-foreground/80"
              >
                <option value="">Nenhuma</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-primary">Trilha Mencionada</label>
              <select
                value={trailId}
                onChange={(e) => setTrailId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border-custom bg-white focus:ring-2 focus:ring-secondary focus:outline-none text-sm text-foreground/80"
              >
                <option value="">Nenhuma</option>
                {trails.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Image preview */}
          <div className="space-y-1.5 pt-2">
             <label className="text-sm font-semibold text-primary">Imagem Mídia</label>
            
            {imagePreviews.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {imagePreviews.map((preview, index) => {
                  const isVideo = preview.match(/\.(mp4|webm|ogg)$/i) || imageFiles[index]?.type.startsWith('video/');
                  return (
                    <div key={index} className="relative rounded-xl overflow-hidden border border-border-custom bg-black/5 aspect-square group">
                      {isVideo ? (
                        <video src={preview} className="w-full h-full object-cover" />
                      ) : (
                        <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 shadow-sm backdrop-blur-sm"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-border-custom hover:border-secondary hover:bg-secondary/5 transition-all text-foreground/60 hover:text-secondary"
            >
              <ImagePlus className="w-6 h-6" />
              <span className="text-sm font-medium">{imagePreviews.length > 0 ? 'Substituir imagens (máx 5)' : 'Adicionar imagens'}</span>
            </button>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
            className="hidden"
            onChange={handleImageChange}
          />

          {/* Bottom actions */}
          <div className="flex items-center justify-end gap-3 pt-6 mt-2 border-t border-border-custom">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 text-sm font-semibold text-foreground/70 hover:text-primary transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !description.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>

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
