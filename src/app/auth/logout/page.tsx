'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * /auth/logout — 로그아웃 라우트
 * 
 * Sitemap에 명시된 공통 로그아웃 경로.
 * 로그아웃 처리 후 /auth/login으로 리다이렉트합니다.
 */
export default function LogoutPage() {
    const { signOut, user, loading } = useAuth();
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    useEffect(() => {
        if (loading) return;

        // 이미 로그아웃 상태면 로그인 페이지로
        if (!user) {
            router.replace('/auth/login');
            return;
        }

        // 중복 실행 방지
        if (isLoggingOut) return;

        const performLogout = async () => {
            setIsLoggingOut(true);
            try {
                await signOut();
                router.replace('/auth/login');
            } catch (err) {
                console.error('[Logout] Error during sign out:', err);
                // 에러가 나도 로그인 페이지로 이동
                router.replace('/auth/login');
            }
        };

        performLogout();
    }, [user, loading, signOut, router, isLoggingOut]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--background, #0D0D0E)',
            fontFamily: "'Lexend', sans-serif",
        }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    width: 48,
                    height: 48,
                    border: '3px solid rgba(255, 255, 255, 0.06)',
                    borderTop: '3px solid var(--primary, #FF6B00)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 16px',
                }} />
                <p style={{
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontSize: 14,
                    fontWeight: 500,
                }}>
                    로그아웃 중...
                </p>
            </div>
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
