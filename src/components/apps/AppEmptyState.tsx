'use client';

import React from 'react';

interface AppEmptyStateProps {
    icon: string;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export default function AppEmptyState({ icon, title, description, action, className = '' }: AppEmptyStateProps) {
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
            <div style={{ fontSize: '3rem', marginBottom: '1rem', lineHeight: 1 }}>{icon}</div>
            <div
                style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'var(--app-text-primary, #1A1A1A)',
                    marginBottom: description ? '0.5rem' : action ? '1.25rem' : 0,
                }}
            >
                {title}
            </div>
            {description && (
                <div
                    style={{
                        fontSize: '0.875rem',
                        color: 'var(--app-text-secondary, #6B7280)',
                        lineHeight: 1.5,
                        maxWidth: 280,
                        marginBottom: action ? '1.25rem' : 0,
                    }}
                >
                    {description}
                </div>
            )}
            {action && (
                <button
                    className="app-btn-primary"
                    onClick={action.onClick}
                    style={{ padding: '0.625rem 1.5rem' }}
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}
