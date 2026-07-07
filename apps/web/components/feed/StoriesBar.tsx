'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import CreateStoryModal from './CreateStoryModal';
import StoryViewerModal, { Story } from './StoryViewerModal';
import AlertModal from './AlertModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface StoriesBarProps {
  accessToken?: string;
  currentUser: {
    id?: string;
    name: string;
    profileImage?: string | null;
    role?: string;
  };
}

export default function StoriesBar({ accessToken, currentUser }: StoriesBarProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Users without an approved membership (role USER — which also covers pending
  // students/teachers whose session role is downgraded) cannot publish stories.
  const canPublish = currentUser.role !== 'USER';

  const handleAddStory = () => {
    if (canPublish) setIsCreateOpen(true);
    else setShowBlockedModal(true);
  };

  const fetchStories = async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/stories`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStories(data);
      }
    } catch (e) {
      console.error('Erro ao buscar stories:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, [accessToken]);

  const handleDeleteStory = (storyId: string) => {
    setStories(prev => prev.filter(s => s.id !== storyId));
  };

  // Group stories by user to display only one avatar per user in the bar
  const groupedUsers = stories.reduce((acc, story, index) => {
    if (!acc.find(item => item.user.id === story.user.id)) {
      acc.push({ user: story.user, firstIndex: index });
    }
    return acc;
  }, [] as { user: Story['user']; firstIndex: number }[]);

  if (!accessToken) return null;

  return (
    <div className="w-full bg-white rounded-2xl border border-border-custom shadow-sm p-4 mb-4">
      <div className="flex gap-6 overflow-x-auto snap-x hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {/* Add Story Button */}
        <div className="flex flex-col items-center gap-2 snap-start flex-shrink-0">
          <button
            onClick={handleAddStory}
            className="relative w-16 h-16 rounded-full border-2 border-border-custom bg-beige/30 p-0.5 overflow-hidden group hover:border-forest transition-colors shadow-sm"
          >
            {currentUser.profileImage ? (
              <img 
                src={currentUser.profileImage.startsWith('http') ? currentUser.profileImage : `${API_URL}${currentUser.profileImage}`}
                alt="Seu Story"
                className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 group-hover:scale-105 transition-transform">
                {currentUser.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-forest text-white rounded-full border-2 border-white flex items-center justify-center">
              <Plus className="w-3 h-3" />
            </div>
          </button>
          <span className="text-[10px] font-medium text-foreground/60 text-center w-16 truncate">
            Seu story
          </span>
        </div>

        {/* Loading Skeletons */}
        {loading && (
          [1, 2, 3].map(i => (
            <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0 animate-pulse">
              <div className="w-16 h-16 rounded-full bg-gray-200" />
              <div className="w-12 h-2 bg-gray-200 rounded-full" />
            </div>
          ))
        )}

        {/* Stories List */}
        {!loading && groupedUsers.map(({ user, firstIndex }) => (
          <div key={user.id} className="flex flex-col items-center gap-2 snap-start flex-shrink-0">
            <button 
              onClick={() => setViewerIndex(firstIndex)}
              className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-[#0B5D3B] via-[#EAF4EE] to-emerald-400 hover:scale-105 transition-transform shadow-sm"
            >
              <div className="w-full h-full bg-white rounded-full p-[2px]">
                {user.profileImage ? (
                  <img 
                    src={user.profileImage.startsWith('http') ? user.profileImage : `${API_URL}${user.profileImage}`}
                    alt={user.name}
                    className="w-full h-full rounded-full object-cover border border-border-custom"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 text-sm border border-border-custom">
                    {user.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            </button>
            <span className="text-[10px] font-medium text-foreground/70 text-center w-16 truncate">
              {user.name.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>

      {showBlockedModal && (
        <AlertModal
          title="Publicação indisponível"
          message="Seu vínculo com a escola ainda está em análise. Você poderá publicar stories assim que for aprovado pela instituição."
          onClose={() => setShowBlockedModal(false)}
        />
      )}

      {isCreateOpen && (
        <CreateStoryModal
          accessToken={accessToken} 
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => {
            fetchStories();
          }}
        />
      )}

      {viewerIndex !== null && (
        <StoryViewerModal
          stories={stories}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          currentUserId={currentUser.id}
          currentUserRole={currentUser.role}
          accessToken={accessToken}
          onDeleteStory={handleDeleteStory}
        />
      )}
    </div>
  );
}
