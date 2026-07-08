'use client';

import { SessionProvider } from 'next-auth/react';
import SessionSync from '../components/shared/SessionSync';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    // Sessions never expire on the server (indefinite login), so refetching the
    // session every time a tab regains focus is pointless and, with several tabs
    // open, floods the app with simultaneous session/API requests when the user
    // comes back from inactivity — the cause of tabs getting stuck "loading".
    // SessionSync already does the targeted polling we actually need.
    <SessionProvider refetchOnWindowFocus={false} refetchWhenOffline={false}>
      <SessionSync />
      {children}
    </SessionProvider>
  );
}
