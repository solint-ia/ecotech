'use client';

import { useState } from 'react';
import { X, Copy, QrCode, Share as ShareIcon, ArrowLeft } from 'lucide-react';
import QRCode from 'react-qr-code';
import { getImageUrl } from '../../lib/image-url';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  trail: {
    title: string;
    coverImage?: string;
  };
  url: string;
}

export default function ShareModal({ isOpen, onClose, trail, url }: ShareModalProps) {
  const [viewMode, setViewMode] = useState<'main' | 'qrcode'>('main');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: '💬',
      color: 'bg-green-500',
      action: () => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${trail.title} - ${url}`)}`, '_blank')
    },
    {
      name: 'Twitter',
      icon: '𝕏',
      color: 'bg-black',
      action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(trail.title)}&url=${encodeURIComponent(url)}`, '_blank')
    },
    {
      name: 'Facebook',
      icon: 'f',
      color: 'bg-blue-600',
      action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank')
    },
    {
      name: 'LinkedIn',
      icon: 'in',
      color: 'bg-blue-700',
      action: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank')
    },
    {
      name: 'Telegram',
      icon: '✈️',
      color: 'bg-blue-500',
      action: () => window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(trail.title)}`, '_blank')
    },
    {
      name: 'Email',
      icon: '✉️',
      color: 'bg-red-500',
      action: () => window.open(`mailto:?subject=${encodeURIComponent(trail.title)}&body=${encodeURIComponent(`Confira essa trilha: ${url}`)}`, '_blank')
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1e1e1e] border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            {viewMode === 'qrcode' ? (
              <button onClick={() => setViewMode('main')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-white/70" />
              </button>
            ) : (
              <ShareIcon className="w-5 h-5 text-white/70" />
            )}
            <h2 className="text-base font-medium">
              {viewMode === 'qrcode' ? 'Digitalizar código QR' : 'Compartilhar link'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Content */}
        {viewMode === 'main' ? (
          <div className="p-4">
            {/* Link Preview Card */}
            <div className="flex items-center gap-4 bg-[#2a2a2a] p-3 rounded-xl mb-6">
              {trail.coverImage ? (
                <img src={getImageUrl(trail.coverImage)} alt="Cover" className="w-12 h-12 object-cover rounded-lg bg-black/20" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-green-900 flex items-center justify-center text-xl">🌿</div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm text-white truncate">{trail.title}</h3>
                <p className="text-xs text-white/50 truncate">{url}</p>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setViewMode('qrcode')}
                  className="p-2.5 hover:bg-white/10 rounded-lg transition-colors"
                  title="Mostrar QR Code"
                >
                  <QrCode className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleCopy}
                  className="p-2.5 hover:bg-white/10 rounded-lg transition-colors"
                  title="Copiar Link"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {copied && (
              <div className="text-center text-xs text-green-400 mb-4 bg-green-400/10 py-1.5 rounded-lg">
                Link copiado para a área de transferência!
              </div>
            )}

            <div className="text-sm font-medium text-white/80 mb-4">Compartilhar usando</div>
            
            <div className="grid grid-cols-4 gap-y-6 gap-x-2">
              {shareOptions.map((opt) => (
                <button 
                  key={opt.name}
                  onClick={opt.action}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className={`w-12 h-12 ${opt.color} rounded-full flex items-center justify-center text-xl shadow-lg group-hover:scale-105 transition-transform`}>
                    {opt.icon}
                  </div>
                  <span className="text-xs text-white/70 text-center leading-tight">
                    {opt.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-8 flex flex-col items-center justify-center">
            <div className="bg-white p-4 rounded-xl mb-6">
              <QRCode value={url} size={200} />
            </div>
            <p className="text-sm text-white/70 mb-6 text-center">
              Aponte a câmera do seu celular para o código acima.
            </p>
            <button 
              onClick={() => setViewMode('main')}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
