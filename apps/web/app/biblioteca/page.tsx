'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Search, Plus, BookOpen } from 'lucide-react';
import LibraryCard, { LibraryContent } from '../../components/library/LibraryCard';
import { Pagination } from '../../components/shared/Pagination';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const CATEGORIES = [
  { value: '', label: 'Todas' },
  { value: 'GUIA', label: 'Guias' },
  { value: 'FAUNA', label: 'Fauna' },
  { value: 'FLORA', label: 'Flora' },
  { value: 'CARTILHA', label: 'Cartilhas' },
  { value: 'PROTOCOLO', label: 'Protocolos' },
  { value: 'ODS', label: 'ODS' },
  { value: 'CURIOSIDADE', label: 'Curiosidades' },
  { value: 'ARTIGO', label: 'Artigos' },
  { value: 'VIDEO', label: 'Vídeos' },
];

function BibliotecaPageContent() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isApproved = user?.roleStatus === 'APROVADO';
  const canSubmit = user?.role === 'ADMIN' || (['SCHOOL_MANAGER', 'TEACHER'].includes(user?.role) && isApproved);
  const isAdmin = user?.role === 'ADMIN';

  const page = parseInt(searchParams.get('page') || '1', 10);
  const searchUrl = searchParams.get('search') || '';
  const typeUrl = searchParams.get('type') || '';

  const [contents, setContents] = useState<LibraryContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ totalPages: 1, currentPage: 1 });
  const [search, setSearch] = useState(searchUrl);
  const [selectedType, setSelectedType] = useState(typeUrl);
  const limit = 12;

  // Sync local filter state to URL params with debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      let changed = false;

      if (search !== searchUrl || selectedType !== typeUrl) {
        params.set('page', '1');
        changed = true;
      }

      if (search !== searchUrl) { if (search) params.set('search', search); else params.delete('search'); }
      if (selectedType !== typeUrl) { if (selectedType) params.set('type', selectedType); else params.delete('type'); }

      if (changed) {
        router.push(`${pathname}?${params.toString()}`);
      }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [search, selectedType, searchUrl, typeUrl, pathname, router, searchParams]);

  const fetchContents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (searchUrl) params.set('search', searchUrl);
      if (typeUrl) params.set('type', typeUrl);

      const res = await fetch(`${API_URL}/library?${params}`);
      if (!res.ok) throw new Error('Falha ao carregar biblioteca.');
      const data = await res.json();
      setContents(data.data);
      setMeta(data.meta);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, searchUrl, typeUrl]);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary mb-1">Biblioteca Digital</h1>
          <p className="text-sm text-foreground/70">
            Acesse guias, vídeos, cartilhas e artigos sobre meio ambiente.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              href="/admin/biblioteca"
              className="px-4 py-2 bg-white border border-border-custom text-primary rounded-lg text-sm font-semibold hover:bg-beige transition-colors shadow-sm"
            >
              Gerenciar Materiais
            </Link>
          )}
          {user?.role && user.role !== 'STUDENT' && (
            <Link
              href="/biblioteca/meus-materiais"
              className="px-4 py-2 bg-white border border-border-custom text-primary rounded-lg text-sm font-semibold hover:bg-beige transition-colors shadow-sm"
            >
              Meus Materiais
            </Link>
          )}
          {canSubmit && (
            <Link
              href="/biblioteca/nova"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Enviar Material
            </Link>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
          <input
            type="text"
            placeholder="Buscar conteúdos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-custom bg-white focus:outline-none focus:ring-2 focus:ring-secondary text-sm transition-all shadow-sm"
          />
        </div>
        
        {/* Category Pills (Desktop) */}
        <div className="hidden md:flex flex-wrap gap-2 items-center bg-white border border-border-custom p-1.5 rounded-xl shadow-sm">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedType(cat.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                selectedType === cat.value 
                  ? 'bg-secondary text-white' 
                  : 'text-foreground/70 hover:bg-beige hover:text-primary'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Category Select (Mobile) */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="md:hidden w-full px-3 py-2.5 rounded-xl border border-border-custom bg-white text-sm focus:outline-none focus:ring-2 focus:ring-secondary appearance-none shadow-sm"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl overflow-hidden border border-border-custom animate-pulse h-[360px]">
              <div className="h-48 bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : contents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-border-custom shadow-sm">
          <BookOpen className="w-12 h-12 text-secondary/40 mb-4" />
          <p className="text-lg font-semibold text-primary">Nenhum conteúdo encontrado</p>
          <p className="text-sm text-foreground/60 mt-1">
            Tente ajustar os filtros ou buscar por outro termo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {contents.map((content) => (
            <LibraryCard key={content.id} content={content} />
          ))}
        </div>
      )}

      <Pagination currentPage={meta.currentPage} totalPages={meta.totalPages} />
    </div>
  );
}

export default function BibliotecaPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-foreground/50">Carregando listagem...</div>}>
      <BibliotecaPageContent />
    </Suspense>
  );
}
