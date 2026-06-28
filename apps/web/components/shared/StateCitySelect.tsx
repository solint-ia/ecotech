'use client';

import { useState, useEffect } from 'react';
import { MapPin, Building } from 'lucide-react';

interface StateCitySelectProps {
  selectedState: string;
  selectedCity: string;
  onStateChange: (state: string) => void;
  onCityChange: (city: string) => void;
  className?: string;
  inline?: boolean;
}

interface UF {
  id: number;
  sigla: string;
  nome: string;
}

interface City {
  nome: string;
  codigo_ibge: string;
}

export function StateCitySelect({
  selectedState,
  selectedCity,
  onStateChange,
  onCityChange,
  className = '',
  inline = false,
}: StateCitySelectProps) {
  const [states, setStates] = useState<UF[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Fetch States on mount
  useEffect(() => {
    async function fetchStates() {
      setLoadingStates(true);
      try {
        const res = await fetch('https://brasilapi.com.br/api/ibge/uf/v1');
        if (res.ok) {
          const data: UF[] = await res.json();
          // Sort by name
          data.sort((a, b) => a.nome.localeCompare(b.nome));
          setStates(data);
        }
      } catch (err) {
        console.error('Failed to load states:', err);
      } finally {
        setLoadingStates(false);
      }
    }
    fetchStates();
  }, []);

  // Fetch Cities when state changes
  useEffect(() => {
    async function fetchCities() {
      if (!selectedState) {
        setCities([]);
        return;
      }
      setLoadingCities(true);
      try {
        const res = await fetch(`https://brasilapi.com.br/api/ibge/municipios/v1/${selectedState}`);
        if (res.ok) {
          const data: City[] = await res.json();
          data.sort((a, b) => a.nome.localeCompare(b.nome));
          setCities(data);
        }
      } catch (err) {
        console.error('Failed to load cities:', err);
      } finally {
        setLoadingCities(false);
      }
    }
    fetchCities();
  }, [selectedState]);

  const containerClass = inline
    ? `flex flex-col sm:flex-row gap-4 ${className}`
    : `space-y-4 ${className}`;

  return (
    <div className={containerClass}>
      <div className="flex-1 space-y-1.5 relative">
        <label className="text-xs font-semibold text-primary/80 uppercase tracking-wider ml-1">
          Estado
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <MapPin className="h-5 w-5 text-primary/40" />
          </div>
          <select
            value={selectedState}
            onChange={(e) => {
              onStateChange(e.target.value);
              onCityChange(''); // Reset city when state changes
            }}
            disabled={loadingStates}
            className="w-full pl-11 pr-4 py-3.5 bg-white border border-border-custom rounded-xl text-primary font-medium focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all outline-none appearance-none disabled:opacity-50"
          >
            <option value="">{loadingStates ? 'Carregando...' : 'Selecione o Estado'}</option>
            {states.map((uf) => (
              <option key={uf.id} value={uf.sigla}>
                {uf.nome} ({uf.sigla})
              </option>
            ))}
          </select>
          {/* Custom Dropdown Arrow */}
          <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
            <svg className="w-4 h-4 text-primary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-1.5 relative">
        <label className="text-xs font-semibold text-primary/80 uppercase tracking-wider ml-1">
          Município
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Building className="h-5 w-5 text-primary/40" />
          </div>
          <select
            value={selectedCity}
            onChange={(e) => onCityChange(e.target.value)}
            disabled={!selectedState || loadingCities}
            className="w-full pl-11 pr-4 py-3.5 bg-white border border-border-custom rounded-xl text-primary font-medium focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all outline-none appearance-none disabled:opacity-50"
          >
            <option value="">
              {!selectedState ? 'Selecione um Estado primeiro' : loadingCities ? 'Carregando...' : 'Selecione a Cidade'}
            </option>
            {cities.map((city) => (
              <option key={city.codigo_ibge} value={city.nome}>
                {city.nome}
              </option>
            ))}
          </select>
           {/* Custom Dropdown Arrow */}
           <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
            <svg className="w-4 h-4 text-primary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
      </div>
    </div>
  );
}
