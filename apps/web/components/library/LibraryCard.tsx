import Link from 'next/link';
import { getImageUrl } from '../../lib/image-url';
import { FileText, Video, Play, Download, User } from 'lucide-react';

export interface LibraryContent {
  id: string;
  title: string;
  description: string;
  contentType: string;
  coverImage: string;
  fileUrl?: string | null;
  videoUrl?: string | null;
  publishedAt?: string | null;
  user: { id: string; name: string; profileImage?: string | null };
  school?: { id: string; name: string; coverImage?: string | null } | null;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  GUIA: { label: 'Guia', color: 'bg-emerald-500', icon: FileText },
  FAUNA: { label: 'Fauna', color: 'bg-amber-500', icon: FileText },
  FLORA: { label: 'Flora', color: 'bg-green-600', icon: FileText },
  CARTILHA: { label: 'Cartilha', color: 'bg-blue-500', icon: FileText },
  PROTOCOLO: { label: 'Protocolo', color: 'bg-slate-600', icon: FileText },
  ODS: { label: 'ODS', color: 'bg-indigo-500', icon: FileText },
  CURIOSIDADE: { label: 'Curiosidade', color: 'bg-pink-500', icon: FileText },
  ARTIGO: { label: 'Artigo', color: 'bg-purple-500', icon: FileText },
  VIDEO: { label: 'Vídeo', color: 'bg-red-500', icon: Video },
};

interface LibraryCardProps {
  content: LibraryContent;
}

export default function LibraryCard({ content }: LibraryCardProps) {
  const config = TYPE_CONFIG[content.contentType] || { label: content.contentType, color: 'bg-gray-500', icon: FileText };
  const Icon = config.icon;
  const isVideo = content.contentType === 'VIDEO';

  return (
    <Link
      href={`/biblioteca/${content.id}`}
      className="group bg-white rounded-xl overflow-hidden border border-border-custom hover:shadow-lg transition-all duration-300 flex flex-col h-full"
    >
      {/* Cover Image */}
      <div className="relative h-48 overflow-hidden bg-beige shrink-0">
        <img
          src={getImageUrl(content.coverImage)}
          alt={content.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Type Badge */}
        <span className={`absolute top-3 left-3 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm ${config.color}`}>
          <Icon className="w-3.5 h-3.5" />
          {config.label}
        </span>

        {/* Video Play Overlay */}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 text-red-500 ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col">
        <h2 className="font-bold text-primary text-lg mb-2 line-clamp-2 group-hover:text-secondary transition-colors">
          {content.title}
        </h2>
        <p className="text-sm text-foreground/70 line-clamp-3 mb-4 flex-1">
          {content.description}
        </p>

        <hr className="border-border-custom mb-4" />

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-foreground/60">
          <div className="flex items-center gap-2">
            {content.school ? (
              <>
                <img 
                  src={getImageUrl(content.school.coverImage) || '/placeholder-school.png'} 
                  alt={content.school.name} 
                  className="w-6 h-6 rounded-full object-cover border border-border-custom"
                />
                <span className="font-medium truncate max-w-[120px]">{content.school.name}</span>
              </>
            ) : (
              <>
                {content.user.profileImage ? (
                  <img 
                    src={getImageUrl(content.user.profileImage)} 
                    alt={content.user.name} 
                    className="w-6 h-6 rounded-full object-cover border border-border-custom"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-secondary/10 flex items-center justify-center">
                    <User className="w-3 h-3 text-secondary" />
                  </div>
                )}
                <span className="font-medium truncate max-w-[120px]">{content.user.name}</span>
              </>
            )}
          </div>
          
          <div className="flex items-center text-primary font-medium">
            {isVideo ? 'Assistir' : (
              <span className="flex items-center gap-1">
                <Download className="w-3.5 h-3.5" />
                Baixar
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
