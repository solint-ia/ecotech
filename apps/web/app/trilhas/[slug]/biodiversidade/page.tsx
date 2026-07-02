'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Save, Edit2, X } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // UI State
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'FAUNA' | 'FLORA'>('ALL');
  const [selectedItem, setSelectedItem] = useState<BiodiversityItem | null>(null);

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
        const resTrail = await fetch(`${API_URL}/trails/${slug}`, { cache: 'no-store' });
        if (!resTrail.ok) throw new Error('Trilha não encontrada.');
        const trailData = await resTrail.json();
        
        if (user?.role === 'SCHOOL_MANAGER' && trailData.schoolId !== user.schoolId) {
          router.push(`/trilhas/${slug}`);
          return;
        }
        setTrail(trailData);

        const resItems = await fetch(`${API_URL}/biodiversity/trail/${trailData.id}`, { cache: 'no-store' });
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

  const handleEditClick = (e: React.MouseEvent, item: BiodiversityItem) => {
    e.stopPropagation();
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
    setSelectedItem(null);
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

  const handleDeleteItem = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
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
      <div className="max-w-6xl mx-auto py-12 text-center text-foreground/60 text-sm animate-pulse">
        Carregando...
      </div>
    );
  }

  const filteredItems = items.filter(i => activeFilter === 'ALL' || i.groupType === activeFilter);

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header & Filters */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Link
            href={`/trilhas/${slug}`}
            className="text-primary/70 hover:text-primary transition-colors p-2 rounded-full hover:bg-beige"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-primary">Biodiversidade</h1>
            {trail && (
              <p className="text-sm text-foreground/60 mt-0.5">{trail.title}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${activeFilter === 'ALL' ? 'bg-secondary text-white' : 'bg-[#FAFCFA] text-foreground/60 border border-black/5 hover:bg-beige'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setActiveFilter('FAUNA')}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${activeFilter === 'FAUNA' ? 'bg-[#EAF4EE] text-forest' : 'bg-[#FAFCFA] text-foreground/60 border border-black/5 hover:bg-beige'}`}
          >
            🦋 Fauna
          </button>
          <button
            onClick={() => setActiveFilter('FLORA')}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${activeFilter === 'FLORA' ? 'bg-[#EAF4EE] text-forest' : 'bg-[#FAFCFA] text-foreground/60 border border-black/5 hover:bg-beige'}`}
          >
            🌿 Flora
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 mb-4">
          {error}
        </div>
      )}

      {/* Grid of Cards */}
      {!showForm && (
        <>
          {filteredItems.length === 0 ? (
            <div className="text-center py-10 text-foreground/50 text-sm bg-white rounded-xl border border-black/5 mb-8 shadow-sm">
              Nenhum item de biodiversidade encontrado para esta categoria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="bg-white rounded-2xl border border-black/5 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col"
                >
                  {/* Image Header */}
                  <div className="relative aspect-video w-full overflow-hidden">
                    <img 
                      src={`${getImageUrl(item.image)}${item.updatedAt ? `?v=${new Date(item.updatedAt).getTime()}` : ''}`} 
                      alt={item.popularName} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleEditClick(e, item)}
                        className="p-1.5 bg-white/90 text-primary hover:bg-white rounded-lg backdrop-blur-sm shadow-sm transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteItem(e, item.id)}
                        className="p-1.5 bg-white/90 text-red-500 hover:bg-white hover:text-red-600 rounded-lg backdrop-blur-sm shadow-sm transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 bg-black/60 backdrop-blur-md text-white text-xs font-semibold rounded-md">
                        {item.groupType === 'FAUNA' ? '🦋 Fauna' : '🌿 Flora'}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-forest line-clamp-1">{item.popularName}</h3>
                    {item.scientificName && (
                      <p className="text-sm italic text-gray-500 mb-2">{item.scientificName}</p>
                    )}
                    <p className="text-sm text-foreground/70 line-clamp-2 mt-auto pt-2">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Button */}
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-4 border-2 border-dashed border-border-custom rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-foreground/60 hover:text-forest hover:border-forest/40 hover:bg-forest/5 transition-all mb-8"
          >
            <Plus className="w-4 h-4" />
            Adicionar Item de Biodiversidade
          </button>
        </>
      )}

      {/* Form View */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-black/5 p-6 shadow-sm mb-8 animate-in fade-in zoom-in-95 duration-200">
          <h2 className="text-lg font-bold text-forest mb-6 flex items-center gap-2">
            {editingItemId ? <Edit2 className="w-5 h-5"/> : <Plus className="w-5 h-5"/>}
            {editingItemId ? 'Editar Item da Biodiversidade' : 'Novo Item da Biodiversidade'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-primary" htmlFor="group-type">
                Grupo *
              </label>
              <div className="relative">
                <select
                  id="group-type"
                  required
                  value={formData.groupType}
                  onChange={(e) => setFormData({ ...formData, groupType: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-black/5 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-forest focus:border-forest appearance-none shadow-sm transition-all text-foreground/70"
                >
                  <option value="FAUNA">Fauna (Animais)</option>
                  <option value="FLORA">Flora (Plantas)</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-foreground/40">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-primary" htmlFor="popular-name">
                Nome Popular *
              </label>
              <input
                id="popular-name"
                type="text"
                required
                value={formData.popularName}
                onChange={(e) => setFormData({ ...formData, popularName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-black/5 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-forest focus:border-forest shadow-sm transition-all"
                placeholder="Ex: Arara Canindé"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-primary" htmlFor="scientific-name">
                Nome Científico
              </label>
              <input
                id="scientific-name"
                type="text"
                value={formData.scientificName}
                onChange={(e) => setFormData({ ...formData, scientificName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-black/5 bg-white text-sm italic focus:outline-none focus:ring-1 focus:ring-forest focus:border-forest shadow-sm transition-all"
                placeholder="Ex: Ara ararauna"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1 text-primary" htmlFor="desc">
              Descrição do Item *
            </label>
            <textarea
              id="desc"
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-black/5 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-forest focus:border-forest resize-none shadow-sm transition-all"
              placeholder="Detalhes físicos, habitat e comportamento..."
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1 text-primary" htmlFor="importance">
              Importância Ambiental *
            </label>
            <textarea
              id="importance"
              required
              rows={2}
              value={formData.environmentalImportance}
              onChange={(e) => setFormData({ ...formData, environmentalImportance: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-black/5 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-forest focus:border-forest resize-none shadow-sm transition-all"
              placeholder="Ex: Dispersão de sementes, controle de pragas..."
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1 text-primary" htmlFor="curiosities">
              Curiosidades
            </label>
            <textarea
              id="curiosities"
              rows={2}
              value={formData.curiosities}
              onChange={(e) => setFormData({ ...formData, curiosities: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-black/5 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-forest focus:border-forest resize-none shadow-sm transition-all"
              placeholder="Fatos interessantes sobre o item..."
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold mb-1 text-primary" htmlFor="image">
              Imagem {editingItemId ? '(Opcional, sobrescreve a atual)' : '*'}
            </label>
            <input
              id="image"
              type="file"
              required={!editingItemId}
              accept="image/*"
              onChange={(e) => setItemImage(e.target.files?.[0] || null)}
              className="w-full text-sm text-foreground/60 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-beige file:text-primary hover:file:bg-beige/80 transition-colors cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-black/5 mt-4">
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-2.5 bg-[#FAFCFA] border border-border-custom rounded-full text-sm font-medium text-foreground/70 hover:bg-beige transition-colors shadow-sm"
            >
              Cancelar
            </button>
            <button
              id="btn-salvar-biodiversidade"
              type="submit"
              disabled={saving}
              className="px-8 py-2.5 bg-forest text-white rounded-full text-sm font-bold hover:bg-forest/90 transition-all hover:shadow-md hover:-translate-y-0.5 disabled:opacity-60 flex items-center gap-2 shadow-sm"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Item'}
            </button>
          </div>
        </form>
      )}

{/* Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Image Header */}
            <div className="w-full h-48 md:h-64 relative bg-gray-100 shrink-0">
              <img 
                src={`${getImageUrl(selectedItem.image)}${selectedItem.updatedAt ? `?v=${new Date(selectedItem.updatedAt).getTime()}` : ''}`} 
                alt={selectedItem.popularName} 
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-4">
                <span className="px-3 py-1.5 bg-black/60 backdrop-blur-md text-white text-sm font-semibold rounded-lg">
                  {selectedItem.groupType === 'FAUNA' ? '🦋 Fauna' : '🌿 Flora'}
                </span>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto">
              <h2 className="text-3xl font-bold text-forest mb-1">{selectedItem.popularName}</h2>
              {selectedItem.scientificName && (
                <p className="text-lg italic text-gray-500 mb-6">{selectedItem.scientificName}</p>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-2">Descrição</h3>
                  <p className="text-foreground/80 leading-relaxed">{selectedItem.description}</p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-2">Importância Ambiental</h3>
                  <p className="text-foreground/80 leading-relaxed bg-forest/5 p-4 rounded-xl border border-forest/10">{selectedItem.environmentalImportance}</p>
                </div>

                {selectedItem.curiosities && (
                  <div>
                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-2">Curiosidades</h3>
                    <p className="text-foreground/80 leading-relaxed">{selectedItem.curiosities}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
