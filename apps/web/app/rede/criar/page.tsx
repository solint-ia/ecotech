'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { StateCitySelect } from '@/components/shared/StateCitySelect';
import { OpeningHoursEditor } from '../../../components/rede/OpeningHoursEditor';

import { formatPhone, validatePhone } from '../../../lib/validation';
import { OpeningHours, createEmptySchedule, validateSchedule } from '../../../lib/opening-hours';
import { canCreateContent } from '../../../lib/permissions';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const CATEGORIES = [
  'Hospedagem',
  'Alimentação',
  'Comércio',
  'Guias',
  'Outros',
];

export default function CriarParceiroPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user as any;

  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [stateUF, setStateUF] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');
  const [website, setWebsite] = useState('');
  const [schedule, setSchedule] = useState<OpeningHours>(createEmptySchedule());
  const [statusActive, setStatusActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if not authorized. Approved schools and teachers may submit a
  // partner; it reaches the public directory only after the admin approves it.
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && !canCreateContent(user)) {
      router.push('/rede');
    }
  }, [status, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!validatePhone(phone)) {
      setError('Telefone principal inválido.');
      setLoading(false);
      return;
    }

    if (whatsapp && !validatePhone(whatsapp)) {
      setError('WhatsApp inválido.');
      setLoading(false);
      return;
    }

    const scheduleError = validateSchedule(schedule);
    if (scheduleError) {
      setError(scheduleError);
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('category', category);
      formData.append('description', description);
      formData.append('address', address);
      formData.append('state', stateUF);
      formData.append('city', city);
      formData.append('phone', phone);
      let finalWebsite = website.trim();
      if (finalWebsite && !finalWebsite.startsWith('http://') && !finalWebsite.startsWith('https://')) {
        finalWebsite = `https://${finalWebsite}`;
      }

      formData.append('openingHours', JSON.stringify(schedule));
      formData.append('status', String(statusActive));

      if (whatsapp) formData.append('whatsapp', whatsapp);
      if (instagram) formData.append('instagram', instagram);
      if (finalWebsite) formData.append('website', finalWebsite);
      if (coverImage) formData.append('coverImage', coverImage);

      const res = await fetch(`${API_URL}/partners`, {
        method: 'POST',
        headers: {
          ...(user?.accessToken ? { Authorization: `Bearer ${user.accessToken}` } : {})
        },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
        throw new Error(msg || 'Erro ao criar parceiro.');
      }

      const partner = await res.json();
      router.push(`/rede/${partner.id}`);
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
          href="/rede"
          className="text-primary/70 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-primary">Novo Parceiro</h1>
          <p className="text-sm text-foreground/60">Cadastre um novo serviço ou comércio local</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl border border-border-custom shadow-sm">

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
        </div>

        <StateCitySelect
          selectedState={stateUF}
          selectedCity={city}
          onStateChange={setStateUF}
          onCityChange={setCity}
          inline={true}
        />

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
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-border-custom bg-white text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
              placeholder="(79) 9 0000-0000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              WhatsApp
            </label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-border-custom bg-white text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
              placeholder="(79) 9 0000-0000"
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
          <OpeningHoursEditor value={schedule} onChange={setSchedule} />
        </div>

        {/* Cover Image */}
        <div>
          <label className="block text-sm font-medium text-primary mb-1">
            Imagem de Capa
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
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar Parceiro
          </button>
        </div>
      </form>
    </div>
  );
}
