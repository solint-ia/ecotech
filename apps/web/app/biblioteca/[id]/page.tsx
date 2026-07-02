import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Video, FileText, User, Calendar, ExternalLink } from 'lucide-react';
import { getImageUrl } from '../../../lib/image-url';
import LibraryItemActions from './LibraryItemActions';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const TYPE_LABELS: Record<string, string> = {
  GUIA: 'Guia',
  FAUNA: 'Fauna',
  FLORA: 'Flora',
  CARTILHA: 'Cartilha',
  PROTOCOLO: 'Protocolo',
  ODS: 'ODS',
  CURIOSIDADE: 'Curiosidade',
  ARTIGO: 'Artigo',
  VIDEO: 'Vídeo',
};

async function getContent(id: string) {
  try {
    const res = await fetch(`${API_URL}/library/${id}`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const content = await getContent(id);
  if (!content) return { title: 'Conteúdo não encontrado — EcoTech' };
  return {
    title: `${content.title} — EcoTech`,
    description: content.description,
  };
}

export default async function LibraryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const content = await getContent(id);

  if (!content) notFound();

  const isVideo = content.contentType === 'VIDEO';
  const typeLabel = TYPE_LABELS[content.contentType] || content.contentType;

  // Extract YouTube ID if it's a YouTube link
  let youtubeEmbedUrl = null;
  if (isVideo && content.videoUrl) {
    const match = content.videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    if (match && match[1]) {
      youtubeEmbedUrl = `https://www.youtube.com/embed/${match[1]}`;
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Back Link */}
      <Link
        href="/biblioteca"
        className="inline-flex items-center gap-1.5 text-sm text-primary/70 hover:text-primary transition-colors mb-6 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para Biblioteca
      </Link>

      <div className="bg-white rounded-2xl overflow-hidden border border-border-custom shadow-sm">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row">
          {/* Cover */}
          <div className="w-full md:w-2/5 h-64 md:h-auto relative bg-beige">
            <img
              src={getImageUrl(content.coverImage)}
              alt={content.title}
              className="w-full h-full object-cover"
            />
            {content.approvalStatus === 'PENDENTE' && (
              <span className="absolute top-4 right-4 bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                EM ANÁLISE
              </span>
            )}
            {content.approvalStatus === 'REPROVADO' && (
              <span className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                REPROVADO
              </span>
            )}
          </div>

          {/* Info */}
          <div className="w-full md:w-3/5 p-6 md:p-8 flex flex-col">
            <span className="inline-block text-xs font-bold text-secondary uppercase tracking-wider mb-2">
              {typeLabel}
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-primary mb-4 leading-tight">
              {content.title}
            </h1>
            
            <p className="text-foreground/70 text-sm md:text-base leading-relaxed mb-6 flex-1">
              {content.description}
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-border-custom">
              {/* Author */}
              <div className="flex items-center gap-3">
                {content.school ? (
                  <>
                    <img 
                      src={getImageUrl(content.school.coverImage) || '/placeholder-school.png'} 
                      alt={content.school.name} 
                      className="w-10 h-10 rounded-full object-cover border border-border-custom shadow-sm"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs text-foreground/50 font-medium">Publicado por</span>
                      <span className="text-sm font-semibold text-primary">{content.school.name}</span>
                    </div>
                  </>
                ) : (
                  <>
                    {content.user.profileImage ? (
                      <img 
                        src={getImageUrl(content.user.profileImage)} 
                        alt={content.user.name} 
                        className="w-10 h-10 rounded-full object-cover border border-border-custom shadow-sm"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center shadow-sm">
                        <User className="w-5 h-5 text-secondary" />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-xs text-foreground/50 font-medium">Publicado por</span>
                      <span className="text-sm font-semibold text-primary">{content.user.name}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Date */}
              {content.publishedAt && (
                <div className="flex flex-col sm:items-end">
                  <span className="text-xs text-foreground/50 font-medium">Data</span>
                  <span className="text-sm font-semibold text-foreground/80 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-secondary" />
                    {new Date(content.publishedAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
            </div>

            {/* Actions for Admins or Owners */}
            <LibraryItemActions 
              id={content.id} 
              userId={content.userId} 
              schoolId={content.schoolId} 
            />
          </div>
        </div>

        {/* Action / Content Area */}
        <div className="p-6 md:p-8 bg-beige/30 border-t border-border-custom">
          {isVideo ? (
            <div className="w-full">
              <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                <Video className="w-5 h-5 text-secondary" />
                Assistir Vídeo
              </h3>
              {youtubeEmbedUrl ? (
                <div className="aspect-video w-full rounded-xl overflow-hidden shadow-md border border-border-custom bg-black">
                  <iframe
                    width="100%"
                    height="100%"
                    src={youtubeEmbedUrl}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              ) : (
                <div className="p-6 bg-white rounded-xl border border-border-custom text-center shadow-sm flex flex-col items-center">
                  <Video className="w-12 h-12 text-secondary/40 mb-3" />
                  <p className="text-foreground/70 mb-4">
                    Este vídeo está hospedado em uma plataforma externa.
                  </p>
                  <a
                    href={content.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors shadow-md"
                  >
                    Assistir na plataforma original
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-white rounded-xl border border-border-custom shadow-sm">
              <div className="flex items-center gap-4 mb-4 sm:mb-0">
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-bold text-primary">Arquivo de Download</h3>
                  <p className="text-sm text-foreground/60">Baixe o material completo em PDF ou Documento.</p>
                </div>
              </div>
              <a
                href={getImageUrl(content.fileUrl)}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold transition-all shadow-md active:scale-95"
              >
                <Download className="w-5 h-5" />
                Fazer Download
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
