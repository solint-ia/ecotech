'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { BookOpen, UploadCloud, AlertCircle, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const CATEGORIES = [
  { value: 'GUIA', label: 'Guia' },
  { value: 'FAUNA', label: 'Fauna' },
  { value: 'FLORA', label: 'Flora' },
  { value: 'CARTILHA', label: 'Cartilha' },
  { value: 'PROTOCOLO', label: 'Protocolo' },
  { value: 'ODS', label: 'ODS' },
  { value: 'CURIOSIDADE', label: 'Curiosidade' },
  { value: 'ARTIGO', label: 'Artigo' },
  { value: 'VIDEO', label: 'Vídeo' },
];

export default function NovaBibliotecaPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user as any;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState('GUIA');
  const [videoUrl, setVideoUrl] = useState('');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isVideo = contentType === 'VIDEO';

  // Redirect if not authorized
  const isApproved = user?.roleStatus === 'APROVADO';
  const isAllowedRole = user?.role === 'ADMIN' || (['SCHOOL_MANAGER', 'TEACHER'].includes(user?.role) && isApproved);
  if (status === 'loading') return null;
  if (!user || !isAllowedRole) {
    router.push('/biblioteca');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!coverImage) {
      setError('A imagem de capa é obrigatória.');
      return;
    }

    if (isVideo && !videoUrl) {
      setError('O link do vídeo é obrigatório para conteúdos em vídeo.');
      return;
    }

    if (!isVideo && !file) {
      setError('O arquivo (PDF/Doc) é obrigatório para este tipo de conteúdo.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('contentType', contentType);
      formData.append('coverImage', coverImage);

      if (isVideo) {
        formData.append('videoUrl', videoUrl);
      } else if (file) {
        formData.append('file', file);
      }

      const res = await fetch(`${API_URL}/library`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Erro ao enviar conteúdo.');
      }

      setShowSuccessModal(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar conteúdo.');
    } finally {
      setLoading(false);
    }
  };

  if (showSuccessModal) {
    return (
      <div className="max-w-2xl mx-auto pb-12 pt-10">
        <div className="bg-white p-8 md:p-12 rounded-3xl border border-border-custom shadow-lg text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold text-primary mb-4">Material Enviado!</h2>
          <p className="text-foreground/70 text-lg mb-8 max-w-md">
            {user.role === 'ADMIN'
              ? 'Seu material educativo foi publicado com sucesso e já está disponível na Biblioteca Digital.'
              : 'Recebemos seu material educativo com sucesso. Ele foi enviado para análise e, assim que aprovado, ficará visível para toda a rede.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <Link
              href="/biblioteca"
              className="px-6 py-3 bg-beige text-primary rounded-xl font-semibold hover:bg-beige/80 transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Voltar para Biblioteca
            </Link>
            <button
              onClick={() => {
                setTitle('');
                setDescription('');
                setVideoUrl('');
                setCoverImage(null);
                setFile(null);
                setShowSuccessModal(false);
              }}
              className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              Enviar Outro Material
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2 mb-2">
          <BookOpen className="w-6 h-6 text-secondary" />
          Enviar Material
        </h1>
        <p className="text-foreground/70 text-sm">
          {user.role === 'ADMIN'
            ? 'Publique um novo material educativo diretamente na biblioteca.'
            : 'Envie um material educativo. Ele passará pela avaliação da administração antes de ser publicado.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl border border-border-custom shadow-sm space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl flex items-center gap-2 font-medium border border-red-100">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {/* Categoria */}
        <div>
          <label className="block text-sm font-bold text-primary mb-1.5">Categoria / Tipo</label>
          <select
            value={contentType}
            onChange={(e) => {
              setContentType(e.target.value);
              setFile(null);
              setVideoUrl('');
            }}
            className="w-full px-4 py-2.5 rounded-xl border border-border-custom bg-background focus:outline-none focus:ring-2 focus:ring-secondary text-sm"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        {/* Título */}
        <div>
          <label className="block text-sm font-bold text-primary mb-1.5">Título do Material</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Guia de Observação de Pássaros"
            className="w-full px-4 py-2.5 rounded-xl border border-border-custom bg-background focus:outline-none focus:ring-2 focus:ring-secondary text-sm"
          />
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-sm font-bold text-primary mb-1.5">Descrição Curta</label>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Sobre o que é este material..."
            className="w-full px-4 py-2.5 rounded-xl border border-border-custom bg-background focus:outline-none focus:ring-2 focus:ring-secondary text-sm resize-none"
          />
        </div>

        <hr className="border-border-custom" />

        {/* Imagem de Capa */}
        <div>
          <label className="block text-sm font-bold text-primary mb-1.5">Imagem de Capa</label>
          <div 
            onClick={() => coverInputRef.current?.click()}
            className="w-full h-32 border-2 border-dashed border-border-custom rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-beige/50 transition-colors bg-background"
          >
            {coverImage ? (
              <span className="text-sm font-medium text-secondary flex items-center gap-2">
                <UploadCloud className="w-5 h-5" />
                {coverImage.name}
              </span>
            ) : (
              <>
                <UploadCloud className="w-8 h-8 text-foreground/40 mb-2" />
                <span className="text-sm text-foreground/60 font-medium">Clique para enviar uma foto (JPG, PNG)</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={coverInputRef}
              onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        {/* Arquivo ou Vídeo */}
        <div>
          <label className="block text-sm font-bold text-primary mb-1.5">
            {isVideo ? 'Link do Vídeo' : 'Arquivo para Download'}
          </label>
          
          {isVideo ? (
            <input
              type="url"
              required
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-4 py-2.5 rounded-xl border border-border-custom bg-background focus:outline-none focus:ring-2 focus:ring-secondary text-sm"
            />
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-32 border-2 border-dashed border-border-custom rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-beige/50 transition-colors bg-background"
            >
              {file ? (
                <span className="text-sm font-medium text-secondary flex items-center gap-2">
                  <UploadCloud className="w-5 h-5" />
                  {file.name}
                </span>
              ) : (
                <>
                  <UploadCloud className="w-8 h-8 text-foreground/40 mb-2" />
                  <span className="text-sm text-foreground/60 font-medium">Clique para enviar o arquivo (PDF, DOC, etc)</span>
                </>
              )}
              <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white font-bold py-3.5 rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Enviando...
            </>
          ) : (
            'Enviar Material'
          )}
        </button>
      </form>
    </div>
  );
}
