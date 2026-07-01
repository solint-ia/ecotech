'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users, School, Compass, MapPin, MessageSquare, Library, Clock, ArrowRight, LayoutDashboard,
  CheckCircle2, XCircle
} from 'lucide-react';
import Link from 'next/link';
import { getImageUrl } from '../../../lib/image-url';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function EscolaDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user as any;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      <div>
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2 mb-2">
          <School className="w-6 h-6 text-secondary" />
          Dashboard da Escola
        </h1>
        <p className="text-foreground/70 text-sm">
          Acompanhe o desempenho, as métricas e as atividades da sua instituição.
        </p>
      </div>

      {/* Quick Nav */}
      <div className="flex flex-wrap gap-3">
        <QuickLink href="/trilhas" icon={Compass} label="Gestão de Trilhas" />
        <QuickLink href="/biblioteca" icon={Library} label="Biblioteca" />
        <QuickLink href="/feed" icon={MessageSquare} label="Publicações da Rede" />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard title="Professores" value={metrics.totalTeachers} icon={Users} color="bg-cyan-500" />
        <MetricCard title="Estudantes" value={metrics.totalStudents} icon={Users} color="bg-indigo-500" />
        <MetricCard title="Trilhas" value={metrics.totalTrails} icon={Compass} color="bg-emerald-500" />
        <MetricCard title="Pontos Educ." value={metrics.totalPoints} icon={MapPin} color="bg-green-600" />
        <MetricCard title="Posts no Feed" value={metrics.totalPosts} icon={MessageSquare} color="bg-purple-500" />
        <MetricCard title="Mat. Biblioteca" value={metrics.totalLibrary} icon={Library} color="bg-pink-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Library Submissions Status */}
        <div className="bg-white rounded-2xl border border-border-custom shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <Library className="w-5 h-5 text-secondary" />
              Status da Biblioteca
            </h2>
            <Link href="/biblioteca/nova" className="text-xs font-semibold text-secondary hover:underline flex items-center gap-1">
              Novo Envio <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
              <span className="block text-xl font-bold text-emerald-600">{libraryStats.approved}</span>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Aprovados</span>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3 text-center border border-yellow-100">
              <span className="block text-xl font-bold text-yellow-600">{libraryStats.pending}</span>
              <span className="text-[10px] font-bold text-yellow-700 uppercase tracking-wider">Pendentes</span>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
              <span className="block text-xl font-bold text-red-600">{libraryStats.rejected}</span>
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Reprovados</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground/60 mb-3 uppercase tracking-wider">Envios Recentes</h3>
            {libraryStats.recent.length === 0 ? (
              <p className="text-sm text-foreground/50">Nenhum envio recente.</p>
            ) : (
              <ul className="space-y-3">
                {libraryStats.recent.map((sub: any) => (
                  <li key={sub.id} className="flex items-center justify-between p-3 bg-beige/30 rounded-lg border border-border-custom/50">
                    <div>
                      <p className="text-sm font-semibold text-primary">{sub.title}</p>
                      <p className="text-xs text-foreground/50">{sub.contentType}</p>
                    </div>
                    <div>
                      {sub.approvalStatus === 'APROVADO' && <span title="Aprovado"><CheckCircle2 className="w-5 h-5 text-emerald-500" /></span>}
                      {sub.approvalStatus === 'PENDENTE' && <span title="Pendente"><Clock className="w-5 h-5 text-yellow-500" /></span>}
                      {sub.approvalStatus === 'REPROVADO' && <span title="Reprovado"><XCircle className="w-5 h-5 text-red-500" /></span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recent Activities Timeline */}
        <div className="bg-white rounded-2xl border border-border-custom shadow-sm p-6">
          <h2 className="text-lg font-bold text-primary mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-secondary" />
            Atividades Recentes da Instituição
          </h2>
          {activities.length === 0 ? (
            <p className="text-sm text-foreground/50 text-center py-4">Nenhuma atividade recente.</p>
          ) : (
            <div className="space-y-5 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border-custom before:to-transparent">
              {activities.map((act: any, i: number) => (
                <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white bg-secondary text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2"></div>
                  <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] bg-beige/40 p-4 rounded-xl border border-border-custom shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-secondary">{act.type}</span>
                      <time className="text-[10px] font-medium text-foreground/50">{new Date(act.date).toLocaleDateString('pt-BR')} {new Date(act.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>
                    </div>
                    <p className="text-sm text-primary font-medium">{act.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color }: { title: string, value: number, icon: any, color: string }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-border-custom shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">{title}</span>
        <div className={`w-8 h-8 rounded-full ${color} text-white flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <span className="text-2xl font-bold text-primary">{value}</span>
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
