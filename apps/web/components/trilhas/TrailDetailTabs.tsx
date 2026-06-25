'use client';

import { useState } from 'react';
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
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'SCHOOL_MANAGER';

  const biodiversity: any[] = trail.biodiversity ?? trail.biodiversityItems ?? [];
  const fauna = biodiversity.filter((i: any) => i.groupType?.toLowerCase() === 'fauna');
  const flora = biodiversity.filter((i: any) => i.groupType?.toLowerCase() === 'flora');

  return (
    <div className="bg-white rounded-xl border border-border-custom overflow-hidden">
      {/* Tab Nav */}
      <div className="flex border-b border-border-custom">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-foreground/60 hover:text-primary hover:bg-beige'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-5">
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
              <div className="space-y-8">
                {/* FAUNA */}
                {fauna.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider">
                        🦋 Fauna
                      </span>
                      <span className="text-xs text-foreground/40">{fauna.length} espécies</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {fauna.map((item: any) => (
                        <BiodiversityCard key={item.id} item={item} color="amber" />
                      ))}
                    </div>
                  </div>
                )}

                {/* FLORA */}
                {flora.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-800 text-xs font-bold uppercase tracking-wider">
                        🌿 Flora
                      </span>
                      <span className="text-xs text-foreground/40">{flora.length} espécies</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {flora.map((item: any) => (
                        <BiodiversityCard key={item.id} item={item} color="green" />
                      ))}
                    </div>
                  </div>
                )}

                {/* Items with other groupType */}
                {biodiversity.filter(
                  (i: any) => i.groupType?.toLowerCase() !== 'fauna' && i.groupType?.toLowerCase() !== 'flora'
                ).length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-bold uppercase tracking-wider">
                        🔎 Outros
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {biodiversity
                        .filter(
                          (i: any) =>
                            i.groupType?.toLowerCase() !== 'fauna' &&
                            i.groupType?.toLowerCase() !== 'flora',
                        )
                        .map((item: any) => (
                          <BiodiversityCard key={item.id} item={item} color="gray" />
                        ))}
                    </div>
                  </div>
                )}
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

// ── BiodiversityCard sub-component ──
function BiodiversityCard({
  item,
  color,
}: {
  item: any;
  color: 'amber' | 'green' | 'gray';
}) {
  const [expanded, setExpanded] = useState(false);

  const colorMap = {
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-green-100 text-green-700',
    gray: 'bg-secondary/10 text-secondary',
  };

  return (
    <div className="rounded-xl border border-border-custom overflow-hidden hover:shadow-sm transition-shadow">
      {/* Image */}
      {item.image && (
        <img
          src={getImageUrl(item.image)}
          alt={item.popularName}
          className="w-full h-32 object-cover"
        />
      )}

      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary truncate">{item.popularName}</p>
            {item.scientificName && (
              <p className="text-xs text-foreground/50 italic">{item.scientificName}</p>
            )}
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${colorMap[color]}`}>
            {item.groupType}
          </span>
        </div>

        {item.description && (
          <p className="text-xs text-foreground/70 mt-1 line-clamp-2">{item.description}</p>
        )}

        {/* Expandable extra info */}
        {(item.curiosities || item.environmentalImportance) && (
          <>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-secondary font-medium mt-2 hover:underline"
            >
              {expanded ? 'Mostrar menos ▲' : 'Saiba mais ▼'}
            </button>
            {expanded && (
              <div className="mt-2 space-y-2 border-t border-border-custom pt-2">
                {item.curiosities && (
                  <div>
                    <p className="text-[10px] font-bold uppercase text-foreground/40 mb-0.5">Curiosidades</p>
                    <p className="text-xs text-foreground/70">{item.curiosities}</p>
                  </div>
                )}
                {item.environmentalImportance && (
                  <div>
                    <p className="text-[10px] font-bold uppercase text-foreground/40 mb-0.5">Importância Ambiental</p>
                    <p className="text-xs text-foreground/70">{item.environmentalImportance}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
