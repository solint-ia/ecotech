'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users, CheckCircle, XCircle, Clock, Loader2, Mail, Phone, Calendar, GraduationCap,
} from 'lucide-react';
import { getImageUrl } from '../../../lib/image-url';
import ConfirmModal from '../../../components/shared/ConfirmModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface PendingUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  roleStatus: string;
  createdAt: string;
}

interface LinkedStudent {
  id: string;
  name: string;
  email: string;
  profileImage?: string | null;
  status: boolean;
  createdAt: string;
}

export default function ProfessorDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as any;

  const [tab, setTab] = useState<'pending' | 'linked'>('pending');
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [students, setStudents] = useState<LinkedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmData, setConfirmData] = useState<{ id: string; name: string } | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.accessToken) return;
    setLoading(true);
    try {
      const [pendingRes, studentsRes] = await Promise.all([
        fetch(`${API_URL}/users/pending`, { headers: { Authorization: `Bearer ${user.accessToken}` } }),
        fetch(`${API_URL}/users/teacher/students?limit=100`, { headers: { Authorization: `Bearer ${user.accessToken}` } }),
      ]);
      if (pendingRes.ok) setPending((await pendingRes.json()).filter((u: PendingUser) => u.roleStatus === 'PENDENTE'));
      if (studentsRes.ok) {
        const json = await studentsRes.json();
        setStudents(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.accessToken]);

  useEffect(() => {
    if (status === 'unauthenticated' || (status === 'authenticated' && user?.role !== 'TEACHER')) {
      router.push('/');
    }
    if (status === 'authenticated' && user?.role === 'TEACHER') {
      fetchData();
    }
  }, [status, user, router, fetchData]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`${API_URL}/users/${id}/approve`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${user.accessToken}` },
      });
      if (!res.ok) throw new Error();
      setPending(prev => prev.filter(u => u.id !== id));
      fetchData();
    } catch {
      alert('Falha ao aprovar.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`${API_URL}/users/${id}/reject`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${user.accessToken}` },
      });
      if (!res.ok) throw new Error();
      setPending(prev => prev.filter(u => u.id !== id));
    } catch {
      alert('Falha ao recusar.');
    } finally {
      setActionLoading(null);
    }
  };

  const executeUnlink = async () => {
    if (!confirmData) return;
    setActionLoading(confirmData.id);
    try {
      const res = await fetch(`${API_URL}/users/${confirmData.id}/unlink`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${user.accessToken}` },
      });
      if (!res.ok) throw new Error();
      setStudents(prev => prev.filter(s => s.id !== confirmData.id));
      setConfirmData(null);
    } catch {
      alert('Falha ao desvincular.');
    } finally {
      setActionLoading(null);
    }
  };

  if (status === 'loading') {
    return <div className="p-12 text-center text-foreground/50">Verificando permissões...</div>;
  }

  const activeStudents = students.filter(s => s.status).length;

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-forest" />
          Painel do Professor
        </h1>
        <p className="text-foreground/70 text-sm mt-1">
          Gerencie as requisições e os estudantes vinculados à sua escola.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Requisições Pendentes" value={pending.length} icon={Clock} color="yellow" />
        <StatCard title="Alunos Ativos" value={activeStudents} icon={CheckCircle} color="emerald" />
        <StatCard title="Total de Vínculos" value={students.length} icon={Users} color="blue" />
      </div>

      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-full md:w-fit">
        <button
          onClick={() => setTab('pending')}
          className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === 'pending' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Requisições Pendentes ({pending.length})
        </button>
        <button
          onClick={() => setTab('linked')}
          className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === 'linked' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Alunos Vinculados
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-forest" /></div>
      ) : tab === 'pending' ? (
        <div className="flex flex-col gap-3">
          {pending.length === 0 ? (
            <div className="text-center text-gray-400 py-12 bg-white rounded-2xl border border-border-custom">
              Nenhuma requisição pendente no momento.
            </div>
          ) : (
            pending.map(u => (
              <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                    {u.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{u.name}</div>
                    <div className="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1 mt-1">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {u.email}</span>
                      {u.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {u.phone}</span>}
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(u.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleReject(u.id)}
                    disabled={actionLoading === u.id}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {actionLoading === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Recusar
                  </button>
                  <button
                    onClick={() => handleApprove(u.id)}
                    disabled={actionLoading === u.id}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                  >
                    {actionLoading === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Aprovar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-border-custom overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Estudante</th>
                  <th className="px-6 py-4">Cadastro</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400">Nenhum aluno vinculado.</td></tr>
                ) : (
                  students.map(s => (
                    <tr key={s.id} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={s.profileImage ? getImageUrl(s.profileImage) : `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name || s.email)}&background=EAF4EE&color=1B4332`}
                            alt={s.name}
                            className={`w-10 h-10 rounded-full object-cover border-2 ${!s.status ? 'border-red-200 opacity-50 grayscale' : 'border-white shadow-sm'}`}
                          />
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">{s.name || 'Sem nome'}</span>
                            <span className="text-[11px] text-gray-400">{s.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{new Date(s.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-4">
                        {s.status ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"><CheckCircle className="w-3 h-3" /> Ativo</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full"><XCircle className="w-3 h-3" /> Suspenso</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setConfirmData({ id: s.id, name: s.name })}
                          disabled={actionLoading === s.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {actionLoading === s.id ? 'Desvinculando...' : 'Desvincular'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmData && (
        <ConfirmModal
          title="Desvincular Estudante"
          description={<>Tem certeza que deseja desvincular <strong>{confirmData.name}</strong> da sua escola? O aluno perderá o acesso institucional.</>}
          onConfirm={executeUnlink}
          onCancel={() => setConfirmData(null)}
          confirmText="Desvincular"
          isLoading={actionLoading === confirmData.id}
          isDestructive
        />
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: 'emerald' | 'blue' | 'yellow' }) {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
  };
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-border-custom flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${colorMap[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
