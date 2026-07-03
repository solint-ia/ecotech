'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { WEEK_DAYS, buildOpeningHours, parseOpeningHours } from '../../../../lib/opening-hours';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const CATEGORIES = [
  'Hospedagem',
  'Alimentação',
  'Comércio',
  'Guias',
  'Outros',
];

export default function EditarParceiroPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const { data: session, status } = useSession();
  const user = session?.user as any;

  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');
  const [website, setWebsite] = useState('');
  const [open247, setOpen247] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>(WEEK_DAYS.map((d) => d.code));
  const [timeStart, setTimeStart] = useState('08:00');
  const [timeEnd, setTimeEnd] = useState('18:00');

  const toggleDay = (code: string) => {
    setSelectedDays((prev) =>
      prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code]
    );
  };
  const [statusActive, setStatusActive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && user?.role !== 'ADMIN') {
      router.push('/rede');
    }
  }, [status, user, router]);

  useEffect(() => {
    async function fetchPartner() {
      try {
        const res = await fetch(`${API_URL}/partners/${id}`);
        if (!res.ok) {
          router.push('/rede');
          return;
        }
        const data = await res.json();
        setName(data.name);
        setCategory(data.category);
        setDescription(data.description);
        setAddress(data.address);
        setCity(data.city);
        setPhone(data.phone);
        setWhatsapp(data.whatsapp || '');
        setInstagram(data.instagram || '');
        setWebsite(data.website || '');
        const parsedHours = parseOpeningHours(data.openingHours);
        setOpen247(parsedHours.is247);
        setSelectedDays(parsedHours.days);
        setTimeStart(parsedHours.start);
        setTimeEnd(parsedHours.end);
        setStatusActive(data.status);
      } catch (err) {
        console.error(err);
        setError('Erro ao carregar dados do parceiro.');
      } finally {
        setLoading(false);
      }
    }

    if (status === 'authenticated' && user?.role === 'ADMIN') {
      fetchPartner();
    }
  }, [id, status, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    if (!open247 && selectedDays.length === 0) {
      setError('Selecione ao menos um dia de funcionamento.');
      setSaving(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('category', category);
      formData.append('description', description);
      formData.append('address', address);
      formData.append('city', city);
      formData.append('phone', phone);
      let finalWebsite = website.trim();
      if (finalWebsite && !finalWebsite.startsWith('http://') && !finalWebsite.startsWith('https://')) {
        finalWebsite = `https://${finalWebsite}`;
      }
      
      const finalOpeningHours = buildOpeningHours(selectedDays, timeStart, timeEnd, open247);

      formData.append('openingHours', finalOpeningHours);
      formData.append('status', String(statusActive));

      if (whatsapp) formData.append('whatsapp', whatsapp);
      if (instagram) formData.append('instagram', instagram);
      if (finalWebsite) formData.append('website', finalWebsite);
      if (coverImage) formData.append('coverImage', coverImage);

      const res = await fetch(`${API_URL}/partners/${id}`, {
        method: 'PATCH',
        headers: {
          ...(user?.accessToken ? { Authorization: `Bearer ${user.accessToken}` } : {})
        },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
        throw new Error(msg || 'Erro ao editar parceiro.');
      }

      router.push(`/rede/${id}`);
    } catch (err: any) {
      setError(err.message || 'Erro inesperado.');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-foreground/60 text-sm">
        Carregando...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/rede/${id}`}
          className="text-primary/70 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-primary">Editar Parceiro</h1>
          <p className="text-sm text-foreground/60">Atualize os dados do serviço ou comércio local</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl border border-border-custom shadow-sm">

        {/* Status Toggle */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-primary">Status do Parceiro:</label>
          <select
            value={statusActive ? 'true' : 'false'}
            onChange={(e) => setStatusActive(e.target.value === 'true')}
            className="px-3 py-1.5 rounded-lg border border-border-custom bg-white text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
          >
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
        </div>

        {/* Name and Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Nome do Parceiro *
            </label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border-custom bg-white text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
              placeholder="Ex: Pousada das Águas"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Categoria *
            </label>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border-custom bg-white text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Endereço *
            </label>
            <input
              required
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border-custom bg-white text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
              placeholder="Rua, número, bairro"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Município *
            </label>
            <input
              required
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border-custom bg-white text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
              placeholder="Cidade - UF"
            />
          </div>
        </div>

        {/* Contacts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Telefone Principal *
            </label>
            <input
              required
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border-custom bg-white text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
              placeholder="(11) 99999-9999"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              WhatsApp
            </label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border-custom bg-white text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
              placeholder="(11) 99999-9999"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Instagram
            </label>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border-custom bg-white text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
              placeholder="@usuario"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Site
            </label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border-custom bg-white text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
              placeholder="Ex: seuparceiro.com.br"
            />
          </div>
        </div>

        {/* Description & Hours */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Sobre o Parceiro *
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border-custom bg-white text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
              placeholder="Descreva o que o parceiro oferece..."
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-primary">
                Horário de Funcionamento *
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={open247}
                  onChange={(e) => setOpen247(e.target.checked)}
                  className="rounded text-secondary focus:ring-secondary cursor-pointer"
                />
                <span className="text-xs font-semibold text-primary">Aberto 24/7</span>
              </label>
            </div>
            
            {!open247 ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-foreground/60 mb-1.5">Dias de funcionamento</label>
                  <div className="flex flex-wrap gap-2">
                    {WEEK_DAYS.map((day) => (
                      <button
                        key={day.code}
                        type="button"
                        onClick={() => toggleDay(day.code)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                          selectedDays.includes(day.code)
                            ? 'bg-secondary text-white border-secondary'
                            : 'bg-white text-foreground/60 border-border-custom hover:border-secondary/50'
                        }`}
                      >
                        {day.code}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-foreground/60 mb-1">Abertura</label>
                    <input
                      type="time"
                      required={!open247}
                      value={timeStart}
                      onChange={(e) => setTimeStart(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border-custom bg-white text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-foreground/60 mb-1">Fechamento</label>
                    <input
                      type="time"
                      required={!open247}
                      value={timeEnd}
                      onChange={(e) => setTimeEnd(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border-custom bg-white text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full px-3 py-3 rounded-lg border border-emerald-200 bg-emerald-50 text-sm font-medium text-emerald-800 text-center">
                Este estabelecimento funciona 24h todos os dias.
              </div>
            )}
          </div>
        </div>

        {/* Cover Image */}
        <div>
          <label className="block text-sm font-medium text-primary mb-1">
            Imagem de Capa (Deixe em branco para manter a atual)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files?.[0]) setCoverImage(e.target.files[0]);
            }}
            className="w-full text-sm text-foreground/60 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-beige file:text-primary hover:file:bg-beige/80 transition-colors"
          />
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-border-custom flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
          >
            {saving ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar Alterações
          </button>
        </div>
      </form>
    </div>
  );
}
