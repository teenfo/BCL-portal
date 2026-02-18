'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextValue {
    toast: (message: string, type?: ToastType) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        // Fallback for components outside provider — use alert as last resort
        return {
            toast: (msg) => alert(msg),
            success: (msg) => alert(msg),
            error: (msg) => alert(msg),
            info: (msg) => alert(msg),
            warning: (msg) => alert(msg),
        };
    }
    return ctx;
}

const ICONS: Record<ToastType, string> = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️',
};

const COLORS: Record<ToastType, { bg: string; border: string; text: string }> = {
    success: { bg: 'rgba(74, 222, 128, 0.12)', border: 'rgba(74, 222, 128, 0.3)', text: '#4ade80' },
    error: { bg: 'rgba(248, 113, 113, 0.12)', border: 'rgba(248, 113, 113, 0.3)', text: '#f87171' },
    info: { bg: 'rgba(96, 165, 250, 0.12)', border: 'rgba(96, 165, 250, 0.3)', text: '#60a5fa' },
    warning: { bg: 'rgba(250, 204, 21, 0.12)', border: 'rgba(250, 204, 21, 0.3)', text: '#facc15' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3500);
    }, []);

    const remove = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const value: ToastContextValue = {
        toast: addToast,
        success: (msg) => addToast(msg, 'success'),
        error: (msg) => addToast(msg, 'error'),
        info: (msg) => addToast(msg, 'info'),
        warning: (msg) => addToast(msg, 'warning'),
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            {/* Toast Container */}
            <div
                style={{
                    position: 'fixed',
                    top: 20,
                    right: 20,
                    zIndex: 99999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    pointerEvents: 'none',
                    maxWidth: 400,
                }}
            >
                {toasts.map(t => {
                    const c = COLORS[t.type];
                    return (
                        <div
                            key={t.id}
                            onClick={() => remove(t.id)}
                            style={{
                                pointerEvents: 'auto',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '12px 16px',
                                borderRadius: 12,
                                background: c.bg,
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                border: `1px solid ${c.border}`,
                                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                                cursor: 'pointer',
                                animation: 'toastSlideIn 0.3s ease',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: 'var(--app-text-primary, #1a1a1a)',
                                lineHeight: 1.4,
                            }}
                        >
                            <span style={{ fontSize: '1.125rem', flexShrink: 0 }}>{ICONS[t.type]}</span>
                            <span style={{ flex: 1 }}>{t.message}</span>
                        </div>
                    );
                })}
            </div>

            <style>{`
                @keyframes toastSlideIn {
                    from { opacity: 0; transform: translateX(100px); }
                    to { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </ToastContext.Provider>
    );
}
