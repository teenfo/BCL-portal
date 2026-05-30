'use client';

import { useEffect, useState, useRef, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGuardProps {
    children: ReactNode;
    requireAuth?: boolean;
    /** 허용 역할: 단일 문자열 또는 배열. admin은 항상 모든 경로에 접근 가능 */
    requiredRole?: 'admin' | 'coach' | 'member' | Array<'admin' | 'coach' | 'member'>;
    redirectTo?: string;
}

/**
 * AuthGuard — 인증 및 역할 기반 경로 보호 컴포넌트 (2차 방어선)
 *
 * 1차 방어선: 루트 middleware.ts (서버 측 토큰 갱신 + 비인증 차단)
 * 2차 방어선: AuthGuard (클라이언트 측 역할/승인상태 기반 세밀한 접근 제어)
 *
 * ── 세션 끊김 방지 설계 ──
 *
 * 문제: 앱 간 이동(admin↔apps↔coach) 시 AuthProvider가 리마운트되어
 *       authorized 상태가 false로 초기화 → 불필요한 로그인 리다이렉트 발생.
 *
 * 해결:
 * 1. authorized 상태가 true가 되면 user/profile이 사라지지 않는 한 유지
 * 2. profile 대기 타임아웃을 5초로 증가 (기존 3초 → 네트워크 지연 대응)
 * 3. loading=true 구간에서는 절대 리다이렉트 하지 않음
 * 4. user는 있지만 profile이 없는 경우 profile 로드 완료까지 스피너 유지
 *    (타임아웃 전에는 리다이렉트하지 않음)
 *
 * 규칙: admin 역할은 requiredRole에 관계없이 항상 접근 허용.
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

    // Profile 대기 타임아웃: user 있는데 profile이 늦게 오는 경우 최대 5초 대기
    // (기존 3초 → 5초: 느린 네트워크 대응)
    const [profileWaitExpired, setProfileWaitExpired] = useState(false);
    const profileTimerRef = useRef<NodeJS.Timeout | null>(null);

    // ─── Profile 대기 타이머 관리 ───
    useEffect(() => {
        // user는 있지만 profile이 없고, 아직 타이머가 시작되지 않은 경우
        if (!loading && user && !profile && !profileWaitExpired && !profileTimerRef.current) {
            profileTimerRef.current = setTimeout(() => {
                setProfileWaitExpired(true);
                profileTimerRef.current = null;
            }, 5000); // 5초 (네트워크 느린 환경 대응)
        }

        // profile이 로드되면 타이머 취소
        if (profile && profileTimerRef.current) {
            clearTimeout(profileTimerRef.current);
            profileTimerRef.current = null;
            // 타임아웃 상태도 리셋 (재사용 가능하도록)
            setProfileWaitExpired(false);
        }

        return () => {
            if (profileTimerRef.current) {
                clearTimeout(profileTimerRef.current);
                profileTimerRef.current = null;
            }
        };
    }, [loading, user, profile, profileWaitExpired]);

    // ─── 인가 로직 ───
    useEffect(() => {
        // ── 1. 아직 Supabase Auth 초기화 중 → 절대 리다이렉트 금지 ──
        if (loading) {
            // authorized를 false로 만들지 않음: 이미 authorized=true 인 경우
            // 앱 전환 시 리마운트로 authorized가 false가 되었을 때도
            // loading이 끝날 때까지 스피너 표시
            return;
        }

        // ── 2. 인증 불필요 → 바로 통과 ──
        if (!requireAuth) {
            setAuthorized(true);
            return;
        }

        // ── 3. 유저 없음 → 로그인으로 ──
        if (!user) {
            setAuthorized(false);
            const returnUrl = encodeURIComponent(pathname || '/');
            router.replace(`${redirectTo}?redirect=${returnUrl}`);
            return;
        }

        // ── 4. Profile 대기 중 ──
        // user는 있지만 profile이 아직 없음 → authorized=false 유지 (스피너)
        if (!profile) {
            if (profileWaitExpired) {
                // 5초 대기 후에도 profile이 없으면 → 로그인으로
                // (RLS 실패 등 비정상 상황)
                console.warn('[AuthGuard] Profile load timeout (5s). Redirecting to login.');
                setAuthorized(false);
                router.replace(redirectTo);
            }
            // 대기 중: authorized=false 유지 → 스피너 표시
            return;
        }

        // ── 5. 승인 대기 중 ──
        if (isPending) {
            if (pathname !== '/auth/pending-approval') {
                router.replace('/auth/pending-approval');
            } else {
                setAuthorized(true);
            }
            return;
        }

        // ── 6. 승인 거절 ──
        if (isRejected) {
            if (pathname !== '/auth/rejected') {
                router.replace('/auth/rejected');
            } else {
                setAuthorized(true);
            }
            return;
        }

        // ── 7. 역할 확인 ──
        // admin은 모든 경로에 접근 가능 (슈퍼유저)
        if (requiredRole && profile.role !== 'admin') {
            const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
            if (!allowedRoles.includes(profile.role as 'admin' | 'coach' | 'member')) {
                const roleRoutes: Record<string, string> = {
                    admin: '/admin/dashboard',
                    coach: '/coach/dashboard',
                    member: '/apps/dashboard',
                };
                router.replace(roleRoutes[profile.role] || '/apps/dashboard');
                return;
            }
        }

        // ── 8. 모든 검증 통과 → 인가 ──
        setAuthorized(true);
    }, [
        user, profile, loading,
        requireAuth, requiredRole,
        router, redirectTo,
        isPending, isRejected,
        pathname, profileWaitExpired,
    ]);

    // ─── 렌더링 ───

    // 로딩 중이거나 아직 인가 미완료 → 스피너
    // ⚠️ requireAuth=false이면 위 effect에서 setAuthorized(true)가 즉시 실행되므로
    //    이 조건에 걸리지 않음
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
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
