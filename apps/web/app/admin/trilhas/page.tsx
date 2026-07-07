'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Clock, Compass, ExternalLink, ArrowLeft, Trash2 } from 'lucide-react';
import { getImageUrl } from '../../../lib/image-url';
import { Pagination } from '../../../components/shared/Pagination';
import ConfirmDeleteModal from '../../../components/feed/ConfirmDeleteModal';
import ApprovalStatusFilter from '../../../components/shared/ApprovalStatusFilter';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface TrailSubmission {
  id: string;
  title: string;
  slug: string;
  city: string;
  state?: string | null;
  biome: string;
  approvalStatus: 'PENDENTE' | 'APROVADO' | 'REPROVADO';
  createdAt: string;
  coverImage: string;
  school?: { id: string; name: string } | null;
}

function AdminTrilhasPageContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user as any;
  const searchParams = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const statusFilter = searchParams.get('status') || 'ALL';

  const [submissions, setSubmissions] = useState<TrailSubmission[]>([]);
  const [meta, setMeta] = useState({ totalPages: 1, currentPage: 1 });
  const [loading, setLoading] = useState(true);
  const [deletingTrailId, setDeletingTrailId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    if (!user?.accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/trails/admin/submissions?limit=20&page=${page}&status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${user.accessToken}` }
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setSubmissions(json.data);
      setMeta(json.meta);
    } catch {
      console.error('Failed to load trail submissions');
    } finally {
      setLoading(false);
    }
  }, [user?.accessToken, page, statusFilter]);

  const handleStatusFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    if (value === 'ALL') params.delete('status');
    else params.set('status', value);
    router.push(`/admin/trilhas?${params.toString()}`);
  };

  const handleDelete = async () => {
    if (!deletingTrailId || !user?.accessToken) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/trails/${deletingTrailId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.accessToken}` }
      });
      if (!res.ok) throw new Error('Falha ao excluir trilha');
      setSubmissions(prev => prev.filter(s => s.id !== deletingTrailId));
      setDeletingTrailId(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir a trilha.');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated' || (status === 'authenticated' && user?.role !== 'ADMIN')) {
      router.push('/trilhas');
    }
    if (status === 'authenticated' && user?.role === 'ADMIN') {
      fetchSubmissions();
    }
  }, [status, user, router, fetchSubmissions]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`${API_URL}/trails/${id}/approval`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.accessToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setSubmissions(prev =>
          prev.map(sub => sub.id === id ? { ...sub, approvalStatus: newStatus as any } : sub)
        );
      }
    } catch {
      console.error('Failed to change trail status');
    }
  };

  if (status === 'loading' || !user || user.role !== 'ADMIN') return null;

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <Link
        href="/trilhas"
        className="inline-flex items-center gap-1.5 text-sm text-primary/70 hover:text-primary transition-colors mb-4 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para Trilhas
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2 mb-2">
          <Compass className="w-6 h-6 text-secondary" />
          Gerenciamento de Trilhas
        </h1>
        <p className="text-foreground/70 text-sm">
          Aprove, reprove ou exclua as trilhas enviadas por escolas e professores. Apenas trilhas aprovadas ficam públicas.
        </p>
      </div>

      <div className="mb-6">
        <ApprovalStatusFilter value={statusFilter} onChange={handleStatusFilter} />
      </div>

      <div className="md:bg-white md:rounded-2xl md:border border-border-custom md:shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-foreground/50">Carregando submissões...</div>
        ) : submissions.length === 0 ? (
          <div className="p-12 text-center text-foreground/50">
            Nenhuma trilha encontrada para este filtro.
          </div>
        ) : (
          <div className="overflow-x-auto md:overflow-visible">
            <table className="w-full text-left md:border-collapse block md:table">
              <thead className="hidden md:table-header-group">
                <tr className="bg-beige border-b border-border-custom text-sm font-semibold text-primary">
                  <th className="p-4">Trilha</th>
                  <th className="p-4">Escola</th>
                  <th className="p-4">Data</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="block md:table-row-group space-y-4 md:space-y-0 px-4 md:px-0">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="block md:table-row bg-white border border-border-custom md:border-b md:border-border-custom/50 rounded-2xl md:rounded-none shadow-sm md:shadow-none hover:bg-beige/30 transition-colors">
                    <td className="flex flex-col sm:flex-row sm:items-center justify-between md:table-cell p-5 md:p-4 border-b border-border-custom/50 md:border-0 gap-2 sm:gap-0">
                      <span className="md:hidden text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Trilha</span>
                      <div className="flex items-center gap-3">
                        <img
                          src={getImageUrl(sub.coverImage)}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover border border-border-custom"
                        />
                        <div>
                          <p className="font-semibold text-primary text-sm line-clamp-1">{sub.title}</p>
                          <span className="text-xs font-medium text-secondary">{sub.city}{sub.state ? `/${sub.state}` : ''} · {sub.biome}</span>
                        </div>
                      </div>
                    </td>
                    <td className="flex flex-col sm:flex-row sm:items-center justify-between md:table-cell p-5 md:p-4 border-b border-border-custom/50 md:border-0 gap-1 sm:gap-0">
                      <span className="md:hidden text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Escola</span>
                      <p className="text-sm font-medium text-foreground/80 text-right md:text-left">{sub.school?.name || '—'}</p>
                    </td>
                    <td className="flex flex-col sm:flex-row sm:items-center justify-between md:table-cell p-5 md:p-4 text-sm text-foreground/70 border-b border-border-custom/50 md:border-0 gap-1 sm:gap-0">
                      <span className="md:hidden text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Data</span>
                      <span>{new Date(sub.createdAt).toLocaleDateString('pt-BR')}</span>
                    </td>
                    <td className="flex flex-col sm:flex-row sm:items-center justify-between md:table-cell p-5 md:p-4 border-b border-border-custom/50 md:border-0 gap-1 sm:gap-0">
                      <span className="md:hidden text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Status</span>
                      <span>
                        {sub.approvalStatus === 'APROVADO' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> APROVADO
                          </span>
                        )}
                        {sub.approvalStatus === 'REPROVADO' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                            <XCircle className="w-3.5 h-3.5" /> REPROVADO
                          </span>
                        )}
                        {sub.approvalStatus === 'PENDENTE' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                            <Clock className="w-3.5 h-3.5" /> PENDENTE
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="flex items-center justify-between md:justify-end md:table-cell p-5 md:p-4 bg-gray-50/50 md:bg-transparent rounded-b-2xl md:rounded-none">
                      <span className="md:hidden text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Ações</span>
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/trilhas/${sub.slug}`}
                          target="_blank"
                          className="p-2 text-foreground/50 hover:text-primary transition-colors rounded-lg hover:bg-beige border border-border-custom md:border-transparent bg-white md:bg-transparent shadow-sm md:shadow-none"
                          title="Visualizar"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        {sub.approvalStatus !== 'APROVADO' && (
                          <button
                            onClick={() => handleStatusChange(sub.id, 'APROVADO')}
                            className="p-2 text-emerald-600 hover:text-emerald-700 transition-colors rounded-lg hover:bg-emerald-50 border border-emerald-100 md:border-transparent bg-white md:bg-transparent shadow-sm md:shadow-none"
                            title="Aprovar"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                        )}
                        {sub.approvalStatus !== 'REPROVADO' && (
                          <button
                            onClick={() => handleStatusChange(sub.id, 'REPROVADO')}
                            className="p-2 text-red-600 hover:text-red-700 transition-colors rounded-lg hover:bg-red-50 border border-red-100 md:border-transparent bg-white md:bg-transparent shadow-sm md:shadow-none"
                            title="Reprovar"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeletingTrailId(sub.id)}
                          className="p-2 text-foreground/50 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50 border border-border-custom md:border-transparent bg-white md:bg-transparent shadow-sm md:shadow-none"
                          title="Excluir Permanentemente"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination currentPage={meta.currentPage} totalPages={meta.totalPages} />

      {deletingTrailId && (
        <ConfirmDeleteModal
          title="Excluir Trilha"
          description="Tem certeza que deseja excluir esta trilha permanentemente? Esta ação removerá a trilha e não poderá ser desfeita."
          loading={isDeleting}
          onClose={() => setDeletingTrailId(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

export default function AdminTrilhasPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-foreground/50">Carregando listagem...</div>}>
      <AdminTrilhasPageContent />
    </Suspense>
  );
}
