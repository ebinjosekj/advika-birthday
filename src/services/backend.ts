import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const backendMode: 'supabase' | 'demo' = url && anonKey ? 'supabase' : 'demo';

let client: Promise<SupabaseClient> | null = null;

/** Lazily imported so the Supabase SDK never ships in demo mode's critical path. */
export function getSupabase(): Promise<SupabaseClient> {
  if (backendMode !== 'supabase') throw new Error('Supabase is not configured');
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url!, anonKey!, { auth: { persistSession: false } }),
  );
  return client;
}

export function newClientId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Demo-only switch so the failure state can be seen and tested: add ?demoFail=1 to the URL. */
export function demoShouldFail(): boolean {
  try {
    return new URLSearchParams(location.search).get('demoFail') === '1';
  } catch {
    return false;
  }
}

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
