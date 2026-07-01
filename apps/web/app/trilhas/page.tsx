'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { MapPin, Clock, Route, Heart, Eye, Plus, Search, Leaf, ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { getImageUrl } from '../../lib/image-url';
import { StateCitySelect } from '../../components/shared/StateCitySelect';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

import TrailCard, { Trail } from '../../components/trilhas/TrailCard';

// const DIFFICULTY_LABELS and interface Trail were extracted to TrailCard.tsx



export default function TrilhasPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const isApproved = user?.roleStatus === 'APROVADO';
  const canManageTrails = user?.role === 'ADMIN' || (['SCHOOL_MANAGER', 'TEACHER'].includes(user?.role) && isApproved);

  const [trails, setTrails] = useState<Trail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'publicadas' | 'rascunhos' | 'minhas-trilhas'>('publicadas');
  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [selectedBiome, setSelectedBiome] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const limit = 12;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterState, filterCity, selectedBiome, selectedDifficulty, activeTab]);

  const fetchTrails = useCallback(async () => {
    setLoading(true);
    try {
      let endpoint = `${API_URL}/trails`;
      if (activeTab === 'rascunhos') endpoint = `${API_URL}/trails/my-drafts`;
      if (activeTab === 'minhas-trilhas') endpoint = `${API_URL}/trails/my-trails`;

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filterState) params.set('state', filterState);
      if (filterCity) params.set('city', filterCity);
      if (selectedBiome) params.set('biome', selectedBiome);
      if (selectedDifficulty) params.set('difficulty', selectedDifficulty);

      const headers: HeadersInit = {};
      if (activeTab !== 'publicadas' && user?.accessToken) {
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
  }, [page, debouncedSearch, filterState, filterCity, selectedBiome, selectedDifficulty, activeTab, user?.accessToken]);

  useEffect(() => {
    fetchTrails();
  }, [fetchTrails]);

  const BRAZILIAN_BIOMES = [
    'Amazônia',
    'Caatinga',
    'Cerrado',
    'Mata Atlântica',
    'Pampa',
    'Pantanal'
  ];

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
        {canManageTrails && (
          <Link
            href="/trilhas/criar"
            id="btn-nova-trilha"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Trilha
          </Link>
        )}
      </div>

      {/* Tabs */}
      {(user?.role === 'ADMIN' || user?.role === 'SCHOOL_MANAGER' || user?.role === 'TEACHER') && (
        <div className="flex items-center gap-6 mb-8 border-b border-border-custom pb-3">
          <button
            onClick={() => setActiveTab('publicadas')}
            className={`text-sm font-semibold transition-all relative ${activeTab === 'publicadas' ? 'text-forest' : 'text-foreground/50 hover:text-foreground/80'
              }`}
          >
            Publicadas
            {activeTab === 'publicadas' && (
              <span className="absolute -bottom-[13px] left-0 right-0 h-0.5 bg-forest rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('rascunhos')}
            className={`text-sm font-semibold transition-all relative ${activeTab === 'rascunhos' ? 'text-forest' : 'text-foreground/50 hover:text-foreground/80'
              }`}
          >
            Meus Rascunhos
            {activeTab === 'rascunhos' && (
              <span className="absolute -bottom-[13px] left-0 right-0 h-0.5 bg-forest rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('minhas-trilhas')}
            className={`text-sm font-semibold transition-all relative ${activeTab === 'minhas-trilhas' ? 'text-forest' : 'text-foreground/50 hover:text-foreground/80'
              }`}
          >
            Minhas Trilhas
            {activeTab === 'minhas-trilhas' && (
              <span className="absolute -bottom-[13px] left-0 right-0 h-0.5 bg-forest rounded-t-full" />
            )}
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex gap-2 w-full">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-forest/50" />
            <input
              id="search-trilhas"
              type="text"
              placeholder="Buscar trilhas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-full border border-border-custom bg-white focus:outline-none focus:ring-2 focus:ring-forest text-sm transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowFiltersModal(true)}
            className="md:hidden flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-900/10 bg-white text-emerald-950 font-medium whitespace-nowrap shadow-sm"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
          </button>
        </div>
        
        {/* Desktop Filters (Hidden on Mobile) */}
        <div className="hidden md:flex flex-row gap-4 items-center">
          <div className="flex-1 w-full sm:w-auto">
            <StateCitySelect
              selectedState={filterState}
              selectedCity={filterCity}
              onStateChange={setFilterState}
              onCityChange={setFilterCity}
              inline={true}
            />
          </div>
          <div className="relative w-full sm:w-auto">
            <select
              id="filter-biome"
              value={selectedBiome}
              onChange={(e) => setSelectedBiome(e.target.value)}
              className={`w-full sm:min-w-[160px] pl-4 pr-10 py-3 rounded-full border text-sm focus:outline-none focus:ring-2 focus:ring-forest appearance-none h-[46px] transition-all cursor-pointer shadow-sm ${selectedBiome
                  ? 'bg-sage text-forest border-sage font-medium'
                  : 'bg-white border-border-custom text-foreground/80 hover:border-forest/30'
                }`}
            >
              <option value="">Todos os biomas</option>
              {BRAZILIAN_BIOMES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <ChevronDown className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors ${selectedBiome ? 'text-forest' : 'text-foreground/50'}`} />
          </div>
          <div className="relative w-full sm:w-auto">
            <select
              id="filter-difficulty"
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className={`w-full sm:min-w-[140px] pl-4 pr-10 py-3 rounded-full border text-sm focus:outline-none focus:ring-2 focus:ring-forest appearance-none h-[46px] transition-all cursor-pointer shadow-sm ${selectedDifficulty
                  ? 'bg-sage text-forest border-sage font-medium'
                  : 'bg-white border-border-custom text-foreground/80 hover:border-forest/30'
                }`}
            >
              <option value="">Dificuldade</option>
              <option value="FACIL">Fácil</option>
              <option value="MODERADA">Moderada</option>
              <option value="DIFICIL">Difícil</option>
            </select>
            <ChevronDown className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors ${selectedDifficulty ? 'text-forest' : 'text-foreground/50'}`} />
          </div>
        </div>
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
      {/* Mobile Filters Modal */}
      {showFiltersModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm md:hidden">
          <div className="bg-white w-full max-h-[85vh] rounded-t-2xl sm:rounded-2xl p-6 flex flex-col gap-6 overflow-y-auto animate-in slide-in-from-bottom-full duration-300">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-primary">Filtros</h2>
              <button onClick={() => setShowFiltersModal(false)} className="p-2 text-foreground/50 hover:bg-black/5 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              <StateCitySelect
                selectedState={filterState}
                selectedCity={filterCity}
                onStateChange={setFilterState}
                onCityChange={setFilterCity}
                inline={false}
              />
              <div className="relative">
                <select
                  value={selectedBiome}
                  onChange={(e) => setSelectedBiome(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 rounded-xl border border-border-custom bg-white focus:outline-none focus:ring-2 focus:ring-forest text-sm appearance-none"
                >
                  <option value="">Todos os biomas</option>
                  {BRAZILIAN_BIOMES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 rounded-xl border border-border-custom bg-white focus:outline-none focus:ring-2 focus:ring-forest text-sm appearance-none"
                >
                  <option value="">Dificuldade</option>
                  <option value="FACIL">Fácil</option>
                  <option value="MODERADA">Moderada</option>
                  <option value="DIFICIL">Difícil</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50 pointer-events-none" />
              </div>
            </div>

            <button 
              onClick={() => setShowFiltersModal(false)}
              className="w-full py-3 bg-forest text-white rounded-xl font-bold mt-2 hover:bg-forest/90 transition-colors"
            >
              Aplicar Filtros
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
