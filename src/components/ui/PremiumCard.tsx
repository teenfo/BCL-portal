'use client';

import React from 'react';

interface PremiumCardProps {
    children: React.ReactNode;
    className?: string;
    variant?: 'default' | 'elevated' | 'glass';
}

export const PremiumCard: React.FC<PremiumCardProps> = ({
    children,
    className = '',
    variant = 'default'
}) => {
    const variants = {
        default: 'bg-[#1A1A1A]/70 backdrop-blur-xl',
        elevated: 'bg-[#2D2D2D]/80 backdrop-blur-2xl shadow-2xl',
        glass: 'bg-white/5 backdrop-blur-md border-white/10'
    };

    return (
        <div className={`premium-card p-1 ${className}`}>
            <div className={`rounded-[calc(var(--radius-md)-4px)] h-full ${variants[variant]}`}>
                {children}
            </div>
        </div>
    );
};
