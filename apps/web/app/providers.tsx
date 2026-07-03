'use client';

import { SessionProvider } from 'next-auth/react';
import SessionSync from '../components/shared/SessionSync';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionSync />
      {children}
    </SessionProvider>
  );
}
