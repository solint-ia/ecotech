'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Rss, Loader2, ChevronDown, Sparkles } from 'lucide-react';
import FeedPostCard, { FeedPost } from '../../components/feed/FeedPostCard';
import CreatePostForm from '../../components/feed/CreatePostForm';
import EditPostModal from '../../components/feed/EditPostModal';
import StoriesBar from '../../components/feed/StoriesBar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const PAGE_SIZE = 10;

export default function FeedPage() {
  const { data: session } = useSession();
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

  const fetchPosts = useCallback(async (cursor?: string | null) => {
    const isLoadingMore = !!cursor;
    isLoadingMore ? setLoadingMore(true) : setLoading(true);

    try {
      let url = `${API_URL}/feed?take=${PAGE_SIZE}`;
      if (user?.id) url += `&currentUserId=${user.id}`;
      if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;

      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('Erro ao carregar o feed.');
      const data = await res.json();

      if (isLoadingMore) {
        setPosts((prev) => [...prev, ...data.data]);
      } else {
        setPosts(data.data);
      }
      setHasMore(data.meta.hasMore);
      setNextCursor(data.meta.nextCursor);
    } catch (err) {
      console.error(err);
    } finally {
      isLoadingMore ? setLoadingMore(false) : setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handlePostCreated = () => {
    fetchPosts(); // reload from beginning
  };

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

  return (
    <div ref={feedRef} className="max-w-2xl mx-auto space-y-6">
      {/* Edit Modal */}
      {editingPost && (
        <EditPostModal
          post={editingPost}
          accessToken={accessToken}
          currentUserRole={user?.role}
          currentUserSchoolId={user?.schoolId}
          onClose={() => setEditingPost(null)}
          onUpdated={handlePostUpdated}
        />
      )}
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center shadow-sm">
          <Rss className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-primary leading-tight">Feed</h1>
          <p className="text-sm text-foreground/60">
            Acompanhe as publicações da comunidade
          </p>
        </div>
      </div>

      {/* Stories Bar */}
      {isLoggedIn && (
        <StoriesBar 
          accessToken={accessToken} 
          currentUser={{ id: user?.id, name: user?.name || 'Usuário', profileImage: user?.profileImage, role: user?.role }}
        />
      )}

      {/* Create Post Form */}
      {isLoggedIn && (
        <CreatePostForm
          accessToken={accessToken}
          userName={user?.name || 'Usuário'}
          userImage={user?.profileImage}
          userSchoolId={user?.schoolId}
          userRole={user?.role}
          onCreated={handlePostCreated}
        />
      )}

      {/* Feed Loading Skeleton */}
      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-border-custom overflow-hidden animate-pulse"
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
              <div className="flex items-center gap-4 px-5 py-3 border-t border-border-custom">
                <div className="h-4 bg-gray-200 rounded w-12" />
                <div className="h-4 bg-gray-200 rounded w-12" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-border-custom">
          <div className="w-16 h-16 rounded-2xl bg-beige flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-secondary/50" />
          </div>
          <p className="text-lg font-semibold text-primary">
            Nenhuma publicação ainda
          </p>
          <p className="text-sm text-foreground/60 mt-1 max-w-xs">
            {isLoggedIn
              ? 'Seja o primeiro a compartilhar algo com a comunidade!'
              : 'Faça login para começar a publicar no feed.'}
          </p>
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
                className="flex items-center gap-2 px-6 py-2.5 bg-white border border-border-custom text-primary rounded-xl text-sm font-semibold hover:bg-beige transition-all shadow-sm disabled:opacity-50"
              >
                {loadingMore ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                {loadingMore ? 'Carregando...' : 'Ver mais publicações'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
