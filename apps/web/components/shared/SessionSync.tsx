'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function SessionSync() {
  const { data: session, status, update } = useSession();
  const pathname = usePathname();
  const lastSyncPath = useRef<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) {
      return;
    }

    const user = session.user as any;

    // Targeted Polling: Skip polling if the user is ADMIN or a simple USER with no school
    // because they don't have pending actions or school links that can change in real-time.
    const isStaticUser = user.role === 'ADMIN' || (user.role === 'USER' && !user.schoolId && user.roleStatus === 'APROVADO');
    if (isStaticUser) {
      return;
    }

    const checkSession = async () => {
      // Visibility Check: Pause polling if the tab is inactive or minimized
      if (document.visibilityState !== 'visible') {
        return;
      }

      try {
        if (!user.accessToken) return;

        const res = await fetch(`${API_URL}/users/me`, {
          headers: {
            Authorization: `Bearer ${user.accessToken}`
          }
        });

        if (res.ok) {
          const dbUser = await res.json();
          const roleMismatch = dbUser.role !== user.realRole && dbUser.role !== user.role;
          const statusMismatch = dbUser.roleStatus !== user.roleStatus;
          const schoolMismatch = dbUser.schoolId !== user.schoolId;

          if (roleMismatch || statusMismatch || schoolMismatch) {
            console.log('[SessionSync] Update detected. Refreshing session...');
            await update({
              role: dbUser.role,
              roleStatus: dbUser.roleStatus,
              schoolId: dbUser.schoolId
            });
            // Wait slightly to ensure the browser persists the new Set-Cookie header
            setTimeout(() => {
              window.location.reload();
            }, 500);
          }
        }
      } catch (err) {
        console.error('[SessionSync] Error verifying session:', err);
      }
    };

    // Run immediately on path change
    if (lastSyncPath.current !== pathname) {
      checkSession();
      lastSyncPath.current = pathname;
    }

    // Also run periodically every 30 seconds
    const interval = setInterval(() => {
      checkSession();
    }, 30000);

    return () => clearInterval(interval);
  }, [pathname, status, session, update]);

  return null;
}
