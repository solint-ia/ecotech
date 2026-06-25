'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Library, MessageSquare, School, Share2 } from 'lucide-react';

const navItems = [
  { name: 'Feed', href: '/feed', icon: MessageSquare },
  { name: 'Trilhas', href: '/trilhas', icon: Compass },
  { name: 'Escolas', href: '/escolas', icon: School },
  { name: 'Biblioteca', href: '/biblioteca', icon: Library },
  { name: 'Rede', href: '/rede', icon: Share2 },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Navigation (Top Bar) */}
      <header className="sticky top-0 z-40 hidden w-full border-b border-border-custom bg-white md:block">
        <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-primary">EcoTech</span>
            </Link>
            <nav className="flex items-center gap-4">
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
          <div>
            {/* Espaço para Login/Dashboard link no desktop */}
            <Link
              href="/login"
              className="text-sm font-semibold text-primary hover:text-secondary"
            >
              Entrar
            </Link>
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
