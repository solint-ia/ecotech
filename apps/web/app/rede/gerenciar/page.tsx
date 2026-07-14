'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Store, ArrowLeft, Edit2, Trash2, CheckCircle2, XCircle, Clock, Search } from 'lucide-react';
import { Partner } from '../../../components/rede/PartnerCard';
import ConfirmDeleteModal from '../../../components/feed/ConfirmDeleteModal';
import RejectModal from '../../../components/shared/RejectModal';
import { Pagination } from '../../../components/shared/Pagination';
import ApprovalStatusFilter from '../../../components/shared/ApprovalStatusFilter';
import { AuthorInfo, Author } from '../../../components/shared/AuthorInfo';
import { extractApiError } from '../../../lib/api-error';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface PartnerSubmission extends Partner {
  approvalStatus: 'PENDENTE' | 'APROVADO' | 'REPROVADO';
  rejectionReason?: string | null;
  createdAt: string;
  createdBy?: Author | null;
}

function GerenciarParceirosPageContent() {
  const { data: session, status } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.role === 'ADMIN';
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const statusFilter = searchParams.get('status') || 'ALL';

  const [partners, setPartners] = useState<PartnerSubmission[]>([]);
  const [meta, setMeta] = useState({ totalPages: 1, currentPage: 1 });
  const [loading, setLoading] = useState(true);

  // Live search by name (debounced) — no need to press Enter.
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [error, setError] = useState('');
  const [partnerToDelete, setPartnerToDelete] = useState<{ id: string, name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [partnerToReject, setPartnerToReject] = useState<{ id: string, name: string } | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectError, setRejectError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && !isAdmin) {
      router.push('/rede');
    }
  }, [status, isAdmin, router]);

  const fetchPartners = useCallback(async () => {
    if (!isAdmin || !user?.accessToken) return;
    setLoading(true);
    try {
      // The moderation queue, not the public directory: it carries pending and
      // rejected partners plus who submitted each one.
      const searchParam = debouncedQuery ? `&search=${encodeURIComponent(debouncedQuery)}` : '';
      const res = await fetch(
        `${API_URL}/partners/admin/submissions?page=${page}&limit=20&status=${statusFilter}${searchParam}`,
        { headers: { Authorization: `Bearer ${user.accessToken}` } },
      );
      if (!res.ok) throw new Error('Falha ao carregar parceiros.');
      const json = await res.json();
      setPartners(json.data);
      setMeta(json.meta);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user?.accessToken, page, statusFilter, debouncedQuery]);

  // Debounce the typed query so we don't fetch on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (isAdmin) {
      fetchPartners();
    }
  }, [isAdmin, fetchPartners]);

  const handleStatusFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    if (value === 'ALL') params.delete('status');
    else params.set('status', value);
    router.push(`/rede/gerenciar?${params.toString()}`);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!user?.accessToken) return;
    try {
      const res = await fetch(`${API_URL}/partners/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.accessToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar o status do parceiro.');
      setPartners(prev =>
        prev.map(p =>
          // Approving clears any previous rejection, mirroring what the API stores.
          p.id === id ? { ...p, approvalStatus: newStatus as any, rejectionReason: null } : p,
        ),
      );
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar o status.');
    }
  };

  // Rejection is the one transition that needs a justification, so it goes through
  // a modal. Errors stay inside it — closing would throw away the typed reason.
  const confirmReject = async (reason: string) => {
    if (!partnerToReject || !user?.accessToken) return;
    setIsRejecting(true);
    setRejectError('');
    try {
      const res = await fetch(`${API_URL}/partners/${partnerToReject.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.accessToken}`,
        },
        body: JSON.stringify({ status: 'REPROVADO', reason }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(extractApiError(body, 'Falha ao reprovar o parceiro.'));
      }
      setPartners(prev =>
        prev.map(p =>
          p.id === partnerToReject.id
            ? { ...p, approvalStatus: 'REPROVADO' as const, rejectionReason: reason }
            : p,
        ),
      );
      setPartnerToReject(null);
    } catch (err: any) {
      setRejectError(err.message || 'Erro ao reprovar o parceiro.');
    } finally {
      setIsRejecting(false);
    }
  };

  const confirmDelete = async () => {
    if (!partnerToDelete) return;
    setIsDeleting(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/partners/${partnerToDelete.id}`, {
        method: 'DELETE',
        headers: user?.accessToken ? { Authorization: `Bearer ${user.accessToken}` } : {},
      });

      if (!res.ok && res.status !== 204) throw new Error('Falha ao excluir o parceiro.');

      // Remove from list
      setPartners(prev => prev.filter(p => p.id !== partnerToDelete.id));
      setPartnerToDelete(null);
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir.');
      setPartnerToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Only block the whole page on the initial auth check — never on data fetches,
  // otherwise the search input unmounts on every keystroke and loses focus.
  if (status === 'loading') {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center text-foreground/60">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p>Carregando parceiros...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/rede"
          className="text-primary/70 hover:text-primary transition-colors p-2 rounded-full hover:bg-beige"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Store className="w-6 h-6 text-secondary" />
            Gerenciar Parceiros
          </h1>
          <p className="text-sm text-foreground/60 mt-1">
            Aprove, reprove e administre os parceiros enviados por escolas e professores.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 mb-6">
          {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
        <input
          type="text"
          placeholder="Buscar por nome..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-2xl border border-border-custom bg-white focus:ring-2 focus:ring-secondary focus:outline-none shadow-sm"
        />
      </div>

      <div className="mb-6">
        <ApprovalStatusFilter value={statusFilter} onChange={handleStatusFilter} />
      </div>

      <div className="md:bg-white md:rounded-2xl md:border border-border-custom overflow-hidden md:shadow-sm">
        <div className="overflow-x-auto md:overflow-visible">
          {/* Sem `whitespace-nowrap` no table: com nowrap global, um nome ou
              endereço longo estica a tabela e empurra a coluna de Ações para
              fora da área visível no desktop (que não tem rolagem lateral). */}
          <table className="w-full text-left text-sm block md:table">
            <thead className="hidden md:table-header-group bg-[#FAFCFA] border-b border-border-custom text-foreground/60 font-medium">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Enviado por</th>
                <th className="px-6 py-4">Localização</th>
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                {/* w-0 + nowrap: a coluna encolhe até o tamanho dos botões e nunca é espremida. */}
                <th className="px-6 py-4 text-right w-0 whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group divide-y-0 md:divide-y divide-border-custom px-4 md:px-0 space-y-4 md:space-y-0">
              {loading ? (
                <tr className="block md:table-row">
                  <td colSpan={6} className="block md:table-cell px-6 py-8 text-center text-foreground/50">
                    Carregando parceiros...
                  </td>
                </tr>
              ) : partners.length === 0 ? (
                <tr className="block md:table-row">
                  <td colSpan={6} className="block md:table-cell px-6 py-8 text-center text-foreground/50">
                    Nenhum parceiro encontrado.
                  </td>
                </tr>
              ) : (
                partners.map((partner) => (
                  <tr key={partner.id} className="block md:table-row bg-white border border-border-custom md:border-0 rounded-2xl md:rounded-none shadow-sm md:shadow-none hover:bg-[#FAFCFA] transition-colors">
                    <td className="flex flex-col sm:flex-row sm:items-center justify-between md:table-cell px-5 py-4 md:px-6 border-b border-border-custom/50 md:border-0 gap-1 sm:gap-0">
                      <span className="md:hidden text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Nome</span>
                      <span className="font-semibold text-primary break-words">{partner.name}</span>
                    </td>
                    <td className="flex flex-col sm:flex-row sm:items-center justify-between md:table-cell px-5 py-4 md:px-6 border-b border-border-custom/50 md:border-0 gap-1 sm:gap-0">
                      <span className="md:hidden text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Categoria</span>
                      <span className="px-3 py-1 bg-beige text-primary rounded-full text-xs font-medium border border-border-custom w-fit">
                        {partner.category}
                      </span>
                    </td>
                    <td className="flex flex-col sm:flex-row sm:items-center justify-between md:table-cell px-5 py-4 md:px-6 border-b border-border-custom/50 md:border-0 gap-1 sm:gap-0">
                      <span className="md:hidden text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Enviado por</span>
                      <AuthorInfo author={partner.createdBy} className="text-right md:text-left" />
                    </td>
                    <td className="flex flex-col sm:flex-row sm:items-center justify-between md:table-cell px-5 py-4 md:px-6 text-foreground/70 border-b border-border-custom/50 md:border-0 gap-1 sm:gap-0">
                      <span className="md:hidden text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Localização</span>
                      <span>{partner.city}, {partner.state}</span>
                    </td>
                    <td className="flex flex-col sm:flex-row sm:items-center justify-between md:table-cell px-5 py-4 md:px-6 border-b border-border-custom/50 md:border-0 gap-1 sm:gap-0 md:whitespace-nowrap">
                      <span className="md:hidden text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Status</span>
                      <span>
                        {partner.approvalStatus === 'APROVADO' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> APROVADO
                          </span>
                        )}
                        {partner.approvalStatus === 'REPROVADO' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                            <XCircle className="w-3.5 h-3.5" /> REPROVADO
                          </span>
                        )}
                        {partner.approvalStatus === 'PENDENTE' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                            <Clock className="w-3.5 h-3.5" /> PENDENTE
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="flex items-center justify-between md:justify-end md:table-cell px-5 py-4 md:px-6 bg-gray-50/50 md:bg-transparent rounded-b-2xl md:rounded-none md:w-0 md:whitespace-nowrap">
                      <span className="md:hidden text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Ações</span>
                      <div className="flex items-center justify-end gap-2">
                        {partner.approvalStatus !== 'APROVADO' && (
                          <button
                            onClick={() => handleStatusChange(partner.id, 'APROVADO')}
                            className="p-2 text-emerald-600 hover:text-emerald-700 transition-colors rounded-lg hover:bg-emerald-50 border border-emerald-100 md:border-transparent bg-white md:bg-transparent shadow-sm md:shadow-none"
                            title="Aprovar"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                        )}
                        {partner.approvalStatus !== 'REPROVADO' && (
                          <button
                            onClick={() => {
                              setRejectError('');
                              setPartnerToReject({ id: partner.id, name: partner.name });
                            }}
                            className="p-2 text-red-600 hover:text-red-700 transition-colors rounded-lg hover:bg-red-50 border border-red-100 md:border-transparent bg-white md:bg-transparent shadow-sm md:shadow-none"
                            title="Reprovar"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        )}
                        <Link
                          href={`/rede/${partner.id}/editar`}
                          className="p-2 text-primary hover:bg-beige rounded-lg transition-colors border border-border-custom md:border-transparent bg-white md:bg-transparent shadow-sm md:shadow-none"
                          title="Editar parceiro"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setPartnerToDelete({ id: partner.id, name: partner.name })}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-100 md:border-transparent bg-white md:bg-transparent shadow-sm md:shadow-none"
                          title="Excluir permanentemente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Pagination Component */}
      <Pagination currentPage={meta.currentPage} totalPages={meta.totalPages} />

      {partnerToDelete && (
        <ConfirmDeleteModal
          title="Excluir Parceiro"
          description={`Tem certeza que deseja excluir permanentemente o parceiro "${partnerToDelete.name}"? Esta ação não pode ser desfeita.`}
          loading={isDeleting}
          onConfirm={confirmDelete}
          onClose={() => !isDeleting && setPartnerToDelete(null)}
        />
      )}

      {partnerToReject && (
        <RejectModal
          title="Reprovar Parceiro"
          itemName={partnerToReject.name}
          isLoading={isRejecting}
          error={rejectError}
          onConfirm={confirmReject}
          onCancel={() => !isRejecting && setPartnerToReject(null)}
        />
      )}
    </div>
  );
}

export default function GerenciarParceirosPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-foreground/50">Carregando listagem...</div>}>
      <GerenciarParceirosPageContent />
    </Suspense>
  );
}
