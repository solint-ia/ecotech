'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MapPin, Loader2, Library, Users, Target, UserPlus, UserMinus, FileText } from 'lucide-react';
import TrailCard, { Trail } from '../../../components/trilhas/TrailCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface SchoolDetail {
  id: string;
  name: string;
  city: string;
  location: string;
  description: string;
  coverImage?: string;
  _count: {
    trails: number;
    followers: number;
  };
  trails: Trail[];
}

export default function SchoolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const { data: session, status } = useSession();
  const router = useRouter();
  const accessToken = (session?.user as any)?.accessToken;

  const [school, setSchool] = useState<SchoolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const fetchSchool = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${API_URL}/schools/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSchool(data);
      } else if (res.status === 404) {
        router.push('/escolas');
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes da escola:', error);
    } finally {
      setLoading(false);
    }
  }, [id, accessToken, router]);

  const fetchFollowStatus = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${API_URL}/schools/${id}/status`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.isFollowing);
      }
    } catch (error) {
      console.error('Erro ao buscar status de seguidor:', error);
    }
  }, [id, accessToken]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchSchool();
      fetchFollowStatus();
    }
  }, [status, fetchSchool, fetchFollowStatus, router]);

  const handleToggleFollow = async () => {
    if (!accessToken || followLoading || !school) return;
    setFollowLoading(true);
    try {
      const res = await fetch(`${API_URL}/schools/${id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.isFollowing);
        // Atualiza a contagem localmente para resposta imediata na UI
        setSchool(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            _count: {
              ...prev._count,
              followers: data.isFollowing ? prev._count.followers + 1 : prev._count.followers - 1
            }
          };
        });
      }
    } catch (error) {
      console.error('Erro ao seguir/deixar de seguir:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!school) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      {/* Hero / Header */}
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-border-custom">
        <div className="w-full h-48 md:h-64 bg-gray-200 relative">
          {school.coverImage ? (
            <img 
              src={school.coverImage.startsWith('http') ? school.coverImage : `${API_URL}${school.coverImage}`}
              alt={school.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <Library className="w-16 h-16 text-primary/40" />
            </div>
          )}
          {/* Degradê na base da imagem para dar contraste ao texto (se necessário) */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
        </div>

        <div className="p-6 md:p-8 relative">
          {/* Floating Avatar Area - opcional, podemos manter só texto já que tem banner */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex-1 space-y-2 text-center md:text-left">
              <h1 className="text-3xl font-bold text-primary">{school.name}</h1>
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm font-medium text-foreground/70 justify-center md:justify-start">
                <div className="flex items-center gap-1.5 justify-center">
                  <MapPin className="w-4 h-4 text-secondary" />
                  <span>{school.city} • {school.location}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-center md:justify-end shrink-0">
              <button
                onClick={handleToggleFollow}
                disabled={followLoading}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-sm ${
                  isFollowing 
                    ? 'bg-beige text-primary border border-primary/20 hover:bg-beige/70' 
                    : 'bg-primary text-white hover:bg-primary/90'
                } disabled:opacity-70 disabled:cursor-wait`}
              >
                {followLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isFollowing ? (
                  <UserMinus className="w-4 h-4" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {followLoading ? 'Aguarde...' : isFollowing ? 'Deixar de Seguir' : 'Seguir Escola'}
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center justify-center md:justify-start gap-8 mt-8 pt-6 border-t border-border-custom">
            <div className="flex flex-col items-center md:items-start">
              <span className="flex items-center gap-1.5 text-[11px] uppercase font-bold tracking-widest text-foreground/50 mb-1">
                <Target className="w-3.5 h-3.5" /> Trilhas
              </span>
              <span className="text-2xl font-black text-primary">{school._count.trails}</span>
            </div>
            <div className="flex flex-col items-center md:items-start">
              <span className="flex items-center gap-1.5 text-[11px] uppercase font-bold tracking-widest text-foreground/50 mb-1">
                <Users className="w-3.5 h-3.5" /> Seguidores
              </span>
              <span className="text-2xl font-black text-primary">{school._count.followers}</span>
            </div>
          </div>

          {/* Description */}
          <div className="mt-8 pt-6 border-t border-border-custom">
            <h2 className="flex items-center gap-2 text-lg font-bold text-primary mb-3">
              <FileText className="w-5 h-5 text-secondary" />
              Sobre a Escola
            </h2>
            <p className="text-foreground/80 leading-relaxed whitespace-pre-line text-sm md:text-base">
              {school.description || 'Esta escola ainda não forneceu uma descrição detalhada.'}
            </p>
          </div>
        </div>
      </div>

      {/* Seção de Trilhas */}
      <div className="pt-4">
        <h2 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
          <Target className="w-6 h-6 text-secondary" />
          Trilhas da Escola
        </h2>

        {school.trails.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl border border-border-custom text-center">
            <p className="text-foreground/60 mb-2">Nenhuma trilha publicada ainda.</p>
            <p className="text-sm text-foreground/50">As trilhas criadas por esta escola aparecerão aqui.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {school.trails.map((trail) => (
              <TrailCard key={trail.id} trail={trail as any} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
