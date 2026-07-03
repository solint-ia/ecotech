'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { 
  Users, CheckCircle, XCircle, Search, Filter,
  LayoutDashboard, Clock
} from 'lucide-react';
import Link from 'next/link';
import { getImageUrl } from '../../../lib/image-url';
import ConfirmModal from '../../../components/shared/ConfirmModal';
import { Pagination } from '../../../components/shared/Pagination';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getRoleLabel(role: string) {
  switch (role) {
    case 'TEACHER': return 'Professor';
    case 'STUDENT': return 'Estudante';
    case 'USER': return 'Usuário';
    default: return role;
  }
}

function getRoleColor(role: string) {
  switch (role) {
    case 'TEACHER': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'STUDENT': return 'bg-green-100 text-green-700 border-green-200';
    case 'USER': return 'bg-slate-100 text-slate-700 border-slate-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function EscolaUsersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const initialRole = searchParams?.get('role') || 'ALL';

  const { data: session, status } = useSession();
  const user = session?.user as any;

  const page = parseInt(searchParams.get('page') || '1', 10);
  const searchUrl = searchParams.get('search') || '';
  const statusUrl = searchParams.get('status') || 'ALL';

  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, suspended: 0, pending: 0 });
  const [meta, setMeta] = useState({ totalCount: 0, currentPage: 1, limit: 20, totalPages: 1 });
  
  const [loading, setLoading] = useState(true);
  
  const [searchInput, setSearchInput] = useState(searchUrl);
  const [statusFilter, setStatusFilter] = useState(statusUrl);

  const fetchUsers = useCallback(async () => {
    if (!user?.accessToken) return;
    setLoading(true);
    try {
      const url = new URL(`${API_URL}/users/school/list`);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', '20');
      url.searchParams.append('role', initialRole);
      if (statusUrl !== 'ALL') {
        url.searchParams.append('status', statusUrl === 'ACTIVE' ? 'true' : 'false');
      }
      if (searchUrl) url.searchParams.append('search', searchUrl);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${user.accessToken}` }
      });
      
      if (!res.ok) throw new Error('Falha ao carregar usuários');
      
      const json = await res.json();
      setUsers(json.data);
      setMeta(json.meta);
      setStats(json.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.accessToken, page, searchUrl, statusUrl, initialRole]);

  useEffect(() => {
    if (status === 'unauthenticated' || (status === 'authenticated' && user?.role !== 'SCHOOL_MANAGER')) {
      router.push('/');
    }
    if (status === 'authenticated' && user?.role === 'SCHOOL_MANAGER') {
      fetchUsers();
    }
  }, [status, user, router, fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    if (searchInput) params.set('search', searchInput);
    else params.delete('search');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setStatusFilter(val);
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    if (val !== 'ALL') params.set('status', val);
    else params.delete('status');
    router.push(`${pathname}?${params.toString()}`);
  };

  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [confirmModalData, setConfirmModalData] = useState<{ isOpen: boolean, userId: string, userName: string } | null>(null);

  const handleUnlink = (userId: string, userName: string) => {
    setConfirmModalData({ isOpen: true, userId, userName });
  };

  const executeUnlink = async () => {
    if (!confirmModalData) return;
    
    const { userId } = confirmModalData;
    setUnlinkingId(userId);
    try {
      const res = await fetch(`${API_URL}/users/${userId}/unlink`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user.accessToken}` }
      });
      
      if (!res.ok) throw new Error('Falha ao desvincular usuário');
      
      // Update locally
      setUsers(prev => prev.filter(u => u.id !== userId));
      setConfirmModalData(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao desvincular usuário.');
    } finally {
      setUnlinkingId(null);
    }
  };

  if (status === 'loading') {
    return <div className="p-12 text-center text-foreground/50">Verificando permissões...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/escola/dashboard" className="text-sm font-medium text-emerald-600 hover:text-emerald-800 flex items-center gap-1 mb-2 transition-colors">
            <LayoutDashboard className="w-4 h-4" />
            Voltar ao Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Users className="w-6 h-6 text-forest" />
            {initialRole === 'TEACHER' ? 'Gestão de Professores' : initialRole === 'STUDENT' ? 'Gestão de Estudantes' : 'Gestão de Usuários (Escola)'}
          </h1>
          <p className="text-foreground/70 text-sm mt-1">
            {initialRole === 'TEACHER' 
              ? 'Controle de acesso e vínculos dos professores da sua escola.' 
              : initialRole === 'STUDENT'
              ? 'Controle de acesso e vínculos dos estudantes da sua escola.'
              : 'Controle de acesso dos professores e estudantes da sua escola.'}
          </p>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${initialRole === 'TEACHER' ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
        <StatCard title="Total de Vínculos" value={stats.total} icon={Users} color="emerald" />
        <StatCard title="Ativos" value={stats.active} icon={CheckCircle} color="blue" />
        <StatCard title="Suspensos" value={stats.suspended} icon={XCircle} color="red" />
        {initialRole === 'TEACHER' && (
          <StatCard title="Pendentes de Aprovação" value={stats.pending} icon={Clock} color="yellow" link="/escolas/aprovacoes" />
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-border-custom flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearch} className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar por nome ou e-mail..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest focus:bg-white transition-all"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-gray-400 hidden md:block" />
          <select 
            value={statusFilter}
            onChange={handleStatusChange}
            className="w-full md:w-48 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-forest transition-all"
          >
            <option value="ALL">Todos (Status)</option>
            <option value="ACTIVE">Ativos</option>
            <option value="SUSPENDED">Inativos / Suspensos</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-border-custom overflow-hidden relative min-h-[400px]">
        {loading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-forest border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="hidden md:table-header-group bg-gray-50/80 border-b border-gray-100 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4 rounded-tl-2xl">Usuário</th>
                <th className="px-6 py-4">Tipo (Role)</th>
                <th className="px-6 py-4">Data de Cadastro</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 rounded-tr-2xl text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 md:divide-y p-4 md:p-0 block md:table-row-group">
              {users.length === 0 && !loading ? (
                <tr className="block md:table-row mb-4 border border-gray-100 rounded-lg p-4 shadow-sm md:mb-0 md:border-none md:p-0 md:shadow-none">
                  <td colSpan={5} className="block md:table-cell px-6 py-12 text-center text-gray-400">
                    Nenhum usuário encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="block md:table-row mb-4 border border-gray-100 rounded-lg p-4 shadow-sm md:mb-0 md:border-none md:p-0 md:shadow-none hover:bg-emerald-50/30 transition-colors group">
                    <td className="block md:table-cell border-b border-gray-50 pb-3 mb-3 md:border-none md:pb-0 md:mb-0 px-0 md:px-6 md:py-4">
                      <Link 
                        href={`/perfil/${u.id}`}
                        className="flex items-center gap-3 group/link"
                      >
                        <img 
                          src={u.profileImage ? getImageUrl(u.profileImage) : `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || u.email)}&background=EAF4EE&color=1B4332`} 
                          alt={u.name || 'Avatar'}
                          className={`w-10 h-10 rounded-full object-cover border-2 transition-transform group-hover/link:scale-105 ${!u.status ? 'border-red-200 opacity-50 grayscale' : 'border-white shadow-sm'}`}
                        />
                        <div className="flex flex-col">
                          <span className={`font-semibold transition-colors group-hover/link:text-forest group-hover/link:underline ${!u.status ? 'text-gray-500' : 'text-gray-900'}`}>
                            {u.name || 'Sem nome'}
                          </span>
                          <span className="text-[11px] text-gray-400 mt-0.5 leading-tight">{u.email}</span>
                        </div>
                      </Link>
                    </td>
                    
                    <td className="block md:table-cell mb-2 md:mb-0 px-0 md:px-6 md:py-4">
                      <div className="flex justify-between items-center md:table-cell md:justify-start">
                        <span className="text-xs text-gray-500 md:hidden">Tipo (Role):</span>
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase border ${getRoleColor(u.role)}`}>
                          {getRoleLabel(u.role)}
                        </span>
                      </div>
                    </td>
                    
                    <td className="block md:table-cell mb-2 md:mb-0 px-0 md:px-6 md:py-4 text-gray-500">
                      <div className="flex justify-between items-center md:table-cell md:justify-start">
                        <span className="text-xs text-gray-500 md:hidden">Data de Cadastro:</span>
                        <span>{new Date(u.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </td>
                    
                    <td className="block md:table-cell mb-2 md:mb-0 px-0 md:px-6 md:py-4">
                      <div className="flex justify-between items-center md:table-cell md:justify-start">
                        <span className="text-xs text-gray-500 md:hidden">Status:</span>
                        {u.status ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                            <CheckCircle className="w-3 h-3" /> Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                            <XCircle className="w-3 h-3" /> Suspenso
                          </span>
                        )}
                      </div>
                    </td>
                    
                    <td className="block md:table-cell mb-2 md:mb-0 px-0 md:px-6 md:py-4 text-right">
                      <div className="flex justify-between items-center md:table-cell md:justify-end">
                        <span className="text-xs text-gray-500 md:hidden">Ações:</span>
                        {u.role !== 'SCHOOL_MANAGER' && (
                          <button
                            onClick={() => handleUnlink(u.id, u.name)}
                            disabled={unlinkingId === u.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            {unlinkingId === u.id ? 'Desvinculando...' : 'Desvincular'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <Pagination currentPage={meta.currentPage} totalPages={meta.totalPages} />

      {confirmModalData?.isOpen && (
        <ConfirmModal
          title="Desvincular Usuário"
          description={
            <>
              Tem certeza que deseja desvincular o usuário <strong>{confirmModalData.userName}</strong> da sua escola? 
              Ele perderá imediatamente todos os acessos institucionais vinculados à sua escola.
            </>
          }
          onConfirm={executeUnlink}
          onCancel={() => setConfirmModalData(null)}
          confirmText="Desvincular"
          isLoading={unlinkingId === confirmModalData.userId}
          isDestructive={true}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, link }: { title: string, value: number, icon: any, color: 'emerald' | 'blue' | 'red' | 'yellow', link?: string }) {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100'
  };

  const CardContent = (
    <>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${colorMap[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </>
  );

  if (link) {
    return (
      <Link 
        href={link} 
        className="bg-white rounded-2xl p-5 shadow-sm border border-border-custom flex items-center gap-4 hover:shadow-md hover:border-yellow-200 transition-all duration-300 group cursor-pointer"
      >
        {CardContent}
      </Link>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-border-custom flex items-center gap-4">
      {CardContent}
    </div>
  );
}

export default function EscolaUsersPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-foreground/50">Carregando listagem...</div>}>
      <EscolaUsersPageContent />
    </Suspense>
  );
}
