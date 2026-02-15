'use client';

import { ReactNode, useEffect } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { ThemeProvider } from '@/components/theme-provider';
import { initOfflineSyncListener, flushPendingQueue } from '@/lib/notes-service';

export function Providers({ children }: { children: ReactNode }) {
  // Initialize offline sync: listen for connectivity and flush any pending notes
  useEffect(() => {
    initOfflineSyncListener();
    // On mount, flush anything queued from a previous session
    flushPendingQueue().catch(() => {});
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem storageKey="notesio-theme">
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
}