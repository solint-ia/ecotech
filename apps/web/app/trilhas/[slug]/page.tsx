import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Route, Clock, Heart, Eye, ExternalLink } from 'lucide-react';
import { getImageUrl } from '../../../lib/image-url';
import TrailDetailTabs from '../../../components/trilhas/TrailDetailTabs';
import TrailActions from '../../../components/trilhas/TrailActions';
import { TrailGallery } from '../../../components/trilhas/TrailGallery';
import { CommunityGallery } from '../../../components/trilhas/CommunityGallery';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  FACIL: { label: 'Fácil', color: 'bg-[#eaf4ee] text-[#142f1f]' },
  MODERADA: { label: 'Moderada', color: 'bg-mustard-soft/90 text-white' },
  DIFICIL: { label: 'Difícil', color: 'bg-terracotta-soft/90 text-white' },
};

async function getTrail(slug: string) {
  try {
    const res = await fetch(`${API_URL}/trails/${slug}`, {
      next: { revalidate: 0 }, // Always fetch fresh data
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
      <div className="relative rounded-3xl overflow-hidden h-80 sm:h-[420px] bg-beige mb-6 shadow-sm">
        {trail.coverImage ? (
          <img
            src={getImageUrl(trail.coverImage)}
            alt={trail.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-forest/5">
            <span className="text-forest/20 text-5xl">🌿</span>
          </div>
        )}
        {/* Gradient overlay - covers bottom 40% */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
        
        {/* Info overlay */}
        <div className="absolute bottom-0 left-0 p-6 sm:p-8 w-full">
          <span className={`text-[11px] font-bold tracking-wider px-3 py-1 rounded-full uppercase ${difficulty.color} mb-3 inline-block shadow-sm`}>
            {difficulty.label}
          </span>
          <h1 className="text-white text-3xl sm:text-4xl font-extrabold drop-shadow-md leading-tight">{trail.title}</h1>
          {trail.city && (
            <p className="text-white/90 text-sm sm:text-base font-medium flex items-center gap-1.5 mt-2 drop-shadow-sm">
              <MapPin className="w-4 h-4" />
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
      <div className="flex flex-wrap gap-3 mb-8">
        {trail.biome && (
          <span className="inline-flex items-center gap-1.5 text-xs bg-sage text-forest font-semibold px-3.5 py-2 rounded-full border border-forest/10 shadow-sm">
            🌿 {trail.biome}
          </span>
        )}
        {trail.distanceKm != null && (
          <span className="inline-flex items-center gap-1.5 text-xs bg-white text-foreground/70 font-semibold px-3.5 py-2 rounded-full border border-border-custom shadow-sm">
            <Route className="w-3.5 h-3.5" />
            {trail.distanceKm} km
          </span>
        )}
        {trail.duration && (
          <span className="inline-flex items-center gap-1.5 text-xs bg-white text-foreground/70 font-semibold px-3.5 py-2 rounded-full border border-border-custom shadow-sm">
            <Clock className="w-3.5 h-3.5" />
            {trail.duration}
          </span>
        )}
        {trail.educationalPoints && (
          <span className="inline-flex items-center gap-1.5 text-xs bg-white text-foreground/70 font-semibold px-3.5 py-2 rounded-full border border-border-custom shadow-sm">
            📍 {trail.educationalPoints.length} pontos educativos
          </span>
        )}
      </div>

      {/* Tabs (Client Component) */}
      <TrailDetailTabs trail={trail} />

      {/* Official Gallery Section */}
      <TrailGallery trailId={trail.id} photos={trail.photos || []} />

      {/* Community Gallery Section */}
      <CommunityGallery trailId={trail.id} />
    </div>
  );
}
