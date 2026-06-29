'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Store, MapPin, Search, Plus } from 'lucide-react';
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
      setPartners(data);
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
      <div className="flex items-start justify-between mb-8">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold text-primary mb-2 flex items-center gap-2">
            <Store className="w-8 h-8 text-secondary" />
            Rede de Parceiros
          </h1>
          <p className="text-base text-foreground/70">
            Apoie a economia local! Conheça os serviços, guias e comércios da nossa região.
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-3">
            <Link
              href="/rede/gerenciar"
              className="flex items-center gap-2 px-4 py-2 bg-white text-primary border border-border-custom rounded-lg text-sm font-semibold hover:bg-beige transition-colors shadow-sm whitespace-nowrap"
            >
              Gerenciar Parceiros
            </Link>
            <Link
              href="/rede/criar"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Novo Parceiro
            </Link>
          </div>
        )}
      </div>

      {/* Search Bar and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative md:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
          <input
            type="text"
            placeholder="Buscar parceiro por nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border-custom bg-white focus:ring-2 focus:ring-secondary focus:outline-none shadow-sm h-[50px]"
          />
        </div>
        <div className="md:w-2/3">
          <StateCitySelect
            selectedState={filterState}
            selectedCity={filterCity}
            onStateChange={setFilterState}
            onCityChange={setFilterCity}
            inline={true}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex overflow-x-auto pb-4 mb-6 gap-2 snap-x scrollbar-hide">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap snap-start transition-colors ${selectedCategory === category
              ? 'bg-secondary text-white shadow-sm'
              : 'bg-beige text-primary hover:bg-beige/80 border border-border-custom'
              }`}
          >
            {category}
          </button>
        ))}
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
    </div>
  );
}
