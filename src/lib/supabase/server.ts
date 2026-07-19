// 팩토리 ③ server — RSC / Route Handler / Server Action 전용 (docs/01-auth §5.2)
// 요청마다 새 인스턴스 (싱글턴 금지)
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { AUTH_STORAGE_KEY, getSupabaseConfig } from './constants';

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function createServerSupabase() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseConfig();

  return createServerClient(url, anonKey, {
    cookieOptions: { name: AUTH_STORAGE_KEY },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // RSC에서는 쿠키 set 불가 — 무시 (세션 갱신은 미들웨어가 담당, docs/01-auth §5.2)
        }
      },
    },
  });
}
