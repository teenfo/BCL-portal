'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGuardProps {
    children: ReactNode;
    requireAuth?: boolean;
    requiredRole?: 'admin' | 'coach' | 'member';
    redirectTo?: string;
}

/**
 * AuthGuard — 인증 및 역할 기반 경로 보호 컴포넌트
 * 
 * 미들웨어가 1차 방어선이고, AuthGuard는 2차 방어선(클라이언트 측) 역할.
 * 미들웨어에서 비인증 사용자를 이미 차단하지만,
 * AuthGuard는 역할 확인(admin/coach/member) + 승인 상태 확인을 추가로 수행.
 */
export function AuthGuard({
    children,
    requireAuth = true,
    requiredRole,
    redirectTo = '/auth/login',
}: AuthGuardProps) {
    const { user, profile, loading, isApproved, isPending, isRejected } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        if (loading) return;

        // 인증 필요한데 로그인 안 됨
        if (requireAuth && !user) {
            const returnUrl = encodeURIComponent(pathname || '/');
            router.replace(`${redirectTo}?redirect=${returnUrl}`);
            return;
        }

        // 로그인은 됐지만 프로필이 아직 없는 경우 — 잠시 대기
        if (requireAuth && user && !profile) {
            // 프로필 로딩 중일 수 있으므로 아직 리다이렉트하지 않음
            return;
        }

        // 승인 대기 중인 사용자
        if (requireAuth && user && profile && isPending) {
            if (pathname !== '/auth/pending-approval') {
                router.replace('/auth/pending-approval');
            }
            return;
        }

        // 승인 거절된 사용자
        if (requireAuth && user && profile && isRejected) {
            if (pathname !== '/auth/rejected') {
                router.replace('/auth/rejected');
            }
            return;
        }

        // 역할 확인 (profile의 role 사용)
        if (requiredRole && profile) {
            const userRole = profile.role;
            if (userRole !== requiredRole) {
                // 역할에 따라 올바른 홈으로 리다이렉트
                if (userRole === 'admin') router.replace('/admin/dashboard');
                else if (userRole === 'coach') router.replace('/apps/dashboard');
                else router.replace('/apps/dashboard');
                return;
            }
        }

        // 모든 검증 통과 — 인증 완료
        setAuthorized(true);
    }, [user, profile, loading, requireAuth, requiredRole, router, redirectTo, isPending, isRejected, pathname]);

    // 로딩 중
    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--background, #0D0D0E)',
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        border: '3px solid rgba(255, 255, 255, 0.06)',
                        borderTop: '3px solid #FF6B00',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 16px',
                    }} />
                    <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 14 }}>Loading...</p>
                </div>
            </div>
        );
    }

    // 인증/권한 검증이 아직 완료되지 않음
    if (!authorized) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--background, #0D0D0E)',
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        border: '3px solid rgba(255, 255, 255, 0.06)',
                        borderTop: '3px solid #FF6B00',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 16px',
                    }} />
                    <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 14 }}>Verifying access...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
