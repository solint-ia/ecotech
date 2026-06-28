'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Store, ArrowLeft, Edit2, Trash2, CheckCircle2, XCircle, Search } from 'lucide-react';
import { Partner } from '../../../components/rede/PartnerCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function GerenciarParceirosPage() {
  const { data: session, status } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.role === 'ADMIN';
  const router = useRouter();

  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

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
      // API has been updated to accept includeInactive=true
      const res = await fetch(`${API_URL}/partners?includeInactive=true`);
      if (!res.ok) throw new Error('Falha ao carregar parceiros.');
      const data = await res.json();
      setPartners(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchPartners();
    }
  }, [isAdmin, fetchPartners]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir permanentemente o parceiro "${name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/partners/${id}`, {
        method: 'DELETE',
        headers: user?.accessToken ? { Authorization: `Bearer ${user.accessToken}` } : {},
      });

      if (!res.ok && res.status !== 204) throw new Error('Falha ao excluir o parceiro.');
      
      // Remove from list
      setPartners(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir.');
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

  const filteredPartners = partners.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
        <input
          type="text"
          placeholder="Buscar por nome, categoria ou cidade..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-2xl border border-border-custom bg-white focus:ring-2 focus:ring-secondary focus:outline-none shadow-sm"
        />
      </div>

      {/* Table List */}
      <div className="bg-white rounded-2xl border border-border-custom overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#FAFCFA] border-b border-border-custom text-foreground/60 font-medium">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Localização</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom">
              {filteredPartners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-foreground/50">
                    Nenhum parceiro encontrado.
                  </td>
                </tr>
              ) : (
                filteredPartners.map((partner) => (
                  <tr key={partner.id} className="hover:bg-[#FAFCFA] transition-colors">
                    <td className="px-6 py-4 font-semibold text-primary">
                      {partner.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-beige text-primary rounded-full text-xs font-medium border border-border-custom">
                        {partner.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-foreground/70">
                      {partner.city}, {partner.state}
                    </td>
                    <td className="px-6 py-4">
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
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/rede/${partner.id}/editar`}
                          className="p-2 text-primary hover:bg-beige rounded-lg transition-colors"
                          title="Editar parceiro"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(partner.id, partner.name)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
    </div>
  );
}
