'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft, MapPin, Phone, MessageCircle, 
  Globe, Instagram, Clock, Info, Image as ImageIcon, Store
} from 'lucide-react';
import Link from 'next/link';
import { getImageUrl } from '../../../lib/image-url';
import { PartnerGallery } from '../../../components/rede/PartnerGallery';
import { formatOpeningHoursDisplay } from '../../../lib/opening-hours';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Partner {
  id: string;
  name: string;
  category: string;
  description: string;
  coverImage: string;
  address: string;
  city: string;
  phone: string;
  whatsapp?: string;
  instagram?: string;
  website?: string;
  openingHours: string;
  photos: { id: string; image: string }[];
}

export default function PartnerDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as any;
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    async function fetchPartner() {
      try {
        const res = await fetch(`${API_URL}/partners/${id}`);
        if (!res.ok) {
          if (res.status === 404) router.push('/rede');
          return;
        }
        const data = await res.json();
        setPartner(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPartner();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
      </div>
    );
  }

  if (!partner) return null;

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Back button and Edit */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/rede"
          className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-secondary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Rede
        </Link>
        {user?.role === 'ADMIN' && (
          <Link
            href={`/rede/${partner.id}/editar`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-white text-sm font-semibold rounded-lg hover:bg-secondary/90 transition-colors shadow-sm"
          >
            Editar Parceiro
          </Link>
        )}
      </div>

      {/* Hero Section */}
      <div className="bg-white rounded-2xl overflow-hidden border border-border-custom shadow-sm mb-8">
        <div className="h-64 sm:h-80 relative bg-beige">
          {partner.coverImage ? (
            <img
              src={getImageUrl(partner.coverImage)}
              alt={partner.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-gray-400">Sem imagem de capa</span>
            </div>
          )}
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-primary text-sm font-bold rounded-full shadow-sm">
              {partner.category}
            </span>
          </div>
        </div>
        
        <div className="p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-primary mb-2">{partner.name}</h1>
          <p className="text-foreground/70 flex items-center gap-2 mb-6 text-sm sm:text-base">
            <MapPin className="w-5 h-5 text-secondary" />
            {partner.address}, {partner.city}
          </p>

          <div className="flex flex-wrap gap-3">
            {partner.whatsapp && (
              <a
                href={`https://wa.me/55${partner.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366] text-white rounded-lg hover:bg-[#1ebd5a] transition-colors font-medium shadow-sm"
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp
              </a>
            )}
            <a
              href={`tel:${partner.phone.replace(/\D/g, '')}`}
              className="flex items-center gap-2 px-4 py-2.5 bg-beige text-primary rounded-lg hover:bg-beige/80 border border-border-custom transition-colors font-medium"
            >
              <Phone className="w-5 h-5" />
              Ligar
            </a>
            {partner.instagram && (
              <a
                href={`https://instagram.com/${partner.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white rounded-lg hover:opacity-90 transition-opacity font-medium shadow-sm"
              >
                <Instagram className="w-5 h-5" />
                Instagram
              </a>
            )}
            {partner.website && (
              <a
                href={partner.website.startsWith('http') ? partner.website : `https://${partner.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-primary rounded-lg hover:bg-gray-50 border border-border-custom transition-colors font-medium"
              >
                <Globe className="w-5 h-5" />
                Website
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-8">
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-border-custom shadow-sm">
            <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <Info className="w-6 h-6 text-secondary" />
              Sobre o Parceiro
            </h2>
            <div className="prose prose-sm sm:prose-base text-foreground/80 whitespace-pre-wrap">
              {partner.description}
            </div>
          </section>

          {/* Gallery Section */}
          <PartnerGallery partnerId={partner.id} photos={partner.photos || []} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-border-custom shadow-sm">
            <h3 className="font-bold text-primary mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-secondary" />
              Horário de Funcionamento
            </h3>
            <p className="text-sm text-foreground/80 whitespace-pre-wrap">
              {formatOpeningHoursDisplay(partner.openingHours)}
            </p>
          </div>
          

        </div>
      </div>


    </div>
  );
}
