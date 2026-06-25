import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Route, Clock, Heart, Eye, ExternalLink } from 'lucide-react';
import TrailDetailTabs from '../../../components/trilhas/TrailDetailTabs';
import TrailActions from '../../../components/trilhas/TrailActions';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  FACIL: { label: 'Fácil', color: 'bg-green-500' },
  MODERADA: { label: 'Moderada', color: 'bg-yellow-500' },
  DIFICIL: { label: 'Difícil', color: 'bg-red-500' },
};

async function getTrail(slug: string) {
  try {
    const res = await fetch(`${API_URL}/trails/${slug}`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trail = await getTrail(slug);
  if (!trail) return { title: 'Trilha não encontrada — EcoTech' };
  return {
    title: `${trail.title} — EcoTech`,
    description: trail.shortDescription || trail.fullDescription,
  };
}

export default async function TrailDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trail = await getTrail(slug);

  if (!trail) notFound();

  const difficulty = DIFFICULTY_LABELS[trail.difficulty] || { label: trail.difficulty, color: 'bg-gray-500' };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Link */}
      <Link
        href="/trilhas"
        className="inline-flex items-center gap-1.5 text-sm text-primary/70 hover:text-primary transition-colors mb-4 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Link>

      {/* Hero Image */}
      <div className="relative rounded-2xl overflow-hidden h-72 sm:h-96 bg-beige mb-6">
        {trail.coverImage ? (
          <img
            src={trail.coverImage}
            alt={trail.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary/10">
            <span className="text-secondary/40 text-4xl">🌿</span>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {/* Info overlay */}
        <div className="absolute bottom-0 left-0 p-5">
          <span className={`text-white text-xs font-bold px-2.5 py-1 rounded-full ${difficulty.color} mb-2 inline-block`}>
            {difficulty.label}
          </span>
          <h1 className="text-white text-2xl sm:text-3xl font-bold drop-shadow">{trail.title}</h1>
          {trail.city && (
            <p className="text-white/80 text-sm flex items-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5" />
              {trail.city}
            </p>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white rounded-xl border border-border-custom px-4 py-3">
        <TrailActions trail={trail} />
        <div className="flex items-center gap-1.5 text-xs text-foreground/50">
          <Eye className="w-4 h-4" />
          {trail.viewsCount ?? 0} visualizações
        </div>
      </div>

      {/* Trail Meta (biome, distance, duration, points count) */}
      <div className="flex flex-wrap gap-2 mb-6">
        {trail.biome && (
          <span className="inline-flex items-center gap-1.5 text-xs bg-secondary/10 text-secondary font-medium px-3 py-1.5 rounded-full">
            🌿 {trail.biome}
          </span>
        )}
        {trail.distanceKm != null && (
          <span className="inline-flex items-center gap-1.5 text-xs bg-beige text-foreground/70 font-medium px-3 py-1.5 rounded-full">
            <Route className="w-3.5 h-3.5" />
            {trail.distanceKm} km
          </span>
        )}
        {trail.duration && (
          <span className="inline-flex items-center gap-1.5 text-xs bg-beige text-foreground/70 font-medium px-3 py-1.5 rounded-full">
            <Clock className="w-3.5 h-3.5" />
            {trail.duration}
          </span>
        )}
        {trail.educationalPoints && (
          <span className="inline-flex items-center gap-1.5 text-xs bg-beige text-foreground/70 font-medium px-3 py-1.5 rounded-full">
            📍 {trail.educationalPoints.length} pontos educativos
          </span>
        )}
      </div>

      {/* Tabs (Client Component) */}
      <TrailDetailTabs trail={trail} />
    </div>
  );
}
