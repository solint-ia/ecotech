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
  const [isActivitiesOpen, setIsActivitiesOpen] = useState(false);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2 mb-2">
            <LayoutDashboard className="w-6 h-6 text-forest" />
            Dashboard Administrativo
          </h1>
          <p className="text-foreground/70 text-sm">
            Visão geral e métricas estratégicas de toda a plataforma EcoTech.
          </p>
        </div>

        {/* Dropdown de Atividades Recentes */}
        <div className="relative">
          <button 
            onClick={() => setIsActivitiesOpen(!isActivitiesOpen)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-border-custom hover:bg-gray-50 rounded-xl text-sm font-semibold text-emerald-900 transition-colors shadow-sm"
          >
            <Clock className="w-4 h-4 text-forest" />
            Atividades Recentes
          </button>
          
          {isActivitiesOpen && (
            <div className="absolute right-0 top-full mt-2 w-[340px] sm:w-[400px] bg-white rounded-2xl shadow-xl border border-border-custom p-6 z-50 max-h-[500px] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-forest" />
                  Histórico
                </h3>
                <button onClick={() => setIsActivitiesOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <span className="sr-only">Fechar</span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="relative">
                {/* Linha Guia Contínua */}
                <div className="absolute left-4 top-2 bottom-2 w-[2px] bg-emerald-900/10"></div>
                
                <div className="space-y-6">
                  {activities.length > 0 ? activities.map((act: any, i: number) => (
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
                  )) : (
                    <p className="text-sm text-center text-gray-500 py-4">Nenhuma atividade recente.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard title="Usuários" value={metrics.totalUsers} icon={Users} main link="/admin/usuarios" linkText="Gerenciar" />
        <MetricCard title="Escolas" value={metrics.totalSchools} icon={School} main link="/escolas" linkText="Gerenciar" />
        <MetricCard title="Trilhas" value={metrics.totalTrails} icon={Compass} main link="/trilhas" linkText="Gerenciar" />
        <MetricCard title="Estudantes" value={metrics.totalStudents} icon={Users} />
        <MetricCard title="Professores" value={metrics.totalTeachers} icon={Users} />
        <MetricCard title="Pontos Educ." value={metrics.totalPoints} icon={MapPin} />
        <MetricCard title="Publicações" value={metrics.totalPosts} icon={MessageSquare} />
        <MetricCard title="Biblioteca" value={metrics.totalLibrary} icon={Library} />
        
        <div className={`rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-colors border ${metrics.pendingLibrary > 0 ? 'bg-white border-[#D97757]/30 hover:border-[#D97757]/60' : 'bg-white border-border-custom hover:border-forest/30'}`}>
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
      <div className="space-y-6">
        
        {/* Rankings */}
        <div className="space-y-6">
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
                          <Link href={`/trilhas/${trail.slug}`} className="font-medium text-emerald-900 leading-tight hover:text-forest hover:underline transition-colors">{trail.title}</Link>
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
                          <Link href={`/trilhas/${trail.slug}`} className="font-medium text-emerald-900 leading-tight hover:text-forest hover:underline transition-colors">{trail.title}</Link>
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
                          <Link href={`/escolas/${school.id}`} className="font-medium text-emerald-900 leading-tight hover:text-forest hover:underline transition-colors">{school.name}</Link>
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
                          <Link href={`/escolas/${school.id}`} className="font-medium text-emerald-900 leading-tight hover:text-forest hover:underline transition-colors">{school.name}</Link>
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
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, main, link, linkText }: { title: string, value: number, icon: any, main?: boolean, link?: string, linkText?: string }) {
  return (
    <div className={`rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-colors border ${main ? 'bg-forest border-forest text-white' : 'bg-white border-border-custom hover:border-forest/30'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-semibold tracking-wider ${main ? 'text-white/80' : 'text-foreground/50'} uppercase`}>{title}</span>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${main ? 'bg-white/10 text-white' : 'bg-beige text-forest'}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-end justify-between mt-2">
        <span className={`text-3xl font-bold ${main ? 'text-white' : 'text-emerald-950'}`}>{value}</span>
        {link && linkText && (
          <Link href={link} className={`text-xs font-semibold hover:underline ${main ? 'text-white/90' : 'text-forest'}`}>
            {linkText}
          </Link>
        )}
      </div>
    </div>
  );
}
