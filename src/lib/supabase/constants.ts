// 세션 저장소 이름의 유일한 정의처 (docs/01-auth §5.1 — 장애 #2 재발 차단)
// 문자열 리터럴 'bcl-portal-auth'가 이 파일 외 어디에도 등장하면 안 된다 (CI grep 가드).
export const AUTH_STORAGE_KEY = 'bcl-portal-auth';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

// URL/키 결정 로직도 1곳 — 세 팩토리(browser/middleware/server)가 공유 (docs/01-auth §5.2)
export function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Supabase 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY',
    );
  }
  return { url, anonKey };
}
