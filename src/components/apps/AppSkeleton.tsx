'use client';

import React from 'react';

interface AppSkeletonProps {
    variant?: 'card' | 'list' | 'stat' | 'text';
    count?: number;
    className?: string;
}

function SkeletonPulse({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
    return (
        <div
            className={className}
            style={{
                background: 'linear-gradient(90deg, #E5E7EB 25%, #F3F4F6 50%, #E5E7EB 75%)',
                backgroundSize: '200% 100%',
                animation: 'skeletonPulse 1.5s ease-in-out infinite',
                borderRadius: 'var(--app-radius-md, 12px)',
                ...style,
            }}
        />
    );
}

export default function AppSkeleton({ variant = 'card', count = 1, className = '' }: AppSkeletonProps) {
    const items = Array.from({ length: count }, (_, i) => i);

    if (variant === 'stat') {
        return (
            <div className={className} style={{ display: 'flex', gap: '0.75rem' }}>
                {items.map((i) => (
                    <div
                        key={i}
                        style={{
                            flex: 1,
                            background: 'var(--app-surface, #fff)',
                            border: '1px solid var(--app-border, rgba(0,0,0,0.06))',
                            borderRadius: 'var(--app-radius-lg, 16px)',
                            padding: '1rem',
                            textAlign: 'center',
                        }}
                    >
                        <SkeletonPulse style={{ width: '40%', height: 24, margin: '0 auto 8px' }} />
                        <SkeletonPulse style={{ width: '60%', height: 12, margin: '0 auto' }} />
                    </div>
                ))}
            </div>
        );
    }

    if (variant === 'list') {
        return (
            <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {items.map((i) => (
                    <div
                        key={i}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            background: 'var(--app-surface, #fff)',
                            border: '1px solid var(--app-border, rgba(0,0,0,0.06))',
                            borderRadius: 'var(--app-radius-lg, 16px)',
                            padding: '1rem 1.25rem',
                        }}
                    >
                        <SkeletonPulse style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                            <SkeletonPulse style={{ width: '70%', height: 14, marginBottom: 6 }} />
                            <SkeletonPulse style={{ width: '45%', height: 10 }} />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (variant === 'text') {
        return (
            <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {items.map((i) => (
                    <SkeletonPulse key={i} style={{ width: `${80 - i * 15}%`, height: 14 }} />
                ))}
            </div>
        );
    }

    // Default: card
    return (
        <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {items.map((i) => (
                <div
                    key={i}
                    style={{
                        background: 'var(--app-surface, #fff)',
                        border: '1px solid var(--app-border, rgba(0,0,0,0.06))',
                        borderRadius: 'var(--app-radius-lg, 16px)',
                        padding: '1.25rem',
                        boxShadow: 'var(--app-shadow-card)',
                    }}
                >
                    <SkeletonPulse style={{ width: '50%', height: 16, marginBottom: 12 }} />
                    <SkeletonPulse style={{ width: '100%', height: 12, marginBottom: 8 }} />
                    <SkeletonPulse style={{ width: '75%', height: 12 }} />
                </div>
            ))}
        </div>
    );
}
