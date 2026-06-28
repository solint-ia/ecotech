import { Instagram, Mail, MessageCircle, ChevronRight, Leaf, Cpu } from 'lucide-react';

export function AuthFooter() {
  return (
    <footer className="w-full bg-[#FAFCFA] relative z-10 border-t border-primary/5 pt-20">

      {/* Background Topographic/Trail Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10 Q 30 40 50 10 T 90 10' fill='none' stroke='%230B5D3B' stroke-width='1' /%3E%3Cpath d='M10 30 Q 30 60 50 30 T 90 30' fill='none' stroke='%230B5D3B' stroke-width='1' /%3E%3Cpath d='M10 50 Q 30 80 50 50 T 90 50' fill='none' stroke='%230B5D3B' stroke-width='1' /%3E%3Cpath d='M10 70 Q 30 100 50 70 T 90 70' fill='none' stroke='%230B5D3B' stroke-width='1' /%3E%3C/svg%3E")`,
          backgroundSize: '100px 100px'
        }}
      />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pb-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">

          {/* SECTION 1 — BRAND */}
          <div className="space-y-5 lg:col-span-1 pr-4">
            <div className="flex items-center gap-3">
              <img src="/EcoTechLogo.png" alt="Ecotech" className="w-25 h-25 object-contain" />
              <span className="font-bold text-[#0B5D3B] text-xl tracking-tight">Ecotech</span>
            </div>
            <h3 className="text-[#4F8A4C] font-semibold text-sm tracking-wide">
              Educação Ambiental e Trilhas Educativas
            </h3>
            <p className="text-primary/60 text-sm leading-relaxed">
              Conectamos pessoas, escolas e comunidades através da educação ambiental, das trilhas educativas e da tecnologia.
            </p>
          </div>

          {/* SECTION 2 — NAVEGAÇÃO */}
          <div className="space-y-5">
            <h4 className="text-[#0B5D3B] font-bold text-xs uppercase tracking-widest mb-6">Navegação</h4>
            <ul className="space-y-3">
              {['Feed', 'Trilhas', 'Escolas', 'Biblioteca', 'Rede'].map((link) => (
                <li key={link}>
                  <a href="#" className="group flex items-center gap-2 text-sm text-primary/70 hover:text-[#4F8A4C] transition-all duration-300">
                    <Leaf className="w-3 h-3 text-primary/30 group-hover:text-[#4F8A4C] transition-colors" />
                    <span className="group-hover:translate-x-1 transition-transform duration-300">{link}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* SECTION 3 — CONTATO */}
          <div className="space-y-5">
            <h4 className="text-[#0B5D3B] font-bold text-xs uppercase tracking-widest mb-6">Contato</h4>
            <div className="space-y-3">
              {[
                { icon: Mail, text: 'contato@cliente.com.br' },
                { icon: MessageCircle, text: '(00) 00000-0000' },
                { icon: Instagram, text: '@cliente' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[#EAF4EE]/50 border border-transparent hover:border-[#4F8A4C]/30 hover:shadow-sm transition-all duration-300 group cursor-pointer">
                  <item.icon className="w-4 h-4 text-[#0B5D3B] group-hover:text-[#4F8A4C] transition-colors" />
                  <span className="text-sm font-medium text-[#0B5D3B]/80 group-hover:text-[#0B5D3B] transition-colors">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 4 — CONECTE-SE */}
          <div className="space-y-5">
            <h4 className="text-[#0B5D3B] font-bold text-xs uppercase tracking-widest mb-6">Rede</h4>
            <p className="text-primary/60 text-sm leading-relaxed mb-6">
              Acompanhe nossas iniciativas e faça parte da transformação ambiental.
            </p>
            <div className="flex items-center gap-4">
              {[Instagram, Mail, MessageCircle].map((Icon, i) => (
                <button key={i} className="w-12 h-12 rounded-full border-2 border-[#0B5D3B]/20 flex items-center justify-center text-[#0B5D3B] hover:border-[#0B5D3B] hover:bg-[#0B5D3B] hover:text-white hover:scale-105 hover:shadow-[0_0_15px_rgba(79,138,76,0.3)] transition-all duration-300">
                  <Icon className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* 3. BOTTOM BAR */}
      <div className="w-full bg-[#0B5D3B] py-6 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-center gap-4 text-center">
          <p className="text-white/80 text-xs font-medium tracking-wide">
            Desenvolvido com tecnologia, propósito e compromisso com a educação ambiental por Solint-ia.
          </p>
          <div className="flex items-center gap-1.5 text-[#4F8A4C] bg-white/10 px-3 py-1.5 rounded-full">
            <Cpu className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/90">Tech + Nature</span>
            <Leaf className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

    </footer>
  );
}
