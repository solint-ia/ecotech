'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Clock, BookOpen, ExternalLink, ArrowLeft, Trash2, Edit2, Plus } from 'lucide-react';
import { getImageUrl } from '../../../lib/image-url';
import ConfirmDeleteModal from '../../../components/feed/ConfirmDeleteModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface MyMaterial {
  id: string;
  title: string;
  contentType: string;
  approvalStatus: 'PENDENTE' | 'APROVADO' | 'REPROVADO';
  createdAt: string;
  coverImage: string;
  versionOfId: string | null;
}

export default function MyMaterialsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user as any;

  const [materials, setMaterials] = useState<MyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'PUBLISHED' | 'REJECTED'>('PUBLISHED');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMaterials = useCallback(async () => {
    if (!user?.accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/library/me?status=${filterStatus}&limit=50`, {
        headers: { Authorization: `Bearer ${user.accessToken}` }
      });
      if (!res.ok) {
        const txt = await res.text();
        console.error('Failed to load materials. Status:', res.status, txt);
        throw new Error();
      }
      const data = await res.json();
      setMaterials(data.data);
    } catch (err) {
      console.error('Failed to load materials caught:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.accessToken, filterStatus]);

  useEffect(() => {
    if (status === 'unauthenticated' || (status === 'authenticated' && user?.role === 'STUDENT')) {
      router.push('/biblioteca');
    }
    if (status === 'authenticated' && user?.role !== 'STUDENT') {
      fetchMaterials();
    }
  }, [status, user, router, fetchMaterials]);

  const handleDelete = async () => {
    if (!deletingId || !user?.accessToken) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/library/${deletingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.accessToken}` }
      });
      if (!res.ok) throw new Error('Falha ao excluir');
      setMaterials(prev => prev.filter(m => m.id !== deletingId));
      setDeletingId(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir o material.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (status === 'loading' || !user || user.role === 'STUDENT') return null;

  return (
    <div className="max-w-5xl mx-auto pb-12 px-4 md:px-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <Link
            href="/biblioteca"
            className="inline-flex items-center gap-1.5 text-sm text-primary/70 hover:text-primary transition-colors mb-4 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Biblioteca
          </Link>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-secondary" />
            Meus Materiais
          </h1>
          <p className="text-foreground/70 text-sm mt-1">
            Gerencie os conteúdos que você publicou ou que foram reprovados.
          </p>
        </div>
      </div>

      {user?.role !== 'ADMIN' && (
        <div className="flex items-center gap-2 mb-6 bg-white p-1 rounded-xl shadow-sm border border-border-custom w-fit">
          <button
            onClick={() => setFilterStatus('PUBLISHED')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              filterStatus === 'PUBLISHED' ? 'bg-primary text-white' : 'text-primary hover:bg-beige'
            }`}
          >
            Publicados
          </button>
          <button
            onClick={() => setFilterStatus('REJECTED')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              filterStatus === 'REJECTED' ? 'bg-primary text-white' : 'text-primary hover:bg-beige'
            }`}
          >
            Reprovados
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-border-custom shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-foreground/50">Carregando seus materiais...</div>
        ) : materials.length === 0 ? (
          <div className="p-12 text-center text-foreground/50 flex flex-col items-center">
            <BookOpen className="w-12 h-12 text-border-custom mb-3" />
            <p>Nenhum material encontrado nesta categoria.</p>
          </div>
        ) : (
          <div>
            {/* Mobile Cards */}
            <div className="block md:hidden">
              {materials.map((sub) => (
                <div key={sub.id} className="p-4 border-b border-border-custom/50 flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <img 
                      src={getImageUrl(sub.coverImage)} 
                      alt="" 
                      className="w-16 h-16 rounded-lg object-cover border border-border-custom shrink-0"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-primary text-sm line-clamp-2 mb-1">
                        {sub.title}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-secondary">{sub.contentType}</span>
                        {sub.versionOfId && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">Rascunho de Edição</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-foreground/70">
                        {new Date(sub.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                      <div>
                        {sub.approvalStatus === 'APROVADO' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" /> APROVADO
                          </span>
                        )}
                        {sub.approvalStatus === 'REPROVADO' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                            <XCircle className="w-3 h-3" /> REPROVADO
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Link
                        href={`/biblioteca/${sub.versionOfId || sub.id}`}
                        className="p-2 text-foreground/50 hover:text-primary transition-colors rounded-lg hover:bg-beige"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/biblioteca/editar/${sub.versionOfId || sub.id}`}
                        className="p-2 text-blue-600 hover:text-blue-700 transition-colors rounded-lg hover:bg-blue-50"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => setDeletingId(sub.id)}
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
                    <th className="p-4">Material</th>
                    <th className="p-4">Data</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((sub) => (
                    <tr key={sub.id} className="border-b border-border-custom/50 hover:bg-beige/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={getImageUrl(sub.coverImage)} 
                            alt="" 
                            className="w-12 h-12 rounded-lg object-cover border border-border-custom"
                          />
                          <div>
                            <p className="font-semibold text-primary text-sm line-clamp-1">
                              {sub.title} 
                              {sub.versionOfId && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">Rascunho de Edição</span>}
                            </p>
                            <span className="text-xs font-medium text-secondary">{sub.contentType}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-foreground/70 whitespace-nowrap">
                        {new Date(sub.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4">
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
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/biblioteca/${sub.versionOfId || sub.id}`}
                            className="p-2 text-foreground/50 hover:text-primary transition-colors rounded-lg hover:bg-beige"
                            title="Visualizar"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          
                          <Link
                            href={`/biblioteca/editar/${sub.versionOfId || sub.id}`}
                            className="p-2 text-blue-600 hover:text-blue-700 transition-colors rounded-lg hover:bg-blue-50"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          
                          <button
                            onClick={() => setDeletingId(sub.id)}
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
          title="Excluir Material"
          description="Tem certeza que deseja excluir este material permanentemente? Esta ação não poderá ser desfeita e removerá eventuais rascunhos em análise."
          loading={isDeleting}
          onClose={() => setDeletingId(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
