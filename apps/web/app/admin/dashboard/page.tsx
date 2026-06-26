'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Users, School, Compass, MapPin, MessageSquare, Library, Clock, Trophy, Heart, Eye, ArrowRight, LayoutDashboard
} from 'lucide-react';
import Link from 'next/link';
import { getImageUrl } from '../../../lib/image-url';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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
          <LayoutDashboard className="w-6 h-6 text-secondary" />
          Dashboard Administrativo
        </h1>
        <p className="text-foreground/70 text-sm">
          Visão geral e métricas estratégicas de toda a plataforma EcoTech.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <MetricCard title="Usuários" value={metrics.totalUsers} icon={Users} color="bg-blue-500" />
        <MetricCard title="Escolas" value={metrics.totalSchools} icon={School} color="bg-orange-500" />
        <MetricCard title="Estudantes" value={metrics.totalStudents} icon={Users} color="bg-indigo-500" />
        <MetricCard title="Professores" value={metrics.totalTeachers} icon={Users} color="bg-cyan-500" />
        <MetricCard title="Trilhas" value={metrics.totalTrails} icon={Compass} color="bg-emerald-500" />
        <MetricCard title="Pontos Educ." value={metrics.totalPoints} icon={MapPin} color="bg-green-600" />
        <MetricCard title="Publicações" value={metrics.totalPosts} icon={MessageSquare} color="bg-purple-500" />
        <MetricCard title="Biblioteca (Total)" value={metrics.totalLibrary} icon={Library} color="bg-pink-500" />
        
        <div className="bg-white rounded-xl p-4 border border-border-custom shadow-sm flex flex-col justify-between group hover:border-yellow-400 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-foreground/50 uppercase">Pendentes na Biblioteca</span>
            <div className="w-8 h-8 rounded-full bg-yellow-500 text-white flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-primary">{metrics.pendingLibrary}</span>
            <Link href="/admin/biblioteca" className="text-xs font-semibold text-yellow-600 hover:underline">
              Avaliar
            </Link>
          </div>
        </div>
      </div>

      {/* Rankings Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-border-custom shadow-sm p-6">
          <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Top Trilhas
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground/60 mb-3 uppercase tracking-wider">Mais Curtidas</h3>
              <ul className="space-y-3">
                {rankings.topTrailsLiked.map((trail: any, i: number) => (
                  <li key={trail.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium text-primary">
                      <span className="text-foreground/40 w-4">{i + 1}.</span> {trail.title}
                    </span>
                    <span className="flex items-center gap-1 text-red-500 font-semibold bg-red-50 px-2 py-0.5 rounded-md">
                      <Heart className="w-3.5 h-3.5 fill-current" /> {trail.likesCount}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground/60 mb-3 uppercase tracking-wider">Mais Visualizadas</h3>
              <ul className="space-y-3">
                {rankings.topTrailsViewed.map((trail: any, i: number) => (
                  <li key={trail.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium text-primary">
                      <span className="text-foreground/40 w-4">{i + 1}.</span> {trail.title}
                    </span>
                    <span className="flex items-center gap-1 text-blue-500 font-semibold bg-blue-50 px-2 py-0.5 rounded-md">
                      <Eye className="w-3.5 h-3.5" /> {trail.viewsCount}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border-custom shadow-sm p-6">
          <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
            <School className="w-5 h-5 text-secondary" />
            Destaques de Escolas
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground/60 mb-3 uppercase tracking-wider">Mais Trilhas Criadas</h3>
              <ul className="space-y-3">
                {rankings.schoolsWithMostTrails.map((school: any, i: number) => (
                  <li key={school.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium text-primary">
                      <span className="text-foreground/40 w-4">{i + 1}.</span> {school.name}
                    </span>
                    <span className="font-semibold text-foreground/70">{school._count.trails} trilhas</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground/60 mb-3 uppercase tracking-wider">Mais Seguidores</h3>
              <ul className="space-y-3">
                {rankings.schoolsWithMostFollowers.map((school: any, i: number) => (
                  <li key={school.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium text-primary">
                      <span className="text-foreground/40 w-4">{i + 1}.</span> {school.name}
                    </span>
                    <span className="font-semibold text-foreground/70">{school._count.followers} seg.</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities Timeline */}
      <div className="bg-white rounded-2xl border border-border-custom shadow-sm p-6">
        <h2 className="text-lg font-bold text-primary mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-secondary" />
          Atividades Recentes
        </h2>
        <div className="space-y-5 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border-custom before:to-transparent">
          {activities.map((act: any, i: number) => (
            <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white bg-secondary text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2"></div>
              <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] bg-beige/40 p-4 rounded-xl border border-border-custom shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-secondary">{act.type}</span>
                  <time className="text-[10px] font-medium text-foreground/50">{new Date(act.date).toLocaleDateString('pt-BR')} {new Date(act.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</time>
                </div>
                <p className="text-sm text-primary font-medium">{act.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color }: { title: string, value: number, icon: any, color: string }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-border-custom shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-foreground/50 uppercase tracking-wider">{title}</span>
        <div className={`w-8 h-8 rounded-full ${color} text-white flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <span className="text-2xl font-bold text-primary">{value}</span>
    </div>
  );
}
