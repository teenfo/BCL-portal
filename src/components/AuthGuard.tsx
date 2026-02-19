'use client';

import { useEffect, useState, useRef, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGuardProps {
    children: ReactNode;
    requireAuth?: boolean;
    requiredRole?: 'admin' | 'coach' | 'member';
    redirectTo?: string;
}

/**
 * AuthGuard — 인증 및 역할 기반 경로 보호 컴포넌트 (2차 방어선)
 *
 * 미들웨어(1차)가 서버 측에서 비인증 사용자를 차단.
 * AuthGuard(2차)는 클라이언트에서 역할/승인상태 기반 세밀한 접근 제어.
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
    const [profileWaitExpired, setProfileWaitExpired] = useState(false);
    const profileTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Profile 대기 타이머: user는 있는데 profile이 없으면 최대 3초 대기
    useEffect(() => {
        if (!loading && user && !profile && !profileWaitExpired) {
            profileTimerRef.current = setTimeout(() => {
                setProfileWaitExpired(true);
            }, 3000);
        }

        // profile이 로드되면 타이머 취소
        if (profile && profileTimerRef.current) {
            clearTimeout(profileTimerRef.current);
            profileTimerRef.current = null;
        }

        return () => {
            if (profileTimerRef.current) {
                clearTimeout(profileTimerRef.current);
            }
        };
    }, [loading, user, profile, profileWaitExpired]);

    useEffect(() => {
        // 아직 로딩 중
        if (loading) {
            setAuthorized(false);
            return;
        }

        // 인증 불필요 → 바로 통과
        if (!requireAuth) {
            setAuthorized(true);
            return;
        }

        // ─── 인증 필요한데 유저 없음 → 로그인 이동 ───
        if (!user) {
            const returnUrl = encodeURIComponent(pathname || '/');
            router.replace(`${redirectTo}?redirect=${returnUrl}`);
            return;
        }

        // ─── 유저는 있는데 프로필 아직 없음 → 대기 ───
        if (!profile) {
            if (profileWaitExpired) {
                // 3초 대기 후에도 프로필이 없으면 로그인으로
                console.warn('[AuthGuard] Profile not loaded after timeout. Redirecting to login.');
                router.replace(redirectTo);
            }
            // 대기 중: authorized=false 유지 → 스피너 표시
            return;
        }

        // ─── 승인 대기 중 ───
        if (isPending) {
            if (pathname !== '/auth/pending-approval') {
                router.replace('/auth/pending-approval');
            } else {
                setAuthorized(true);
            }
            return;
        }

        // ─── 승인 거절 ───
        if (isRejected) {
            if (pathname !== '/auth/rejected') {
                router.replace('/auth/rejected');
            } else {
                setAuthorized(true);
            }
            return;
        }

        // ─── 역할 확인 ───
        if (requiredRole && profile.role !== requiredRole) {
            const roleRoutes: Record<string, string> = {
                admin: '/admin/dashboard',
                coach: '/coach/dashboard',
                member: '/apps/dashboard',
            };
            router.replace(roleRoutes[profile.role] || '/apps/dashboard');
            return;
        }

        // ─── 모든 검증 통과 ───
        setAuthorized(true);
    }, [user, profile, loading, requireAuth, requiredRole, router, redirectTo, isPending, isRejected, pathname, profileWaitExpired]);

    // 로딩 중 또는 검증 미완료
    if (loading || (!authorized && requireAuth)) {
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
                    <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 14 }}>
                        {loading ? 'Loading...' : 'Verifying access...'}
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
