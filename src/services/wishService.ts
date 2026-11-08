import { backendMode, demoShouldFail, getSupabase, newClientId, wait } from './backend';
import { cleanText, type WishInput } from '../utils/validation';
import type { SubmitResult, WishRecord } from '../types';

const DEMO_KEY = 'advika.demo.wishes.v1';

function readDemo(): WishRecord[] {
  try {
    const raw = JSON.parse(localStorage.getItem(DEMO_KEY) ?? '[]');
    return Array.isArray(raw) ? (raw as WishRecord[]).filter((w) => typeof w.message === 'string') : [];
  } catch {
    return [];
  }
}

export async function listWishes(): Promise<WishRecord[]> {
  if (backendMode === 'supabase') {
    try {
      const sb = await getSupabase();
      const { data, error } = await sb
        .from('wishes')
        .select('id, name, message, created_at')
        .order('created_at', { ascending: false })
        .limit(40);
      if (error || !data) return [];
      return data.map((w) => ({ id: String(w.id), name: w.name ?? '', message: w.message, createdAt: w.created_at, demo: false }));
    } catch {
      return [];
    }
  }
  return readDemo().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function submitWish(input: WishInput): Promise<SubmitResult & { wish?: WishRecord }> {
  const wish: WishRecord = {
    id: newClientId(),
    name: cleanText(input.name),
    message: cleanText(input.message),
    createdAt: new Date().toISOString(),
    demo: backendMode === 'demo',
  };
  try {
    if (backendMode === 'supabase') {
      const sb = await getSupabase();
      const { error } = await sb.from('wishes').insert({ name: wish.name || null, message: wish.message });
      if (error) return { ok: false, demo: false, error: 'Your wish didn’t reach the garden. Please try again.' };
    } else {
      await wait(600);
      if (demoShouldFail()) return { ok: false, demo: true, error: 'Demo failure: the wish was not saved. Remove ?demoFail=1 and try again.' };
      const all = readDemo();
      all.push(wish);
      localStorage.setItem(DEMO_KEY, JSON.stringify(all.slice(-60)));
    }
    return { ok: true, demo: backendMode === 'demo', wish };
  } catch {
    return { ok: false, demo: backendMode === 'demo', error: 'Your wish didn’t reach the garden. Please try again.' };
  }
}
