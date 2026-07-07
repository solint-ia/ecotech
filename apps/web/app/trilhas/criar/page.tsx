'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, Save, ChevronDown } from 'lucide-react';
import { StateCitySelect } from '../../../components/shared/StateCitySelect';
import SafetyTipsField from '../../../components/trilhas/SafetyTipsField';
import { DEFAULT_SAFETY_TIPS, safetyTipsToString } from '../../../lib/trail-safety-tips';
import { durationToTimeInput, timeInputToDuration } from '../../../lib/trail-duration';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';


export default function CriarTrilhaPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user as any;

  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [biome, setBiome] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [duration, setDuration] = useState('');
  const [difficulty, setDifficulty] = useState('FACIL');
  const [wikilocUrl, setWikilocUrl] = useState('');
  const [safetyWarnings, setSafetyWarnings] = useState<string[]>([...DEFAULT_SAFETY_TIPS]);
  const [publishNow, setPublishNow] = useState(false);
  const [schoolId, setSchoolId] = useState('');
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch schools if admin
  useEffect(() => {
    if (user?.role === 'ADMIN' && user?.accessToken) {
      fetch(`${API_URL}/schools`, {
        headers: { Authorization: `Bearer ${user.accessToken}` },
      })
      .then(res => res.json())
      .then(data => setSchools(Array.isArray(data) ? data : data.data || []))
      .catch(console.error);
    }
  }, [user]);

  // Redirect if not authorized
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      const isApproved = user?.roleStatus === 'APROVADO';
      const isAllowedRole = user?.role === 'ADMIN' || (['SCHOOL_MANAGER', 'TEACHER'].includes(user?.role) && isApproved);
      if (!isAllowedRole) {
        router.push('/trilhas');
      }
    }
  }, [status, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('city', city);
      if (state) formData.append('state', state);
      formData.append('difficulty', difficulty);
      formData.append('status', String(publishNow));

      if (shortDescription) formData.append('shortDescription', shortDescription);
      if (fullDescription) formData.append('fullDescription', fullDescription);
      if (biome) formData.append('biome', biome);
      if (distanceKm) formData.append('distanceKm', distanceKm);
      if (duration) formData.append('duration', duration);
      if (coverImage) formData.append('coverImage', coverImage);
      if (wikilocUrl) formData.append('wikilocUrl', wikilocUrl);
      const safetyWarningsStr = safetyTipsToString(safetyWarnings);
      if (safetyWarningsStr) formData.append('safetyWarnings', safetyWarningsStr);
      if (schoolId) formData.append('schoolId', schoolId);

      const res = await fetch(`${API_URL}/trails`, {
        method: 'POST',
        headers: { 
          ...(user?.accessToken ? { Authorization: `Bearer ${user.accessToken}` } : {})
        },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
        throw new Error(msg || 'Erro ao criar trilha.');
      }

      const trail = await res.json();
      // Admin trails go live immediately; school/teacher trails are pending admin
      // approval, so send the author to their trails list where the status shows.
      if (user?.role === 'ADMIN') {
        router.push(`/trilhas/${trail.slug}`);
      } else {
        router.push('/trilhas?tab=minhas-trilhas');
      }
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
        {/* Nome */}
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

        {/* Estado e Município */}
        <StateCitySelect
          selectedState={state}
          selectedCity={city}
          onStateChange={setState}
          onCityChange={setCity}
          inline={true}
        />

        {/* Seleção de Escola (Somente Admin) */}
        {user?.role === 'ADMIN' && (
          <div>
            <label htmlFor="trail-school" className="block text-sm font-medium mb-1.5 text-foreground">
              Escola Vinculada (Opcional)
            </label>
            <select
              id="trail-school"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border-custom bg-background focus:outline-none focus:ring-2 focus:ring-secondary text-sm"
            >
              <option value="">-- Nenhuma escola --</option>
              {schools.map(school => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
            </select>
          </div>
        )}

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

        {/* Bioma */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <label htmlFor="trail-biome" className="block text-sm font-medium mb-1.5 text-foreground">
              Bioma Predominante
            </label>
            <select
              id="trail-biome"
              value={biome}
              onChange={(e) => setBiome(e.target.value)}
              className="w-full rounded-xl border border-border-custom px-4 py-2.5 outline-none focus:border-secondary transition-colors appearance-none bg-white"
            >
              <option value="">Selecione o Bioma</option>
              <option value="Amazônia">Amazônia</option>
              <option value="Caatinga">Caatinga</option>
              <option value="Cerrado">Cerrado</option>
              <option value="Mata Atlântica">Mata Atlântica</option>
              <option value="Pampa">Pampa</option>
              <option value="Pantanal">Pantanal</option>
            </select>
            <ChevronDown className="absolute right-4 top-[38px] w-4 h-4 text-foreground/50 pointer-events-none" />
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
              type="time"
              value={durationToTimeInput(duration)}
              onChange={(e) => setDuration(timeInputToDuration(e.target.value))}
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
            Imagem de capa
          </label>
          <input
            id="trail-cover"
            type="file"
            accept="image/*"
            onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
            className="w-full text-sm text-foreground/60 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-beige file:text-primary hover:file:bg-beige/80 transition-colors"
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
          <label className="block text-sm font-medium mb-1.5 text-foreground">
            Avisos de segurança
          </label>
          <SafetyTipsField tips={safetyWarnings} onChange={setSafetyWarnings} />
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
