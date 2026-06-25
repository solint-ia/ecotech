'use client';

import { Download } from 'lucide-react';

interface QrCodeDownloadBtnProps {
  pointTitle: string;
  pointSlug: string;
  qrImage: string;
  qrTextContent?: string;
  apiUrl: string;
}

export default function QrCodeDownloadBtn({
  pointTitle,
  pointSlug,
  qrImage,
  qrTextContent,
  apiUrl,
}: QrCodeDownloadBtnProps) {
  return (
    <button
      onClick={async () => {
        const { jsPDF } = await import('jspdf');
        const url = qrImage.startsWith('http') ? qrImage : `${apiUrl}${qrImage}`;
        const response = await fetch(url);
        const blob = await response.blob();
        
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = function() {
          const base64data = reader.result as string;
          
          const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
          });
          
          doc.setFontSize(22);
          doc.text('EcoTech - Ponto Educativo', 105, 20, { align: 'center' });
          
          doc.setFontSize(16);
          doc.text(pointTitle, 105, 30, { align: 'center' });
          
          // Add QR Code Image
          doc.addImage(base64data, 'PNG', 55, 40, 100, 100);
          
          // Add Summary
          if (qrTextContent) {
            doc.setFontSize(10);
            const splitText = doc.splitTextToSize(qrTextContent, 170);
            doc.text(splitText, 20, 150);
          }
          
          doc.save(`qrcode-${pointSlug}.pdf`);
        };
      }}
      id="btn-download-qr"
      className="inline-flex items-center gap-1 text-xs text-secondary font-medium mt-2 hover:underline bg-transparent border-none cursor-pointer"
    >
      <Download className="w-3 h-3" />
      Baixar QR (PDF)
    </button>
  );
}
