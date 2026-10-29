import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import './local-storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/** Admin client: keeps the login session on the device. */
export const adminDb = createClient(url, key, {
  auth: { storage: localStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) =>
    state === 'active' ? adminDb.auth.startAutoRefresh() : adminDb.auth.stopAutoRefresh(),
  );
}

/** Viewer client: no login; the share token header grants read-only access to one store (see supabase/schema.sql). */
export function viewerDb(shareToken: string): SupabaseClient {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'viewer' },
    global: { headers: { 'x-share-token': shareToken } },
  });
}

export const photoUrl = (path: string | null) =>
  path ? adminDb.storage.from('photos').getPublicUrl(path).data.publicUrl : null;
