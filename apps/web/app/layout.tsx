import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '../components/layout/Navbar';

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
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
