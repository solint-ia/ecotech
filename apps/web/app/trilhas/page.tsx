'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { MapPin, Clock, Route, Heart, Eye, Plus, Search, Leaf } from 'lucide-react';
import { getImageUrl } from '../../lib/image-url';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

import TrailCard, { Trail } from '../../components/trilhas/TrailCard';

// const DIFFICULTY_LABELS and interface Trail were extracted to TrailCard.tsx



export default function TrilhasPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.role === 'ADMIN';

  const [trails, setTrails] = useState<Trail[]>([]);
  const [biomes, setBiomes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showDrafts, setShowDrafts] = useState(false);
  const [selectedBiome, setSelectedBiome] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 12;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedBiome, selectedDifficulty, showDrafts]);

  const fetchTrails = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = showDrafts ? `${API_URL}/trails/my-drafts` : `${API_URL}/trails`;
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (selectedBiome) params.set('biome', selectedBiome);
      if (selectedDifficulty) params.set('difficulty', selectedDifficulty);

      const headers: HeadersInit = {};
      if (showDrafts && user?.accessToken) {
        headers['Authorization'] = `Bearer ${user.accessToken}`;
      }

      const res = await fetch(`${endpoint}?${params}`, { headers });
      if (!res.ok) throw new Error('Falha ao carregar trilhas.');
      const data = await res.json();
      setTrails(data.data);
      setTotal(data.meta.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, selectedBiome, selectedDifficulty, showDrafts, user?.accessToken]);

  useEffect(() => {
    fetchTrails();
  }, [fetchTrails]);

  useEffect(() => {
    fetch(`${API_URL}/trails/biomes`)
      .then((r) => r.json())
      .then(setBiomes)
      .catch(() => {});
  }, []);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary mb-1">Trilhas Ecológicas</h1>
          <p className="text-sm text-foreground/70">
            Explore trilhas educativas e conheça a biodiversidade local
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/trilhas/criar"
            id="btn-nova-trilha"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nova Trilha
          </Link>
        )}
      </div>

      {/* Tabs */}
      {(user?.role === 'ADMIN' || user?.role === 'SCHOOL_MANAGER') && (
        <div className="flex items-center gap-4 mb-6 border-b border-border-custom pb-2">
          <button
            onClick={() => setShowDrafts(false)}
            className={`text-sm font-semibold px-2 py-1 transition-colors ${
              !showDrafts ? 'text-primary border-b-2 border-primary' : 'text-foreground/50 hover:text-foreground/80'
            }`}
          >
            Publicadas
          </button>
          <button
            onClick={() => setShowDrafts(true)}
            className={`text-sm font-semibold px-2 py-1 transition-colors ${
              showDrafts ? 'text-primary border-b-2 border-primary' : 'text-foreground/50 hover:text-foreground/80'
            }`}
          >
            Meus Rascunhos
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
          <input
            id="search-trilhas"
            type="text"
            placeholder="Buscar trilhas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border-custom bg-white focus:outline-none focus:ring-2 focus:ring-secondary text-sm transition-all"
          />
        </div>
        <select
          id="filter-biome"
          value={selectedBiome}
          onChange={(e) => setSelectedBiome(e.target.value)}
          className="px-3 py-2.5 rounded-lg border border-border-custom bg-white text-sm focus:outline-none focus:ring-2 focus:ring-secondary appearance-none min-w-[160px]"
        >
          <option value="">Todos os biomas</option>
          {biomes.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          id="filter-difficulty"
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          className="px-3 py-2.5 rounded-lg border border-border-custom bg-white text-sm focus:outline-none focus:ring-2 focus:ring-secondary appearance-none min-w-[140px]"
        >
          <option value="">Dificuldade</option>
          <option value="FACIL">Fácil</option>
          <option value="MODERADA">Moderada</option>
          <option value="DIFICIL">Difícil</option>
        </select>
      </div>

      {/* Trails Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl overflow-hidden border border-border-custom animate-pulse">
              <div className="h-48 bg-gray-200" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : trails.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Leaf className="w-12 h-12 text-secondary/40 mb-4" />
          <p className="text-lg font-semibold text-primary">Nenhuma trilha encontrada</p>
          <p className="text-sm text-foreground/60 mt-1">
            Tente ajustar os filtros ou buscar por outro termo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {trails.map((trail) => (
            <TrailCard key={trail.id} trail={trail} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm border border-border-custom rounded-lg disabled:opacity-40 hover:bg-beige transition-colors"
          >
            Anterior
          </button>
          <span className="text-sm text-foreground/70">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm border border-border-custom rounded-lg disabled:opacity-40 hover:bg-beige transition-colors"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
