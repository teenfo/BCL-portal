import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase 환경 설정을 반환하는 유틸리티 함수
 * client.ts와 server.ts에서 동일한 환경 결정 로직을 공유합니다.
 */
export function getSupabaseConfig() {
    const env = process.env.NEXT_PUBLIC_SUPABASE_ENV || 'prod';

    let url: string;
    let anonKey: string;

    if (env === 'dev') {
        url = process.env.NEXT_PUBLIC_SUPABASE_URL_DEV!;
        anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV!;
    } else {
        url = process.env.NEXT_PUBLIC_SUPABASE_URL_PROD!;
        anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PROD!;
    }

    // Fallback: 환경별 URL이 없으면 기본값 사용
    if (!url) url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    if (!anonKey) anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    return { url, anonKey, env };
}

/**
 * ─── 브라우저 싱글턴 캐시 ───
 *
 * createBrowserClient()는 Supabase SDK 내부에서 싱글턴을 관리하지만,
 * 명시적으로 모듈 레벨 캐시를 유지하여:
 * 1. 여러 컴포넌트에서 createClient()를 호출해도 동일한 인스턴스 보장
 * 2. onAuthStateChange 구독이 중복 생성되지 않음
 * 3. localStorage의 세션 토큰을 단일 인스턴스에서 관리
 *
 * ⚠️ SSR 환경에서는 절대 이 싱글턴을 사용하지 마세요.
 *    서버 컴포넌트/API Route에서는 server.ts의 createClient()를 사용하세요.
 */
let _browserClient: SupabaseClient<Database> | null = null;

export function createClient(): SupabaseClient<Database> {
    // 서버 사이드에서 호출되는 경우 방어 (Next.js SSR/ISR 환경)
    if (typeof window === 'undefined') {
        // 서버에서는 캐시 없이 새 인스턴스 (서버 측 요청은 독립적이어야 함)
        const { url, anonKey } = getSupabaseConfig();
        return createBrowserClient<Database>(url, anonKey);
    }

    // 클라이언트: 싱글턴 반환
    if (!_browserClient) {
        const { url, anonKey } = getSupabaseConfig();
        _browserClient = createBrowserClient<Database>(url, anonKey, {
            auth: {
                // 세션을 localStorage에 영속적으로 저장
                // → 탭/창 재오픈, 앱 전환 후에도 로그인 유지
                persistSession: true,
                // Access Token 만료 전 자동 갱신 (만료 10분 전)
                // → 서버 측 middleware.ts와 이중 갱신 체계
                autoRefreshToken: true,
                // OAuth/Magic Link 콜백의 URL hash 처리
                detectSessionInUrl: true,
                // 탭 간 세션 공유 (localStorage 기반)
                // 멀티탭에서 로그인/로그아웃이 동기화됨
                storageKey: 'bcl-portal-auth',
            },
        });
    }

    return _browserClient;
}
