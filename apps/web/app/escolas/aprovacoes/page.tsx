'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle, ArrowLeft, School, User, Mail, Calendar, Phone, FileText, Fingerprint, Info } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// A pending teacher is stored with role USER while awaiting approval, so both
// USER and TEACHER map to the "Professor" bucket; STUDENT is its own bucket.
function getRoleMeta(role: string): { label: string; className: string } {
  if (role === 'SCHOOL_MANAGER') return { label: 'Gestor Escolar', className: 'bg-amber-100 text-amber-800' };
  if (role === 'STUDENT') return { label: 'Estudante', className: 'bg-emerald-100 text-emerald-800' };
  return { label: 'Professor', className: 'bg-blue-100 text-blue-800' };
}

interface PendingUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  roleStatus: string;
  createdAt: string;
  // Present when this pending item is a teacher <-> school link (N:N). Approval
  // then targets the link, not the user.
  teacherSchoolId?: string;
  school?: {
    name: string;
    cnpj?: string;
    cpfManager?: string;
  };
}

// Stable identity for a pending item: a teacher link (per school) or a user.
const itemKey = (u: PendingUser) => u.teacherSchoolId || u.id;

export default function AprovacoesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as any;
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'SCHOOL_MANAGER' | 'TEACHER' | 'STUDENT'>('ALL');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      if (!['ADMIN', 'SCHOOL_MANAGER', 'TEACHER'].includes(user?.role)) {
        router.push('/escolas');
      } else {
        fetchPendingUsers();
      }
    }
  }, [status, router, user]);

  const fetchPendingUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/users/pending`, {
        headers: { Authorization: `Bearer ${user.accessToken}` },
      });
      if (!res.ok) throw new Error('Falha ao carregar solicitações');
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Teacher links are approved/rejected per school; every other pending item is
  // a plain user.
  const endpointFor = (u: PendingUser, action: 'approve' | 'reject') =>
    u.teacherSchoolId
      ? `${API_URL}/users/teacher-links/${u.teacherSchoolId}/${action}`
      : `${API_URL}/users/${u.id}/${action}`;

  const handleApprove = async (u: PendingUser) => {
    const key = itemKey(u);
    setActionLoading(key);
    try {
      const res = await fetch(endpointFor(u, 'approve'), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user.accessToken}` },
      });
      if (!res.ok) throw new Error('Erro ao aprovar');

      setUsers(prev => prev.map(item => itemKey(item) === key ? { ...item, roleStatus: 'APROVADO' } : item));
    } catch (err) {
      console.error(err);
      alert('Falha ao aprovar.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (u: PendingUser) => {
    if (!confirm('Tem certeza que deseja reprovar esta solicitação? O usuário ficará registrado como estudante comum.')) return;

    const key = itemKey(u);
    setActionLoading(key);
    try {
      const res = await fetch(endpointFor(u, 'reject'), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user.accessToken}` },
      });
      if (!res.ok) throw new Error('Erro ao recusar');

      setUsers(prev => prev.map(item => itemKey(item) === key ? { ...item, roleStatus: 'REPROVADO' } : item));
    } catch (err) {
      console.error(err);
      alert('Falha ao recusar.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isAdmin = user?.role === 'ADMIN';
  const isTeacher = user?.role === 'TEACHER';

  // Pending teachers are stored with role USER while awaiting approval, so the
  // "Professores" bucket is USER/TEACHER; STUDENT and SCHOOL_MANAGER are their own.
  const filteredUsers = users.filter((u) => {
    if (!isAdmin || filter === 'ALL') return true;
    if (filter === 'SCHOOL_MANAGER') return u.role === 'SCHOOL_MANAGER';
    if (filter === 'STUDENT') return u.role === 'STUDENT';
    return u.role === 'TEACHER' || u.role === 'USER';
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-border-custom shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/escolas" className="text-sm font-medium text-primary hover:underline flex items-center gap-1 mb-2">
            <ArrowLeft className="w-4 h-4" /> Voltar para Escolas
          </Link>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            Gerenciamento de Solicitações
          </h1>
          <p className="text-sm text-foreground/70 mt-1">
            {isAdmin
              ? 'Aprove ou recuse os cadastros de Escolas Parceiras, Professores e Estudantes.'
              : isTeacher
              ? 'Aprove ou recuse os estudantes da sua Escola.'
              : 'Aprove ou recuse os cadastros de Professores e Estudantes da sua Escola.'}
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl self-start">
            {([
              { key: 'ALL', label: 'Todos' },
              { key: 'SCHOOL_MANAGER', label: 'Escolas' },
              { key: 'TEACHER', label: 'Professores' },
              { key: 'STUDENT', label: 'Estudantes' },
            ] as const).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  filter === opt.key
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {/* Tabela/Lista */}
      <div className="bg-white md:rounded-2xl md:border md:border-border-custom md:shadow-sm overflow-hidden px-4 md:px-0">
        
        {/* Mobile View (Cards) */}
        <div className="flex flex-col gap-4 md:hidden py-4">
          {filteredUsers.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Nenhuma solicitação pendente no momento.
            </div>
          ) : (
            filteredUsers.map(u => (
              <div key={`mobile-${itemKey(u)}`} className="flex flex-col gap-3 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                      {u.name.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{u.name}</div>
                      <div className="flex items-center gap-1 mt-1">
                        {(() => {
                          const m = getRoleMeta(u.role);
                          const Icon = u.role === 'SCHOOL_MANAGER' ? School : User;
                          return (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${m.className}`}>
                              <Icon className="w-3 h-3" /> {m.label}
                            </span>
                          );
                        })()}
                        {u.roleStatus === 'PENDENTE' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-800">Pendente</span>
                        ) : u.roleStatus === 'APROVADO' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">Aprovado</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800">Reprovado</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Body do Card */}
                <div className="flex flex-col gap-1.5 text-xs text-gray-600 bg-gray-50/50 p-3 rounded-lg">
                  <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-gray-400" /> <span className="truncate">{u.email}</span></div>
                  {u.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400" /> {u.phone}</div>}
                  {u.school && <div className="flex items-center gap-2"><School className="w-3.5 h-3.5 text-gray-400" /> <span className="truncate">{u.school.name}</span></div>}
                  {u.role === 'SCHOOL_MANAGER' && u.school?.cnpj && (
                    <div className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-gray-400" /> CNPJ: {u.school.cnpj}</div>
                  )}
                  {u.role === 'SCHOOL_MANAGER' && u.school?.cpfManager && (
                    <div className="flex items-center gap-2"><Fingerprint className="w-3.5 h-3.5 text-gray-400" /> CPF: {u.school.cpfManager}</div>
                  )}
                  <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-gray-400" /> Data: {new Date(u.createdAt).toLocaleDateString('pt-BR')}</div>
                </div>

                {/* Footer do Card (Ações) */}
                <div className="pt-2">
                  {u.roleStatus === 'PENDENTE' || u.roleStatus === 'REPROVADO' ? (
                    <div className="flex gap-2 w-full">
                      {u.roleStatus === 'PENDENTE' && (
                        <button
                          onClick={() => handleReject(u)}
                          disabled={actionLoading === itemKey(u)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold rounded-xl transition-colors focus:outline-none"
                        >
                          {actionLoading === itemKey(u) ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                          Recusar
                        </button>
                      )}
                      <button
                        onClick={() => handleApprove(u)}
                        disabled={actionLoading === itemKey(u)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm focus:outline-none"
                      >
                        {actionLoading === itemKey(u) ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Aprovar
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-xs text-gray-400 font-medium py-2 bg-gray-50 rounded-xl">Concluído</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-600">
                <th className="px-6 py-4 whitespace-nowrap">Usuário / Solicitação</th>
                <th className="px-6 py-4 whitespace-nowrap">Cargo Solicitado</th>
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 whitespace-nowrap">Data do Pedido</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Nenhuma solicitação pendente no momento.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={`desktop-${itemKey(u)}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                          {u.name.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{u.name}</div>
                          <div className="text-xs text-gray-500 flex flex-col gap-1 mt-1">
                            <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {u.email}</span>
                            {u.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {u.phone}</span>}
                            {u.role === 'SCHOOL_MANAGER' && u.school?.cnpj && (
                              <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> CNPJ: {u.school.cnpj}</span>
                            )}
                            {u.role === 'SCHOOL_MANAGER' && u.school?.cpfManager && (
                              <span className="flex items-center gap-1"><Fingerprint className="w-3 h-3" /> CPF Resp.: {u.school.cpfManager}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-start gap-2">
                        {(() => {
                          const m = getRoleMeta(u.role);
                          const Icon = u.role === 'SCHOOL_MANAGER' ? School : User;
                          return (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${m.className}`}>
                              <Icon className="w-3 h-3" /> {m.label}
                            </span>
                          );
                        })()}
                        {u.school && (
                          <span className="text-xs text-gray-500">({u.school.name})</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {u.roleStatus === 'PENDENTE' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                          Pendente
                        </span>
                      ) : u.roleStatus === 'APROVADO' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Aprovado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                          Reprovado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.roleStatus === 'PENDENTE' || u.roleStatus === 'REPROVADO' ? (
                        <div className="flex items-center justify-end gap-2">
                          {u.roleStatus === 'PENDENTE' && (
                            <button
                              onClick={() => handleReject(u)}
                              disabled={actionLoading === itemKey(u)}
                              className="flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors focus:outline-none"
                              title="Reprovar Solicitação"
                            >
                              {actionLoading === itemKey(u) ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                              Recusar
                            </button>
                          )}
                          <button
                            onClick={() => handleApprove(u)}
                            disabled={actionLoading === itemKey(u)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm focus:outline-none"
                          >
                            {actionLoading === itemKey(u) ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            Aprovar
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium">Concluído</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
