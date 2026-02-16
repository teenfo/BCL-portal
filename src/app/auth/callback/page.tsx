'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        const handleCallback = async () => {
            const supabase = createClient();

            // URL에서 code 추출
            const { data, error } = await supabase.auth.exchangeCodeForSession(
                new URL(window.location.href).searchParams.get('code') || ''
            );

            if (error) {
                console.error('Auth callback error:', error);
                router.push('/auth/login?error=auth_callback_failed');
                return;
            }

            if (data.session) {
                // 역할 기반 리다이렉트
                const role = data.session.user.user_metadata?.role || 'member';

                if (role === 'admin') {
                    router.push('/admin');
                } else if (role === 'coach') {
                    router.push('/coach');
                } else {
                    router.push('/apps');
                }
            }
        };

        handleCallback();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white/60">Completing authentication...</p>
            </div>
        </div>
    );
}
