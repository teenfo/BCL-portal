'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface ToastNotification {
    id: string;
    title: string;
    content: string;
    category: string;
    action_url?: string;
}

const CATEGORY_ICONS: Record<string, string> = {
    class_reminder: '📅',
    waitlist_vacancy: '🎉',
    membership_expiry: '⚠️',
    promotion: '🎁',
    checkin: '✅',
    system: '🔧',
    general: '🔔',
};

export default function NotificationToast() {
    const [toasts, setToasts] = useState<ToastNotification[]>([]);
    const router = useRouter();

    const handleNotification = useCallback((event: Event) => {
        const detail = (event as CustomEvent).detail as ToastNotification;
        setToasts(prev => [...prev, detail]);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== detail.id));
        }, 5000);
    }, []);

    useEffect(() => {
        window.addEventListener('bcl-notification', handleNotification);
        return () => window.removeEventListener('bcl-notification', handleNotification);
    }, [handleNotification]);

    const dismiss = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const handleClick = (toast: ToastNotification) => {
        if (toast.action_url) {
            router.push(toast.action_url);
        } else {
            router.push('/apps/notifications');
        }
        dismiss(toast.id);
    };

    if (toasts.length === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            width: '100%',
            maxWidth: 440,
            padding: '0 16px',
            pointerEvents: 'none',
        }}>
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    onClick={() => handleClick(toast)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 16px',
                        background: '#FFFFFF',
                        borderRadius: 16,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                        border: '1px solid rgba(0,0,0,0.06)',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        animation: 'toastSlideIn 0.3s ease-out',
                    }}
                >
                    <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: 'rgba(210, 105, 30, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.125rem',
                        flexShrink: 0,
                    }}>
                        {CATEGORY_ICONS[toast.category] || '🔔'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: '#1A1A1A',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}>
                            {toast.title}
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#6B7280',
                            marginTop: 2,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}>
                            {toast.content}
                        </div>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); dismiss(toast.id); }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#9CA3AF',
                            fontSize: '1.25rem',
                            cursor: 'pointer',
                            padding: '0 4px',
                            lineHeight: 1,
                        }}
                    >
                        ×
                    </button>
                </div>
            ))}
            <style>{`
                @keyframes toastSlideIn {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
