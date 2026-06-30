'use client';

import { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Pencil, Trash2, MoreHorizontal, MapPin, Calendar, User as UserIcon, Send, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface FeedComment {
  id: string;
  postId: string;
  userId: string;
  comment: string;
  createdAt: string;
  likesCount?: number;
  hasLiked?: boolean;
  user: { id: string; name: string; profileImage?: string | null };
}

export interface FeedPost {
  id: string;
  userId: string;
  title: string;
  description: string;
  images?: { id: string; url: string; order: number }[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: string;
  user: { id: string; name: string; profileImage?: string | null; role: string };
  school?: { id: string; name: string } | null;
  trail?: { id: string; title: string; slug: string } | null;
  hasLiked?: boolean;
  _count?: { likes: number; comments: number };
}

interface FeedPostCardProps {
  post: FeedPost;
  currentUserId?: string;
  currentUserRole?: string;
  onDelete?: (id: string) => void;
  onEdit?: (post: FeedPost) => void;
  accessToken?: string;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function roleLabel(role: string) {
  switch (role) {
    case 'ADMIN': return 'Administrador';
    case 'SCHOOL_MANAGER': return 'Escola';
    case 'TEACHER': return 'Professor';
    case 'STUDENT': return 'Estudante';
    default: return role;
  }
}

function roleBadgeColor(role: string) {
  switch (role) {
    case 'ADMIN': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'SCHOOL_MANAGER': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'TEACHER': return 'bg-sky-100 text-sky-800 border-sky-200';
    case 'STUDENT': return 'bg-violet-100 text-violet-800 border-violet-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

import ConfirmDeleteModal from './ConfirmDeleteModal';

export default function FeedPostCard({
  post,
  currentUserId,
  currentUserRole,
  onDelete,
  onEdit,
  accessToken,
}: FeedPostCardProps) {
  const [liked, setLiked] = useState(post.hasLiked || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || post._count?.likes || 0);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || post._count?.comments || 0);
  const [sharesCount, setSharesCount] = useState(post.sharesCount || 0);
  const [showMenu, setShowMenu] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    setLiked(post.hasLiked || false);
  }, [post.hasLiked]);
  
  // Deletion state
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);
  
  // Comments state
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Carousel state
  const carouselRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleScroll = () => {
    if (!carouselRef.current) return;
    const { scrollLeft, clientWidth } = carouselRef.current;
    const slideIndex = Math.round(scrollLeft / clientWidth);
    if (slideIndex !== currentSlide) setCurrentSlide(slideIndex);
  };

  const scrollPrev = () => {
    if (!carouselRef.current) return;
    const width = carouselRef.current.clientWidth;
    carouselRef.current.scrollBy({ left: -width, behavior: 'smooth' });
  };

  const scrollNext = () => {
    if (!carouselRef.current) return;
    const width = carouselRef.current.clientWidth;
    carouselRef.current.scrollBy({ left: width, behavior: 'smooth' });
  };

  const canEdit = currentUserId === post.userId || currentUserRole === 'ADMIN';
  const initials = post.user.name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const handleLike = async () => {
    if (!accessToken || isLiking) return;
    setIsLiking(true);
    try {
      const res = await fetch(`${API_URL}/feed/${post.id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikesCount((prev) => (data.liked ? prev + 1 : prev - 1));
      }
    } catch (e) {
      console.error('Erro ao curtir:', e);
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/feed?post=${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        alert('Link copiado!');
      }
      await fetch(`${API_URL}/feed/${post.id}/share`, { method: 'POST' });
      setSharesCount((prev) => prev + 1);
    } catch (e) {
      // cancelled
    }
  };

  const handleDelete = async () => {
    setIsDeletingLoading(true);
    try {
      const res = await fetch(`${API_URL}/feed/${post.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok || res.status === 204) {
        onDelete?.(post.id);
      }
    } catch (e) {
      console.error('Erro ao excluir:', e);
    } finally {
      setIsDeletingLoading(false);
      setIsDeletingPost(false);
    }
  };

  const toggleComments = async () => {
    if (!showComments) {
      setShowComments(true);
      setLoadingComments(true);
      try {
        const url = currentUserId ? `${API_URL}/feed/${post.id}?userId=${currentUserId}` : `${API_URL}/feed/${post.id}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setComments(data.comments || []);
        }
      } catch (e) {
        console.error('Erro ao carregar comentários:', e);
      } finally {
        setLoadingComments(false);
      }
    } else {
      setShowComments(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !accessToken || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const res = await fetch(`${API_URL}/feed/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ comment: newComment.trim() }),
      });

      if (res.ok) {
        const added = await res.json();
        added.likesCount = 0;
        added.hasLiked = false;
        setComments((prev) => [added, ...prev]);
        setCommentsCount((prev) => prev + 1);
        setNewComment('');
      } else {
        const err = await res.json().catch(() => null);
        alert(`Erro ao comentar: ${err?.message || 'Falha no servidor'}`);
      }
    } catch (e) {
      console.error('Erro ao adicionar comentário:', e);
      alert('Erro de conexão ao enviar comentário.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!accessToken) return;
    
    // Optimistic update
    setComments((prev) => prev.map(c => {
      if (c.id === commentId) {
        const wasLiked = c.hasLiked;
        return {
          ...c,
          hasLiked: !wasLiked,
          likesCount: (c.likesCount || 0) + (wasLiked ? -1 : 1),
        };
      }
      return c;
    }));

    try {
      const res = await fetch(`${API_URL}/feed/comments/${commentId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Update with actual state from server if needed
        setComments((prev) => prev.map(c => c.id === commentId ? { ...c, hasLiked: data.liked, likesCount: data.likesCount } : c));
      }
    } catch (e) {
      console.error('Erro ao curtir comentário:', e);
    }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete) return;
    setIsDeletingLoading(true);
    try {
      const res = await fetch(`${API_URL}/feed/comments/${commentToDelete}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok || res.status === 204) {
        setComments((prev) => prev.filter((c) => c.id !== commentToDelete));
        setCommentsCount((prev) => Math.max(0, prev - 1));
      } else {
        alert('Erro ao excluir comentário.');
      }
    } catch (e) {
      console.error('Erro ao excluir comentário:', e);
    } finally {
      setIsDeletingLoading(false);
      setCommentToDelete(null);
    }
  };

  return (
    <article className="bg-white rounded-2xl border border-border-custom shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
      {/* Author Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <a href={`/perfil/${post.userId}`} className="shrink-0 transition-transform hover:scale-105">
            {post.user.profileImage ? (
              <img
                src={post.user.profileImage.startsWith('http') ? post.user.profileImage : `${API_URL}${post.user.profileImage}`}
                alt={post.user.name}
                className="w-11 h-11 rounded-full object-cover border-2 border-secondary/30"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center text-sm font-bold shadow-sm">
                {initials}
              </div>
            )}
          </a>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <a href={`/perfil/${post.userId}`} className="font-semibold text-primary text-sm hover:underline">
                {post.user.name}
              </a>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${roleBadgeColor(post.user.role)}`}>
                {roleLabel(post.user.role)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-foreground/50 mt-0.5">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(post.createdAt)}</span>
              {post.school && (
                <>
                  <span className="text-foreground/30">•</span>
                  <MapPin className="w-3 h-3" />
                  <a href={`/escolas/${post.school.id}`} className="hover:underline hover:text-primary transition-colors">
                    {post.school.name}
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions menu */}
        {canEdit && (
          <div className="relative">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="p-1.5 rounded-lg hover:bg-beige transition-colors"
              aria-label="Opções"
            >
              <MoreHorizontal className="w-5 h-5 text-foreground/50" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-border-custom rounded-xl shadow-lg py-1 z-20 min-w-[140px] animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  onClick={() => { setShowMenu(false); onEdit?.(post); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-beige transition-colors text-primary"
                >
                  <Pencil className="w-4 h-4" /> Editar
                </button>
                <button
                  onClick={() => { setShowMenu(false); setIsDeletingPost(true); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-red-50 transition-colors text-red-600"
                >
                  <Trash2 className="w-4 h-4" /> Excluir
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Trail badge */}
      {post.trail && (
        <div className="px-5 pb-4">
          <a
            href={`/trilhas/${post.trail.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-forest bg-forest/10 px-3 py-1 rounded-full hover:bg-forest/20 transition-colors"
          >
            🌿 Trilha: {post.trail.title}
          </a>
        </div>
      )}

      {/* Media Carousel (PASSO 3 - Mídia do Post) */}
      {post.images && post.images.length > 0 && (
        <div className="px-5 pb-4">
          <div className="relative w-full overflow-hidden group rounded-xl bg-beige">
            <div 
              ref={carouselRef}
              className="flex overflow-x-auto snap-x snap-mandatory"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              onScroll={handleScroll}
            >
              <style jsx>{`
                div::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              
              {post.images.sort((a, b) => a.order - b.order).map((img, i) => {
                const isVideo = img.url.match(/\.(mp4|webm|ogg)$/i);
                return (
                  <div key={img.id || i} className="w-full flex-shrink-0 snap-center aspect-video bg-black">
                    {isVideo ? (
                      <video
                        src={img.url.startsWith('http') ? img.url : `${API_URL}${img.url}`}
                        controls
                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <img
                        src={img.url.startsWith('http') ? img.url : `${API_URL}${img.url}`}
                        alt={`${post.title} - imagem ${i + 1}`}
                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                        loading="lazy"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {post.images.length > 1 && (
              <>
                {/* Arrows (desktop) */}
                <button
                  onClick={scrollPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 backdrop-blur-sm disabled:opacity-0"
                  disabled={currentSlide === 0}
                  aria-label="Anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={scrollNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 backdrop-blur-sm disabled:opacity-0"
                  disabled={currentSlide === post.images.length - 1}
                  aria-label="Próxima"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Dots */}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {post.images.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${
                        i === currentSlide ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Title & Description (PASSO 4 - Nova Posição) */}
      <div className="px-5 pb-4">
        <h3 className="text-base font-bold text-forest">{post.title}</h3>
        <p className="mt-1 text-sm text-foreground/70 opacity-90 leading-relaxed whitespace-pre-line">
          {post.description}
        </p>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-border-custom">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            disabled={!accessToken}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
              liked
                ? 'text-red-500'
                : 'text-foreground/50 hover:text-red-500'
            } ${!accessToken ? 'opacity-40 cursor-default' : 'cursor-pointer'}`}
            aria-label="Curtir"
          >
            <Heart className={`w-5 h-5 transition-transform ${liked ? 'fill-red-500 scale-110' : ''}`} />
            <span>{likesCount}</span>
          </button>

          <button
            onClick={toggleComments}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
              showComments ? 'text-secondary' : 'text-foreground/50 hover:text-secondary'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            <span>{commentsCount}</span>
          </button>
        </div>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-sm font-medium text-foreground/50 hover:text-secondary transition-colors"
          aria-label="Compartilhar"
        >
          <Share2 className="w-5 h-5" />
          <span>{sharesCount > 0 ? sharesCount : ''}</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="px-5 py-4 bg-[#FAFCFA] border-t border-black/5 animate-in slide-in-from-top-2 duration-300">
          {/* Add Comment Input */}
          {accessToken ? (
            <form onSubmit={handleAddComment} className="flex gap-3 mb-5">
              <div className="w-8 h-8 rounded-full bg-forest/10 flex-shrink-0 flex items-center justify-center text-xs font-bold text-forest">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 flex items-center gap-2 bg-white rounded-full border border-black/5 px-4 py-1.5 focus-within:ring-2 focus-within:ring-forest/20 focus-within:border-forest transition-all shadow-sm">
                <input
                  type="text"
                  placeholder="Escreva um comentário..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 bg-transparent text-sm focus:outline-none text-foreground placeholder:text-foreground/40"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || isSubmittingComment}
                  className="p-1.5 text-forest hover:bg-forest/10 rounded-full transition-colors disabled:opacity-40"
                >
                  {isSubmittingComment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-xs text-foreground/50 text-center mb-4">Faça login para comentar.</p>
          )}

          {/* Comments List */}
          {loadingComments ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-forest/50" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-sm text-foreground/50 py-2">Nenhum comentário ainda. Seja o primeiro!</p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => {
                const isCommentAuthor = currentUserId === comment.userId;
                const canDeleteComment = isCommentAuthor || currentUserRole === 'ADMIN';
                const commentInitials = comment.user.name.substring(0, 2).toUpperCase();

                return (
                  <div key={comment.id} className="flex gap-3">
                    {comment.user.profileImage ? (
                      <img
                        src={comment.user.profileImage.startsWith('http') ? comment.user.profileImage : `${API_URL}${comment.user.profileImage}`}
                        alt={comment.user.name}
                        className="w-8 h-8 rounded-full object-cover border border-black/5 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0 border border-black/5">
                        {commentInitials}
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <div className="bg-white rounded-2xl rounded-tl-none border border-black/5 p-3 shadow-sm inline-block min-w-[60%] relative group">
                        <div className="flex items-center justify-between gap-4 mb-1">
                          <span className="font-semibold text-xs text-forest">{comment.user.name}</span>
                          <span className="text-[10px] text-foreground/40">{formatDate(comment.createdAt)}</span>
                        </div>
                        <p className="text-sm text-foreground/80 break-words">{comment.comment}</p>
                        
                        {/* Delete Comment Button */}
                        {canDeleteComment && (
                          <button
                            onClick={() => setCommentToDelete(comment.id)}
                            className="absolute -right-2 -top-2 w-6 h-6 bg-white border border-black/5 rounded-full flex items-center justify-center text-foreground/30 hover:text-red-500 transition-all hover:bg-red-50 hover:scale-110 shadow-sm"
                            title="Excluir comentário"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      
                      {/* Like Comment Button */}
                      <button
                        onClick={() => handleLikeComment(comment.id)}
                        className={`flex items-center gap-1.5 text-[11px] mt-1.5 ml-2 transition-colors ${comment.hasLiked ? 'text-forest font-semibold' : 'text-foreground/40 hover:text-forest'}`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${comment.hasLiked ? 'fill-forest text-forest' : ''}`} />
                        <span>{comment.likesCount || 0} curtidas</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {isDeletingPost && (
        <ConfirmDeleteModal
          title="Excluir Publicação"
          description="Tem certeza que deseja excluir esta publicação? Essa ação não pode ser desfeita."
          loading={isDeletingLoading}
          onClose={() => setIsDeletingPost(false)}
          onConfirm={handleDelete}
        />
      )}

      {commentToDelete && (
        <ConfirmDeleteModal
          title="Excluir Comentário"
          description="Tem certeza que deseja excluir este comentário?"
          loading={isDeletingLoading}
          onClose={() => setCommentToDelete(null)}
          onConfirm={handleDeleteComment}
        />
      )}
    </article>
  );
}
