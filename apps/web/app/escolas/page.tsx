'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Search, MapPin, Loader2, Library, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { StateCitySelect } from '@/components/shared/StateCitySelect';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface School {
  id: string;
  name: string;
  city: string;
  location: string;
  description: string;
  coverImage?: string;
  _count: {
    trails: number;
    followers: number;
  };
}

export default function SchoolsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const accessToken = (session?.user as any)?.accessToken;

  const [schools, setSchools] = useState<School[]>([]);
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchSchools = useCallback(async (searchQuery = '', stateQuery = '', cityQuery = '') => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const url = new URL(`${API_URL}/schools`);
      if (searchQuery) url.searchParams.append('search', searchQuery);
      if (stateQuery) url.searchParams.append('state', stateQuery);
      if (cityQuery) url.searchParams.append('city', cityQuery);
      
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSchools(data);
      }
    } catch (error) {
      console.error('Erro ao buscar escolas:', error);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchSchools();
    }
  }, [status, fetchSchools, router]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (status === 'authenticated') fetchSchools(search, filterState, filterCity);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, filterState, filterCity, fetchSchools, status]);

  if (status === 'loading' || (loading && schools.length === 0)) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 bg-white p-6 rounded-2xl border border-border-custom shadow-sm">
        <div className="md:w-1/3">
          <h1 className="text-2xl font-bold text-primary mb-2">Escolas Parceiras</h1>
          <p className="text-sm text-foreground/70 mb-4">
            Descubra as escolas que estão transformando a educação ambiental.
          </p>
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-foreground/40" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-4 py-2.5 border border-border-custom rounded-full bg-white text-foreground text-sm font-medium focus:bg-white focus:ring-2 focus:ring-forest/20 focus:border-forest transition-all outline-none"
              placeholder="Buscar por escola..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
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

      {/* Grid de Escolas */}
      {schools.length === 0 && !loading ? (
        <div className="bg-white p-10 rounded-2xl border border-border-custom text-center">
          <p className="text-foreground/60">Nenhuma escola encontrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schools.map((school) => (
            <Link key={school.id} href={`/escolas/${school.id}`} className="block group">
              <article className="bg-white rounded-2xl border border-border-custom shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 group-hover:-translate-y-1 flex flex-col h-full">
                
                {/* Cover Image */}
                <div className="w-full h-44 bg-beige relative overflow-hidden rounded-t-2xl">
                  {school.coverImage ? (
                    <img 
                      src={school.coverImage.startsWith('http') ? school.coverImage : `${API_URL}${school.coverImage}`}
                      alt={school.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full bg-forest/5 flex items-center justify-center">
                      <span className="text-forest/30 text-5xl font-bold">
                        {school.name.substring(0, 1).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-lg font-bold text-forest line-clamp-1 mb-1 transition-colors">
                    {school.name}
                  </h3>
                  
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-foreground/50 mb-3">
                    <MapPin className="w-3.5 h-3.5 opacity-70" />
                    <span className="truncate">{school.city} • {school.location}</span>
                  </div>
                  
                  <p className="text-sm text-foreground/70 line-clamp-2 mb-4 flex-1">
                    {school.description || 'Nenhuma descrição fornecida.'}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-6 pt-4 mt-auto">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold text-foreground/40 mb-0.5">Trilhas</span>
                      <span className="text-sm font-bold text-forest/80">{school._count.trails}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold text-foreground/40 mb-0.5">Seguidores</span>
                      <span className="text-sm font-bold text-forest/80">{school._count.followers}</span>
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
