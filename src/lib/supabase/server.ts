import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';
import { getSupabaseConfig } from './client';

export async function createClient() {
    const cookieStore = await cookies();
    const { url, anonKey } = getSupabaseConfig();

    return createServerClient<Database>(
        url,
        anonKey,
        {
            // 브라우저 클라이언트의 auth.storageKey('bcl-portal-auth')와 쿠키명 일치 필수
            cookieOptions: { name: 'bcl-portal-auth' },
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    );
}
