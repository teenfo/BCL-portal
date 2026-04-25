'use client';

import CoachBottomNav from '@/components/layout/CoachBottomNav';
import UserTopHeader from '@/components/layout/UserTopHeader';
import NotificationToast from '@/components/ui/NotificationToast';
import { AuthGuard } from '@/components/AuthGuard';
import CoachStateGate from '@/components/coach/CoachStateGate';
import { ReactNode } from 'react';

import '../apps/apps.css';

export default function CoachLayout({ children }: { children: ReactNode }) {
    return (
        <AuthGuard requireAuth={true} requiredRole="coach" redirectTo="/auth/login">
            <div className="relative">
                <UserTopHeader />
                <NotificationToast />
                <CoachStateGate>
                    {children}
                </CoachStateGate>
                <CoachBottomNav />
            </div>
        </AuthGuard>
    );
}
