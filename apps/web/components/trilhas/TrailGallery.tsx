'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
  Image as ImageIcon,
  X,
  ZoomIn,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { getImageUrl } from '../../lib/image-url';

interface TrailPhoto {
  id: string;
  image: string;
  createdAt: string;
}

interface TrailGalleryProps {
  trailId: string;
  photos: TrailPhoto[];
}

export function TrailGallery({ trailId, photos: initialPhotos }: TrailGalleryProps) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const canManage = user?.role === 'ADMIN' || user?.role === 'SCHOOL_MANAGER';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Local state for photos — avoids dependence on server cache / router.refresh()
  const [photos, setPhotos] = useState<TrailPhoto[]>(initialPhotos);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Sync if parent re-renders with new data (e.g. on navigation)
  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  // ---------- Scroll helpers ----------
  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };



  // ---------- Upload ----------
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const token = user?.accessToken;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/trails/${trailId}/photos`,
        {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        },
      );

      if (!res.ok) {
        throw new Error('Falha ao enviar imagem');
      }

      const newPhoto: TrailPhoto = await res.json();
      // Instant UI update — add the new photo to local state
      setPhotos((prev) => [...prev, newPhoto]);
    } catch (error) {
      console.error(error);
      alert('Erro ao enviar imagem.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // ---------- Delete ----------
  const handleDelete = async (photoId: string, e?: React.MouseEvent) => {
    // Prevent opening the lightbox when clicking delete
    e?.stopPropagation();

    if (!confirm('Tem certeza que deseja excluir esta foto?')) return;

    setDeletingId(photoId);
    try {
      const token = user?.accessToken;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/trails/photos/${photoId}`,
        {
          method: 'DELETE',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );

      if (!res.ok) {
        throw new Error('Falha ao excluir imagem');
      }

      // Instant UI update — remove the photo from local state
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));

      // If lightbox is open and we deleted the current photo, adjust
      if (lightboxOpen) {
        const newPhotos = photos.filter((p) => p.id !== photoId);
        if (newPhotos.length === 0) {
          setLightboxOpen(false);
        } else if (lightboxIndex >= newPhotos.length) {
          setLightboxIndex(newPhotos.length - 1);
        }
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao excluir imagem.');
    } finally {
      setDeletingId(null);
    }
  };

  // ---------- Lightbox navigation ----------
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  const goToNext = useCallback(() => {
    setLightboxIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const goToPrev = useCallback(() => {
    setLightboxIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  // Keyboard navigation for the lightbox
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxOpen, closeLightbox, goToNext, goToPrev]);

  // ---------- Render ----------
  if (!photos?.length && !canManage) {
    return null;
  }

  return (
    <>
      <div className="mt-12 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            📷 Imagens da Trilha
            {photos.length > 0 && (
              <span className="text-sm font-normal text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {photos.length}
              </span>
            )}
          </h2>
          {canManage && (
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 active:scale-95"
              >
                {isUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
                Adicionar Imagem
              </button>
            </div>
          )}
        </div>

        {/* Gallery Grid */}
        {photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-sm group/photo cursor-pointer hover:shadow-md transition-all duration-300"
                onClick={() => openLightbox(index)}
              >
                <img
                  src={getImageUrl(photo.image)}
                  alt={`Imagem da trilha ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/photo:scale-110"
                  loading="lazy"
                />

                {/* Hover overlay with zoom icon */}
                <div className="absolute inset-0 bg-forest/0 group-hover/photo:bg-forest/20 transition-colors duration-300 flex items-center justify-center">
                  <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover/photo:opacity-100 transition-opacity duration-300 drop-shadow-md" />
                </div>

                {/* Delete button */}
                {canManage && (
                  <button
                    onClick={(e) => handleDelete(photo.id, e)}
                    disabled={deletingId === photo.id}
                    className="absolute top-2.5 right-2.5 bg-red-600/90 hover:bg-red-700 text-white p-2 rounded-lg opacity-0 group-hover/photo:opacity-100 transition-all disabled:opacity-50 shadow-md hover:scale-110 active:scale-95"
                    title="Excluir imagem"
                  >
                    {deletingId === photo.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="bg-slate-50 rounded-xl p-10 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200">
            <ImageIcon className="w-14 h-14 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-600">Nenhuma imagem</h3>
            <p className="text-slate-500 max-w-sm mt-1">
              Esta trilha ainda não possui imagens na galeria.
            </p>
          </div>
        )}
      </div>

      {/* ========== Lightbox Modal ========== */}
      {lightboxOpen && photos[lightboxIndex] && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

          {/* Content container */}
          <div
            className="relative z-10 flex items-center justify-center w-full h-full p-4 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-white/10 hover:bg-white/25 text-white p-2.5 rounded-full transition-all z-20 backdrop-blur"
              title="Fechar (Esc)"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Counter badge */}
            <div className="absolute top-4 left-4 sm:top-6 sm:left-6 bg-white/10 backdrop-blur text-white text-sm font-medium px-3 py-1.5 rounded-full z-20">
              {lightboxIndex + 1} / {photos.length}
            </div>

            {/* Delete in lightbox (for admins) */}
            {canManage && (
              <button
                onClick={(e) => handleDelete(photos[lightboxIndex].id, e)}
                disabled={deletingId === photos[lightboxIndex].id}
                className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 bg-red-600/80 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all z-20 flex items-center gap-2 backdrop-blur disabled:opacity-50"
                title="Excluir imagem"
              >
                {deletingId === photos[lightboxIndex].id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Excluir
              </button>
            )}

            {/* Previous button */}
            {photos.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrev();
                }}
                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 text-white p-3 rounded-full transition-all z-20 backdrop-blur"
                title="Anterior (←)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Main image */}
            <img
              src={getImageUrl(photos[lightboxIndex].image)}
              alt={`Imagem da trilha ${lightboxIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl select-none"
              style={{ animation: 'fadeIn 0.2s ease-out' }}
            />

            {/* Next button */}
            {photos.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 text-white p-3 rounded-full transition-all z-20 backdrop-blur"
                title="Próxima (→)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lightbox fade-in animation */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </>
  );
}
