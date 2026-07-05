'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Store, MapPin, Search, Plus, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { PartnerCard, Partner } from '../../components/rede/PartnerCard';
import { StateCitySelect } from '@/components/shared/StateCitySelect';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const CATEGORIES = [
  'Todos',
  'Hospedagem',
  'Alimentação',
  'Comércio',
  'Guias',
  'Outros',
];

export default function RedePage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.role === 'ADMIN';

  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/partners?`;
      const params = new URLSearchParams();
      if (selectedCategory !== 'Todos') params.append('category', selectedCategory);
      if (filterState) params.append('state', filterState);
      if (filterCity) params.append('city', filterCity);

      const res = await fetch(url + params.toString());
      if (!res.ok) throw new Error('Falha ao carregar parceiros.');
      const data = await res.json();
      setPartners(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, filterState, filterCity]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col mb-4">
        <h1 className="w-full flex items-center gap-2 text-3xl font-bold text-primary mb-2">
          <Store className="w-8 h-8 text-secondary" />
          Rede de Parceiros
        </h1>
        <p className="text-sm md:text-base text-gray-600 mb-4">
          Apoie a economia local! Conheça os serviços, guias e comércios da nossa região.
        </p>
        
        {isAdmin && (
          <div className="w-full flex gap-3 mb-4">
            <Link
              href="/rede/gerenciar"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-primary border border-border-custom rounded-xl text-xs md:text-sm font-medium hover:bg-beige transition-colors shadow-sm"
            >
              Gerenciar Parceiros
            </Link>
            <Link
              href="/rede/criar"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-forest text-white rounded-xl text-xs md:text-sm font-medium hover:bg-forest/90 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Novo Parceiro
            </Link>
          </div>
        )}
      </div>

      {/* Search Bar and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex gap-2 w-full md:flex-1">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
            <input
              type="text"
              placeholder="Buscar parceiro..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-border-custom bg-white focus:ring-2 focus:ring-secondary focus:outline-none shadow-sm h-[50px]"
            />
          </div>
          <button
            onClick={() => setShowFiltersModal(true)}
            className="md:hidden flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-900/10 bg-white text-emerald-950 font-medium shadow-sm"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
          </button>
        </div>

        <div className="hidden md:block md:flex-1">
          <StateCitySelect
            selectedState={filterState}
            selectedCity={filterCity}
            onStateChange={setFilterState}
            onCityChange={setFilterCity}
            inline={true}
          />
        </div>

        {/* Categories Dropdown */}
        <div className="relative w-full md:w-56 shrink-0">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full pl-4 pr-10 py-3 rounded-xl border border-sage/50 focus:outline-none focus:ring-2 focus:ring-forest text-sm font-medium appearance-none cursor-pointer shadow-sm bg-sage text-forest"
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category === 'Todos' ? 'Todas as Categorias' : category}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-forest pointer-events-none" />
        </div>
      </div>

      {/* Partners Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl overflow-hidden border border-border-custom animate-pulse h-80">
              <div className="h-48 bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : partners.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-border-custom">
          <Store className="w-12 h-12 text-secondary/40 mb-4" />
          <p className="text-lg font-semibold text-primary">Nenhum parceiro encontrado</p>
          <p className="text-sm text-foreground/60 mt-1">
            Nenhum parceiro corresponde à sua busca ou categoria selecionada.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {partners.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map((partner) => (
            <PartnerCard key={partner.id} partner={partner} />
          ))}
        </div>
      )}

      {/* Mobile Filters Modal */}
      {showFiltersModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm md:hidden">
          <div className="bg-white w-full max-h-[85vh] rounded-t-2xl p-6 flex flex-col gap-6 overflow-y-auto animate-in slide-in-from-bottom-full duration-300">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-primary">Filtros de Localização</h2>
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
