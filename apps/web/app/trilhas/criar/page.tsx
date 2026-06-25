'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface School {
  id: string;
  name: string;
  city: string;
}

export default function CriarTrilhaPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user as any;

  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [biome, setBiome] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [duration, setDuration] = useState('');
  const [difficulty, setDifficulty] = useState('FACIL');
  const [coverImage, setCoverImage] = useState('');
  const [wikilocUrl, setWikilocUrl] = useState('');
  const [safetyWarnings, setSafetyWarnings] = useState('');
  const [publishNow, setPublishNow] = useState(false);

  // Redirect if not authorized
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && user?.role !== 'ADMIN' && user?.role !== 'SCHOOL_MANAGER') {
      router.push('/trilhas');
    }
  }, [status, user, router]);

  // Pre-fill schoolId for SCHOOL_MANAGER
  useEffect(() => {
    if (user?.role === 'SCHOOL_MANAGER' && user?.schoolId) {
      setSchoolId(user.schoolId);
    }
  }, [user]);

  // Fetch schools for ADMIN
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetch(`${API_URL}/schools`)
        .then((r) => r.json())
        .then(setSchools)
        .catch(() => {});
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload: any = {
        title,
        city,
        schoolId,
        difficulty,
        status: publishNow,
      };

      if (shortDescription) payload.shortDescription = shortDescription;
      if (fullDescription) payload.fullDescription = fullDescription;
      if (biome) payload.biome = biome;
      if (distanceKm) payload.distanceKm = parseFloat(distanceKm);
      if (duration) payload.duration = duration;
      if (coverImage) payload.coverImage = coverImage;
      if (wikilocUrl) payload.wikilocUrl = wikilocUrl;
      if (safetyWarnings) payload.safetyWarnings = safetyWarnings;

      const res = await fetch(`${API_URL}/trails`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(user?.accessToken ? { Authorization: `Bearer ${user.accessToken}` } : {})
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
        throw new Error(msg || 'Erro ao criar trilha.');
      }

      const trail = await res.json();
      router.push(`/trilhas/${trail.slug}`);
    } catch (err: any) {
      setError(err.message || 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-foreground/60 text-sm">
        Verificando permissões...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/trilhas"
          className="text-primary/70 hover:text-primary transition-colors"
          id="btn-back-criar"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-primary">Nova Trilha</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 mb-5">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-border-custom p-6 space-y-5">
        {/* Nome + Município */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="trail-title" className="block text-sm font-medium mb-1.5 text-foreground">
              Nome *
            </label>
            <input
              id="trail-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
              className="w-full px-4 py-2.5 rounded-xl border border-border-custom bg-background focus:outline-none focus:ring-2 focus:ring-secondary text-sm transition-all"
            />
          </div>
          <div>
            <label htmlFor="trail-city" className="block text-sm font-medium mb-1.5 text-foreground">
              Município *
            </label>
            <input
              id="trail-city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-border-custom bg-background focus:outline-none focus:ring-2 focus:ring-secondary text-sm transition-all"
            />
          </div>
        </div>

        {/* Descrição curta */}
        <div>
          <label htmlFor="trail-short-desc" className="block text-sm font-medium mb-1.5 text-foreground">
            Descrição curta
          </label>
          <input
            id="trail-short-desc"
            type="text"
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            maxLength={200}
            placeholder="Resumo para o card da trilha"
            className="w-full px-4 py-2.5 rounded-xl border border-border-custom bg-background focus:outline-none focus:ring-2 focus:ring-secondary text-sm transition-all"
          />
        </div>

        {/* Descrição completa */}
        <div>
          <label htmlFor="trail-full-desc" className="block text-sm font-medium mb-1.5 text-foreground">
            Descrição completa
          </label>
          <textarea
            id="trail-full-desc"
            rows={4}
            value={fullDescription}
            onChange={(e) => setFullDescription(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-border-custom bg-background focus:outline-none focus:ring-2 focus:ring-secondary text-sm transition-all resize-y"
          />
        </div>

        {/* Escola + Bioma */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="trail-school" className="block text-sm font-medium mb-1.5 text-foreground">
              Escola *
            </label>
            {user?.role === 'ADMIN' ? (
              <select
                id="trail-school"
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-border-custom bg-background focus:outline-none focus:ring-2 focus:ring-secondary text-sm appearance-none"
              >
                <option value="">Selecione...</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="trail-school"
                type="text"
                value={user?.schoolId || ''}
                disabled
                className="w-full px-4 py-2.5 rounded-xl border border-border-custom bg-gray-50 text-sm text-foreground/50"
              />
            )}
          </div>
          <div>
            <label htmlFor="trail-biome" className="block text-sm font-medium mb-1.5 text-foreground">
              Bioma
            </label>
            <input
              id="trail-biome"
              type="text"
              value={biome}
              onChange={(e) => setBiome(e.target.value)}
              placeholder="Mata Atlântica"
              className="w-full px-4 py-2.5 rounded-xl border border-border-custom bg-background focus:outline-none focus:ring-2 focus:ring-secondary text-sm transition-all"
            />
          </div>
        </div>

        {/* Extensão + Duração + Dificuldade */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="trail-distance" className="block text-sm font-medium mb-1.5 text-foreground">
              Extensão (km)
            </label>
            <input
              id="trail-distance"
              type="number"
              min="0"
              step="0.1"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border-custom bg-background focus:outline-none focus:ring-2 focus:ring-secondary text-sm transition-all"
            />
          </div>
          <div>
            <label htmlFor="trail-duration" className="block text-sm font-medium mb-1.5 text-foreground">
              Duração
            </label>
            <input
              id="trail-duration"
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="2h30"
              className="w-full px-4 py-2.5 rounded-xl border border-border-custom bg-background focus:outline-none focus:ring-2 focus:ring-secondary text-sm transition-all"
            />
          </div>
          <div>
            <label htmlFor="trail-difficulty" className="block text-sm font-medium mb-1.5 text-foreground">
              Dificuldade
            </label>
            <select
              id="trail-difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border-custom bg-background focus:outline-none focus:ring-2 focus:ring-secondary text-sm appearance-none"
            >
              <option value="FACIL">Fácil</option>
              <option value="MODERADA">Moderada</option>
              <option value="DIFICIL">Difícil</option>
            </select>
          </div>
        </div>

        {/* Imagem de capa */}
        <div>
          <label htmlFor="trail-cover" className="block text-sm font-medium mb-1.5 text-foreground">
            Imagem de capa (URL)
          </label>
          <input
            id="trail-cover"
            type="url"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-border-custom bg-background focus:outline-none focus:ring-2 focus:ring-secondary text-sm transition-all"
          />
        </div>

        {/* Link Wikiloc */}
        <div>
          <label htmlFor="trail-wikiloc" className="block text-sm font-medium mb-1.5 text-foreground">
            Link Wikiloc
          </label>
          <input
            id="trail-wikiloc"
            type="url"
            value={wikilocUrl}
            onChange={(e) => setWikilocUrl(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-border-custom bg-background focus:outline-none focus:ring-2 focus:ring-secondary text-sm transition-all"
          />
        </div>

        {/* Avisos de segurança */}
        <div>
          <label htmlFor="trail-safety" className="block text-sm font-medium mb-1.5 text-foreground">
            Avisos de segurança
          </label>
          <textarea
            id="trail-safety"
            rows={3}
            value={safetyWarnings}
            onChange={(e) => setSafetyWarnings(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-border-custom bg-background focus:outline-none focus:ring-2 focus:ring-secondary text-sm transition-all resize-y"
          />
        </div>

        {/* Publicar */}
        <div className="flex items-center gap-2">
          <input
            id="trail-publish"
            type="checkbox"
            checked={publishNow}
            onChange={(e) => setPublishNow(e.target.checked)}
            className="rounded border-border-custom text-primary focus:ring-secondary"
          />
          <label htmlFor="trail-publish" className="text-sm font-medium text-foreground">
            Publicar
          </label>
        </div>

        {/* Submit */}
        <button
          id="btn-salvar-trilha"
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  );
}
