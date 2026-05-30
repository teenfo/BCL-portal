import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseConfig } from './client';

/**
 * 인증이 필요하지 않은 공개 경로 목록
 *
 * ⚠️ /coach, /apps, /admin 은 여기에 포함하면 안 됩니다.
 * 해당 경로들은 AuthGuard가 클라이언트에서 역할 기반 접근 제어를 합니다.
 * 미들웨어는 토큰 갱신만 담당하고, 비인증 시 /auth/login으로 보냅니다.
 */
const PUBLIC_PATHS = [
    '/auth',          // 로그인, 회원가입, 콜백 등
    '/api',           // API 라우트 (자체 인증 처리)
    '/kiosk',         // 키오스크 (공용 계정 별도 처리)
    '/class',         // 클래스 스크린 (공용)
    '/_next',         // Next.js 내부 경로 (matcher에서 제외되지만 중복 안전장치)
];

function isPublicPath(pathname: string): boolean {
    if (pathname === '/') return true;
    return PUBLIC_PATHS.some(path => pathname.startsWith(path));
}

export async function updateSession(request: NextRequest) {
    /**
     * ─── 핵심 패턴 (Supabase SSR 공식 가이드) ───
     *
     * 1. supabaseResponse 를 NextResponse.next()로 먼저 생성
     * 2. createServerClient 에 쿠키 핸들러 주입
     * 3. supabase.auth.getUser() 호출 → 토큰 만료 시 내부적으로 갱신
     * 4. 갱신된 쿠키가 setAll() 콜백으로 supabaseResponse에 기록됨
     * 5. 반드시 supabaseResponse를 그대로 반환 (새 Response 생성 금지)
     *
     * ❌ 새 NextResponse를 반환하면 Set-Cookie 헤더가 유실됩니다.
     */
    let supabaseResponse = NextResponse.next({ request });

    const { url, anonKey } = getSupabaseConfig();

    const supabase = createServerClient(url, anonKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                // 1) request에 쿠키 반영 (이후 Server Component에서 읽을 수 있도록)
                cookiesToSet.forEach(({ name, value }) =>
                    request.cookies.set(name, value)
                );
                // 2) 새 response 생성 (갱신된 request 포함)
                supabaseResponse = NextResponse.next({ request });
                // 3) response에 Set-Cookie 헤더 추가 (브라우저에 전달)
                cookiesToSet.forEach(({ name, value, options }) =>
                    supabaseResponse.cookies.set(name, value, options)
                );
            },
        },
    });

    // ─── 반드시 getUser()를 먼저 호출해야 합니다 ───
    // createServerClient()와 getUser() 사이에 다른 Supabase 호출을 넣지 마세요.
    // getUser()가 내부적으로 만료된 access_token을 refresh_token으로 갱신하고,
    // 갱신된 토큰을 setAll() 콜백을 통해 response에 기록합니다.
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // 공개 경로 — 쿠키 갱신만 하고 통과
    if (isPublicPath(pathname)) {
        return supabaseResponse;
    }

    // 비공개 경로에 비인증 사용자 → 로그인으로 리다이렉트
    // redirect 파라미터를 유지해 로그인 후 원래 경로로 돌아올 수 있게 함
    if (!user) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/auth/login';
        redirectUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(redirectUrl);
    }

    // ─── 반드시 supabaseResponse를 그대로 반환해야 합니다 ───
    // 여기서 새 NextResponse를 만들면 Set-Cookie 헤더가 사라져
    // 브라우저-서버 세션 불일치(세션 끊김)가 발생합니다.
    return supabaseResponse;
}
