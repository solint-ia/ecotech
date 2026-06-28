'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Users, School, Compass, MapPin, MessageSquare, Library, Clock, Trophy, Heart, Eye, LayoutDashboard, User as UserIcon
} from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getTimelineIcon(type: string) {
  switch (type) {
    case 'USER': return <UserIcon className="w-3.5 h-3.5" />;
    case 'SCHOOL': return <School className="w-3.5 h-3.5" />;
    case 'TRAIL': return <Compass className="w-3.5 h-3.5" />;
    case 'POST': return <MessageSquare className="w-3.5 h-3.5" />;
    case 'LIBRARY': return <Library className="w-3.5 h-3.5" />;
    default: return <Clock className="w-3.5 h-3.5" />;
  }
}

function getActivityTypeLabel(type: string) {
  switch (type) {
    case 'USER': return 'USUÁRIO';
    case 'SCHOOL': return 'ESCOLA';
    case 'TRAIL': return 'TRILHA';
    case 'POST': return 'PUBLICAÇÃO';
    case 'LIBRARY': return 'BIBLIOTECA';
    default: return type;
  }
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user as any;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.accessToken) return;
    try {
      const res = await fetch(`${API_URL}/analytics/admin`, {
        headers: { Authorization: `Bearer ${user.accessToken}` }
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
    } catch {
      console.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user?.accessToken]);

  useEffect(() => {
    if (status === 'unauthenticated' || (status === 'authenticated' && user?.role !== 'ADMIN')) {
      router.push('/');
    }
    if (status === 'authenticated' && user?.role === 'ADMIN') {
      fetchData();
    }
  }, [status, user, router, fetchData]);

  if (status === 'loading' || loading || !data) {
    return <div className="p-12 text-center text-foreground/50">Carregando dashboard...</div>;
  }

  const { metrics, rankings, activities } = data;

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2 mb-2">
          <LayoutDashboard className="w-6 h-6 text-forest" />
          Dashboard Administrativo
        </h1>
        <p className="text-foreground/70 text-sm">
          Visão geral e métricas estratégicas de toda a plataforma EcoTech.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <MetricCard title="Usuários" value={metrics.totalUsers} icon={Users} main />
        <MetricCard title="Escolas" value={metrics.totalSchools} icon={School} main />
        <MetricCard title="Trilhas" value={metrics.totalTrails} icon={Compass} main />
        <MetricCard title="Estudantes" value={metrics.totalStudents} icon={Users} />
        <MetricCard title="Professores" value={metrics.totalTeachers} icon={Users} />
        
        <MetricCard title="Pontos Educ." value={metrics.totalPoints} icon={MapPin} />
        <MetricCard title="Publicações" value={metrics.totalPosts} icon={MessageSquare} />
        <MetricCard title="Biblioteca" value={metrics.totalLibrary} icon={Library} />
        
        <div className={`col-span-2 md:col-span-1 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-colors border ${metrics.pendingLibrary > 0 ? 'bg-white border-[#D97757]/30' : 'bg-white border-border-custom'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wider text-foreground/50 uppercase">Pendentes (Bib.)</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${metrics.pendingLibrary > 0 ? 'bg-[#D97757]/10 text-[#D97757]' : 'bg-beige text-foreground/60'}`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between mt-2">
            <span className={`text-3xl font-bold ${metrics.pendingLibrary > 0 ? 'text-[#D97757]' : 'text-emerald-950'}`}>{metrics.pendingLibrary}</span>
            <Link href="/admin/biblioteca" className={`text-xs font-semibold hover:underline ${metrics.pendingLibrary > 0 ? 'text-[#D97757]' : 'text-forest'}`}>
              Avaliar
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Rankings (Left 2 columns) */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-border-custom p-6">
            <h2 className="text-lg font-bold text-emerald-950 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Top Trilhas
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xs font-semibold text-foreground/50 mb-3 uppercase tracking-wider">Mais Curtidas</h3>
                <ul className="divide-y divide-gray-100">
                  {rankings.topTrailsLiked.map((trail: any, i: number) => (
                    <li key={trail.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-sage/20 text-forest' : 'bg-gray-100 text-gray-500'}`}>
                          {i + 1}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-medium text-emerald-900 leading-tight">{trail.title}</span>
                          {(trail.biome || trail.city) && (
                            <span className="text-xs text-emerald-800/60 leading-tight mt-0.5">
                              {[trail.biome, trail.city, trail.state].filter(Boolean).join(' • ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-red-500/90 text-xs font-semibold bg-red-50 px-2.5 py-1 rounded-full shrink-0">
                        <Heart className="w-3.5 h-3.5 fill-current" /> {trail.likesCount}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-foreground/50 mb-3 uppercase tracking-wider">Mais Visualizadas</h3>
                <ul className="divide-y divide-gray-100">
                  {rankings.topTrailsViewed.map((trail: any, i: number) => (
                    <li key={trail.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-sage/20 text-forest' : 'bg-gray-100 text-gray-500'}`}>
                          {i + 1}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-medium text-emerald-900 leading-tight">{trail.title}</span>
                          {(trail.biome || trail.city) && (
                            <span className="text-xs text-emerald-800/60 leading-tight mt-0.5">
                              {[trail.biome, trail.city, trail.state].filter(Boolean).join(' • ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-blue-500/90 text-xs font-semibold bg-blue-50 px-2.5 py-1 rounded-full shrink-0">
                        <Eye className="w-3.5 h-3.5" /> {trail.viewsCount}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-border-custom p-6">
            <h2 className="text-lg font-bold text-emerald-950 mb-4 flex items-center gap-2">
              <School className="w-5 h-5 text-forest" />
              Destaques de Escolas
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xs font-semibold text-foreground/50 mb-3 uppercase tracking-wider">Mais Trilhas Criadas</h3>
                <ul className="divide-y divide-gray-100">
                  {rankings.schoolsWithMostTrails.map((school: any, i: number) => (
                    <li key={school.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-sage/20 text-forest' : 'bg-gray-100 text-gray-500'}`}>
                          {i + 1}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-medium text-emerald-900 leading-tight">{school.name}</span>
                          {school.city && (
                            <span className="text-xs text-emerald-800/60 leading-tight mt-0.5">
                              {school.city}, {school.state}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full shrink-0">{school._count.trails} trilhas</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-foreground/50 mb-3 uppercase tracking-wider">Mais Seguidores</h3>
                <ul className="divide-y divide-gray-100">
                  {rankings.schoolsWithMostFollowers.map((school: any, i: number) => (
                    <li key={school.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-sage/20 text-forest' : 'bg-gray-100 text-gray-500'}`}>
                          {i + 1}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-medium text-emerald-900 leading-tight">{school.name}</span>
                          {school.city && (
                            <span className="text-xs text-emerald-800/60 leading-tight mt-0.5">
                              {school.city}, {school.state}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full shrink-0">{school._count.followers} seg.</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline (Right Column) */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-border-custom p-6 h-full">
            <h2 className="text-lg font-bold text-emerald-950 mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-forest" />
              Atividades Recentes
            </h2>
            <div className="relative">
              {/* Linha Guia Contínua */}
              <div className="absolute left-4 top-2 bottom-2 w-[2px] bg-emerald-900/10"></div>
              
              <div className="space-y-6">
                {activities.map((act: any, i: number) => (
                  <div key={i} className="flex gap-4 relative">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#EAF4EE] border border-emerald-800/15 text-emerald-800 shrink-0 z-10">
                      {getTimelineIcon(act.type)}
                    </div>
                    <div className="pt-1 flex flex-col min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-bold text-forest uppercase tracking-wider">{getActivityTypeLabel(act.type)}</span>
                        <time className="text-[11px] font-medium text-gray-400 shrink-0">
                          {new Date(act.date).toLocaleDateString('pt-BR')} {new Date(act.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                        </time>
                      </div>
                      <p className="text-sm text-emerald-950 font-medium line-clamp-2 leading-snug">{act.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, main }: { title: string, value: number, icon: any, main?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 shadow-sm flex flex-col justify-between border ${main ? 'bg-sage/10 border-sage/20' : 'bg-white border-border-custom'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold tracking-wider text-foreground/50 uppercase">{title}</span>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${main ? 'bg-sage/20 text-forest' : 'bg-beige text-foreground/60'}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <span className="text-3xl font-bold text-emerald-950 mt-2">{value}</span>
    </div>
  );
}
