// 팩토리 ② middleware — Edge 전용 (docs/01-auth §5.5 표준 골격, 수정 금지 구간)
// F-3: supabaseResponse 원본 반환 강제 — 새 NextResponse 생성 반환 시 Set-Cookie 유실(장애 #3)
// F-7: createServerClient → 즉시 getUser() — 사이에 다른 supabase 호출 삽입 금지
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { AUTH_STORAGE_KEY, getSupabaseConfig } from './constants';

type CookieToSet = { name: string; value: string; options: CookieOptions };

// 경로 분류 단일 상수 (docs/01-auth §5.5)
const PROTECTED_PREFIXES = ['/admin', '/coach', '/apps'] as const;

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  const { url, anonKey } = getSupabaseConfig();
  const supabase = createServerClient(url, anonKey, {
    cookieOptions: { name: AUTH_STORAGE_KEY },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // 즉시 호출 — 만료 access_token을 refresh_token으로 갱신 (F-7)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // 폐지 라우트: 구버전 인증 메일 링크 유입 → 안내 배너로 (docs/01 §2.3, 이메일 검증 제외 결정)
  if (pathname === '/auth/email-verify') {
    const legacyUrl = request.nextUrl.clone();
    legacyUrl.pathname = '/auth/login';
    legacyUrl.search = '?error=verify_deprecated';
    const redirect = NextResponse.redirect(legacyUrl);
    supabaseResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/auth/login';
    loginUrl.search = `?redirect=${encodeURIComponent(pathname)}`;
    const redirect = NextResponse.redirect(loginUrl);
    // 갱신된 세션 쿠키를 리다이렉트 응답에도 승계
    supabaseResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  // 역할·승인 판정은 하지 않음 — 클라 AuthGuard + RLS 담당 (엣지에서 DB 조회 금지)
  return supabaseResponse;
}
