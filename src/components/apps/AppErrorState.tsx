'use client';

import React from 'react';

interface AppErrorStateProps {
    message?: string;
    onRetry?: () => void;
    className?: string;
}

export default function AppErrorState({
    message = '데이터를 불러오는 중 오류가 발생했습니다.',
    onRetry,
    className = '',
}: AppErrorStateProps) {
    return (
        <div
            className={className}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3rem 1.5rem',
                textAlign: 'center',
            }}
        >
            <div
                style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem',
                }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
            </div>
            <div
                style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'var(--app-text-primary, #1A1A1A)',
                    marginBottom: '0.375rem',
                }}
            >
                오류 발생
            </div>
            <div
                style={{
                    fontSize: '0.875rem',
                    color: 'var(--app-text-secondary, #6B7280)',
                    lineHeight: 1.5,
                    maxWidth: 280,
                    marginBottom: onRetry ? '1.25rem' : 0,
                }}
            >
                {message}
            </div>
            {onRetry && (
                <button
                    onClick={onRetry}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.625rem 1.25rem',
                        borderRadius: 'var(--app-radius-md, 12px)',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        background: 'var(--app-surface, #fff)',
                        color: 'var(--app-text-primary, #1A1A1A)',
                        border: '1px solid var(--app-border-strong, rgba(0,0,0,0.1))',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                    다시 시도
                </button>
            )}
        </div>
    );
}
