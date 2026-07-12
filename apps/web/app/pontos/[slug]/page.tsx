import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Download, Leaf, TreePine } from 'lucide-react';
import QrCodeDownloadBtn from '../../../components/pontos/QrCodeDownloadBtn';
import { getImageUrl } from '../../../lib/image-url';
import FileDownloadBtn from '../../../components/shared/FileDownloadBtn';
import { auth } from '../../../lib/auth';

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

async function getPoint(slug: string, accessToken?: string) {
  try {
    const res = await fetch(`${API_URL}/educational-points/${slug}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      // Only the public (token-less) response may be cached — a personalised
      // response carries the QR code and must never be shared between viewers.
      ...(accessToken ? { cache: 'no-store' as const } : { next: { revalidate: 3600 } }),
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
  if (!point) return { title: 'Ponto interpretativo não encontrado — EcoTech' };
  return {
    title: `${point.title} — EcoTech`,
    description: point.shortDescription || point.fullDescription,
  };
}

export default async function PointDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // The session has to be resolved first: the QR code is only attached to the
  // response when the request carries the token of someone allowed to see it.
  const session = await auth();
  const user = session?.user as any;
  const point = await getPoint(slug, user?.accessToken);

  if (!point) notFound();

  // The API decides who may see the QR code; the UI just follows its answer.
  const canSeeQrCode = point.canSeeQrCode === true;
  const qrCode = point.qrCodes?.[0];
  const trailSlug = point.trail?.slug;
  const pdfUrl = point.pdfUrl ? getImageUrl(point.pdfUrl) : null;

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

      {/* Hero & Header */}
      <div className="relative rounded-3xl overflow-hidden min-h-[320px] sm:min-h-[400px] bg-beige mb-8 shadow-sm flex flex-col justify-end">
        {point.mainImage ? (
          <img src={getImageUrl(point.mainImage)} alt={point.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-forest/5">
            <span className="text-forest/20 text-6xl">🌿</span>
          </div>
        )}
        
        {/* Gradient overlay - covers bottom 35-40% */}
        <div className="absolute inset-x-0 bottom-0 h-[60%] sm:h-[45%] bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
        
        {/* Info overlay */}
        <div className="relative z-10 p-6 sm:p-8 w-full mt-auto">
          <div className="mb-3">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md border border-white/30 text-white px-3 py-1 rounded-full shadow-sm">
              {POINT_TYPE_LABELS[point.type] ?? point.type}
            </span>
          </div>
          <h1 className="text-white text-3xl sm:text-4xl font-extrabold drop-shadow-md leading-tight mb-2">
            {point.title}
          </h1>
          {point.trail && (
            <p className="text-white/90 text-sm sm:text-base font-medium flex items-center gap-1.5 drop-shadow-sm">
              <span>Trilha:</span>
              <Link
                href={trailSlug ? `/trilhas/${trailSlug}` : '/trilhas'}
                className="text-white hover:text-white/70 hover:underline transition-colors font-bold"
              >
                {point.trail.title}
              </Link>
            </p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 mb-8">
        {trailSlug && (
          <Link
            href={`/trilhas/${trailSlug}`}
            id="btn-ver-trilha"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-forest text-forest text-sm font-semibold hover:bg-forest/5 transition-all active:scale-95 shadow-sm"
          >
            <Leaf className="w-4 h-4" />
            Ver trilha completa
          </Link>
        )}
        {pdfUrl && (
          <FileDownloadBtn 
            fileUrl={pdfUrl} 
            fileName={`ecotech-${point.slug}.pdf`} 
            label="Baixar PDF" 
          />
        )}
        {point.trail?.wikilocUrl && (
          <a
            href={point.trail.wikilocUrl}
            target="_blank"
            rel="noopener noreferrer"
            id="btn-wikiloc-point"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
              !pdfUrl 
                ? 'bg-forest text-white shadow-md hover:bg-forest/90 hover:shadow-lg' 
                : 'border border-forest text-forest hover:bg-forest/5 shadow-sm'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ver no Wikiloc
          </a>
        )}
      </div>

      {/* Main content */}
      <div className="space-y-8">
        {point.shortDescription && (
          <div className="bg-sage rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-forest font-medium leading-relaxed">{point.shortDescription}</p>
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

        {/* QR Code section (Only visible to Admins or the Trail's School Manager) */}
        {qrCode && canSeeQrCode && (
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">QR Code Híbrido</h2>
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start bg-white rounded-2xl p-6 shadow-sm border border-border-custom/40">
              {/* QR image */}
              {qrCode.qrImage && (
                <div className="flex-shrink-0 text-center w-full md:w-1/3 flex flex-col items-center">
                  <div className="bg-white p-3 rounded-xl border border-border-custom/50 inline-block mb-4 shadow-sm">
                    <img
                      src={qrCode.qrImage.startsWith('http') ? qrCode.qrImage : `${API_URL}${qrCode.qrImage}`}
                      alt="QR Code do ponto interpretativo"
                      id="qrcode-image"
                      className="w-40 h-40 object-contain rounded"
                    />
                  </div>
                  <QrCodeDownloadBtn
                    pointTitle={point.title}
                    pointSlug={point.slug}
                    qrImage={qrCode.qrImage}
                    qrTextContent={qrCode.qrTextContent}
                    apiUrl={API_URL}
                  />
                </div>
              )}
              <div className="min-w-0 flex-1 md:border-l md:border-border-custom md:pl-8">
                <p className="text-sm text-foreground/60 mb-5 leading-relaxed">
                  Escaneie com a câmera do celular. Mesmo sem internet, o conteúdo resumido estará disponível. Com internet, você acessa a página completa.
                </p>
                {qrCode.qrTextContent && (
                  <div className="bg-sage/40 rounded-xl p-5 border border-sage/50">
                    <pre className="text-xs sm:text-sm text-forest font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">
                      {qrCode.qrTextContent}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
