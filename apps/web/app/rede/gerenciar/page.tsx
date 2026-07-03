'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Store, ArrowLeft, Edit2, Trash2, CheckCircle2, XCircle, Search } from 'lucide-react';
import { Partner } from '../../../components/rede/PartnerCard';
import ConfirmDeleteModal from '../../../components/feed/ConfirmDeleteModal';
import { Pagination } from '../../../components/shared/Pagination';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function GerenciarParceirosPageContent() {
  const { data: session, status } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.role === 'ADMIN';
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const page = parseInt(searchParams.get('page') || '1', 10);

  const [partners, setPartners] = useState<Partner[]>([]);
  const [meta, setMeta] = useState({ totalPages: 1, currentPage: 1 });
  const [loading, setLoading] = useState(true);
  
  // Initialize search from URL if present
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [error, setError] = useState('');
  const [partnerToDelete, setPartnerToDelete] = useState<{ id: string, name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && !isAdmin) {
      router.push('/rede');
    }
  }, [status, isAdmin, router]);

  const fetchPartners = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const res = await fetch(`${API_URL}/partners?includeInactive=true&page=${page}&limit=20${searchParam}`);
      if (!res.ok) throw new Error('Falha ao carregar parceiros.');
      const json = await res.json();
      setPartners(json.data);
      setMeta(json.meta);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, page, searchQuery]);

  useEffect(() => {
    if (isAdmin) {
      fetchPartners();
    }
  }, [isAdmin, fetchPartners]);

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

  if (status === 'loading' || loading) {
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

  // We no longer filter locally, the backend handles it.
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    if (searchQuery) {
      params.set('search', searchQuery);
    } else {
      params.delete('search');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

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
            Administre os parceiros da rede (ativos e inativos).
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 mb-6">
          {error}
        </div>
      )}

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
        <input
          type="text"
          placeholder="Buscar por nome, categoria ou cidade... (Pressione Enter)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-2xl border border-border-custom bg-white focus:ring-2 focus:ring-secondary focus:outline-none shadow-sm"
        />
      </form>

      <div className="md:bg-white md:rounded-2xl md:border border-border-custom overflow-hidden md:shadow-sm">
        <div className="overflow-x-auto md:overflow-visible">
          <table className="w-full text-left text-sm whitespace-nowrap block md:table">
            <thead className="hidden md:table-header-group bg-[#FAFCFA] border-b border-border-custom text-foreground/60 font-medium">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Localização</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group divide-y-0 md:divide-y divide-border-custom px-4 md:px-0 space-y-4 md:space-y-0">
              {partners.length === 0 ? (
                <tr className="block md:table-row">
                  <td colSpan={5} className="block md:table-cell px-6 py-8 text-center text-foreground/50">
                    Nenhum parceiro encontrado.
                  </td>
                </tr>
              ) : (
                partners.map((partner) => (
                  <tr key={partner.id} className="block md:table-row bg-white border border-border-custom md:border-0 rounded-2xl md:rounded-none shadow-sm md:shadow-none hover:bg-[#FAFCFA] transition-colors">
                    <td className="flex flex-col sm:flex-row sm:items-center justify-between md:table-cell px-5 py-4 md:px-6 border-b border-border-custom/50 md:border-0 gap-1 sm:gap-0">
                      <span className="md:hidden text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Nome</span>
                      <span className="font-semibold text-primary">{partner.name}</span>
                    </td>
                    <td className="flex flex-col sm:flex-row sm:items-center justify-between md:table-cell px-5 py-4 md:px-6 border-b border-border-custom/50 md:border-0 gap-1 sm:gap-0">
                      <span className="md:hidden text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Categoria</span>
                      <span className="px-3 py-1 bg-beige text-primary rounded-full text-xs font-medium border border-border-custom w-fit">
                        {partner.category}
                      </span>
                    </td>
                    <td className="flex flex-col sm:flex-row sm:items-center justify-between md:table-cell px-5 py-4 md:px-6 text-foreground/70 border-b border-border-custom/50 md:border-0 gap-1 sm:gap-0">
                      <span className="md:hidden text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Localização</span>
                      <span>{partner.city}, {partner.state}</span>
                    </td>
                    <td className="flex flex-col sm:flex-row sm:items-center justify-between md:table-cell px-5 py-4 md:px-6 border-b border-border-custom/50 md:border-0 gap-1 sm:gap-0">
                      <span className="md:hidden text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Status</span>
                      <span>
                        {partner.status ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                            <XCircle className="w-3.5 h-3.5" />
                            Inativo
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="flex items-center justify-between md:justify-end md:table-cell px-5 py-4 md:px-6 bg-gray-50/50 md:bg-transparent rounded-b-2xl md:rounded-none">
                      <span className="md:hidden text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Ações</span>
                      <div className="flex items-center justify-end gap-2">
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
