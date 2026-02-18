import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

/**
 * Supabase 환경 설정을 반환하는 유틸리티 함수
 * client.ts와 server.ts에서 동일한 환경 결정 로직을 공유
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

export function createClient() {
    const { url, anonKey } = getSupabaseConfig();
    return createBrowserClient<Database>(url, anonKey);
}
