'use client';

import CoachBottomNav from '@/components/layout/CoachBottomNav';
import UserTopHeader from '@/components/layout/UserTopHeader';
import NotificationToast from '@/components/ui/NotificationToast';
import { AuthGuard } from '@/components/AuthGuard';
import { ReactNode } from 'react';
import '../apps/apps.css';

export default function CoachLayout({ children }: { children: ReactNode }) {
    return (
        <AuthGuard requireAuth={true} requiredRole="coach" redirectTo="/auth/login">
            <div className="relative">
                <UserTopHeader />
                <NotificationToast />
                {children}
                <CoachBottomNav />
            </div>
        </AuthGuard>
    );
}
