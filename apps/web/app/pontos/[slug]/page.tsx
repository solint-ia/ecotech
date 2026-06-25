import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Download, Leaf, TreePine } from 'lucide-react';
import QrCodeDownloadBtn from '../../../components/pontos/QrCodeDownloadBtn';
import { getImageUrl } from '../../../lib/image-url';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const POINT_TYPE_LABELS: Record<string, string> = {
  FLORA: 'Flora',
  RIO: 'Rio',
  FAUNA: 'Fauna',
  ESPACO_CULTURAL: 'Espaço Cultural',
  AREA_VERDE: 'Área Verde',
  OUTRO: 'Outro',
};

async function getPoint(slug: string) {
  try {
    const res = await fetch(`${API_URL}/educational-points/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const point = await getPoint(slug);
  if (!point) return { title: 'Ponto educativo não encontrado — EcoTech' };
  return {
    title: `${point.title} — EcoTech`,
    description: point.shortDescription || point.fullDescription,
  };
}

export default async function PointDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const point = await getPoint(slug);

  if (!point) notFound();

  const qrCode = point.qrCodes?.[0];
  const trailSlug = point.trail?.slug;
  const pdfUrl = point.pdfUrl ? `${API_URL}${point.pdfUrl}` : null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        href={trailSlug ? `/trilhas/${trailSlug}` : '/trilhas'}
        className="inline-flex items-center gap-1.5 text-sm text-primary/70 hover:text-primary transition-colors mb-4 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar à trilha
      </Link>

      {/* Hero */}
      {point.mainImage && (
        <div className="relative rounded-2xl overflow-hidden h-64 sm:h-80 bg-beige mb-6">
          <img src={getImageUrl(point.mainImage)} alt={point.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          {/* Overlay badge */}
          <div className="absolute bottom-4 left-5">
            <span className="text-xs font-bold uppercase tracking-wide bg-secondary/90 text-white px-2.5 py-1 rounded-full">
              {POINT_TYPE_LABELS[point.type] ?? point.type}
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-5">
        {!point.mainImage && (
          <span className="text-xs font-bold uppercase tracking-wide text-secondary">
            {POINT_TYPE_LABELS[point.type] ?? point.type}
          </span>
        )}
        <h1 className="text-2xl font-bold text-primary mt-1">{point.title}</h1>
        {point.trail && (
          <p className="text-sm text-foreground/60 mt-1 flex flex-wrap gap-1 items-center">
            <span>Trilha:</span>
            <Link
              href={trailSlug ? `/trilhas/${trailSlug}` : '/trilhas'}
              className="text-secondary font-medium hover:underline"
            >
              {point.trail.title}
            </Link>
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 mb-7">
        {trailSlug && (
          <Link
            href={`/trilhas/${trailSlug}`}
            id="btn-ver-trilha"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/5 transition-colors"
          >
            <Leaf className="w-4 h-4" />
            Ver trilha completa
          </Link>
        )}
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            id="btn-download-pdf"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Download className="w-4 h-4" />
            Baixar PDF
          </a>
        )}
        {point.trail?.wikilocUrl && (
          <a
            href={point.trail.wikilocUrl}
            target="_blank"
            rel="noopener noreferrer"
            id="btn-wikiloc-point"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-secondary text-secondary text-sm font-medium hover:bg-secondary/5 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Ver no Wikiloc
          </a>
        )}
      </div>

      {/* Main content */}
      <div className="space-y-6">
        {point.shortDescription && (
          <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-4">
            <p className="text-sm text-primary font-medium leading-relaxed">{point.shortDescription}</p>
          </div>
        )}

        {point.fullDescription && (
          <section>
            <h2 className="text-base font-bold text-primary mb-2">Descrição Educativa</h2>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
              {point.fullDescription}
            </p>
          </section>
        )}

        {point.curiosities && (
          <section className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <h2 className="text-base font-bold text-amber-800 mb-2">💡 Curiosidades</h2>
            <p className="text-sm text-amber-900 leading-relaxed">{point.curiosities}</p>
          </section>
        )}

        {point.environmentalImportance && (
          <section>
            <h2 className="text-base font-bold text-primary mb-2">🌱 Importância Ambiental</h2>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {point.environmentalImportance}
            </p>
          </section>
        )}

        {point.preservationCare && (
          <section>
            <h2 className="text-base font-bold text-primary mb-2">🛡️ Cuidados e Preservação</h2>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 leading-relaxed">{point.preservationCare}</p>
            </div>
          </section>
        )}

        {/* QR Code section */}
        {qrCode && (
          <section>
            <h2 className="text-base font-bold text-primary mb-3">QR Code Híbrido</h2>
            <div className="flex flex-col sm:flex-row gap-5 items-start bg-white border border-border-custom rounded-xl p-5">
              {/* QR image */}
              {qrCode.qrImage && (
                <div className="flex-shrink-0 text-center">
                  <img
                    src={qrCode.qrImage.startsWith('http') ? qrCode.qrImage : `${API_URL}${qrCode.qrImage}`}
                    alt="QR Code do ponto educativo"
                    id="qrcode-image"
                    className="w-36 h-36 object-contain rounded border border-border-custom"
                  />
                  <QrCodeDownloadBtn
                    pointTitle={point.title}
                    pointSlug={point.slug}
                    qrImage={qrCode.qrImage}
                    qrTextContent={qrCode.qrTextContent}
                    apiUrl={API_URL}
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs text-foreground/60 mb-2">
                  Escaneie com a câmera do celular. Mesmo sem internet, o conteúdo resumido estará disponível. Com internet, você acessa a página completa.
                </p>
                {qrCode.qrTextContent && (
                  <pre className="text-xs bg-beige rounded-lg p-3 whitespace-pre-wrap text-foreground/70 font-mono leading-relaxed overflow-x-auto">
                    {qrCode.qrTextContent}
                  </pre>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
