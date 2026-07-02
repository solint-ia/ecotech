'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users, School, Compass, MapPin, MessageSquare, Library, Clock, ArrowRight, LayoutDashboard,
  CheckCircle2, XCircle, User as UserIcon
} from 'lucide-react';
import Link from 'next/link';
import { getImageUrl } from '../../../lib/image-url';

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

export default function EscolaDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user as any;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isActivitiesOpen, setIsActivitiesOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.accessToken) return;
    try {
      const res = await fetch(`${API_URL}/analytics/school`, {
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
    if (status === 'unauthenticated' || (status === 'authenticated' && user?.role !== 'SCHOOL_MANAGER')) {
      router.push('/');
    }
    if (status === 'authenticated' && user?.role === 'SCHOOL_MANAGER') {
      fetchData();
    }
  }, [status, user, router, fetchData]);

  if (status === 'loading' || loading || !data) {
    return <div className="p-12 text-center text-foreground/50">Carregando dashboard da escola...</div>;
  }

  const { metrics, libraryStats, activities } = data;

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2 mb-2">
            <LayoutDashboard className="w-6 h-6 text-forest" />
            Dashboard da Escola
          </h1>
          <p className="text-foreground/70 text-sm">
            Acompanhe o desempenho, as métricas e as atividades da sua instituição.
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

      {/* Quick Nav */}
      <div className="flex flex-wrap gap-3">
        <QuickLink href="/trilhas" icon={Compass} label="Gestão de Trilhas" />
        <QuickLink href="/biblioteca" icon={Library} label="Biblioteca" />
        <QuickLink href="/feed" icon={MessageSquare} label="Publicações da Rede" />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard title="Professores" value={metrics.totalTeachers} icon={Users} main />
        <MetricCard title="Estudantes" value={metrics.totalStudents} icon={Users} main />
        <MetricCard title="Trilhas" value={metrics.totalTrails} icon={Compass} main link="/trilhas" linkText="Gerenciar Trilhas" />
        <MetricCard title="Pontos Educ." value={metrics.totalPoints} icon={MapPin} />
        <MetricCard title="Publicações" value={metrics.totalPosts} icon={MessageSquare} />
        <MetricCard title="Biblioteca" value={metrics.totalLibrary} icon={Library} />
      </div>

      <div className="space-y-6">
        {/* Library Submissions Status */}
        <div className="bg-white rounded-2xl shadow-sm border border-border-custom p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-emerald-950 flex items-center gap-2">
              <Library className="w-5 h-5 text-forest" />
              Status da Biblioteca
            </h2>
            <Link href="/biblioteca/nova" className="text-xs font-semibold text-forest hover:underline flex items-center gap-1">
              Novo Envio <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-[#EAF4EE] rounded-xl p-3 text-center border border-emerald-800/15">
              <span className="block text-xl font-bold text-emerald-900">{libraryStats.approved}</span>
              <span className="text-[10px] font-bold text-forest uppercase tracking-wider">Aprovados</span>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-200/50">
              <span className="block text-xl font-bold text-amber-700">{libraryStats.pending}</span>
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Pendentes</span>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
              <span className="block text-xl font-bold text-red-600">{libraryStats.rejected}</span>
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Reprovados</span>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-foreground/50 mb-3 uppercase tracking-wider">Envios Recentes</h3>
            {libraryStats.recent.length === 0 ? (
              <p className="text-sm text-foreground/50">Nenhum envio recente.</p>
            ) : (
              <ul className="space-y-3">
                {libraryStats.recent.map((sub: any) => (
                  <li key={sub.id} className="flex items-center justify-between p-3 bg-white hover:bg-gray-50 transition-colors rounded-xl border border-border-custom">
                    <div>
                      <p className="text-sm font-semibold text-emerald-950 leading-tight">{sub.title}</p>
                      <p className="text-xs text-foreground/50 mt-0.5">{sub.contentType}</p>
                    </div>
                    <div>
                      {sub.approvalStatus === 'APROVADO' && <span title="Aprovado"><CheckCircle2 className="w-5 h-5 text-emerald-500" /></span>}
                      {sub.approvalStatus === 'PENDENTE' && <span title="Pendente"><Clock className="w-5 h-5 text-amber-500" /></span>}
                      {sub.approvalStatus === 'REPROVADO' && <span title="Reprovado"><XCircle className="w-5 h-5 text-red-500" /></span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
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

function QuickLink({ href, icon: Icon, label }: { href: string, icon: any, label: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 px-4 py-2 bg-white border border-border-custom rounded-xl hover:bg-beige transition-colors shadow-sm text-sm font-semibold text-primary">
      <Icon className="w-4 h-4 text-secondary" />
      {label}
    </Link>
  );
}
