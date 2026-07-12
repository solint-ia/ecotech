import { Instagram, Mail, Youtube, Leaf, Cpu } from 'lucide-react';

const SOCIAL_LINKS = [
  { Icon: Instagram, href: 'https://www.instagram.com/projeto_ecotech/', label: 'Instagram' },
  { Icon: Youtube, href: 'https://www.youtube.com/@Projeto_Ecotech', label: 'YouTube' },
  { Icon: Mail, href: 'mailto:projetoecotech31@gmail.com', label: 'E-mail' },
];

export function AuthFooter() {
  return (
    <footer className="w-full bg-[#FAFCFA] relative z-10 border-t border-primary/5 pt-10 lg:pt-20">

      {/* Background Topographic/Trail Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10 Q 30 40 50 10 T 90 10' fill='none' stroke='%230B5D3B' stroke-width='1' /%3E%3Cpath d='M10 30 Q 30 60 50 30 T 90 30' fill='none' stroke='%230B5D3B' stroke-width='1' /%3E%3Cpath d='M10 50 Q 30 80 50 50 T 90 50' fill='none' stroke='%230B5D3B' stroke-width='1' /%3E%3Cpath d='M10 70 Q 30 100 50 70 T 90 70' fill='none' stroke='%230B5D3B' stroke-width='1' /%3E%3C/svg%3E")`,
          backgroundSize: '100px 100px'
        }}
      />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pb-16 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">

          {/* COLUMN 1 — BRAND */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <img src="/EcoTechLogo.png" alt="Ecotech" className="w-14 h-14 object-contain" />
              <span className="font-bold text-[#0B5D3B] text-xl tracking-tight">Ecotech</span>
            </div>
            <h3 className="text-[#4F8A4C] font-semibold text-sm tracking-wide">
              Educação Ambiental e Trilhas Interpretativas
            </h3>
            <p className="text-primary/60 text-sm leading-relaxed">
              Conectamos pessoas, escolas e comunidades através da educação ambiental, das trilhas interpretativas e da tecnologia.
            </p>
          </div>

          {/* COLUMN 2 — NAVEGAÇÃO */}
          <div className="space-y-5">
            <h4 className="text-[#0B5D3B] font-bold text-xs uppercase tracking-widest">Navegação</h4>
            <ul className="space-y-3">
              {['Feed', 'Trilhas', 'Escolas', 'Biblioteca', 'Rede'].map((link) => (
                <li key={link}>
                  <a href="#" className="group flex items-center gap-2 text-sm text-primary/70 hover:text-[#4F8A4C] transition-all duration-300">
                    <Leaf className="w-3 h-3 text-[#0B5D3B]/60 group-hover:text-[#4F8A4C] transition-colors shrink-0" />
                    <span className="group-hover:translate-x-1 transition-transform duration-300 truncate">{link}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* COLUMN 3 — CONECTE-SE (Contato + Redes) */}
          <div className="space-y-5">
            <h4 className="text-[#0B5D3B] font-bold text-xs uppercase tracking-widest">Conecte-se</h4>
            <p className="text-primary/60 text-sm leading-relaxed">
              Acompanhe nossas iniciativas e fale com o projeto.
            </p>
            <a
              href="mailto:projetoecotech31@gmail.com"
              className="inline-flex items-center gap-2 group cursor-pointer max-w-full"
            >
              <Mail className="w-4 h-4 text-[#0B5D3B] group-hover:text-[#4F8A4C] transition-colors shrink-0" />
              <span className="text-sm font-medium text-[#0B5D3B]/80 group-hover:text-[#0B5D3B] transition-colors truncate">projetoecotech31@gmail.com</span>
            </a>
            <div className="flex items-center gap-3 pt-1">
              {SOCIAL_LINKS.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className="w-11 h-11 rounded-full border-2 border-[#0B5D3B]/20 flex items-center justify-center text-[#0B5D3B] hover:border-[#0B5D3B] hover:bg-[#0B5D3B] hover:text-white hover:scale-105 hover:shadow-[0_0_15px_rgba(79,138,76,0.3)] transition-all duration-300"
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* COLUMN 4 — APOIO INSTITUCIONAL */}
          <div className="space-y-5">
            <h4 className="text-[#0B5D3B] font-bold text-xs uppercase tracking-widest">Apoio Institucional</h4>
            <div className="inline-flex items-center justify-center p-5 bg-white rounded-2xl border border-[#0B5D3B]/10 shadow-sm">
              <img src="/fapitec-logo.png" alt="FAPITEC" className="h-16 sm:h-20 w-auto object-contain" />
            </div>
          </div>

        </div>
      </div>

      {/* 3. BOTTOM BAR */}
      <div className="w-full bg-[#0B5D3B] py-6 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-center gap-4 text-center">
          <p className="text-white/80 text-xs font-medium tracking-wide">
            Desenvolvido com tecnologia, propósito e compromisso com a educação ambiental por Zenco.
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
