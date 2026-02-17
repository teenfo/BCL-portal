'use client';

import UserBottomNav from '@/components/layout/UserBottomNav';
import NotificationToast from '@/components/ui/NotificationToast';
import { ReactNode, useEffect } from 'react';
import './apps.css';

export default function AppsLayout({ children }: { children: ReactNode }) {
    // Register Service Worker for PWA + Push
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(err =>
                console.log('SW registration failed:', err)
            );
        }
    }, []);

    return (
        <div className="relative">
            <NotificationToast />
            {children}
            <UserBottomNav />
        </div>
    );
}
