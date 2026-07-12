'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Clock, Store, ExternalLink, ArrowLeft, Trash2, Edit2, Plus } from 'lucide-react';
import { getImageUrl } from '../../../lib/image-url';
import ConfirmDeleteModal from '../../../components/feed/ConfirmDeleteModal';
import ApprovalStatusFilter from '../../../components/shared/ApprovalStatusFilter';
import { canCreateContent } from '../../../lib/permissions';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface MyPartner {
  id: string;
  name: string;
  category: string;
  city: string;
  state?: string;
  coverImage: string;
  approvalStatus: 'PENDENTE' | 'APROVADO' | 'REPROVADO';
  createdAt: string;
}

function StatusBadge({ status }: { status: MyPartner['approvalStatus'] }) {
  if (status === 'APROVADO') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
        <CheckCircle2 className="w-3.5 h-3.5" /> APROVADO
      </span>
    );
  }
  if (status === 'REPROVADO') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
        <XCircle className="w-3.5 h-3.5" /> REPROVADO
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
      <Clock className="w-3.5 h-3.5" /> PENDENTE
    </span>
  );
}

export default function MyPartnersPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user as any;
  const canCreate = canCreateContent(user);

  const [partners, setPartners] = useState<MyPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPartners = useCallback(async () => {
    if (!user?.accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/partners/me?status=${statusFilter}&limit=50`, {
        headers: { Authorization: `Bearer ${user.accessToken}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setPartners(json.data);
    } catch {
      console.error('Failed to load partners');
    } finally {
      setLoading(false);
    }
  }, [user?.accessToken, statusFilter]);

  useEffect(() => {
    if (status === 'unauthenticated' || (status === 'authenticated' && !canCreate)) {
      router.push('/rede');
    }
    if (status === 'authenticated' && canCreate) {
      fetchPartners();
    }
  }, [status, canCreate, router, fetchPartners]);

  const handleDelete = async () => {
    if (!deletingId || !user?.accessToken) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/partners/${deletingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.accessToken}` },
      });
      if (!res.ok && res.status !== 204) throw new Error('Falha ao excluir');
      setPartners(prev => prev.filter(p => p.id !== deletingId));
      setDeletingId(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir o parceiro.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (status === 'loading' || !canCreate) return null;

  return (
    <div className="max-w-5xl mx-auto pb-12 px-4 md:px-0">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <Link
            href="/rede"
            className="inline-flex items-center gap-1.5 text-sm text-primary/70 hover:text-primary transition-colors mb-4 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Rede
          </Link>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Store className="w-6 h-6 text-secondary" />
            Meus Parceiros
          </h1>
          <p className="text-foreground/70 text-sm mt-1">
            Parceiros que você cadastrou. Novos cadastros passam pela aprovação do administrador
            antes de aparecerem na rede.
          </p>
        </div>
        <Link
          href="/rede/criar"
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-forest text-white rounded-xl text-sm font-medium hover:bg-forest/90 transition-colors shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Novo Parceiro
        </Link>
      </div>

      <div className="mb-6">
        <ApprovalStatusFilter value={statusFilter} onChange={setStatusFilter} />
      </div>

      <div className="bg-white rounded-2xl border border-border-custom shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-foreground/50">Carregando seus parceiros...</div>
        ) : partners.length === 0 ? (
          <div className="p-12 text-center text-foreground/50 flex flex-col items-center">
            <Store className="w-12 h-12 text-border-custom mb-3" />
            <p>Nenhum parceiro encontrado nesta categoria.</p>
          </div>
        ) : (
          <div>
            {/* Mobile Cards */}
            <div className="block md:hidden">
              {partners.map((partner) => (
                <div key={partner.id} className="p-4 border-b border-border-custom/50 flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <img
                      src={getImageUrl(partner.coverImage)}
                      alt=""
                      className="w-16 h-16 rounded-lg object-cover border border-border-custom shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-primary text-sm line-clamp-2 mb-1">
                        {partner.name}
                      </p>
                      <span className="text-xs font-medium text-secondary">{partner.category}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-foreground/70">
                        {new Date(partner.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                      <StatusBadge status={partner.approvalStatus} />
                    </div>

                    <div className="flex items-center gap-1">
                      <Link
                        href={`/rede/${partner.id}`}
                        className="p-2 text-foreground/50 hover:text-primary transition-colors rounded-lg hover:bg-beige"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/rede/${partner.id}/editar`}
                        className="p-2 text-blue-600 hover:text-blue-700 transition-colors rounded-lg hover:bg-blue-50"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => setDeletingId(partner.id)}
                        className="p-2 text-foreground/50 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-beige border-b border-border-custom text-sm font-semibold text-primary">
                    <th className="p-4">Parceiro</th>
                    <th className="p-4">Localização</th>
                    <th className="p-4">Data</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {partners.map((partner) => (
                    <tr key={partner.id} className="border-b border-border-custom/50 hover:bg-beige/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getImageUrl(partner.coverImage)}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover border border-border-custom"
                          />
                          <div>
                            <p className="font-semibold text-primary text-sm line-clamp-1">{partner.name}</p>
                            <span className="text-xs font-medium text-secondary">{partner.category}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-foreground/70 whitespace-nowrap">
                        {partner.city}{partner.state ? `, ${partner.state}` : ''}
                      </td>
                      <td className="p-4 text-sm text-foreground/70 whitespace-nowrap">
                        {new Date(partner.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4">
                        <StatusBadge status={partner.approvalStatus} />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/rede/${partner.id}`}
                            className="p-2 text-foreground/50 hover:text-primary transition-colors rounded-lg hover:bg-beige"
                            title="Visualizar"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/rede/${partner.id}/editar`}
                            className="p-2 text-blue-600 hover:text-blue-700 transition-colors rounded-lg hover:bg-blue-50"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => setDeletingId(partner.id)}
                            className="p-2 text-foreground/50 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                            title="Excluir Permanentemente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {deletingId && (
        <ConfirmDeleteModal
          title="Excluir Parceiro"
          description="Tem certeza que deseja excluir este parceiro permanentemente? Esta ação não poderá ser desfeita."
          loading={isDeleting}
          onClose={() => setDeletingId(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
