'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Search, MapPin, Loader2, Library, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
  const [loading, setLoading] = useState(true);

  const fetchSchools = useCallback(async (searchQuery = '') => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const url = new URL(`${API_URL}/schools`);
      if (searchQuery) url.searchParams.append('search', searchQuery);
      
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
      if (status === 'authenticated') fetchSchools(search);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, fetchSchools, status]);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-border-custom shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-primary">Escolas Parceiras</h1>
          <p className="text-sm text-foreground/70">
            Descubra as escolas que estão transformando a educação ambiental.
          </p>
        </div>
        
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-foreground/40" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-border-custom rounded-xl bg-beige/30 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
                <div className="w-full h-40 bg-gray-200 relative overflow-hidden">
                  {school.coverImage ? (
                    <img 
                      src={school.coverImage.startsWith('http') ? school.coverImage : `${API_URL}${school.coverImage}`}
                      alt={school.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      <span className="text-white text-4xl font-bold opacity-80">
                        {school.name.split(' ').length > 1 
                          ? (school.name.split(' ')[0][0] + school.name.split(' ')[school.name.split(' ').length - 1][0]).toUpperCase()
                          : school.name.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-lg font-bold text-primary line-clamp-1 mb-1 group-hover:text-secondary transition-colors">
                    {school.name}
                  </h3>
                  
                  <div className="flex items-center gap-1 text-xs font-medium text-foreground/60 mb-3">
                    <MapPin className="w-3.5 h-3.5 text-secondary" />
                    <span className="truncate">{school.city} • {school.location}</span>
                  </div>
                  
                  <p className="text-sm text-foreground/70 line-clamp-2 mb-4 flex-1">
                    {school.description || 'Nenhuma descrição fornecida.'}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 pt-4 border-t border-border-custom mt-auto">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-foreground/50">Trilhas</span>
                      <span className="text-sm font-semibold text-primary">{school._count.trails}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-foreground/50">Seguidores</span>
                      <span className="text-sm font-semibold text-primary">{school._count.followers}</span>
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
