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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Clears a single field's inline error as the user fixes it.
  const clearErr = (key: string) =>
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  // Admin picks from every school; a teacher picks only among their APPROVED
  // school links.
  useEffect(() => {
    if (!user?.accessToken) return;
    if (user.role === 'ADMIN') {
      fetch(`${API_URL}/schools`, {
        headers: { Authorization: `Bearer ${user.accessToken}` },
      })
        .then(res => res.json())
        .then(data => setSchools(Array.isArray(data) ? data : data.data || []))
        .catch(console.error);
    } else if (user.role === 'TEACHER') {
      fetch(`${API_URL}/users/me/schools`, {
        headers: { Authorization: `Bearer ${user.accessToken}` },
      })
        .then(res => res.json())
        .then((links) => {
          const approved = (Array.isArray(links) ? links : [])
            .filter((l: any) => l.status === 'APROVADO')
            .map((l: any) => ({ id: l.schoolId, name: l.school?.name || 'Escola' }));
          setSchools(approved);
          if (approved.length === 1) setSchoolId(approved[0].id);
        })
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

    // All fields are required except the Wikiloc link. We report each missing
    // field inline (below it) — not just a single message at the top.
    const fe: Record<string, string> = {};
    if (!title.trim()) fe.title = 'Informe o nome da trilha.';
    if (!state || !city) fe.location = 'Selecione o estado e o município.';
    if (user?.role === 'TEACHER' && !schoolId) fe.schoolId = 'Selecione uma das suas escolas aprovadas.';
    if (!shortDescription.trim()) fe.shortDescription = 'Informe a descrição curta.';
    if (!fullDescription.trim()) fe.fullDescription = 'Informe a descrição completa.';
    if (!biome) fe.biome = 'Selecione o bioma predominante.';
    if (!distanceKm) fe.distanceKm = 'Informe a extensão (km).';
    if (!duration) fe.duration = 'Informe a duração.';
    if (!coverImage) fe.coverImage = 'Selecione uma imagem de capa.';

    if (Object.keys(fe).length > 0) {
      setFieldErrors(fe);
      setError('Preencha os campos obrigatórios destacados abaixo.');
      return;
    }

    setFieldErrors({});
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
            onChange={(e) => { setTitle(e.target.value); clearErr('title'); }}
            required
            minLength={3}
            className={`w-full px-4 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-secondary text-sm transition-all ${fieldErrors.title ? 'border-red-500' : 'border-border-custom'}`}
          />
          {fieldErrors.title && <p className="text-xs text-red-500 font-medium mt-1">{fieldErrors.title}</p>}
        </div>

        {/* Estado e Município */}
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground">
            Estado e Município *
          </label>
          <StateCitySelect
            selectedState={state}
            selectedCity={city}
            onStateChange={(v) => { setState(v); clearErr('location'); }}
            onCityChange={(v) => { setCity(v); clearErr('location'); }}
            inline={true}
          />
          {fieldErrors.location && <p className="text-xs text-red-500 font-medium mt-1">{fieldErrors.location}</p>}
        </div>

        {/* Seleção de Escola: Admin (opcional) ou Professor (obrigatório, só escolas aprovadas) */}
        {(user?.role === 'ADMIN' || user?.role === 'TEACHER') && (
          <div>
            <label htmlFor="trail-school" className="block text-sm font-medium mb-1.5 text-foreground">
              {user?.role === 'TEACHER' ? 'Escola Vinculada *' : 'Escola Vinculada (Opcional)'}
            </label>
            <select
              id="trail-school"
              value={schoolId}
              onChange={(e) => { setSchoolId(e.target.value); clearErr('schoolId'); }}
              required={user?.role === 'TEACHER'}
              className={`w-full px-4 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-secondary text-sm ${fieldErrors.schoolId ? 'border-red-500' : 'border-border-custom'}`}
            >
              <option value="">{user?.role === 'TEACHER' ? 'Selecione uma escola' : '-- Nenhuma escola --'}</option>
              {schools.map(school => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
            </select>
            {fieldErrors.schoolId && <p className="text-xs text-red-500 font-medium mt-1">{fieldErrors.schoolId}</p>}
            {user?.role === 'TEACHER' && schools.length === 0 && (
              <p className="text-xs text-amber-600 mt-1.5">
                Você ainda não tem nenhuma escola aprovada. Aguarde a aprovação para poder criar trilhas.
              </p>
            )}
          </div>
        )}

        {/* Descrição curta */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label htmlFor="trail-short-desc" className="block text-sm font-medium text-foreground">
              Descrição curta *
            </label>
            <span className={`text-xs font-mono ${80 - shortDescription.length < 15 ? 'text-red-500' : 'text-foreground/50'}`}>
              {80 - shortDescription.length} restantes
            </span>
          </div>
          <input
            id="trail-short-desc"
            type="text"
            value={shortDescription}
            onChange={(e) => { setShortDescription(e.target.value); clearErr('shortDescription'); }}
            required
            maxLength={80}
            placeholder="Resumo curto para o card da trilha"
            className={`w-full px-4 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-secondary text-sm transition-all ${fieldErrors.shortDescription ? 'border-red-500' : 'border-border-custom'}`}
          />
          {fieldErrors.shortDescription && <p className="text-xs text-red-500 font-medium mt-1">{fieldErrors.shortDescription}</p>}
        </div>

        {/* Descrição completa */}
        <div>
          <label htmlFor="trail-full-desc" className="block text-sm font-medium mb-1.5 text-foreground">
            Descrição completa *
          </label>
          <textarea
            id="trail-full-desc"
            rows={4}
            value={fullDescription}
            onChange={(e) => { setFullDescription(e.target.value); clearErr('fullDescription'); }}
            required
            className={`w-full px-4 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-secondary text-sm transition-all resize-y ${fieldErrors.fullDescription ? 'border-red-500' : 'border-border-custom'}`}
          />
          {fieldErrors.fullDescription && <p className="text-xs text-red-500 font-medium mt-1">{fieldErrors.fullDescription}</p>}
        </div>

        {/* Bioma */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <label htmlFor="trail-biome" className="block text-sm font-medium mb-1.5 text-foreground">
              Bioma Predominante *
            </label>
            <select
              id="trail-biome"
              value={biome}
              onChange={(e) => { setBiome(e.target.value); clearErr('biome'); }}
              required
              className={`w-full rounded-xl border px-4 py-2.5 outline-none focus:border-secondary transition-colors appearance-none bg-white ${fieldErrors.biome ? 'border-red-500' : 'border-border-custom'}`}
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
            {fieldErrors.biome && <p className="text-xs text-red-500 font-medium mt-1">{fieldErrors.biome}</p>}
          </div>
        </div>

        {/* Extensão + Duração + Dificuldade */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="trail-distance" className="block text-sm font-medium mb-1.5 text-foreground">
              Extensão (km) *
            </label>
            <input
              id="trail-distance"
              type="number"
              min="0"
              step="0.1"
              value={distanceKm}
              onChange={(e) => { setDistanceKm(e.target.value); clearErr('distanceKm'); }}
              required
              className={`w-full px-4 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-secondary text-sm transition-all ${fieldErrors.distanceKm ? 'border-red-500' : 'border-border-custom'}`}
            />
            {fieldErrors.distanceKm && <p className="text-xs text-red-500 font-medium mt-1">{fieldErrors.distanceKm}</p>}
          </div>
          <div>
            <label htmlFor="trail-duration" className="block text-sm font-medium mb-1.5 text-foreground">
              Duração *
            </label>
            <input
              id="trail-duration"
              type="time"
              value={durationToTimeInput(duration)}
              onChange={(e) => { setDuration(timeInputToDuration(e.target.value)); clearErr('duration'); }}
              required
              className={`w-full px-4 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-secondary text-sm transition-all ${fieldErrors.duration ? 'border-red-500' : 'border-border-custom'}`}
            />
            {fieldErrors.duration && <p className="text-xs text-red-500 font-medium mt-1">{fieldErrors.duration}</p>}
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
            Imagem de capa *
          </label>
          <input
            id="trail-cover"
            type="file"
            accept="image/*"
            required
            onChange={(e) => { setCoverImage(e.target.files?.[0] || null); clearErr('coverImage'); }}
            className={`w-full text-sm text-foreground/60 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-beige file:text-primary hover:file:bg-beige/80 transition-colors ${fieldErrors.coverImage ? 'ring-1 ring-red-500 rounded-lg' : ''}`}
          />
          {fieldErrors.coverImage && <p className="text-xs text-red-500 font-medium mt-1">{fieldErrors.coverImage}</p>}
        </div>

        {/* Link Wikiloc */}
        <div>
          <label htmlFor="trail-wikiloc" className="block text-sm font-medium mb-1.5 text-foreground">
            Link Wikiloc <span className="text-foreground/40 font-normal">(opcional)</span>
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
