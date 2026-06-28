'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Save, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import { getImageUrl } from '../../../../lib/image-url';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const POINT_TYPES = [
  { value: 'FLORA', label: 'Flora' },
  { value: 'RIO', label: 'Rio' },
  { value: 'FAUNA', label: 'Fauna' },
  { value: 'ESPACO_CULTURAL', label: 'Espaço Cultural' },
  { value: 'AREA_VERDE', label: 'Área Verde' },
  { value: 'OUTRO', label: 'Outro' },
];

interface Point {
  id: string;
  title: string;
  type: string;
  order: number;
  shortDescription: string;
  fullDescription: string;
  curiosities: string;
  environmentalImportance: string;
  preservationCare: string;
  mainImage: string;
  offlineSummary: string;
  status: boolean;
}

export default function PontosPage() {
  const params = useParams();
  const trailSlug = params.slug as string;
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user as any;

  const [trail, setTrail] = useState<any>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [expandedPointId, setExpandedPointId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingPointId, setEditingPointId] = useState<string | null>(null);
  const [pointImage, setPointImage] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'FAUNA',
    order: 1,
    shortDescription: '',
    fullDescription: '',
    curiosities: '',
    environmentalImportance: '',
    preservationCare: '',
    mainImage: '',
    offlineSummary: '',
    status: false,
  });
  const [offlineSummaryLeft, setOfflineSummaryLeft] = useState(250);

  // Auth check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && user?.role !== 'ADMIN' && user?.role !== 'SCHOOL_MANAGER') {
      router.push('/trilhas');
    }
  }, [status, user, router]);

  // Load trail info + points
  useEffect(() => {
    if (!trailSlug || status !== 'authenticated') return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const trailRes = await fetch(`${API_URL}/trails/${trailSlug}`);
        if (!trailRes.ok) throw new Error('Trilha não encontrada.');
        const trailData = await trailRes.json();
        setTrail(trailData);

        // Fetch all points (incl. unpublished) for admin/manager using trail.id
        const pointsRes = await fetch(`${API_URL}/educational-points/trail/${trailData.id}/all`, {
          headers: user?.accessToken ? { Authorization: `Bearer ${user.accessToken}` } : {},
        });
        if (pointsRes.ok) setPoints(await pointsRes.json());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [trailSlug, status]);

  const resetForm = () => {
    setShowForm(false);
    setEditingPointId(null);
    setPointImage(null);
    setFormData({
      title: '',
      type: 'FAUNA',
      order: points.length + 1,
      shortDescription: '',
      fullDescription: '',
      curiosities: '',
      environmentalImportance: '',
      preservationCare: '',
      mainImage: '',
      offlineSummary: '',
      status: false,
    });
    setOfflineSummaryLeft(250);
  };

  const handleEditClick = (point: Point) => {
    setEditingPointId(point.id);
    setFormData({
      title: point.title,
      type: point.type,
      order: point.order,
      shortDescription: point.shortDescription || '',
      fullDescription: point.fullDescription || '',
      curiosities: point.curiosities || '',
      environmentalImportance: point.environmentalImportance || '',
      preservationCare: point.preservationCare || '',
      mainImage: point.mainImage || '',
      offlineSummary: point.offlineSummary || '',
      status: point.status,
    });
    setPointImage(null);
    setOfflineSummaryLeft(250 - (point.offlineSummary?.length || 0));
    setShowForm(true);
    setExpandedPointId(null);
  };

  const handleSavePoint = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    try {
      const payload = new FormData();
      payload.append('title', formData.title);
      payload.append('type', formData.type);
      payload.append('order', String(formData.order));
      payload.append('status', String(formData.status));
      payload.append('trailId', trail.id);
      
      if (formData.shortDescription) payload.append('shortDescription', formData.shortDescription);
      if (formData.fullDescription) payload.append('fullDescription', formData.fullDescription);
      if (formData.curiosities) payload.append('curiosities', formData.curiosities);
      if (formData.environmentalImportance) payload.append('environmentalImportance', formData.environmentalImportance);
      if (formData.preservationCare) payload.append('preservationCare', formData.preservationCare);
      if (formData.offlineSummary) payload.append('offlineSummary', formData.offlineSummary);
      if (pointImage) payload.append('mainImage', pointImage);

      const url = editingPointId ? `${API_URL}/educational-points/${editingPointId}` : `${API_URL}/educational-points`;
      const method = editingPointId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          ...(user?.accessToken ? { Authorization: `Bearer ${user.accessToken}` } : {})
        },
        body: payload,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(Array.isArray(data.message) ? data.message.join(', ') : data.message);
      }
      
      const savedPoint = await res.json();
      
      if (editingPointId) {
        setPoints(prev => prev.map(p => p.id === editingPointId ? savedPoint : p).sort((a, b) => a.order - b.order));
      } else {
        setPoints(prev => [...prev, savedPoint].sort((a, b) => a.order - b.order));
      }

      resetForm();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar ponto.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePoint = async (pointId: string) => {
    if (!confirm('Tem certeza que deseja excluir este ponto?')) return;
    try {
      const res = await fetch(`${API_URL}/educational-points/${pointId}`, {
        method: 'DELETE',
        headers: user?.accessToken ? { Authorization: `Bearer ${user.accessToken}` } : {},
      });
      if (!res.ok && res.status !== 204) throw new Error('Falha ao excluir ponto.');
      setPoints((prev) => prev.filter((p) => p.id !== pointId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-foreground/60 text-sm animate-pulse">
        Carregando...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link
          href={`/trilhas/${trailSlug}`}
          className="text-primary/70 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-primary">Pontos Educativos</h1>
          {trail && (
            <p className="text-xs text-foreground/60 mt-0.5">{trail.title}</p>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 mb-4">
          {error}
        </div>
      )}

      {/* Existing points list */}
      <div className="space-y-3 mb-4">
        {points.length === 0 && !showForm && (
          <div className="text-center py-10 text-foreground/50 text-sm bg-white rounded-xl border border-border-custom">
            Nenhum ponto educativo ainda. Clique em "Novo Ponto" para adicionar.
          </div>
        )}
        {points.map((point, idx) => (
          <div key={point.id} className="bg-white rounded-xl border border-border-custom overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                className="flex items-center gap-3 flex-1 text-left"
                onClick={() => setExpandedPointId(expandedPointId === point.id ? null : point.id)}
              >
                <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-primary truncate">{point.title}</p>
                  <p className="text-xs text-foreground/50">{point.type} • {point.status ? 'Publicado' : 'Rascunho'}</p>
                </div>
                {expandedPointId === point.id ? (
                  <ChevronUp className="w-4 h-4 text-foreground/40 shrink-0 ml-auto" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-foreground/40 shrink-0 ml-auto" />
                )}
              </button>
              <div className="flex items-center ml-2">
                {!point.status && (
                  <button
                    onClick={async () => {
                      try {
                        const formData = new FormData();
                        formData.append('status', 'true');
                        const res = await fetch(`${API_URL}/educational-points/${point.id}`, {
                          method: 'PATCH',
                          headers: user?.accessToken ? { Authorization: `Bearer ${user.accessToken}` } : {},
                          body: formData,
                        });
                        if (!res.ok) throw new Error('Falha ao publicar ponto.');
                        setPoints(prev => prev.map(p => p.id === point.id ? { ...p, status: true } : p));
                      } catch (err: any) {
                        setError(err.message);
                      }
                    }}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors mr-1"
                    title="Publicar ponto"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </button>
                )}
                <button
                  onClick={() => handleEditClick(point)}
                  className="p-1.5 text-primary/60 hover:text-primary hover:bg-beige rounded-lg transition-colors"
                  title="Editar ponto"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeletePoint(point.id)}
                  className="ml-1 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Excluir ponto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {expandedPointId === point.id && (
              <div className="px-4 pb-4 border-t border-border-custom pt-3 space-y-2 text-sm text-foreground/70">
                {point.shortDescription && <p><strong>Descrição:</strong> {point.shortDescription}</p>}
                {point.offlineSummary && (
                  <p><strong>Resumo offline:</strong> {point.offlineSummary}</p>
                )}
                {point.mainImage && (
                  <div className="mt-2">
                    <strong>Imagem principal:</strong>
                    <img src={getImageUrl(point.mainImage)} alt={point.title} className="mt-2 w-32 h-32 object-cover rounded-lg border border-border-custom" />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new point button or form */}
      {!showForm ? (
        <button
          id="btn-novo-ponto"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border-custom rounded-xl text-sm font-medium text-foreground/60 hover:border-secondary hover:text-secondary transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Ponto
        </button>
      ) : (
        <form
          onSubmit={handleSavePoint}
          className="bg-white rounded-2xl border border-border-custom p-5 space-y-4"
        >
          <h2 className="text-base font-bold text-primary">
            {editingPointId ? 'Editar Ponto Educativo' : 'Novo Ponto Educativo'}
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1 text-foreground" htmlFor="point-title">
                Nome do Ponto *
              </label>
              <input
                id="point-title"
                type="text"
                required
                minLength={3}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border-custom bg-background text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-foreground" htmlFor="point-order">
                Ordem *
              </label>
              <input
                id="point-order"
                type="number"
                min={1}
                required
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-border-custom bg-background text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-foreground" htmlFor="point-type">
              Tipo *
            </label>
            <select
              id="point-type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border-custom bg-background text-sm focus:outline-none focus:ring-2 focus:ring-secondary appearance-none"
            >
              {POINT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-foreground" htmlFor="point-short-desc">
              Descrição curta
            </label>
            <input
              id="point-short-desc"
              type="text"
              value={formData.shortDescription}
              onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border-custom bg-background text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="block text-xs font-medium text-foreground" htmlFor="point-offline-summary">
                Resumo offline (para QR Code) *
              </label>
              <span className={`text-xs font-mono ${offlineSummaryLeft < 30 ? 'text-red-500' : 'text-foreground/50'}`}>
                {offlineSummaryLeft} restantes
              </span>
            </div>
            <textarea
              id="point-offline-summary"
              rows={3}
              required
              maxLength={250}
              value={formData.offlineSummary}
              onChange={(e) => {
                setFormData({ ...formData, offlineSummary: e.target.value });
                setOfflineSummaryLeft(250 - e.target.value.length);
              }}
              placeholder="Resumo de até 250 caracteres para leitura sem internet"
              className="w-full px-3 py-2 rounded-lg border border-border-custom bg-background text-sm focus:outline-none focus:ring-2 focus:ring-secondary resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-foreground" htmlFor="point-full-desc">
              Descrição Completa
            </label>
            <textarea
              id="point-full-desc"
              rows={4}
              value={formData.fullDescription}
              onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border-custom bg-background text-sm focus:outline-none focus:ring-2 focus:ring-secondary resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-foreground" htmlFor="point-env-importance">
              Importância Ambiental
            </label>
            <textarea
              id="point-env-importance"
              rows={3}
              value={formData.environmentalImportance}
              onChange={(e) => setFormData({ ...formData, environmentalImportance: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border-custom bg-background text-sm focus:outline-none focus:ring-2 focus:ring-secondary resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1 text-foreground" htmlFor="point-curiosities">
                Curiosidades
              </label>
              <textarea
                id="point-curiosities"
                rows={3}
                value={formData.curiosities}
                onChange={(e) => setFormData({ ...formData, curiosities: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border-custom bg-background text-sm focus:outline-none focus:ring-2 focus:ring-secondary resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-foreground" htmlFor="point-preservation">
                Cuidados e Preservação
              </label>
              <textarea
                id="point-preservation"
                rows={3}
                value={formData.preservationCare}
                onChange={(e) => setFormData({ ...formData, preservationCare: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border-custom bg-background text-sm focus:outline-none focus:ring-2 focus:ring-secondary resize-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-foreground" htmlFor="point-image">
              Imagem de capa
            </label>
            <input
              id="point-image"
              type="file"
              accept="image/*"
              onChange={(e) => setPointImage(e.target.files?.[0] || null)}
              className="w-full text-sm text-foreground/60 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-beige file:text-primary hover:file:bg-beige/80 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="point-publish"
              type="checkbox"
              checked={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
              className="rounded border-border-custom"
            />
            <label htmlFor="point-publish" className="text-xs font-medium text-foreground">
              Publicar ponto
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 py-2.5 border border-border-custom rounded-xl text-sm font-medium text-foreground/70 hover:bg-beige transition-colors"
            >
              Cancelar
            </button>
            <button
              id="btn-salvar-ponto"
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
