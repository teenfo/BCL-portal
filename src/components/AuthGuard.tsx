'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGuardProps {
    children: ReactNode;
    requireAuth?: boolean;
    requiredRole?: 'admin' | 'coach' | 'member';
    redirectTo?: string;
}

export function AuthGuard({
    children,
    requireAuth = true,
    requiredRole,
    redirectTo = '/auth/login',
}: AuthGuardProps) {
    const { user, session, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        // 인증 필요한데 로그인 안 됨
        if (requireAuth && !user) {
            router.push(redirectTo);
            return;
        }

        // 역할 확인
        if (requiredRole && user) {
            const userRole = user.user_metadata?.role;
            if (userRole !== requiredRole) {
                // 역할에 따라 리다이렉트
                if (userRole === 'admin') router.push('/admin');
                else if (userRole === 'coach') router.push('/coach');
                else router.push('/apps');
                return;
            }
        }
    }, [user, loading, requireAuth, requiredRole, router, redirectTo]);

    // 로딩 중
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white/60">Loading...</p>
                </div>
            </div>
        );
    }

    // 인증 필요한데 로그인 안 됨
    if (requireAuth && !user) {
        return null;
    }

    // 역할 검증 실패
    if (requiredRole && user?.user_metadata?.role !== requiredRole) {
        return null;
    }

    return <>{children}</>;
}
