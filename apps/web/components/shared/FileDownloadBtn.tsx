'use client';

import { Download } from 'lucide-react';
import { useMemo } from 'react';

interface FileDownloadBtnProps {
  fileUrl: string;
  fileName: string;
  label?: string;
  className?: string;
  iconClassName?: string;
}

export default function FileDownloadBtn({
  fileUrl,
  fileName,
  label = 'Baixar Arquivo',
  className = "flex items-center gap-2 px-5 py-2.5 rounded-full bg-forest text-white text-sm font-semibold hover:bg-forest/90 transition-all active:scale-95 shadow-md hover:shadow-lg",
  iconClassName = "w-4 h-4"
}: FileDownloadBtnProps) {
  
  // Appends ?download= to Supabase URLs to force the browser to download instead of opening in a new tab
  const downloadUrl = useMemo(() => {
    if (fileUrl.includes('supabase.co')) {
      const url = new URL(fileUrl);
      url.searchParams.set('download', fileName);
      return url.toString();
    }
    return fileUrl;
  }, [fileUrl, fileName]);

  return (
    <a
      href={downloadUrl}
      download={fileName}
      className={className}
    >
      <Download className={iconClassName} />
      {label}
    </a>
  );
}
