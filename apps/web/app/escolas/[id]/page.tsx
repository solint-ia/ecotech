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
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      {/* Immersive Banner & Info Card */}
      <div className="relative bg-white rounded-2xl shadow-sm border border-border-custom overflow-hidden">
        {/* Banner */}
        <div className="w-full h-56 md:h-72 bg-beige relative">
          {school.coverImage ? (
            <img 
              src={school.coverImage.startsWith('http') ? school.coverImage : `${API_URL}${school.coverImage}`}
              alt={school.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-forest/5 flex items-center justify-center">
              <Library className="w-20 h-20 text-forest/20" />
            </div>
          )}
          {/* Degradê na base da imagem para dar contraste */}
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent"></div>
        </div>

        {/* Informações da Escola (abrangendo a base fluidamente) */}
        <div className="relative z-10 bg-white p-6 md:p-8 -mt-6 rounded-t-3xl">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex-1 space-y-2 text-center md:text-left">
              <h1 className="text-3xl font-bold text-forest">{school.name}</h1>
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm font-medium text-foreground/50 justify-center md:justify-start">
                <div className="flex items-center gap-1.5 justify-center">
                  <MapPin className="w-4 h-4 opacity-70" />
                  <span>{school.city} • {school.location}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-center md:justify-end shrink-0">
              <button
                onClick={handleToggleFollow}
                disabled={followLoading}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm transition-all ${
                  isFollowing 
                    ? 'bg-transparent text-forest border border-forest hover:bg-forest/5' 
                    : 'bg-forest text-white hover:bg-forest/90 shadow-sm'
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
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/40 mb-1">
                <Target className="w-3.5 h-3.5" /> Trilhas
              </span>
              <span className="text-2xl font-bold text-forest/90">{school._count.trails}</span>
            </div>
            <div className="flex flex-col items-center md:items-start">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/40 mb-1">
                <Users className="w-3.5 h-3.5" /> Seguidores
              </span>
              <span className="text-2xl font-bold text-forest/90">{school._count.followers}</span>
            </div>
          </div>

          {/* Description */}
          <div className="mt-8 pt-6 border-t border-border-custom">
            <h2 className="flex items-center gap-2 text-lg font-bold text-forest mb-3">
              <FileText className="w-5 h-5 opacity-70" />
              Sobre a Escola
            </h2>
            <p className="text-foreground/70 leading-relaxed whitespace-pre-line text-sm md:text-base">
              {school.description || 'Esta escola ainda não forneceu uma descrição detalhada.'}
            </p>
          </div>
        </div>
      </div>

      {/* Seção de Trilhas */}
      <div className="pt-4">
        <h2 className="text-xl font-bold text-forest mb-6 flex items-center gap-2">
          <Target className="w-6 h-6 opacity-80" />
          Trilhas da Escola
        </h2>

        {school.trails.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl border border-border-custom text-center shadow-sm">
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
