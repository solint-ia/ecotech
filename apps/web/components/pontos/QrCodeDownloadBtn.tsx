'use client';

import { Download } from 'lucide-react';

interface QrCodeDownloadBtnProps {
  pointTitle: string;
  pointSlug: string;
  qrImage: string;
  qrTextContent?: string;
  apiUrl: string;
}

// Brand palette (RGB) — green identity for text/graphics; the QR stays pure
// black on white for maximum scannability.
const GREEN_DARK: [number, number, number] = [18, 58, 41]; // #123a29
const GREEN: [number, number, number] = [31, 107, 71]; // #1f6b47
const GREEN_SOFT: [number, number, number] = [76, 139, 94]; // #4C8B5E
const LIGHT_BG: [number, number, number] = [244, 246, 241]; // #f4f6f1
const MUTED: [number, number, number] = [110, 125, 112];
const CREAM: [number, number, number] = [238, 241, 233];

const CTA_TEXT =
  'NOS ACOMPANHE NAS NOSSAS REDES SOCIAIS, SE INSPIRE E CONTRIBUA COM PRÁTICAS DE EDUCAÇÃO AMBIENTAL NO SEU LUGAR!';

async function toDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function QrCodeDownloadBtn({
  pointTitle,
  pointSlug,
  qrImage,
  apiUrl,
}: QrCodeDownloadBtnProps) {
  const handleDownload = async () => {
    const { jsPDF } = await import('jspdf');

    // The QR image already ships from the backend as pure black-on-white with
    // the EcoTech logo composited in its center (errorCorrectionLevel 'H',
    // ~11% occlusion — well under 20%), so we just place it as-is.
    const qrUrl = qrImage.startsWith('http') ? qrImage : `${apiUrl}${qrImage}`;
    const qrData = await toDataUrl(qrUrl);

    // Header brand logo (same-origin public asset). Optional — skip on failure.
    let logoData: string | null = null;
    try {
      logoData = await toDataUrl('/EcoTechLogo.png');
    } catch {
      logoData = null;
    }

    // A5 sheet (148 x 210 mm) — compact layout so it can be printed and posted
    // at a trail access point for scanning. Spacing between elements is kept
    // tight; the QR itself stays large for easy reading.
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const W = 148;
    const cx = W / 2;

    // Thin green accent bar at the very top.
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, W, 2.5, 'F');

    // ---- Header: brand logo (centered) ----
    if (logoData) {
      try {
        const props = doc.getImageProperties(logoData);
        const logoH = 12;
        const logoW = (props.width / props.height) * logoH;
        doc.addImage(logoData, 'PNG', cx - logoW / 2, 6, logoW, logoH);
      } catch {
        /* ignore logo render issues */
      }
    }

    // ---- Title ----
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...GREEN_DARK);
    doc.text('Projeto Ecotech', cx, 26, { align: 'center' });

    // Decorative underline centered below the title.
    doc.setDrawColor(...GREEN_SOFT);
    doc.setLineWidth(0.7);
    doc.line(cx - 12, 29.5, cx + 12, 29.5);

    // Scan hint.
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(
      'Aponte a câmera do seu celular para acessar o ponto educativo',
      cx,
      35,
      { align: 'center', maxWidth: 120 },
    );

    // ---- QR Code (centered, framed) — ~70% of the sheet width for easy scanning ----
    const qrSize = Math.round(W * 0.7); // 104mm on A5
    const framePad = 3;
    const frameSize = qrSize + framePad * 2;
    const frameX = cx - frameSize / 2;
    const frameY = 39;
    const qrX = cx - qrSize / 2;
    const qrY = frameY + framePad;

    doc.setFillColor(...LIGHT_BG);
    doc.setDrawColor(...GREEN_SOFT);
    doc.setLineWidth(0.5);
    doc.roundedRect(frameX, frameY, frameSize, frameSize, 5, 5, 'FD');
    doc.addImage(qrData, 'PNG', qrX, qrY, qrSize, qrSize);

    // ---- Educational point name (dynamic legend) ----
    let y = frameY + frameSize + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...GREEN_DARK);
    const nameLines = doc.splitTextToSize(pointTitle, 130) as string[];
    doc.text(nameLines, cx, y, { align: 'center' });
    y += nameLines.length * 4.8 + 7;

    // ---- Social handle (pill) — enlarged ~80% ----
    const handle = '@projeto_ecotech';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    const handleW = doc.getTextWidth(handle);
    const pillPadX = 8;
    const pillW = handleW + pillPadX * 2;
    const pillH = 11;
    const pillX = cx - pillW / 2;
    const pillY = y - pillH + 3.4;
    doc.setFillColor(...CREAM);
    doc.roundedRect(pillX, pillY, pillW, pillH, pillH / 2, pillH / 2, 'F');
    doc.setTextColor(...GREEN);
    doc.text(handle, cx, y, { align: 'center' });

    // ---- CTA text, snug right below the handle (no band, no extra padding) ----
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...GREEN_DARK);
    const ctaLines = doc.splitTextToSize(CTA_TEXT, W - 20) as string[];
    doc.text(ctaLines, cx, y + 6, { align: 'center', lineHeightFactor: 1.25 });

    doc.save(`qrcode-${pointSlug}.pdf`);
  };

  return (
    <button
      onClick={handleDownload}
      id="btn-download-qr"
      className="inline-flex items-center gap-1 text-xs text-secondary font-medium mt-2 hover:underline bg-transparent border-none cursor-pointer"
    >
      <Download className="w-3 h-3" />
      Baixar QR (PDF)
    </button>
  );
}
