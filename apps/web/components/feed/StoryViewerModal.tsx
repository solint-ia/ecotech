'use client';

import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, MoreHorizontal, Trash2, Link, Cloud, MapPin, Send, Pencil } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ConfirmDeleteModal from './ConfirmDeleteModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface Story {
  id: string;
  mediaType?: string;
  mediaUrl: string;
  createdAt: string;
  caption?: string;
  location?: string;
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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editCaption, setEditCaption] = useState('');
  const [editLocation, setEditLocation] = useState('');
  
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const currentStory = stories[currentIndex];

  useEffect(() => {
    if (showComments && currentStory) {
      fetchComments();
    }
  }, [showComments, currentStory]);

  const fetchComments = async () => {
    try {
      const res = await fetch(`${API_URL}/stories/${currentStory.id}/comments`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {}
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !accessToken || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      const res = await fetch(`${API_URL}/stories/${currentStory.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ comment: newComment }),
      });
      if (res.ok) {
        setNewComment('');
        fetchComments();
      }
    } catch (err) {}
    setIsSubmittingComment(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${API_URL}/stories/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        setComments(comments.filter(c => c.id !== commentId));
      }
    } catch (err) {}
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowMenu(false);
      setShowComments(false);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowMenu(false);
      setShowComments(false);
    } else {
      onClose();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showComments || isEditing || isDeleteModalOpen) return;
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
  }, [currentIndex, stories.length, onClose, showComments, isEditing, isDeleteModalOpen]);

  // Timer
  useEffect(() => {
    if (showMenu || showComments || isEditing || isDeleteModalOpen) return; // Pause timer
    if (currentStory?.mediaType === 'VIDEO' || currentStory?.mediaUrl.match(/\.(mp4|webm|ogg)$/i)) return; // Let video onEnded handle it

    const timer = setTimeout(() => {
      if (currentIndex < stories.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onClose();
      }
    }, 15000);
    return () => clearTimeout(timer);
  }, [currentIndex, stories.length, onClose, showMenu, showComments, isEditing, isDeleteModalOpen, currentStory]);

  if (!currentStory) return null;

  const isOwner = currentUserId === currentStory.user.id;

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    const url = `${window.location.origin}/feed?story=${currentStory.id}`;
    if (navigator.share) {
      navigator.share({ title: 'Story de ' + currentStory.user.name, url }).catch(() => { });
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copiado!');
    }
  };

  const handleDelete = async () => {
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
          setCurrentIndex(currentIndex + 1);
        } else {
          setCurrentIndex(currentIndex - 1);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
      setShowMenu(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${API_URL}/stories/${currentStory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ caption: editCaption, location: editLocation })
      });
      if (res.ok) {
        currentStory.caption = editCaption;
        currentStory.location = editLocation;
      }
    } catch (err) {}
    setIsEditing(false);
  };

  const timeAgo = formatDistanceToNowStrict(new Date(currentStory.createdAt), { locale: ptBR, addSuffix: false })
    .replace('segundos', 's')
    .replace('minutos', 'm')
    .replace('horas', 'h')
    .replace('hora', 'h')
    .replace(' dias', 'd')
    .replace(' dia', 'd')
    .replace(' ', '');

  const userStories = stories.filter(s => s.user.id === currentStory.user.id);
  const userStoryIndex = userStories.findIndex(s => s.id === currentStory.id);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full h-full sm:w-[400px] sm:h-[90vh] sm:rounded-2xl overflow-hidden bg-black flex flex-col justify-center shadow-2xl">

        {/* Progress Bars */}
        <div className="absolute top-2 left-0 right-0 z-10 flex gap-1 px-2">
          {userStories.map((s, i) => (
            <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className={`h-full bg-white`}
                style={{
                  width: i < userStoryIndex ? '100%' : i === userStoryIndex ? '100%' : '0%',
                  transition: i === userStoryIndex && !showMenu && !showComments && !isEditing && !isDeleteModalOpen ? 'width 15s linear' : 'none'
                }}
                ref={(el) => {
                  if (el && i === userStoryIndex && !showMenu && !showComments && !isEditing && !isDeleteModalOpen) {
                    el.style.width = '0%';
                    void el.offsetWidth;
                    el.style.width = '100%';
                  }
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
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
                    <>
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setEditCaption(currentStory.caption || ''); 
                          setEditLocation(currentStory.location || ''); 
                          setIsEditing(true); 
                          setShowMenu(false); 
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Pencil className="w-4 h-4" /> Editar Story
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setIsDeleteModalOpen(true); setShowMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" /> Excluir Story
                      </button>
                    </>
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

        {/* Media */}
        {(currentStory.mediaType === 'VIDEO' || currentStory.mediaUrl.match(/\.(mp4|webm|ogg)$/i)) ? (
          <video
            src={currentStory.mediaUrl.startsWith('http') ? currentStory.mediaUrl : `${API_URL}${currentStory.mediaUrl}`}
            autoPlay
            playsInline
            controls
            onEnded={() => {
              if (currentIndex < stories.length - 1) setCurrentIndex(currentIndex + 1);
              else onClose();
            }}
            className="w-full h-full object-contain"
          />
        ) : (
          <img
            src={currentStory.mediaUrl.startsWith('http') ? currentStory.mediaUrl : `${API_URL}${currentStory.mediaUrl}`}
            alt="Story"
            className="w-full h-full object-contain"
          />
        )}

        {/* Location and Caption overlays */}
        <div className="absolute bottom-16 left-0 right-0 p-4 pointer-events-none z-10 bg-gradient-to-t from-black/80 to-transparent">
          {currentStory.location && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full text-white text-xs font-medium mb-3">
              <MapPin className="w-3.5 h-3.5" />
              {currentStory.location}
            </div>
          )}
          {currentStory.caption && (
            <p className="text-white text-sm font-medium drop-shadow-md leading-snug">
              {currentStory.caption}
            </p>
          )}
        </div>

        {/* Bottom Bar: Cloud Comment Button */}
        <div className="absolute bottom-4 left-4 z-20">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
            className="flex items-center justify-center p-2.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md transition-colors text-white"
          >
            <Cloud className="w-6 h-6" />
          </button>
        </div>

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

        {/* Comments Sliding Panel */}
        {showComments && (
          <div className="absolute inset-x-0 bottom-0 top-1/3 bg-black/90 backdrop-blur-xl z-50 rounded-t-3xl flex flex-col animate-in slide-in-from-bottom-full duration-300 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-white/10">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Cloud className="w-5 h-5 text-sage" /> Comentários
              </h3>
              <button onClick={() => setShowComments(false)} className="text-white hover:text-white/70 bg-white/10 rounded-full p-1.5">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
                    {c.user.profileImage ? (
                      <img src={c.user.profileImage.startsWith('http') ? c.user.profileImage : `${API_URL}${c.user.profileImage}`} className="w-full h-full object-cover" />
                    ) : c.user.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="bg-white/10 rounded-xl rounded-tl-none p-3 text-sm text-white max-w-[85%] relative group">
                    <p className="font-semibold mb-0.5 text-xs text-white/70">{c.user.name}</p>
                    {c.comment}
                    
                    {/* Delete button for own comment or admin */}
                    {(currentUserId === c.user.id || isOwner) && (
                      <button 
                        onClick={() => handleDeleteComment(c.id)}
                        className="absolute -right-8 top-1/2 -translate-y-1/2 p-1.5 text-white/50 hover:text-red-400 opacity-0 md:group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-white/50 text-center text-sm mt-10">Nenhum comentário ainda. Seja o primeiro!</p>
              )}
            </div>

            <div className="p-4 border-t border-white/10 pb-4">
              <form onSubmit={handleCommentSubmit} className="flex items-center w-full gap-2">
                <input 
                  type="text"
                  placeholder="Responder ao story..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/40"
                />
                <button 
                  type="submit"
                  disabled={isSubmittingComment || !newComment.trim()}
                  className="p-2.5 rounded-full bg-sage text-forest hover:bg-sage/90 shrink-0 disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Edit Form Modal */}
        {isEditing && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center p-4 border-b border-border-custom bg-beige/30">
                <h3 className="font-bold text-primary">Editar Story</h3>
                <button onClick={() => setIsEditing(false)} className="text-foreground/50 hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 flex flex-col gap-4">
                <div className="relative">
                  <label className="text-sm font-semibold text-foreground/80 block mb-1">Localização</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    maxLength={40}
                    className="w-full px-4 py-2 bg-secondary/5 border border-border-custom rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage/50"
                  />
                </div>
                <div className="relative">
                  <label className="text-sm font-semibold text-foreground/80 block mb-1">Legenda</label>
                  <textarea
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    maxLength={150}
                    className="w-full px-4 py-2 bg-secondary/5 border border-border-custom rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage/50 resize-none h-20"
                  />
                </div>
                <button
                  onClick={handleSaveEdit}
                  className="mt-2 w-full py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-md"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {isDeleteModalOpen && (
          <ConfirmDeleteModal
            title="Excluir Story"
            description="Tem certeza que deseja excluir este story? Esta ação não poderá ser desfeita."
            loading={isDeleting}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={handleDelete}
          />
        )}
      </div>
    </div>
  );
}
