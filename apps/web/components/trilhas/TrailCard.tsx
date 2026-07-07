import Link from 'next/link';
import { MapPin, Clock, Route, Heart, Eye, Leaf } from 'lucide-react';
import { getImageUrl } from '../../lib/image-url';

export interface Trail {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  city: string;
  coverImage: string | null;
  biome: string;
  distanceKm: number | null;
  duration: string | null;
  difficulty: string;
  school?: { id: string; name: string };
  createdBy?: { id: string; name: string };
  likesCount: number;
  _count: { educationalPoints?: number; points?: number; likes?: number };
  viewsCount: number;
  status?: boolean;
  approvalStatus?: 'PENDENTE' | 'APROVADO' | 'REPROVADO';
}

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  FACIL: { label: 'Fácil', color: 'bg-emerald-600 text-white shadow-sm' }, 
  MODERADA: { label: 'Moderada', color: 'bg-amber-500 text-white shadow-sm' },
  DIFICIL: { label: 'Difícil', color: 'bg-red-600 text-white shadow-sm' },
};

interface TrailCardProps {
  trail: Trail;
}

export default function TrailCard({ trail }: TrailCardProps) {
  const difficulty = DIFFICULTY_LABELS[trail.difficulty] || { label: trail.difficulty, color: 'bg-gray-500' };
  const educationalPointsCount = trail._count?.educationalPoints ?? trail._count?.points ?? 0;

  return (
    <Link
      href={`/trilhas/${trail.slug}`}
      id={`trail-card-${trail.slug}`}
      className="group bg-white rounded-2xl overflow-hidden border border-border-custom hover:-translate-y-1 hover:shadow-xl hover:shadow-forest/5 transition-all duration-300 block"
    >
      {/* Cover Image */}
      <div className="relative h-48 overflow-hidden bg-beige">
        {trail.coverImage ? (
          <img
            src={getImageUrl(trail.coverImage)}
            alt={trail.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Leaf className="w-12 h-12 text-secondary/30" />
          </div>
        )}
        <span
          className={`absolute top-3 left-3 text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full uppercase ${difficulty.color}`}
        >
          {difficulty.label}
        </span>
        {trail.approvalStatus === 'PENDENTE' ? (
          <span className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-md shadow-sm">
            EM ANÁLISE
          </span>
        ) : trail.approvalStatus === 'REPROVADO' ? (
          <span className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-md shadow-sm">
            REPROVADO
          </span>
        ) : trail.status === false ? (
          <span className="absolute top-3 right-3 bg-yellow-500 text-white text-xs font-bold px-2 py-0.5 rounded-md shadow-sm">
            RASCUNHO
          </span>
        ) : null}
      </div>

      {/* Card Content */}
      <div className="p-5">
        <h2 className="font-bold text-foreground text-lg mb-1 line-clamp-1 group-hover:text-forest transition-colors">
          {trail.title}
        </h2>
        <div className="flex items-center gap-1.5 text-xs text-foreground/50 mb-3">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{trail.city}</span>
          {trail.biome && (
            <>
              <span className="mx-1">•</span>
              <span className="truncate">{trail.biome}</span>
            </>
          )}
        </div>
        
        {trail.shortDescription && (
          <p className="text-sm text-foreground/60 line-clamp-2 mb-4 leading-relaxed">
            {trail.shortDescription}
          </p>
        )}
        
        <hr className="border-border-custom/50 mb-4" />
        
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-foreground/40 font-medium">
          {trail.distanceKm != null && (
            <span className="flex items-center gap-1.5">
              <Route className="w-3.5 h-3.5" />
              {trail.distanceKm} km
            </span>
          )}
          {trail.duration && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {trail.duration}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5" />
            {trail.likesCount ?? trail._count?.likes ?? 0}
          </span>
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            {trail.viewsCount ?? 0}
          </span>
          
          <span className="flex items-center gap-1 ml-auto text-forest font-semibold bg-sage px-2 py-0.5 rounded-md">
            {educationalPointsCount ?? trail._count?.educationalPoints ?? 0} pts
          </span>
        </div>
      </div>
    </Link>
  );
}
