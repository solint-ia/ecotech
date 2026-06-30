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
      {/* Tab Nav */}
      <div className="flex flex-nowrap overflow-x-auto gap-2 p-4 border-b border-border-custom bg-white scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-5 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-forest text-white shadow-md'
                : 'bg-white text-foreground/60 border border-border-custom hover:border-forest/30 hover:text-forest'
            }`}
          >
            {tab.label}
          </button>
        ))}
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
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-primary">Pontos de Interesse</h2>
              {isAdminOrManager && (
                <Link
                  id="btn-gerenciar-pontos"
                  href={`/trilhas/${trail.slug}/pontos`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
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
                {/* Vertical line */}
                <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-primary/30 via-secondary/20 to-transparent" />

                <div className="space-y-4">
                  {trail.educationalPoints.map((point: any, index: number) => (
                    <div key={point.id} className="relative flex gap-4 group">
                      {/* Step indicator */}
                      <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shadow-md group-hover:bg-secondary transition-colors">
                        {point.order ?? index + 1}
                      </div>

                      {/* Card */}
                      <div className="flex-1 bg-white border border-border-custom rounded-xl p-3 hover:border-secondary/40 hover:shadow-sm transition-all">
                        <div className="flex gap-3">
                          {/* Thumbnail */}
                          {point.mainImage && (
                            <img
                              src={getImageUrl(point.mainImage)}
                              alt={point.title}
                              className="w-14 h-14 rounded-lg object-cover shrink-0"
                            />
                          )}
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-primary truncate">
                                  {point.title}
                                </p>
                                <span className="text-[10px] uppercase font-bold tracking-wide text-secondary/70">
                                  {POINT_TYPE_LABELS[point.type] ?? point.type}
                                </span>
                              </div>
                            </div>
                            {point.shortDescription && (
                              <p className="text-xs text-foreground/70 mt-1 line-clamp-2">
                                {point.shortDescription}
                              </p>
                            )}

                            {/* Actions row */}
                            <div className="flex items-center gap-2 mt-2">
                              <Link
                                href={`/pontos/${point.slug}`}
                                id={`point-link-${point.slug}`}
                                className="inline-flex items-center gap-1 text-xs text-secondary font-medium hover:underline"
                              >
                                Ver ponto completo <ChevronRight className="w-3 h-3" />
                              </Link>
                              {/* QR Code link */}
                              {point.qrCodes?.[0]?.qrImage && (
                                <a
                                  href={point.qrCodes[0].qrImage}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  id={`qr-link-${point.slug}`}
                                  title="QR Code do ponto"
                                  className="inline-flex items-center gap-1 text-xs text-foreground/50 hover:text-primary transition-colors"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                  QR Code
                                </a>
                              )}
                            </div>
                          </div>
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
                <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-line">
                  {trail.safetyWarnings}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
