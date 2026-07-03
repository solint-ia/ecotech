'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Plus, Download, QrCode, ChevronRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { getImageUrl } from '../../lib/image-url';

const TABS = [
  { id: 'sobre', label: 'Sobre' },
  { id: 'biodiversidade', label: 'Biodiversidade' },
  { id: 'pontos', label: 'Pontos' },
  { id: 'avisos', label: 'Avisos' },
];

const POINT_TYPE_LABELS: Record<string, string> = {
  FLORA: 'Flora',
  RIO: 'Rio',
  FAUNA: 'Fauna',
  ESPACO_CULTURAL: 'Espaço Cultural',
  AREA_VERDE: 'Área Verde',
  OUTRO: 'Outro',
};

interface TrailDetailTabsProps {
  trail: any;
}

export default function TrailDetailTabs({ trail }: TrailDetailTabsProps) {
  const [activeTab, setActiveTab] = useState('sobre');
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdminOrManager = user?.role === 'ADMIN' || (user?.role === 'SCHOOL_MANAGER' && user?.schoolId === trail.schoolId);

  const biodiversity: any[] = trail.biodiversity ?? trail.biodiversityItems ?? [];

  // Split-View States for Biodiversidade Tab
  const [activeBioFilter, setActiveBioFilter] = useState<'ALL' | 'FAUNA' | 'FLORA'>('ALL');
  const [selectedBioItem, setSelectedBioItem] = useState<any>(null);

  const filteredBioItems = biodiversity.filter(i => activeBioFilter === 'ALL' || i.groupType === activeBioFilter);

  useEffect(() => {
    if (activeTab === 'biodiversidade') {
      if (filteredBioItems.length === 0) {
        setSelectedBioItem(null);
      } else if (selectedBioItem && !filteredBioItems.find(i => i.id === selectedBioItem.id)) {
        setSelectedBioItem(null);
      }
    }
  }, [activeTab, activeBioFilter, biodiversity]);

  return (
    <div className="bg-white rounded-2xl border border-border-custom overflow-hidden shadow-sm">
      {/* Tab Nav Wrapper */}
      <div className="relative border-b border-border-custom bg-white">
        <div className="flex flex-nowrap overflow-x-auto gap-2 p-4 scrollbar-hide pr-8 sm:pr-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap px-4 py-2 sm:px-5 text-sm font-semibold rounded-full transition-all duration-300 shrink-0 ${
                activeTab === tab.id
                  ? 'bg-forest text-white shadow-md'
                  : 'bg-white text-foreground/60 border border-border-custom hover:border-forest/30 hover:text-forest'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* Scroll Hint (Mobile only) */}
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none flex items-center justify-end pr-2 sm:hidden">
          <ChevronRight className="w-4 h-4 text-foreground/40 animate-pulse" />
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* ── SOBRE ── */}
        {activeTab === 'sobre' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-primary mb-2">Sobre a Trilha</h2>
              {trail.shortDescription && (
                <p className="text-sm text-secondary font-medium mb-3 leading-relaxed">
                  {trail.shortDescription}
                </p>
              )}
              {trail.fullDescription && (
                <div className="mt-4 prose prose-sm max-w-none">
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                    {trail.fullDescription}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── BIODIVERSIDADE ── */}
        {activeTab === 'biodiversidade' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-primary">Biodiversidade</h2>
              {isAdminOrManager && (
                <Link
                  id="btn-gerenciar-biodiversidade"
                  href={`/trilhas/${trail.slug}/biodiversidade`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Gerenciar
                </Link>
              )}
            </div>

            {biodiversity.length === 0 ? (
              <p className="text-sm text-foreground/60 text-center py-8">
                Nenhum item de biodiversidade cadastrado ainda.
              </p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[600px] mb-8">
                {/* Left Column: Quick Selection List */}
                <div className="flex flex-col gap-4">
                  {/* Filters */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveBioFilter('FAUNA')}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${activeBioFilter === 'FAUNA' ? 'bg-[#EAF4EE] text-forest' : 'bg-[#FAFCFA] text-foreground/60 border border-black/5 hover:bg-beige'}`}
                    >
                      🦋 Fauna
                    </button>
                    <button
                      onClick={() => setActiveBioFilter('FLORA')}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${activeBioFilter === 'FLORA' ? 'bg-[#EAF4EE] text-forest' : 'bg-[#FAFCFA] text-foreground/60 border border-black/5 hover:bg-beige'}`}
                    >
                      🌿 Flora
                    </button>
                    <button
                      onClick={() => setActiveBioFilter('ALL')}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${activeBioFilter === 'ALL' ? 'bg-secondary text-white' : 'bg-[#FAFCFA] text-foreground/60 border border-black/5 hover:bg-beige'}`}
                    >
                      Todos
                    </button>
                  </div>

                  {/* Scrollable List */}
                  <div className="overflow-y-auto max-h-[500px] space-y-3 pr-2 scrollbar-thin scrollbar-thumb-black/10 scrollbar-track-transparent">
                    {filteredBioItems.length === 0 ? (
                      <div className="text-center py-10 text-foreground/50 text-sm bg-white rounded-xl border border-black/5">
                        Nenhum item encontrado.
                      </div>
                    ) : (
                      filteredBioItems.map((item) => {
                        const isSelected = selectedBioItem?.id === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => setSelectedBioItem(item)}
                            className={`flex items-center gap-4 p-3 rounded-xl shadow-sm cursor-pointer transition-all ${isSelected ? 'bg-[#EAF4EE] border border-emerald-700/30' : 'bg-white border border-transparent hover:bg-emerald-50/50'}`}
                          >
                            {item.image ? (
                              <img 
                                src={getImageUrl(item.image)} 
                                alt={item.popularName} 
                                className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-black/5" 
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-black/5 flex-shrink-0 flex items-center justify-center">
                                🌿
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-emerald-950 truncate">{item.popularName}</p>
                              {item.scientificName && (
                                <p className="text-xs italic text-gray-500 truncate">{item.scientificName}</p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Column: Immersive Detail Panel */}
                <div className="lg:col-span-2">
                  {!selectedBioItem ? (
                     <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-950/5 h-full flex items-center justify-center text-foreground/50 text-sm">
                       Selecione um item na lista para ver os detalhes.
                     </div>
                  ) : (
                     <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-950/5 flex flex-col h-full overflow-y-auto">
                        {/* Banner */}
                        <div className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden shadow-sm mb-6 flex-shrink-0 bg-black/5">
                          {selectedBioItem.image && (
                            <img 
                              src={getImageUrl(selectedBioItem.image)} 
                              alt={selectedBioItem.popularName} 
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>

                        {/* Identity Block */}
                        <div className="mb-6 flex items-start justify-between gap-4">
                          <div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-emerald-900">{selectedBioItem.popularName}</h2>
                            {selectedBioItem.scientificName && (
                              <p className="text-sm sm:text-base italic text-gray-500 mt-1">{selectedBioItem.scientificName}</p>
                            )}
                          </div>
                          <span className="px-3 py-1.5 bg-black/5 text-emerald-900 text-xs font-bold uppercase tracking-wider rounded-full whitespace-nowrap">
                            {selectedBioItem.groupType === 'FAUNA' ? '🦋 Fauna' : '🌿 Flora'}
                          </span>
                        </div>

                        {/* Content Blocks */}
                        <div className="space-y-6 flex-1">
                          <div>
                            <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wider mb-2">Descrição</h3>
                            <p className="text-foreground/80 leading-relaxed text-sm sm:text-base">{selectedBioItem.description}</p>
                          </div>

                          {selectedBioItem.environmentalImportance && (
                            <div>
                              <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-[#EAF4EE] flex items-center justify-center text-forest text-xs">🌱</span>
                                Importância Ambiental
                              </h3>
                              <p className="text-foreground/80 leading-relaxed text-sm sm:text-base bg-forest/5 p-4 rounded-xl border border-forest/10">{selectedBioItem.environmentalImportance}</p>
                            </div>
                          )}

                          {selectedBioItem.curiosities && (
                            <div className="bg-[#FAFCFA] p-4 rounded-xl border border-black/5">
                              <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wider mb-2">Curiosidades</h3>
                              <p className="text-foreground/80 leading-relaxed text-sm sm:text-base">{selectedBioItem.curiosities}</p>
                            </div>
                          )}
                        </div>
                     </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PONTOS DE INTERESSE (Roadmap) ── */}
        {activeTab === 'pontos' && (
          <div>
            {/* Header / Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 w-full">
              <h2 className="text-xl sm:text-2xl font-extrabold text-primary text-left">
                Pontos de Interesse
              </h2>
              {isAdminOrManager && (
                <Link
                  id="btn-gerenciar-pontos"
                  href={`/trilhas/${trail.slug}/pontos`}
                  className="inline-flex items-center justify-center w-full sm:w-auto gap-2 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl shadow-sm hover:bg-primary/90 transition-all active:scale-95 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Gerenciar Pontos
                </Link>
              )}
            </div>

            {!trail.educationalPoints || trail.educationalPoints.length === 0 ? (
              <p className="text-sm text-foreground/60 text-center py-8">
                Nenhum ponto educativo cadastrado ainda.
              </p>
            ) : (
              <div className="relative">
                {/* Stacked Cards Layout */}
                <div className="space-y-6">
                  {trail.educationalPoints.map((point: any, index: number) => (
                    <div key={point.id} className="w-full flex flex-col lg:flex-row bg-white border border-border-custom rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden p-4 lg:p-0">
                      
                      {/* MOBILE HEADER (Visible only on mobile/tablet) */}
                      <div className="flex lg:hidden items-center justify-between pb-3 mb-3 border-b border-border-custom">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-extrabold shadow-inner shrink-0">
                            {point.order ?? index + 1}
                          </div>
                          <span className="text-xs uppercase font-black tracking-widest text-secondary/90">
                            {POINT_TYPE_LABELS[point.type] ?? point.type}
                          </span>
                        </div>
                      </div>

                      {/* Image Section (Top with margin on Mobile, Full-height Left on Desktop) */}
                      {point.mainImage && (
                        <div className="w-full lg:w-2/5 xl:w-[35%] aspect-[4/3] lg:aspect-auto lg:h-auto lg:min-h-[260px] relative shrink-0 bg-beige rounded-xl lg:rounded-none overflow-hidden mb-4 lg:mb-0">
                          <img
                            src={getImageUrl(point.mainImage)}
                            alt={point.title}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Content Section (Right on Desktop, Bottom on Mobile) */}
                      <div className="flex flex-col flex-1 lg:p-6 lg:pl-8">
                        {/* DESKTOP HEADER (Visible only on desktop) */}
                        <div className="hidden lg:flex items-center justify-between pb-3 mb-4 border-b border-border-custom">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-extrabold shadow-inner shrink-0">
                              {point.order ?? index + 1}
                            </div>
                            <span className="text-xs uppercase font-black tracking-widest text-secondary/90">
                              {POINT_TYPE_LABELS[point.type] ?? point.type}
                            </span>
                          </div>
                        </div>

                        {/* Text Content */}
                        <div className="flex flex-col gap-2 flex-1">
                          <h3 className="text-lg sm:text-xl font-bold text-primary leading-snug whitespace-normal break-words">
                            {point.title}
                          </h3>
                          
                          {point.shortDescription && (
                            <p className="text-sm text-foreground/70 leading-relaxed whitespace-normal break-words">
                              {point.shortDescription}
                            </p>
                          )}
                        </div>

                        {/* Action Links */}
                        <div className="flex items-center justify-between mt-5 pt-3 border-t border-border-custom gap-3 flex-wrap">
                          <Link
                            href={`/pontos/${point.slug}`}
                            id={`point-link-${point.slug}`}
                            className="inline-flex items-center gap-1.5 text-sm text-forest font-bold hover:text-primary transition-colors py-1"
                          >
                            Ver ponto completo <ChevronRight className="w-4 h-4" />
                          </Link>
                          
                          {/* QR Code link */}
                          {point.qrCodes?.[0]?.qrImage && (
                            <a
                              href={getImageUrl(point.qrCodes[0].qrImage)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-secondary font-semibold hover:underline bg-secondary/10 px-3 py-1.5 rounded-full transition-colors"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              QR Code
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── AVISOS ── */}
        {activeTab === 'avisos' && (
          <div>
            <h2 className="text-base font-bold text-primary mb-4">Avisos de Segurança</h2>
            {!trail.safetyWarnings ? (
              <p className="text-sm text-foreground/60 text-center py-8">
                Nenhum aviso de segurança registrado.
              </p>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <ul className="space-y-2">
                  {trail.safetyWarnings.split('\n').filter(Boolean).map((tip: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-amber-800 leading-relaxed">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
