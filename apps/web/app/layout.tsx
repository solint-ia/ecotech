import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '../components/layout/Navbar';
import Providers from './providers';

const inter = Inter({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'EcoTech — Plataforma Educacional e Socioambiental',
  description: 'Trilhas ecológicas, biodiversidade local e conexão para escolas e comunidades.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground pb-16 md:pb-0">
        <Providers>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-20 md:pt-6">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
