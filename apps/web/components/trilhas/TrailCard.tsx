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
  likesCount: number;
  _count: { educationalPoints?: number; points?: number; likes?: number };
  viewsCount: number;
  status?: boolean;
}

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  FACIL: { label: 'Fácil', color: 'bg-green-500' },
  MODERADA: { label: 'Moderada', color: 'bg-yellow-500' },
  DIFICIL: { label: 'Difícil', color: 'bg-red-500' },
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
      className="group bg-white rounded-xl overflow-hidden border border-border-custom hover:shadow-md transition-shadow duration-200 block"
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
          className={`absolute top-3 left-3 text-white text-xs font-semibold px-2 py-0.5 rounded-full ${difficulty.color}`}
        >
          {difficulty.label}
        </span>
        {trail.status === false && (
          <span className="absolute top-3 right-3 bg-yellow-500 text-white text-xs font-bold px-2 py-0.5 rounded-md shadow-sm">
            RASCUNHO
          </span>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4">
        <h2 className="font-semibold text-primary text-sm mb-0.5 line-clamp-1 group-hover:text-secondary transition-colors">
          {trail.title}
        </h2>
        <p className="text-xs text-foreground/60 mb-1 flex items-center gap-1">
          <MapPin className="w-3 h-3 shrink-0" />
          {trail.city}
        </p>
        {trail.biome && (
          <p className="text-xs text-secondary font-medium mb-2">{trail.biome}</p>
        )}
        {trail.shortDescription && (
          <p className="text-xs text-foreground/70 line-clamp-2 mb-3">
            {trail.shortDescription}
          </p>
        )}
        <hr className="border-border-custom mb-3" />
        <div className="flex items-center gap-3 text-xs text-foreground/60">
          {trail.biome && (
            <span className="flex items-center gap-1">
              <Leaf className="w-3 h-3" />
              {trail.biome}
            </span>
          )}
          {trail.distanceKm != null && (
            <span className="flex items-center gap-1">
              <Route className="w-3 h-3" />
              {trail.distanceKm} km
            </span>
          )}
          {trail.duration && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {trail.duration}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-foreground/50 mt-2">
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            {trail.likesCount ?? trail._count?.likes ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {trail.viewsCount ?? 0}
          </span>
          <span className="flex items-center gap-1 ml-auto">
            {educationalPointsCount} pontos
          </span>
        </div>
      </div>
    </Link>
  );
}
