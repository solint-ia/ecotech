'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Save, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import { getImageUrl } from '../../../../lib/image-url';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface BiodiversityItem {
  id: string;
  trailId: string;
  groupType: string;
  popularName: string;
  scientificName?: string;
  description: string;
  image: string;
  curiosities?: string;
  environmentalImportance: string;
}

export default function BiodiversidadePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user as any;

  const [trail, setTrail] = useState<any>(null);
  const [items, setItems] = useState<BiodiversityItem[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemImage, setItemImage] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    groupType: 'FAUNA',
    popularName: '',
    scientificName: '',
    description: '',
    curiosities: '',
    environmentalImportance: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && user?.role !== 'ADMIN' && user?.role !== 'SCHOOL_MANAGER') {
      router.push(`/trilhas/${slug}`);
    }
  }, [status, user, router, slug]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resTrail = await fetch(`${API_URL}/trails/${slug}`);
        if (!resTrail.ok) throw new Error('Trilha não encontrada.');
        const trailData = await resTrail.json();
        
        if (user?.role === 'SCHOOL_MANAGER' && trailData.schoolId !== user.schoolId) {
          router.push(`/trilhas/${slug}`);
          return;
        }
        setTrail(trailData);

        const resItems = await fetch(`${API_URL}/biodiversity/trail/${trailData.id}`);
        if (resItems.ok) {
          const itemsData = await resItems.json();
          setItems(itemsData);
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar dados.');
      } finally {
        setLoading(false);
      }
    };
    if (slug && status === 'authenticated') {
      fetchData();
    }
  }, [slug, status, user, router]);

  const resetForm = () => {
    setShowForm(false);
    setEditingItemId(null);
    setItemImage(null);
    setFormData({
      groupType: 'FAUNA',
      popularName: '',
      scientificName: '',
      description: '',
      curiosities: '',
      environmentalImportance: '',
    });
  };

  const handleEditClick = (item: BiodiversityItem) => {
    setEditingItemId(item.id);
    setFormData({
      groupType: item.groupType || 'FAUNA',
      popularName: item.popularName || '',
      scientificName: item.scientificName || '',
      description: item.description || '',
      curiosities: item.curiosities || '',
      environmentalImportance: item.environmentalImportance || '',
    });
    setShowForm(true);
    setExpandedItemId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trail) return;

    setSaving(true);
    setError('');

    try {
      const data = new FormData();
      data.append('trailId', trail.id);
      data.append('groupType', formData.groupType);
      data.append('popularName', formData.popularName);
      data.append('description', formData.description);
      data.append('environmentalImportance', formData.environmentalImportance);
      
      if (formData.scientificName) data.append('scientificName', formData.scientificName);
      if (formData.curiosities) data.append('curiosities', formData.curiosities);
      if (itemImage) data.append('image', itemImage);

      const url = editingItemId
        ? `${API_URL}/biodiversity/${editingItemId}`
        : `${API_URL}/biodiversity`;
      
      const res = await fetch(url, {
        method: editingItemId ? 'PATCH' : 'POST',
        headers: {
          ...(user?.accessToken ? { Authorization: `Bearer ${user.accessToken}` } : {})
        },
        body: data,
      });

      if (!res.ok) {
        const errData = await res.json();
        const msg = Array.isArray(errData.message) ? errData.message.join(', ') : errData.message;
        throw new Error(msg || 'Erro ao salvar item.');
      }

      const savedItem = await res.json();
      
      if (editingItemId) {
        setItems((prev) => prev.map((i) => (i.id === editingItemId ? savedItem : i)));
      } else {
        setItems((prev) => [savedItem, ...prev]);
      }
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este item?')) return;
    
    try {
      const res = await fetch(`${API_URL}/biodiversity/${itemId}`, {
        method: 'DELETE',
        headers: user?.accessToken ? { Authorization: `Bearer ${user.accessToken}` } : {},
      });
      if (!res.ok && res.status !== 204) throw new Error('Falha ao excluir item.');
      setItems((prev) => prev.filter((i) => i.id !== itemId));
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

  const fauna = items.filter(i => i.groupType === 'FAUNA');
  const flora = items.filter(i => i.groupType === 'FLORA');

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link
          href={`/trilhas/${slug}`}
          className="text-primary/70 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-primary">Biodiversidade</h1>
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

      {/* List */}
      <div className="space-y-6 mb-4 mt-6">
        {items.length === 0 && !showForm && (
          <div className="text-center py-10 text-foreground/50 text-sm bg-white rounded-xl border border-border-custom">
            Nenhum item de biodiversidade cadastrado. Clique em "Adicionar Item" para começar.
          </div>
        )}

        {fauna.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wider mb-2 px-1">Fauna ({fauna.length})</h3>
            <div className="space-y-3">
              {fauna.map((item) => (
                <div key={item.id} className="bg-white rounded-xl border border-border-custom overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3">
                    <button
                      className="flex items-center gap-3 flex-1 text-left"
                      onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-amber-800 truncate">{item.popularName}</p>
                        {item.scientificName && <p className="text-xs italic text-foreground/50">{item.scientificName}</p>}
                      </div>
                      {expandedItemId === item.id ? (
                        <ChevronUp className="w-4 h-4 text-foreground/40 shrink-0 ml-auto" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-foreground/40 shrink-0 ml-auto" />
                      )}
                    </button>
                    <div className="flex items-center ml-2">
                      <button
                        onClick={() => handleEditClick(item)}
                        className="p-1.5 text-primary/60 hover:text-primary hover:bg-beige rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="ml-1 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {expandedItemId === item.id && (
                    <div className="px-4 pb-4 border-t border-border-custom pt-3 space-y-2 text-sm text-foreground/70">
                      {item.description && <p><strong>Descrição:</strong> {item.description}</p>}
                      {item.environmentalImportance && <p><strong>Importância:</strong> {item.environmentalImportance}</p>}
                      {item.image && (
                        <div className="mt-2">
                          <img src={getImageUrl(item.image)} alt={item.popularName} className="mt-2 w-32 h-32 object-cover rounded-lg border border-border-custom" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {flora.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-green-800 uppercase tracking-wider mb-2 px-1">Flora ({flora.length})</h3>
            <div className="space-y-3">
              {flora.map((item) => (
                <div key={item.id} className="bg-white rounded-xl border border-border-custom overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3">
                    <button
                      className="flex items-center gap-3 flex-1 text-left"
                      onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-green-800 truncate">{item.popularName}</p>
                        {item.scientificName && <p className="text-xs italic text-foreground/50">{item.scientificName}</p>}
                      </div>
                      {expandedItemId === item.id ? (
                        <ChevronUp className="w-4 h-4 text-foreground/40 shrink-0 ml-auto" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-foreground/40 shrink-0 ml-auto" />
                      )}
                    </button>
                    <div className="flex items-center ml-2">
                      <button
                        onClick={() => handleEditClick(item)}
                        className="p-1.5 text-primary/60 hover:text-primary hover:bg-beige rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="ml-1 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {expandedItemId === item.id && (
                    <div className="px-4 pb-4 border-t border-border-custom pt-3 space-y-2 text-sm text-foreground/70">
                      {item.description && <p><strong>Descrição:</strong> {item.description}</p>}
                      {item.environmentalImportance && <p><strong>Importância:</strong> {item.environmentalImportance}</p>}
                      {item.image && (
                        <div className="mt-2">
                          <img src={getImageUrl(item.image)} alt={item.popularName} className="mt-2 w-32 h-32 object-cover rounded-lg border border-border-custom" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-4 border-2 border-dashed border-border-custom rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-foreground/60 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all mb-8"
        >
          <Plus className="w-4 h-4" />
          Adicionar Item
        </button>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-border-custom p-5 space-y-4 shadow-sm mb-8">
          <h2 className="text-base font-bold text-primary mb-4 border-b border-border-custom pb-2">
            {editingItemId ? 'Editar Item' : 'Novo Item'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground" htmlFor="group-type">
                Grupo *
              </label>
              <select
                id="group-type"
                required
                value={formData.groupType}
                onChange={(e) => setFormData({ ...formData, groupType: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border-custom bg-background text-sm focus:outline-none focus:ring-2 focus:ring-secondary appearance-none"
              >
                <option value="FAUNA">Fauna (Animais)</option>
                <option value="FLORA">Flora (Plantas)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground" htmlFor="popular-name">
                Nome Popular *
              </label>
              <input
                id="popular-name"
                type="text"
                required
                value={formData.popularName}
                onChange={(e) => setFormData({ ...formData, popularName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border-custom bg-background text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                placeholder="Ex: Arara Canindé"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground" htmlFor="scientific-name">
                Nome Científico
              </label>
              <input
                id="scientific-name"
                type="text"
                value={formData.scientificName}
                onChange={(e) => setFormData({ ...formData, scientificName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border-custom bg-background text-sm italic focus:outline-none focus:ring-2 focus:ring-secondary"
                placeholder="Ex: Ara ararauna"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-foreground" htmlFor="desc">
              Descrição do Item *
            </label>
            <textarea
              id="desc"
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border-custom bg-background text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
              placeholder="Detalhes físicos, habitat e comportamento..."
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold mb-1 text-foreground" htmlFor="importance">
              Importância Ambiental *
            </label>
            <textarea
              id="importance"
              required
              rows={2}
              value={formData.environmentalImportance}
              onChange={(e) => setFormData({ ...formData, environmentalImportance: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border-custom bg-background text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
              placeholder="Ex: Dispersão de sementes, controle de pragas..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-foreground" htmlFor="curiosities">
              Curiosidades
            </label>
            <textarea
              id="curiosities"
              rows={2}
              value={formData.curiosities}
              onChange={(e) => setFormData({ ...formData, curiosities: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border-custom bg-background text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
              placeholder="Fatos interessantes sobre o item..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-foreground" htmlFor="image">
              Imagem {editingItemId ? '(Opcional, sobrescreve a atual)' : '*'}
            </label>
            <input
              id="image"
              type="file"
              required={!editingItemId}
              accept="image/*"
              onChange={(e) => setItemImage(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 rounded-lg border border-border-custom bg-background text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 py-2.5 border border-border-custom rounded-xl text-sm font-medium text-foreground/70 hover:bg-beige transition-colors"
            >
              Cancelar
            </button>
            <button
              id="btn-salvar-biodiversidade"
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Item'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
