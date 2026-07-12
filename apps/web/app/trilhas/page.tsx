'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { MapPin, Clock, Route, Heart, Eye, Plus, Search, Leaf, ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { getImageUrl } from '../../lib/image-url';
import { StateCitySelect } from '../../components/shared/StateCitySelect';
import { Pagination } from '../../components/shared/Pagination';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

import TrailCard, { Trail } from '../../components/trilhas/TrailCard';
import { canCreateContent } from '../../lib/permissions';

// const DIFFICULTY_LABELS and interface Trail were extracted to TrailCard.tsx



function TrilhasPageContent() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const canManageTrails = canCreateContent(user);

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const searchUrl = searchParams.get('search') || '';
  const filterStateUrl = searchParams.get('state') || '';
  const filterCityUrl = searchParams.get('city') || '';
  const biomeUrl = searchParams.get('biome') || '';
  const difficultyUrl = searchParams.get('difficulty') || '';
  const tabUrl = searchParams.get('tab') || 'publicadas';

  const [trails, setTrails] = useState<Trail[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ totalPages: 1, currentPage: 1 });
  
  const [search, setSearch] = useState(searchUrl);
  const [filterState, setFilterState] = useState(filterStateUrl);
  const [filterCity, setFilterCity] = useState(filterCityUrl);
  const [selectedBiome, setSelectedBiome] = useState(biomeUrl);
  const [selectedDifficulty, setSelectedDifficulty] = useState(difficultyUrl);
  const [activeTab, setActiveTab] = useState<'publicadas' | 'rascunhos' | 'minhas-trilhas' | 'salvas'>(tabUrl as any);

  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const limit = 12;

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      let changed = false;

      if (
        search !== searchUrl || 
        filterState !== filterStateUrl || 
        filterCity !== filterCityUrl ||
        selectedBiome !== biomeUrl ||
        selectedDifficulty !== difficultyUrl ||
        activeTab !== tabUrl
      ) {
        params.set('page', '1');
        changed = true;
      }
      
      if (search !== searchUrl) { if (search) params.set('search', search); else params.delete('search'); }
      if (filterState !== filterStateUrl) { if (filterState) params.set('state', filterState); else params.delete('state'); }
      if (filterCity !== filterCityUrl) { if (filterCity) params.set('city', filterCity); else params.delete('city'); }
      if (selectedBiome !== biomeUrl) { if (selectedBiome) params.set('biome', selectedBiome); else params.delete('biome'); }
      if (selectedDifficulty !== difficultyUrl) { if (selectedDifficulty) params.set('difficulty', selectedDifficulty); else params.delete('difficulty'); }
      if (activeTab !== tabUrl) { if (activeTab !== 'publicadas') params.set('tab', activeTab); else params.delete('tab'); }

      if (changed) {
        router.push(`${pathname}?${params.toString()}`);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [
    search, filterState, filterCity, selectedBiome, selectedDifficulty, activeTab,
    searchUrl, filterStateUrl, filterCityUrl, biomeUrl, difficultyUrl, tabUrl,
    pathname, router, searchParams
  ]);

  const fetchTrails = useCallback(async () => {
    setLoading(true);
    try {
      let endpoint = `${API_URL}/trails`;
      if (tabUrl === 'rascunhos') endpoint = `${API_URL}/trails/my-drafts`;
      if (tabUrl === 'minhas-trilhas') endpoint = `${API_URL}/trails/my-trails`;
      if (tabUrl === 'salvas') endpoint = `${API_URL}/trails/saved`;

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (searchUrl) params.set('search', searchUrl);
      if (filterStateUrl) params.set('state', filterStateUrl);
      if (filterCityUrl) params.set('city', filterCityUrl);
      if (biomeUrl) params.set('biome', biomeUrl);
      if (difficultyUrl) params.set('difficulty', difficultyUrl);

      const headers: HeadersInit = {};
      if (tabUrl !== 'publicadas' && user?.accessToken) {
        headers['Authorization'] = `Bearer ${user.accessToken}`;
      }

      const res = await fetch(`${endpoint}?${params}`, { headers });
      if (!res.ok) throw new Error('Falha ao carregar trilhas.');
      const data = await res.json();
      setTrails(data.data);
      setMeta(data.meta);
    } catch (err) {
      console.error(err);
      setTrails([]);
    } finally {
      setLoading(false);
    }
  }, [page, searchUrl, filterStateUrl, filterCityUrl, biomeUrl, difficultyUrl, tabUrl, user?.accessToken]);

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

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary mb-1">Trilhas Interpretativas</h1>
          <p className="text-sm text-foreground/70">
            Explore trilhas interpretativas e conheça a biodiversidade local
          </p>
        </div>
        <div className="flex items-center gap-3">
          {user?.role === 'ADMIN' && (
            <Link
              href="/admin/trilhas"
              className="px-4 py-2 bg-white border border-border-custom text-primary rounded-lg text-sm font-semibold hover:bg-beige transition-colors shadow-sm"
            >
              Gerenciar Trilhas
            </Link>
          )}
          {canManageTrails && (
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
      </div>

      {/* Tabs */}
      {!!user && (
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
          {canManageTrails && (
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
          )}
          {canManageTrails && (
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
          )}
          <button
            onClick={() => setActiveTab('salvas')}
            className={`text-sm font-semibold transition-all relative ${activeTab === 'salvas' ? 'text-forest' : 'text-foreground/50 hover:text-foreground/80'
              }`}
          >
            Trilhas Salvas
            {activeTab === 'salvas' && (
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

      <Pagination currentPage={meta.currentPage} totalPages={meta.totalPages} />
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

export default function TrilhasPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-foreground/50">Carregando listagem...</div>}>
      <TrilhasPageContent />
    </Suspense>
  );
}
