import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseConfig } from './client';

/**
 * 인증이 필요하지 않은 공개 경로 목록
 * - /auth/* : 로그인, 회원가입, 콜백 등
 * - /api/* : API 라우트 (자체적으로 인증 처리)
 * - / : 홈 페이지
 * - /kiosk/* : 키오스크 (공개)
 * - /class/* : Class 관련 공개 경로
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

    // IMPORTANT: Do not run code between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    // IMPORTANT: This refreshes the auth token if expired and keeps
    // the browser and server in sync
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auth = supabase.auth as any;
    const {
        data: { user },
    } = await auth.getUser();

    const pathname = request.nextUrl.pathname;

    // 공개 경로는 인증 불필요
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

    // IMPORTANT: You *must* return the supabaseResponse object as it is.
    // If you're creating a new response object with NextResponse.next() make sure to:
    // 1. Pass the request in it
    // 2. Copy over the cookies
    // 3. Then change the response as needed
    // If this is not done, you may be causing the browser and server to go out
    // of sync and terminate the user's session prematurely!
    return supabaseResponse;
}
