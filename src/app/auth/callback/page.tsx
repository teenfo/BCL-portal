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
            const url = new URL(window.location.href);

            // ─── 팝업 컨텍스트 감지 ───
            // window.opener가 존재하면 팝업에서 열린 것
            const isPopup = !!window.opener && window.opener !== window;


            // PKCE flow: code exchange
            const code = url.searchParams.get('code');
            // Implicit flow: check hash fragment
            const hashParams = new URLSearchParams(url.hash.substring(1));
            const accessToken = hashParams.get('access_token');

            try {
                if (code) {
                    // PKCE 인증 코드 교환
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

                    if (error) {
                        console.error('[Callback] Code exchange error:', error);
                        if (isPopup) { window.close(); return; }
                        if (mounted) router.replace('/auth/login?error=auth_callback_failed');
                        return;
                    }

                    if (data.session) {
                        // 팝업에서는 세션만 설정하고 닫기
                        if (isPopup) {
                            setStatus('로그인 완료! 창을 닫는 중...');
                            setTimeout(() => window.close(), 300);
                            return;
                        }
                        await handlePostAuth(supabase, data.session.user.id);
                    }
                } else if (accessToken) {
                    // Implicit flow — 세션이 자동으로 설정됨
                    const { data: { session }, error } = await supabase.auth.getSession();

                    if (error || !session) {
                        console.error('[Callback] Session error:', error);
                        if (isPopup) { window.close(); return; }
                        if (mounted) router.replace('/auth/login?error=auth_callback_failed');
                        return;
                    }

                    if (isPopup) {
                        setStatus('로그인 완료! 창을 닫는 중...');
                        setTimeout(() => window.close(), 300);
                        return;
                    }
                    await handlePostAuth(supabase, session.user.id);
                } else {
                    // code도 token도 없는 경우 — 현재 세션 확인
                    if (mounted) setStatus('세션 확인 중...');
                    const { data: { session } } = await supabase.auth.getSession();

                    if (session?.user) {
                        await handlePostAuth(supabase, session.user.id);
                    } else {
                        if (mounted) router.replace('/auth/login');
                    }
                }
            } catch (err) {
                console.error('[Callback] Unexpected error:', err);
                // AbortError는 무시 — 세션은 이미 설정되었을 수 있음
                if (err instanceof DOMException && err.name === 'AbortError') {
                    if (mounted) {
                        setStatus('세션 확인 중...');
                        // 약간의 딜레이 후 세션 재확인
                        setTimeout(async () => {
                            try {
                                const { data: { session } } = await supabase.auth.getSession();
                                if (session?.user) {
                                    await handlePostAuth(supabase, session.user.id);
                                } else {
                                    if (mounted) router.replace('/auth/login');
                                }
                            } catch {
                                if (mounted) router.replace('/auth/login');
                            }
                        }, 500);
                    }
                } else {
                    if (mounted) router.replace('/auth/login?error=auth_callback_failed');
                }
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

            // redirect 파라미터가 있으면 그쪽으로 보내기
            const urlParams = new URLSearchParams(window.location.search);
            const redirectTo = urlParams.get('redirect');

            if (profile.approval_status === 'approved') {
                if (redirectTo && !redirectTo.startsWith('/auth')) {
                    router.replace(redirectTo);
                } else if (profile.role === 'admin') {
                    router.replace('/admin/dashboard');
                } else if (profile.role === 'coach') {
                    router.replace('/coach/dashboard');
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
