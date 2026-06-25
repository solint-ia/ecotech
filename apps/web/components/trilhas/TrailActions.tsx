'use client';

import { useState, useEffect } from 'react';
import { Heart, ExternalLink, Pencil } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import ShareModal from './ShareModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface TrailActionsProps {
  trail: {
    id: string;
    title: string;
    slug?: string;
    schoolId?: string;
    coverImage?: string;
    wikilocUrl?: string;
    likesCount?: number;
    _count?: {
      likes?: number;
    };
  };
}

export default function TrailActions({ trail }: TrailActionsProps) {
  const { data: session } = useSession();
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  // Ensure we fallback to 0 if likesCount is undefined, preventing negative increments from 0
  const [likesCount, setLikesCount] = useState(trail.likesCount ?? 0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  const user = session?.user as any;
  const token = user?.accessToken;

  useEffect(() => {
    setCurrentUrl(window.location.href);

    if (token) {
      // Busca status inicial de like/save
      fetch(`${API_URL}/trails/${trail.id}/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        setIsLiked(data.isLiked);
        setIsSaved(data.isSaved);
      })
      .catch(console.error);
    }
  }, [token, trail.id]);

  const handleLike = async () => {
    if (!token) return;
    try {
      // Optimistic update
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? prev - 1 : prev + 1);

      const res = await fetch(`${API_URL}/trails/${trail.id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      
      // Sync state if optimistic was wrong
      if (data.isLiked !== !isLiked) {
        setIsLiked(data.isLiked);
        setLikesCount(prev => data.isLiked ? prev + 1 : prev - 1);
      }
    } catch {
      // Revert optimistic on error
      setIsLiked(!isLiked);
      setLikesCount(prev => !isLiked ? prev - 1 : prev + 1);
    }
  };

  const handleSave = async () => {
    if (!token) return;
    try {
      setIsSaved(!isSaved);
      const res = await fetch(`${API_URL}/trails/${trail.id}/save`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      
      if (data.isSaved !== !isSaved) {
        setIsSaved(data.isSaved);
      }
    } catch {
      setIsSaved(!isSaved);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            isLiked ? 'text-red-500' : 'text-foreground/70 hover:text-red-500'
          }`}
          title={isLiked ? "Descurtir" : "Curtir"}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          <span>{likesCount}</span>
        </button>
        <button
          onClick={handleSave}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            isSaved ? 'text-primary font-medium' : 'text-foreground/70 hover:text-primary'
          }`}
        >
          <svg className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-7-7 7V5z" />
          </svg>
          {isSaved ? 'Salvo' : 'Salvar'}
        </button>
        <button
          onClick={() => setIsShareModalOpen(true)}
          className="flex items-center gap-1.5 text-sm text-foreground/70 hover:text-primary transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Compartilhar
        </button>
        {trail.wikilocUrl && (
          <a
            href={trail.wikilocUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Wikiloc
          </a>
        )}
        {(user?.role === 'ADMIN' || (user?.role === 'SCHOOL_MANAGER' && user?.schoolId === trail.schoolId)) && trail.slug && (
          <Link
            href={`/trilhas/${trail.slug}/editar`}
            className="flex items-center gap-1.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            <Pencil className="w-4 h-4" />
            Editar Trilha
          </Link>
        )}
      </div>

      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        trail={trail as any}
        url={currentUrl}
      />
    </>
  );
}
