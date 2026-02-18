'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
    const router = useRouter();
    const [status, setStatus] = useState('인증 처리 중...');

    useEffect(() => {
        let mounted = true;

        const handleCallback = async () => {
            const supabase = createClient();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const auth = supabase.auth as any;
            const url = new URL(window.location.href);

            // PKCE flow: code exchange
            const code = url.searchParams.get('code');
            // Implicit flow: check hash fragment
            const hashParams = new URLSearchParams(url.hash.substring(1));
            const accessToken = hashParams.get('access_token');

            try {
                if (code) {
                    const { data, error } = await auth.exchangeCodeForSession(code);

                    if (error) {
                        console.error('Auth callback error:', error);
                        if (mounted) router.replace('/auth/login?error=auth_callback_failed');
                        return;
                    }

                    if (data.session) {
                        await handlePostAuth(supabase, data.session.user.id);
                    }
                } else if (accessToken) {
                    // Implicit flow — session is auto-set by Supabase
                    const { data: { session }, error } = await auth.getSession();

                    if (error || !session) {
                        console.error('Auth session error:', error);
                        if (mounted) router.replace('/auth/login?error=auth_callback_failed');
                        return;
                    }

                    await handlePostAuth(supabase, session.user.id);
                } else {
                    // No code or token — try getting current session (for OAuth redirect)
                    if (mounted) setStatus('세션 확인 중...');
                    const { data: { session } } = await auth.getSession();

                    if (session?.user) {
                        await handlePostAuth(supabase, session.user.id);
                    } else {
                        if (mounted) router.replace('/auth/login');
                    }
                }
            } catch (err) {
                console.error('Auth callback unexpected error:', err);
                if (mounted) router.replace('/auth/login?error=auth_callback_failed');
            }
        };

        const handlePostAuth = async (supabase: any, userId: string) => {
            if (!mounted) return;
            setStatus('프로필 확인 중...');

            // Profile에서 승인 상태 확인 — 최대 3회 재시도
            const maxRetries = 3;
            let retryCount = 0;
            let profile = null;

            while (retryCount < maxRetries && !profile) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('approval_status, role')
                    .eq('id', userId)
                    .single();

                if (!error && data) {
                    profile = data;
                    break;
                }

                retryCount++;
                if (retryCount < maxRetries) {
                    if (mounted) setStatus(`프로필 생성 대기 중... (${retryCount}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            if (!mounted) return;

            if (profile) {
                redirectByApproval(profile);
            } else {
                // 재시도 후에도 프로필이 없으면 pending-approval로
                router.replace('/auth/pending-approval');
            }
        };

        const redirectByApproval = (profile: { approval_status: string; role: string }) => {
            if (!mounted) return;

            if (profile.approval_status === 'approved') {
                if (profile.role === 'admin') {
                    router.replace('/admin/dashboard');
                } else if (profile.role === 'coach') {
                    router.replace('/apps/dashboard');
                } else {
                    router.replace('/apps/dashboard');
                }
            } else if (profile.approval_status === 'rejected') {
                router.replace('/auth/rejected');
            } else {
                router.replace('/auth/pending-approval');
            }
        };

        handleCallback();

        return () => {
            mounted = false;
        };
    }, [router]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0D0D0E',
        }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    width: 56,
                    height: 56,
                    border: '3px solid rgba(255, 255, 255, 0.06)',
                    borderTop: '3px solid #FF6B00',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 20px',
                }} />
                <p style={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: 14,
                    fontWeight: 500,
                }}>
                    {status}
                </p>
            </div>
        </div>
    );
}
