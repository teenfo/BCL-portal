'use client';

import React from 'react';

interface StatCardProps {
    icon: string;
    value: string | number;
    label: string;
    accent?: boolean;
    className?: string;
    onClick?: () => void;
}

export default function StatCard({ icon, value, label, accent = false, className = '', onClick }: StatCardProps) {
    return (
        <div
            className={className}
            onClick={onClick}
            style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.875rem 1rem',
                background: accent ? 'var(--app-accent-light, rgba(210,105,30,0.08))' : 'var(--app-surface, #fff)',
                border: `1px solid ${accent ? 'rgba(210,105,30,0.15)' : 'var(--app-border, rgba(0,0,0,0.06))'}`,
                borderRadius: 'var(--app-radius-lg, 16px)',
                boxShadow: 'var(--app-shadow-sm)',
                transition: 'all 0.2s ease',
                cursor: onClick ? 'pointer' : 'default',
            }}
        >
            <div style={{ fontSize: '1.25rem', lineHeight: 1, flexShrink: 0 }}>{icon}</div>
            <div style={{ minWidth: 0 }}>
                <div
                    style={{
                        fontSize: '1.125rem',
                        fontWeight: 800,
                        color: accent ? 'var(--app-accent, #D2691E)' : 'var(--app-text-primary, #1A1A1A)',
                        lineHeight: 1.2,
                    }}
                >
                    {value}
                </div>
                <div
                    style={{
                        fontSize: '0.6875rem',
                        fontWeight: 500,
                        color: 'var(--app-text-secondary, #6B7280)',
                        marginTop: '0.125rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {label}
                </div>
            </div>
        </div>
    );
}
