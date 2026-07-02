'use client';

import Link from 'next/link';
import { Compass, ArrowRight } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        #main-navbar, #mobile-navbar { display: none !important; }
      ` }} />
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-beige/30">
      <div className="max-w-md w-full bg-white p-8 md:p-12 rounded-[2rem] shadow-sm border border-border-custom text-center animate-in fade-in zoom-in duration-500">
        
        <div className="mx-auto w-20 h-20 bg-sage/20 rounded-full flex items-center justify-center mb-6">
          <Compass className="w-10 h-10 text-forest" />
        </div>
        
        <h1 className="text-3xl font-bold text-emerald-950 mb-3">
          Ops! Parece que você se perdeu na trilha
        </h1>
        
        <p className="text-foreground/70 mb-8 leading-relaxed">
          A página que você está procurando não existe, foi movida ou removida. Vamos te colocar de volta no caminho certo!
        </p>
        
        <Link 
          href="/"
          className="inline-flex items-center justify-center gap-2 w-full py-4 bg-forest text-white rounded-xl font-bold hover:bg-forest/90 hover:scale-[1.02] transition-all shadow-sm"
        >
          Voltar ao Início
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
      </div>
    </>
  );
}
