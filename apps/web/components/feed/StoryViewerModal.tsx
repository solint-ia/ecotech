'use client';

import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, MoreHorizontal, Trash2, Link } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface Story {
  id: string;
  mediaUrl: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    profileImage?: string | null;
  };
}

interface StoryViewerModalProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
  currentUserId?: string;
  accessToken?: string;
  onDeleteStory?: (id: string) => void;
}

export default function StoryViewerModal({ stories, initialIndex, onClose, currentUserId, accessToken, onDeleteStory }: StoryViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const currentStory = stories[currentIndex];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowMenu(false);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowMenu(false);
    } else {
      onClose(); // Close if it's the last story
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
      } else if (e.key === 'ArrowRight') {
        if (currentIndex < stories.length - 1) setCurrentIndex(prev => prev + 1);
        else onClose();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, stories.length, onClose]);

  // 15 seconds timer
  useEffect(() => {
    if (showMenu) return; // Pause timer if menu is open
    const timer = setTimeout(() => {
      if (currentIndex < stories.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onClose();
      }
    }, 15000);
    return () => clearTimeout(timer);
  }, [currentIndex, stories.length, onClose, showMenu]);

  if (!currentStory) return null;

  const isOwner = currentUserId === currentStory.user.id;

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    const url = `${window.location.origin}/feed?story=${currentStory.id}`;
    if (navigator.share) {
      navigator.share({ title: 'Story de ' + currentStory.user.name, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copiado!');
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!accessToken || !isOwner || isDeleting) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/stories/${currentStory.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok || res.status === 204) {
        onDeleteStory?.(currentStory.id);
        if (stories.length === 1) {
          onClose();
        } else if (currentIndex < stories.length - 1) {
          setCurrentIndex(currentIndex + 1); // Move to next
        } else {
          setCurrentIndex(currentIndex - 1); // Move to prev
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
      setShowMenu(false);
    }
  };

  const timeAgo = formatDistanceToNowStrict(new Date(currentStory.createdAt), { locale: ptBR, addSuffix: false })
    .replace('segundos', 's')
    .replace('minutos', 'm')
    .replace('horas', 'h')
    .replace('hora', 'h')
    .replace(' dias', 'd')
    .replace(' dia', 'd')
    .replace(' ', ''); // Simplifies "2 horas" to "2h"

  // Filter stories for the current user to display in progress bar
  const userStories = stories.filter(s => s.user.id === currentStory.user.id);
  const userStoryIndex = userStories.findIndex(s => s.id === currentStory.id);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Close button handled inside header now to group with 3 dots */}

      {/* Main Container */}
      <div className="relative w-full h-full sm:w-[400px] sm:h-[90vh] sm:rounded-2xl overflow-hidden bg-black flex flex-col justify-center shadow-2xl">
        
        {/* Progress Bars Indicator */}
        <div className="absolute top-2 left-0 right-0 z-10 flex gap-1 px-2">
          {userStories.map((s, i) => (
            <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-white`} 
                style={{ 
                  width: i < userStoryIndex ? '100%' : i === userStoryIndex ? '100%' : '0%',
                  transition: i === userStoryIndex && !showMenu ? 'width 15s linear' : 'none'
                }}
                key={i === userStoryIndex && !showMenu ? `active-${s.id}` : `inactive-${s.id}`}
                ref={(el) => {
                  if (el && i === userStoryIndex && !showMenu) {
                    // Reset animation
                    el.style.width = '0%';
                    // Trigger reflow
                    void el.offsetWidth;
                    el.style.width = '100%';
                  }
                }}
              />
            </div>
          ))}
        </div>

        {/* Header (Author) */}
        <div className="absolute top-5 left-0 right-0 z-10 px-4 py-2 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/40 bg-gray-600 flex items-center justify-center text-white text-xs font-bold">
              {currentStory.user.profileImage ? (
                <img 
                  src={currentStory.user.profileImage.startsWith('http') ? currentStory.user.profileImage : `${API_URL}${currentStory.user.profileImage}`} 
                  alt={currentStory.user.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                currentStory.user.name.substring(0, 2).toUpperCase()
              )}
            </div>
            <span className="text-white font-semibold text-sm drop-shadow-md">
              {currentStory.user.name}
            </span>
            <span className="text-white/70 text-xs font-medium drop-shadow-md">
              {timeAgo}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className="p-1.5 text-white hover:bg-white/10 rounded-full transition-colors z-[80]"
              >
                <MoreHorizontal className="w-5 h-5 drop-shadow-md" />
              </button>
              
              {showMenu && (
                <div 
                  className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl py-1 z-[90] w-48 overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={handleShare}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Link className="w-4 h-4" /> Compartilhar link
                  </button>
                  {isOwner && (
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" /> {isDeleting ? 'Excluindo...' : 'Excluir Story'}
                    </button>
                  )}
                </div>
              )}
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 text-white hover:bg-white/10 rounded-full transition-colors z-[80]"
            >
              <X className="w-6 h-6 drop-shadow-md" />
            </button>
          </div>
        </div>

        {/* Image */}
        <img 
          src={currentStory.mediaUrl.startsWith('http') ? currentStory.mediaUrl : `${API_URL}${currentStory.mediaUrl}`} 
          alt="Story" 
          className="w-full h-full object-contain"
        />

        {/* Navigation Overlays */}
        <div className="absolute inset-0 z-0 flex">
          <div className="w-1/3 h-full cursor-pointer" onClick={handlePrev} />
          <div className="w-2/3 h-full cursor-pointer" onClick={handleNext} />
        </div>

        {/* Desktop Arrow Navigations */}
        <button 
          onClick={handlePrev}
          className={`absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-md transition-all z-20 ${currentIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button 
          onClick={handleNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-md transition-all z-20"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
