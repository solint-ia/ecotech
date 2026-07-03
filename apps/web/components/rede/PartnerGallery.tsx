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
import ConfirmDeleteModal from '../feed/ConfirmDeleteModal';

interface PartnerPhoto {
  id: string;
  image: string;
}

interface PartnerGalleryProps {
  partnerId: string;
  photos: PartnerPhoto[];
}

export function PartnerGallery({ partnerId, photos: initialPhotos }: PartnerGalleryProps) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const canManage = user?.role === 'ADMIN';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [photos, setPhotos] = useState<PartnerPhoto[]>(initialPhotos);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setIsUploading(true);
    try {
      const token = user?.accessToken;

      for (const file of files) {
        const formData = new FormData();
        formData.append('image', file);

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/partners/${partnerId}/photos`,
          {
            method: 'POST',
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
          },
        );

        if (!res.ok) {
          console.error('Falha ao enviar imagem', file.name);
          continue;
        }

        const newPhoto: PartnerPhoto = await res.json();
        setPhotos((prev) => [...prev, newPhoto]);
      }
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

  const handleDeleteClick = (photoId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDeletingId(photoId);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;

    setIsUploading(true); // Reusing this for loading state in modal or can just use isUploading
    try {
      const token = user?.accessToken;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/partners/photos/${deletingId}?partnerId=${partnerId}`,
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

      setPhotos((prev) => prev.filter((p) => p.id !== deletingId));

      if (lightboxOpen) {
        const newPhotos = photos.filter((p) => p.id !== deletingId);
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
      setIsUploading(false);
      setDeletingId(null);
    }
  };

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

  if (!photos?.length && !canManage) {
    return null;
  }

  return (
    <>
      <section className="bg-white rounded-2xl p-6 sm:p-8 border border-border-custom shadow-sm mt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-secondary" />
            Galeria de Fotos
            {photos.length > 0 && (
              <span className="text-sm font-normal text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full ml-2">
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
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 active:scale-95"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Adicionar Imagem
              </button>
            </div>
          )}
        </div>

        {/* Carousel */}
        {photos.length > 0 ? (
          <div className="relative group">
            {/* Left arrow */}
            <button
              onClick={() => handleScroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 bg-white/95 backdrop-blur p-2 rounded-full shadow-xl text-slate-700 hover:bg-white hover:scale-110 transition-all z-10 opacity-0 group-hover:opacity-100 hidden sm:flex items-center justify-center border border-border-custom"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Scrollable track */}
            <div
              ref={scrollContainerRef}
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 pt-2 px-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="relative flex-none w-64 sm:w-72 aspect-square sm:aspect-video rounded-xl overflow-hidden snap-center shadow-md group/photo cursor-pointer hover:shadow-lg transition-shadow border border-border-custom"
                  onClick={() => openLightbox(index)}
                >
                  <img
                    src={getImageUrl(photo.image)}
                    alt={`Imagem do parceiro ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover/photo:scale-105"
                    loading="lazy"
                  />

                  <div className="absolute inset-0 bg-black/0 group-hover/photo:bg-black/20 transition-colors flex items-center justify-center">
                    <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover/photo:opacity-100 transition-opacity drop-shadow-lg" />
                  </div>

                  {canManage && (
                    <button
                      onClick={(e) => handleDeleteClick(photo.id, e)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover/photo:opacity-100 transition-opacity duration-300 shadow-md"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Right arrow */}
            <button
              onClick={() => handleScroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 bg-white/95 backdrop-blur p-2 rounded-full shadow-xl text-slate-700 hover:bg-white hover:scale-110 transition-all z-10 opacity-0 group-hover:opacity-100 hidden sm:flex items-center justify-center border border-border-custom"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl p-8 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200">
            <ImageIcon className="w-12 h-12 text-slate-300 mb-3" />
            <h3 className="text-md font-medium text-slate-600">Nenhuma imagem</h3>
            <p className="text-sm text-slate-500 max-w-sm mt-1">
              Este parceiro ainda não possui imagens na galeria.
            </p>
          </div>
        )}
      </section>

      {/* ========== Lightbox Modal ========== */}
      {lightboxOpen && photos[lightboxIndex] && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          onClick={closeLightbox}
        >
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

          <div
            className="relative z-10 flex items-center justify-center w-full h-full p-4 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-white/10 hover:bg-white/25 text-white p-2.5 rounded-full transition-all z-20 backdrop-blur"
              title="Fechar (Esc)"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="absolute top-4 left-4 sm:top-6 sm:left-6 bg-white/10 backdrop-blur text-white text-sm font-medium px-3 py-1.5 rounded-full z-20">
              {lightboxIndex + 1} / {photos.length}
            </div>

            {canManage && (
              <button
                onClick={(e) => handleDeleteClick(photos[lightboxIndex].id, e)}
                className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 bg-red-600/80 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all z-20 flex items-center gap-2 backdrop-blur disabled:opacity-50"
                title="Excluir imagem"
              >
                <Trash2 className="w-4 h-4" />
                Excluir
              </button>
            )}

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

            <img
              src={getImageUrl(photos[lightboxIndex].image)}
              alt={`Imagem do parceiro ${lightboxIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl select-none"
              style={{ animation: 'fadeIn 0.2s ease-out' }}
            />

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

      {/* Confirm Delete Modal */}
      {deletingId && (
        <ConfirmDeleteModal
          title="Excluir Foto"
          description="Tem certeza que deseja excluir esta foto da galeria? Esta ação não poderá ser desfeita."
          loading={isUploading}
          onClose={() => setDeletingId(null)}
          onConfirm={confirmDelete}
        />
      )}

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
