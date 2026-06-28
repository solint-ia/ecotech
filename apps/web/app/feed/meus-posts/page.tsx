'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, ChevronDown, BookHeart, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import FeedPostCard, { FeedPost } from '../../../components/feed/FeedPostCard';
import EditPostModal from '../../../components/feed/EditPostModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const PAGE_SIZE = 10;

export default function MeusPostsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user as any;
  const accessToken = user?.accessToken;
  const isLoggedIn = !!user;

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const fetchPosts = useCallback(async (cursor?: string | null) => {
    if (!user?.id) return;
    
    const isLoadingMore = !!cursor;
    isLoadingMore ? setLoadingMore(true) : setLoading(true);

    try {
      let url = `${API_URL}/feed?take=${PAGE_SIZE}&userId=${user.id}&currentUserId=${user.id}`;
      if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;

      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('Erro ao carregar o feed.');
      const data = await res.json();

      if (isLoadingMore) {
        setPosts((prev) => [...prev, ...data.items]);
      } else {
        setPosts(data.items);
      }
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (err) {
      console.error(err);
    } finally {
      isLoadingMore ? setLoadingMore(false) : setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchPosts();
    }
  }, [fetchPosts, user?.id]);

  const handlePostDeleted = (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleEditPost = (post: FeedPost) => {
    setEditingPost(post);
  };

  const handlePostUpdated = () => {
    setEditingPost(null);
    fetchPosts(); // reload feed
  };

  if (status === 'loading') {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-forest/50" />
      </div>
    );
  }

  if (!isLoggedIn) return null;

  return (
    <div ref={feedRef} className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Edit Modal */}
      {editingPost && (
        <EditPostModal
          post={editingPost}
          accessToken={accessToken}
          onClose={() => setEditingPost(null)}
          onUpdated={handlePostUpdated}
        />
      )}

      {/* Page Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link 
          href="/feed"
          className="w-10 h-10 rounded-full bg-white border border-black/5 flex items-center justify-center text-primary/70 hover:text-primary hover:bg-beige transition-colors shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FAFCFA] border border-black/5 flex items-center justify-center shadow-sm">
            <BookHeart className="w-5 h-5 text-forest" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary leading-tight">Meus Posts</h1>
            <p className="text-sm text-foreground/60">
              Seu histórico pessoal de publicações na rede
            </p>
          </div>
        </div>
      </div>

      {/* Feed Loading Skeleton */}
      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-black/5 overflow-hidden animate-pulse shadow-sm"
            >
              <div className="flex items-center gap-3 px-5 py-4">
                <div className="w-11 h-11 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-2 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
              <div className="px-5 pb-3 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
              <div className="h-48 bg-gray-200" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-black/5 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#EAF4EE] flex items-center justify-center mb-4 border border-emerald-900/5">
            <BookHeart className="w-8 h-8 text-forest/50" />
          </div>
          <p className="text-lg font-bold text-emerald-950">
            Você ainda não publicou nada
          </p>
          <p className="text-sm text-foreground/60 mt-2 max-w-xs leading-relaxed">
            Compartilhe suas ideias e registros da natureza com a comunidade Ecotech.
          </p>
          <Link
            href="/feed"
            className="mt-6 px-6 py-2.5 bg-forest text-white rounded-full text-sm font-semibold hover:bg-forest/90 transition-all shadow-sm"
          >
            Ir para o Feed e publicar
          </Link>
        </div>
      ) : (
        /* Post List */
        <>
          <div className="space-y-6">
            {posts.map((post) => (
              <FeedPostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                currentUserRole={user?.role}
                accessToken={accessToken}
                onDelete={handlePostDeleted}
                onEdit={handleEditPost}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-2 pb-6">
              <button
                onClick={() => fetchPosts(nextCursor)}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-2.5 bg-white border border-black/5 text-primary rounded-full text-sm font-semibold hover:bg-beige transition-all shadow-sm disabled:opacity-50"
              >
                {loadingMore ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                {loadingMore ? 'Carregando...' : 'Carregar publicações mais antigas'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
