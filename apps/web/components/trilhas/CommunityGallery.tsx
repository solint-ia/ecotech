'use client';

import { useEffect, useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import { getImageUrl } from '../../lib/image-url';

interface CommunityImage {
  id: string;
  url: string;
  postId: string;
  userName: string;
  userAvatar: string | null;
  postTitle: string;
}

interface CommunityGalleryProps {
  trailId: string;
}

export function CommunityGallery({ trailId }: CommunityGalleryProps) {
  const [images, setImages] = useState<CommunityImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    fetchCommunityPhotos();
  }, [trailId]);

  const fetchCommunityPhotos = async () => {
    try {
      setIsLoading(true);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiBaseUrl}/feed?trailId=${trailId}&take=50`);
      if (!res.ok) throw new Error('Falha ao carregar fotos da comunidade');
      
      const data = await res.json();
      
      const extractedImages: CommunityImage[] = [];
      data.items.forEach((post: any) => {
        if (post.images && post.images.length > 0) {
          post.images.forEach((img: any) => {
            extractedImages.push({
              id: img.id,
              url: img.url,
              postId: post.id,
              userName: post.user?.name || 'Usuário Anônimo',
              userAvatar: post.user?.profileImage || null,
              postTitle: post.title,
            });
          });
        }
      });

      setImages(extractedImages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const showPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const showNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  if (isLoading) {
    return (
      <div className="mt-12 mb-8">
        <h2 className="text-xl font-bold text-primary mb-1">Trilheiros em Ação</h2>
        <p className="text-sm text-foreground/60 mb-6">Veja os momentos compartilhados por quem já passou por aqui</p>
        <div className="flex items-center justify-center h-40 bg-gray-50 rounded-2xl border border-gray-100">
          <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="mt-12 mb-8">
        <h2 className="text-xl font-bold text-primary mb-1">Trilheiros em Ação</h2>
        <p className="text-sm text-foreground/60 mb-6">Veja os momentos compartilhados por quem já passou por aqui</p>
        
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-2xl border border-gray-100 text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-gray-100">
            <Camera className="w-8 h-8 text-primary/40" />
          </div>
          <p className="text-foreground/70 max-w-md">
            Ainda não há registros da comunidade por aqui. Seja o primeiro a explorar e marcar esta trilha no seu Feed!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-12 mb-8">
      <h2 className="text-xl font-bold text-primary mb-1">Trilheiros em Ação</h2>
      <p className="text-sm text-foreground/60 mb-6">Veja os momentos compartilhados por quem já passou por aqui</p>

      {error && (
        <div className="p-4 mb-4 text-sm text-red-600 bg-red-50 rounded-xl">{error}</div>
      )}

      {/* Responsive Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((img, index) => (
          <div 
            key={img.id} 
            onClick={() => openLightbox(index)}
            className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer shadow-sm border border-black/5"
          >
            <img 
              src={getImageUrl(img.url)} 
              alt={`Foto por ${img.userName}`} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            
            {/* Credit Overlay */}
            <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end p-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full overflow-hidden bg-white/20 shrink-0 border border-white/40">
                  {img.userAvatar ? (
                    <img src={getImageUrl(img.userAvatar)} alt={img.userName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-white flex items-center justify-center text-[10px] font-bold text-primary">
                      {img.userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-white text-xs sm:text-sm font-medium truncate drop-shadow-sm">
                  {img.userName}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && images[lightboxIndex] && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm">
          {/* Close */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 sm:top-8 sm:right-8 p-3 bg-black/50 hover:bg-white/20 text-white rounded-full transition-colors z-10 backdrop-blur-md"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Prev */}
          {images.length > 1 && (
            <button
              onClick={showPrev}
              className="absolute left-2 sm:left-8 p-3 bg-black/50 hover:bg-white/20 text-white rounded-full transition-colors z-10 backdrop-blur-md"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Next */}
          {images.length > 1 && (
            <button
              onClick={showNext}
              className="absolute right-2 sm:right-8 p-3 bg-black/50 hover:bg-white/20 text-white rounded-full transition-colors z-10 backdrop-blur-md"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* Image Container */}
          <div className="relative w-full h-full max-w-5xl max-h-[85vh] flex flex-col items-center justify-center p-4">
            <img
              src={getImageUrl(images[lightboxIndex].url)}
              alt="Ampliada"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
            {/* Context Info in Lightbox */}
            <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-auto bg-black/60 backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-white/20 shrink-0 border border-white/40">
                {images[lightboxIndex].userAvatar ? (
                  <img src={getImageUrl(images[lightboxIndex].userAvatar!)} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white flex items-center justify-center text-xs font-bold text-primary">
                    {images[lightboxIndex].userName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{images[lightboxIndex].userName}</p>
                <p className="text-white/70 text-xs truncate max-w-[200px]">{images[lightboxIndex].postTitle}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
