'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Compass, Library, MessageSquare, School, Share2, LogOut, User, ChevronDown, LayoutDashboard, BookHeart } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const navItems = [
  { name: 'Trilhas', href: '/trilhas', icon: Compass },
  { name: 'Feed', href: '/feed', icon: MessageSquare },
  { name: 'Escolas', href: '/escolas', icon: School },
  { name: 'Biblioteca', href: '/biblioteca', icon: Library },
  { name: 'Rede', href: '/rede', icon: Share2 },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (pathname === '/login') {
    return null;
  }

  const isLoggedIn = status === 'authenticated' && !!session?.user;
  const user = session?.user as any;
  const initials = user?.name
    ? user.name
      .split(' ')
      .slice(0, 2)
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
    : 'U';



  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  return (
    <>
      {/* Desktop Navigation (Top Bar) */}
      {/* Header Navigation - Mobile (Full Width Glass) & Desktop (Floating Capsule) */}
      <header id="main-navbar" className="
        z-50 transition-all duration-300
        fixed top-0 left-0 right-0 w-full bg-[#FAFCFA]/80 backdrop-blur-md border-b border-emerald-900/5
        md:sticky md:top-4 md:mt-4 md:w-[95%] md:max-w-5xl md:mx-auto md:rounded-full md:bg-[#073D26] md:shadow-md md:border md:border-white/10 md:backdrop-blur-none
      ">
        <div className="flex items-center justify-between px-4 md:px-6 lg:px-8 py-2 md:py-3.5 h-14 md:h-auto">
          {/* Canto Esquerdo: Branding */}
          <Link href="/trilhas" className="flex items-center gap-6 md:gap-3 shrink-0">
            {/* Mobile Logo (Verde) */}
            <img src="/EcoTechLogo.png" alt="Ecotech Logo" className="w-10 h-10 object-contain transform scale-150 origin-left md:hidden" />
            {/* Desktop Logo (Branca) */}
            <img src="/logo-header.png" alt="Ecotech Logo" className="w-10 h-10 object-contain hidden md:block" />

            <span className="text-xl font-bold md:font-semibold text-[#0B5D3B] md:text-white tracking-tight">Ecotech</span>
          </Link>

          {/* Centro: Navegação Principal (Apenas Desktop) */}
          <nav className="hidden md:flex items-center gap-1 justify-center flex-1">
            {(user?.role === 'ADMIN' || user?.role === 'SCHOOL_MANAGER') && (
              <Link
                href={user.role === 'ADMIN' ? '/admin/dashboard' : '/escola/dashboard'}
                className={`px-4 py-2 text-sm transition-all rounded-full ${pathname?.includes('dashboard')
                  ? 'text-white font-semibold bg-white/10'
                  : 'text-white/60 hover:text-white hover:bg-white/5 font-medium'
                  }`}
              >
                Dashboard
              </Link>
            )}
            {navItems.map((item) => {
              const isActive = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-4 py-2 text-sm transition-all rounded-full ${isActive
                    ? 'text-white font-semibold bg-white/10'
                    : 'text-white/60 hover:text-white hover:bg-white/5 font-medium'
                    }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Canto Direito: Menu do Usuário */}
          <div className="relative shrink-0" ref={dropdownRef}>
            {isLoggedIn ? (
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-black/5 md:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 md:focus:ring-white/20"
                id="user-menu-button"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                {user?.profileImage ? (
                  <img
                    src={user.profileImage.startsWith('http') ? user.profileImage : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${user.profileImage}`}
                    alt={user.name}
                    className="w-9 h-9 rounded-full object-cover border border-black/10 md:border-white/20"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#0B5D3B]/10 text-[#0B5D3B] md:bg-white/20 md:text-white flex items-center justify-center text-sm font-bold border border-black/5 md:border-white/10">
                    {initials}
                  </div>
                )}
              </button>
            ) : (
              <Link
                href="/login"
                className="px-5 py-2 text-sm font-semibold text-[#0B5D3B] bg-[#0B5D3B]/10 hover:bg-[#0B5D3B]/20 md:text-white md:bg-white/15 md:hover:bg-white/25 rounded-full transition-colors"
              >
                Entrar
              </Link>
            )}

            {/* Dropdown Menu */}
            {dropdownOpen && isLoggedIn && (
              <div
                className="absolute right-0 mt-3 w-56 bg-white border border-border-custom rounded-2xl shadow-xl py-1 animate-in fade-in slide-in-from-top-2 duration-200"
                role="menu"
              >
                <div className="px-5 py-4 border-b border-border-custom bg-beige/30 rounded-t-2xl">
                  <p className="text-sm font-bold text-primary truncate">{user?.name}</p>
                  <p className="text-xs text-foreground/60 truncate mt-0.5">{user?.email}</p>
                  {user?.role && (
                    <span className="inline-block mt-2.5 text-[10px] font-bold uppercase tracking-wider text-secondary bg-secondary/10 px-2.5 py-1 rounded-full">
                      {user.roleStatus === 'PENDENTE'
                        ? 'Aprovação Pendente'
                        : user.role === 'ADMIN'
                          ? 'Administrador'
                          : user.role === 'SCHOOL_MANAGER'
                            ? 'Gestor de Escola'
                            : user.role === 'TEACHER'
                              ? 'Professor'
                              : user.role === 'USER'
                                ? 'Usuário'
                                : 'Estudante'}
                    </span>
                  )}
                </div>

                <div className="p-2 space-y-1">
                  {/* Profile Link */}
                  <Link
                    href={user?.id ? `/perfil/${user.id}` : '/login'}
                    onClick={() => setDropdownOpen(false)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-foreground/80 hover:text-primary hover:bg-beige rounded-xl transition-colors"
                    role="menuitem"
                  >
                    <User className="w-4 h-4 opacity-70" />
                    Meu Perfil
                  </Link>

                  <div className="h-px bg-border-custom my-1.5 mx-2" />

                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    role="menuitem"
                  >
                    <LogOut className="w-4 h-4 opacity-70" />
                    Sair
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation (Bottom Navigation Bar) */}
      <nav id="mobile-navbar" className="fixed bottom-0 left-0 right-0 z-40 border-t border-border-custom bg-white md:hidden">
        <div className="flex h-16 items-center justify-around px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 w-12 h-12 rounded-full transition-colors ${isActive ? 'text-primary' : 'text-gray-500 hover:text-secondary'
                  }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
