'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Plus } from 'lucide-react';
import { useSession } from 'next-auth/react';

const TABS = [
  { id: 'sobre', label: 'Sobre' },
  { id: 'biodiversidade', label: 'Biodiversidade' },
  { id: 'pontos', label: 'Pontos' },
  { id: 'avisos', label: 'Avisos' },
];

interface TrailDetailTabsProps {
  trail: any;
}

export default function TrailDetailTabs({ trail }: TrailDetailTabsProps) {
  const [activeTab, setActiveTab] = useState('sobre');
  const { data: session } = useSession();
  const user = session?.user as any;

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
        {activeTab === 'sobre' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-primary mb-2">Sobre a Trilha</h2>
              {trail.shortDescription && (
                <p className="text-sm text-secondary font-medium mb-3 leading-relaxed">
                  {trail.shortDescription}
                </p>
              )}
              {trail.school && (
                <p className="text-sm text-foreground/70">
                  <span className="font-semibold text-foreground">Escola responsável:</span>{' '}
                  <Link href={`/escolas/${trail.school.id}`} className="text-secondary hover:underline">
                    {trail.school.name}
                  </Link>
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

        {activeTab === 'biodiversidade' && (
          <div>
            <h2 className="text-base font-bold text-primary mb-4">Biodiversidade</h2>
            {!trail.biodiversityItems || trail.biodiversityItems.length === 0 ? (
              <p className="text-sm text-foreground/60 text-center py-8">
                Nenhum item de biodiversidade cadastrado ainda.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {trail.biodiversityItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex gap-3 p-3 rounded-lg border border-border-custom hover:bg-beige/50 transition-colors"
                  >
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.popularName}
                        className="w-16 h-16 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          item.groupType === 'fauna'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {item.groupType}
                      </span>
                      <p className="text-sm font-semibold text-primary mt-0.5 truncate">
                        {item.popularName}
                      </p>
                      {item.scientificName && (
                        <p className="text-xs text-foreground/50 italic truncate">
                          {item.scientificName}
                        </p>
                      )}
                      {item.description && (
                        <p className="text-xs text-foreground/70 mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'pontos' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-primary">Pontos Educativos</h2>
              {(user?.role === 'ADMIN' || user?.role === 'SCHOOL_MANAGER') && (
                <Link
                  href={`/trilhas/${trail.slug}/pontos`}
                  id="btn-gerenciar-pontos"
                  className="inline-flex items-center gap-1.5 text-xs bg-primary text-white hover:bg-primary/90 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Gerenciar Pontos
                </Link>
              )}
            </div>
            {!trail.points || trail.points.length === 0 ? (
              <p className="text-sm text-foreground/60 text-center py-8">
                Nenhum ponto educativo cadastrado ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {trail.points.map((point: any, index: number) => (
                  <Link
                    key={point.id}
                    href={`/pontos/${point.slug}`}
                    id={`point-card-${point.slug}`}
                    className="flex gap-3 p-3 rounded-lg border border-border-custom hover:bg-beige/50 hover:border-secondary/30 transition-colors group"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {index + 1}
                    </div>
                    {point.mainImage && (
                      <img
                        src={point.mainImage}
                        alt={point.title}
                        className="w-14 h-14 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-primary group-hover:text-secondary transition-colors truncate">
                        {point.title}
                      </p>
                      <span className="text-[10px] uppercase font-bold tracking-wide text-secondary/70">
                        {point.type}
                      </span>
                      {point.shortDescription && (
                        <p className="text-xs text-foreground/70 mt-1 line-clamp-2">
                          {point.shortDescription}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

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
