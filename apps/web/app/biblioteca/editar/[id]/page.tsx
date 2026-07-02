'use client';

import { useState, useRef, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { BookOpen, UploadCloud, AlertCircle, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getImageUrl } from '../../../../lib/image-url';

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

export default function EditarBibliotecaPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user as any;
  const { id } = use(params);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState('GUIA');
  const [videoUrl, setVideoUrl] = useState('');
  
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [currentCover, setCurrentCover] = useState<string | null>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [currentFile, setCurrentFile] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isVideo = contentType === 'VIDEO';

  useEffect(() => {
    async function loadData() {
      if (!user?.accessToken) return;
      try {
        const res = await fetch(`${API_URL}/library/${id}`, {
          headers: { Authorization: `Bearer ${user.accessToken}` },
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        
        setTitle(data.title);
        setDescription(data.description);
        setContentType(data.contentType);
        setVideoUrl(data.videoUrl || '');
        setCurrentCover(data.coverImage);
        setCurrentFile(data.fileUrl);
      } catch (err) {
        setError('Não foi possível carregar os dados do material.');
      } finally {
        setInitialLoading(false);
      }
    }
    
    if (user?.accessToken) {
      loadData();
    }
  }, [id, user?.accessToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isVideo && !videoUrl) {
      setError('O link do vídeo é obrigatório para conteúdos em vídeo.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('contentType', contentType);
      
      if (coverImage) {
        formData.append('coverImage', coverImage);
      }

      if (isVideo) {
        formData.append('videoUrl', videoUrl);
      } else if (file) {
        formData.append('file', file);
      }

      const res = await fetch(`${API_URL}/library/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Erro ao atualizar conteúdo.');
      }

      setShowSuccessModal(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar conteúdo.');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || initialLoading) {
    return <div className="p-8 text-center text-foreground/50">Carregando...</div>;
  }

  if (showSuccessModal) {
    return (
      <div className="max-w-2xl mx-auto pb-12 pt-10">
        <div className="bg-white p-8 md:p-12 rounded-3xl border border-border-custom shadow-lg text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold text-primary mb-4">Material Atualizado!</h2>
          <p className="text-foreground/70 text-lg mb-8 max-w-md">
            {user.role === 'ADMIN'
              ? 'As alterações foram salvas e publicadas com sucesso.'
              : 'Suas alterações foram enviadas para análise. Enquanto isso, a versão anterior continua disponível para a rede.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <Link
              href={user.role === 'ADMIN' ? '/admin/biblioteca' : '/biblioteca/meus-materiais'}
              className="px-6 py-3 bg-beige text-primary rounded-xl font-semibold hover:bg-beige/80 transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Voltar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-12 px-4 md:px-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2 mb-2">
          <BookOpen className="w-6 h-6 text-secondary" />
          Editar Material
        </h1>
        <p className="text-foreground/70 text-sm">
          Atualize as informações do seu material educativo.
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
            className="w-full px-4 py-2.5 rounded-xl border border-border-custom bg-background focus:outline-none focus:ring-2 focus:ring-secondary text-sm resize-none"
          />
        </div>

        <hr className="border-border-custom" />

        {/* Imagem de Capa */}
        <div>
          <label className="block text-sm font-bold text-primary mb-1.5">Imagem de Capa (Deixe em branco para manter a atual)</label>
          {currentCover && !coverImage && (
            <div className="mb-4">
              <img src={getImageUrl(currentCover)} alt="Capa Atual" className="h-32 rounded-lg object-cover border border-border-custom shadow-sm" />
            </div>
          )}
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
                <span className="text-sm text-foreground/60 font-medium">Clique para enviar uma nova foto (Opcional)</span>
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
            {isVideo ? 'Link do Vídeo' : 'Arquivo para Download (Deixe em branco para manter)'}
          </label>
          
          {isVideo ? (
            <input
              type="url"
              required
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border-custom bg-background focus:outline-none focus:ring-2 focus:ring-secondary text-sm"
            />
          ) : (
            <>
              {currentFile && !file && (
                <div className="mb-4 flex items-center gap-2 p-3 bg-beige rounded-lg border border-border-custom text-sm font-medium text-foreground/80">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Arquivo atual já enviado
                </div>
              )}
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
                    <span className="text-sm text-foreground/60 font-medium">Clique para enviar um novo arquivo (Opcional)</span>
                  </>
                )}
                <input
                  type="file"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
            </>
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
              Atualizando...
            </>
          ) : (
            'Salvar Alterações'
          )}
        </button>
      </form>
    </div>
  );
}
