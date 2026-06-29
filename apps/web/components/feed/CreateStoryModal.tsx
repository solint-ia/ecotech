'use client';

import { useState, useRef, FormEvent } from 'react';
import { X, ImagePlus, Loader2, Send } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface CreateStoryModalProps {
  accessToken: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateStoryModal({ accessToken, onClose, onCreated }: CreateStoryModalProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!imageFile) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      if (caption) formData.append('caption', caption);
      if (location) formData.append('location', location);

      const res = await fetch(`${API_URL}/stories`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });

      if (res.ok) {
        onCreated();
        onClose();
      } else {
        const errData = await res.json().catch(() => null);
        alert(`Erro ao publicar story: ${errData?.message || 'Falha no servidor'}`);
      }
    } catch (error) {
      console.error('Erro ao enviar story:', error);
      alert('Erro de conexão ao publicar story.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border-custom bg-beige/30">
          <h2 className="text-lg font-bold text-primary">Novo Story</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 transition-colors text-foreground/50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          <div className="flex justify-center">
            {imagePreview ? (
              <div className="relative w-full aspect-[9/16] bg-black rounded-xl overflow-hidden max-h-[60vh]">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-[9/16] max-h-[60vh] flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-secondary/40 bg-secondary/5 text-secondary hover:bg-secondary/10 hover:border-secondary transition-all"
              >
                <ImagePlus className="w-10 h-10" />
                <span className="text-sm font-medium">Selecionar Foto</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleImageChange}
          />

          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Localização (ex: Parque Ibirapuera)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-2 bg-secondary/5 border border-border-custom rounded-xl focus:outline-none focus:ring-2 focus:ring-sage/50 text-sm"
              maxLength={40}
            />
            <textarea
              placeholder="Adicione uma legenda..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-4 py-2 bg-secondary/5 border border-border-custom rounded-xl focus:outline-none focus:ring-2 focus:ring-sage/50 text-sm resize-none h-20"
              maxLength={150}
            />
          </div>

          <button
            type="submit"
            disabled={!imageFile || loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {loading ? 'Publicando...' : 'Publicar Story'}
          </button>
        </form>
      </div>
    </div>
  );
}
