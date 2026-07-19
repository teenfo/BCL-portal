'use client';

// 팩토리 ① browser — 'use client' 컴포넌트 전용 (docs/01-auth §5.2)
// 모듈 레벨 싱글턴: onAuthStateChange 중복 구독 방지 (F-9)
import { createBrowserClient } from '@supabase/ssr';
import { AUTH_STORAGE_KEY, getSupabaseConfig } from './constants';

type BrowserClient = ReturnType<typeof createBrowserClient>;

let browserClient: BrowserClient | null = null;

export function getSupabaseBrowserClient(): BrowserClient {
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseBrowserClient는 브라우저에서만 호출 가능 — 서버는 server.ts 팩토리 사용');
  }
  if (!browserClient) {
    const { url, anonKey } = getSupabaseConfig();
    browserClient = createBrowserClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: AUTH_STORAGE_KEY,
      },
    });
  }
  return browserClient;
}
