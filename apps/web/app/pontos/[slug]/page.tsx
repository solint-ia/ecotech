import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        href={point.trail ? `/trilhas/${point.trail.slug ?? ''}` : '/trilhas'}
        className="inline-flex items-center gap-1.5 text-sm text-primary/70 hover:text-primary transition-colors mb-4 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar à trilha
      </Link>

      {/* Hero */}
      {point.mainImage && (
        <div className="relative rounded-2xl overflow-hidden h-64 sm:h-80 bg-beige mb-6">
          <img src={point.mainImage} alt={point.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <span className="text-xs font-bold uppercase tracking-wide text-secondary">{point.type}</span>
        <h1 className="text-2xl font-bold text-primary mt-1">{point.title}</h1>
        {point.trail && (
          <p className="text-sm text-foreground/60 mt-1">
            Trilha:{' '}
            <span className="text-secondary font-medium">{point.trail.title}</span>
            {point.trail.school && ` • ${point.trail.school.name}`}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
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
        {point.pdfUrl && (
          <a
            href={point.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            id="btn-download-pdf"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            📄 Baixar PDF
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
            <h2 className="text-base font-bold text-primary mb-2">Descrição</h2>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
              {point.fullDescription}
            </p>
          </section>
        )}

        {point.curiosities && (
          <section>
            <h2 className="text-base font-bold text-primary mb-2">Curiosidades</h2>
            <p className="text-sm text-foreground/80 leading-relaxed">{point.curiosities}</p>
          </section>
        )}

        {point.environmentalImportance && (
          <section>
            <h2 className="text-base font-bold text-primary mb-2">Importância Ambiental</h2>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {point.environmentalImportance}
            </p>
          </section>
        )}

        {point.preservationCare && (
          <section>
            <h2 className="text-base font-bold text-primary mb-2">Cuidados de Preservação</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800 leading-relaxed">{point.preservationCare}</p>
            </div>
          </section>
        )}

        {/* QR Code section */}
        {qrCode && (
          <section>
            <h2 className="text-base font-bold text-primary mb-3">QR Code Offline</h2>
            <div className="flex flex-col sm:flex-row gap-4 items-start bg-white border border-border-custom rounded-xl p-4">
              {qrCode.image && (
                <img
                  src={qrCode.image}
                  alt="QR Code do ponto educativo"
                  id="qrcode-image"
                  className="w-32 h-32 object-contain rounded"
                />
              )}
              <div className="min-w-0">
                <p className="text-xs text-foreground/60 mb-2">
                  Escaneie o QR Code com sua câmera para ler o conteúdo deste ponto sem internet.
                </p>
                {qrCode.textContent && (
                  <pre className="text-xs bg-beige rounded-lg p-3 whitespace-pre-wrap text-foreground/70 font-mono">
                    {qrCode.textContent}
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
