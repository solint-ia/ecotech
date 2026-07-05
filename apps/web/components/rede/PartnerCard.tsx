import Link from 'next/link';
import { MapPin, Phone, MessageCircle } from 'lucide-react';
import { getImageUrl } from '../../lib/image-url';

export interface Partner {
  id: string;
  name: string;
  category: string;
  description: string;
  coverImage: string;
  address: string;
  city: string;
  state?: string;
  phone: string;
  whatsapp?: string;
  status?: boolean;
}

interface PartnerCardProps {
  partner: Partner;
}

export function PartnerCard({ partner }: PartnerCardProps) {
  return (
    <Link
      href={`/rede/${partner.id}`}
      className="group bg-white rounded-xl overflow-hidden border border-border-custom hover:shadow-md transition-shadow duration-200 flex flex-col h-full"
    >
      {/* Cover Image */}
      <div className="relative h-48 overflow-hidden bg-beige shrink-0">
        {partner.coverImage ? (
          <img
            src={getImageUrl(partner.coverImage)}
            alt={partner.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <span className="text-gray-400">Sem imagem</span>
          </div>
        )}
        <span className="absolute top-3 left-3 text-white text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary">
          {partner.category}
        </span>
      </div>

      {/* Card Content */}
      <div className="p-4 flex flex-col flex-1">
        <h2 className="font-semibold text-primary text-sm mb-1 line-clamp-1 group-hover:text-secondary transition-colors">
          {partner.name}
        </h2>
        <p className="text-xs text-foreground/60 mb-2 flex items-center gap-1">
          <MapPin className="w-3 h-3 shrink-0" />
          {partner.city}
        </p>
        <p className="text-xs text-foreground/70 line-clamp-3 mb-4 flex-1">
          {partner.description}
        </p>

        <hr className="border-border-custom mb-4 mt-auto" />

        <div className="flex flex-nowrap items-center gap-2 mt-auto">
          <span className="flex-1 min-w-0 text-center py-2 bg-beige text-primary rounded-lg text-xs font-medium group-hover:bg-beige/80 transition-colors border border-border-custom truncate">
            Ver Detalhes
          </span>
          {partner.whatsapp && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(
                  `https://wa.me/55${partner.whatsapp!.replace(/\D/g, '')}`,
                  '_blank',
                  'noopener,noreferrer'
                );
              }}
              className="flex items-center justify-center p-2 bg-[#25D366] text-white rounded-lg hover:bg-[#1ebd5a] transition-colors shadow-sm shrink-0"
              title="Contato via WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
