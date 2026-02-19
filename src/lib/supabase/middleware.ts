import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseConfig } from './client';

/**
 * 인증이 필요하지 않은 공개 경로 목록
 */
const PUBLIC_PATHS = ['/auth', '/api', '/kiosk', '/class'];

function isPublicPath(pathname: string): boolean {
    if (pathname === '/') return true;
    return PUBLIC_PATHS.some(path => pathname.startsWith(path));
}

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const { url, anonKey } = getSupabaseConfig();

    const supabase = createServerClient(
        url,
        anonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // ─── 핵심: getUser()로 토큰 갱신 ───
    // createServerClient와 getUser() 사이에 다른 코드를 넣지 마세요!
    // getUser()는 JWT를 서버 측에서 검증하고, 만료된 토큰을 갱신합니다.
    // 갱신된 토큰은 setAll() 콜백을 통해 response 쿠키에 기록됩니다.
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // 공개 경로는 인증 불필요 — 하지만 쿠키 갱신은 수행됨
    if (isPublicPath(pathname)) {
        return supabaseResponse;
    }

    // 비공개 경로에 비인증 사용자 접근 시 로그인으로 리다이렉트
    if (!user) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/auth/login';
        redirectUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(redirectUrl);
    }

    // ─── 중요 ───
    // supabaseResponse를 그대로 반환해야 합니다.
    // 새 NextResponse를 만들면 쿠키가 유실되어
    // 브라우저-서버 세션이 불일치할 수 있습니다.
    return supabaseResponse;
}
