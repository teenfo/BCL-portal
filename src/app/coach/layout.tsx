'use client';

import CoachBottomNav from '@/components/layout/CoachBottomNav';
import UserTopHeader from '@/components/layout/UserTopHeader';
import NotificationToast from '@/components/ui/NotificationToast';
import { AuthGuard } from '@/components/AuthGuard';
import { ReactNode, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { query, rpc } from '@/lib/supabase/query';
import { useAuth } from '@/contexts/AuthContext';
import '../apps/apps.css';

function CoachUnlinkedBanner() {
    const { user } = useAuth();
    const [isLinked, setIsLinked] = useState<boolean | null>(null);

    useEffect(() => {
        if (!user) return;
        (async () => {
            const { data } = await query('coaches').select('id').eq('user_id', user.id).maybeSingle();
            setIsLinked(!!data);
        })();
    }, [user]);

    if (isLinked === null || isLinked) return null;

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 100%)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: '12px',
            padding: '12px 16px',
            margin: '8px 16px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
        }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#F59E0B', marginBottom: '2px' }}>
                    코치 계정이 연결되지 않았습니다
                </p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                    관리자에게 계정 연결을 요청해 주세요. 일부 기능이 제한될 수 있습니다.
                </p>
            </div>
        </div>
    );
}

export default function CoachLayout({ children }: { children: ReactNode }) {
    return (
        <AuthGuard requireAuth={true} requiredRole="coach" redirectTo="/auth/login">
            <div className="relative">
                <UserTopHeader />
                <NotificationToast />
                <CoachUnlinkedBanner />
                {children}
                <CoachBottomNav />
            </div>
        </AuthGuard>
    );
}
