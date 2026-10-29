import type { SupabaseClient } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getAdminStore, getViewerStore } from './api';
import type { Store } from './schedule';
import { adminDb, viewerDb } from './supabase';

const TOKEN_KEY = 'shiftmanager.viewerToken';

export type Session =
  | { status: 'loading' }
  | { status: 'signedOut'; invalidLink?: boolean }
  /** Admin logged in but hasn't named their store yet. */
  | { status: 'needsStore'; db: SupabaseClient; userId: string }
  | { status: 'admin'; db: SupabaseClient; userId: string; store: Store }
  | { status: 'viewer'; db: SupabaseClient; store: Store };

type Ctx = {
  session: Session;
  /** Re-read the store row (after settings changes or creating the store). */
  reload: () => Promise<void>;
  openShareLink: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Ctx | null>(null);

/** Admin login wins; otherwise a remembered share token; otherwise signed out. */
async function resolveSession(): Promise<Session> {
  const { data } = await adminDb.auth.getSession();
  const user = data.session?.user;
  if (user) {
    const store = await getAdminStore(adminDb, user.id);
    return store ? { status: 'admin', db: adminDb, userId: user.id, store } : { status: 'needsStore', db: adminDb, userId: user.id };
  }
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return { status: 'signedOut' };
  const db = viewerDb(token);
  const store = await getViewerStore(db, token);
  if (store) return { status: 'viewer', db, store };
  localStorage.removeItem(TOKEN_KEY);
  return { status: 'signedOut', invalidLink: true };
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>({ status: 'loading' });

  const load = useCallback(async () => {
    setSession(
      await resolveSession().catch((e) => {
        console.error(e);
        return { status: 'signedOut' } as const;
      }),
    );
  }, []);

  useEffect(() => {
    // INITIAL_SESSION fires on subscribe, so this also does the first load.
    const { data } = adminDb.auth.onAuthStateChange((event) => {
      // Deferred: calling Supabase inside this callback can deadlock its auth lock.
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') setTimeout(load, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [load]);

  const value = useMemo<Ctx>(
    () => ({
      session,
      reload: load,
      openShareLink: async (token) => {
        localStorage.setItem(TOKEN_KEY, token);
        await load();
      },
      signOut: async () => {
        localStorage.removeItem(TOKEN_KEY);
        await adminDb.auth.signOut();
      },
    }),
    [session, load],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession outside SessionProvider');
  return ctx;
}

/** For screens that require a store: the db client, store, and whether edits are allowed. */
export function useStore() {
  const { session } = useSession();
  if (session.status !== 'admin' && session.status !== 'viewer') throw new Error('No store session');
  return { db: session.db, store: session.store, isAdmin: session.status === 'admin' };
}
