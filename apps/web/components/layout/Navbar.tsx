'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Compass, Library, MessageSquare, School, Share2, LogOut, User, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const navItems = [
  { name: 'Feed', href: '/feed', icon: MessageSquare },
  { name: 'Trilhas', href: '/trilhas', icon: Compass },
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

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  return (
    <>
      {/* Desktop Navigation (Top Bar) */}
      <header className="sticky top-0 z-40 hidden w-full border-b border-border-custom bg-white md:block shadow-sm">
        <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/trilhas" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">E</span>
              </div>
              <span className="text-xl font-bold text-primary">Ecotech</span>
            </Link>
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-primary hover:bg-beige hover:text-primary'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User section */}
          <div className="relative" ref={dropdownRef}>
            {isLoggedIn ? (
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-beige transition-colors"
                id="user-menu-button"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                  {initials}
                </div>
                <span className="text-sm font-semibold text-primary max-w-[140px] truncate">
                  {user?.name || 'Usuário'}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-primary transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>
            ) : (
              <Link
                href="/login"
                className="text-sm font-semibold text-primary hover:text-secondary transition-colors"
              >
                Entrar
              </Link>
            )}

            {/* Dropdown Menu */}
            {dropdownOpen && isLoggedIn && (
              <div
                className="absolute right-0 mt-2 w-52 bg-white border border-border-custom rounded-xl shadow-lg py-1 animate-in fade-in slide-in-from-top-2 duration-150"
                role="menu"
              >
                <div className="px-4 py-2 border-b border-border-custom">
                  <p className="text-sm font-semibold text-primary truncate">{user?.name}</p>
                  <p className="text-xs text-foreground/60 truncate">{user?.email}</p>
                  {user?.role && (
                    <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
                      {user.role === 'ADMIN'
                        ? 'Administrador'
                        : user.role === 'SCHOOL_MANAGER'
                        ? 'Gestor de Escola'
                        : user.role === 'TEACHER'
                        ? 'Professor'
                        : 'Estudante'}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  role="menuitem"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation (Bottom Navigation Bar) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border-custom bg-white md:hidden">
        <div className="flex h-16 items-center justify-around px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 w-12 h-12 rounded-full transition-colors ${
                  isActive ? 'text-primary' : 'text-gray-500 hover:text-secondary'
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
