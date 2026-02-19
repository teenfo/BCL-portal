'use client';

import UserTopHeader from '@/components/layout/UserTopHeader';
import UserBottomNav from '@/components/layout/UserBottomNav';
import NotificationToast from '@/components/ui/NotificationToast';
import { AuthGuard } from '@/components/AuthGuard';
import { ReactNode, useEffect } from 'react';
import './apps.css';

export default function AppsLayout({ children }: { children: ReactNode }) {
    // Override body dark theme for user app
    useEffect(() => {
        document.body.classList.add('apps-active');
        return () => document.body.classList.remove('apps-active');
    }, []);

    // Register Service Worker for PWA + Push
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(err =>
                console.log('SW registration failed:', err)
            );
        }
    }, []);

    return (
        <AuthGuard requireAuth={true} redirectTo="/auth/login">
            <div className="relative">
                <UserTopHeader />
                <NotificationToast />
                {children}
                <UserBottomNav />
            </div>
        </AuthGuard>
    );
}
