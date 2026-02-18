'use client';

import React from 'react';

interface LogoProps {
    className?: string;
    variant?: 'primary' | 'white' | 'light';
    collapsed?: boolean;
    size?: number;
}

export default function Logo({ className = '', variant = 'primary', collapsed = false, size = 32 }: LogoProps) {
    const color = variant === 'primary' || variant === 'light' ? 'var(--primary)' : '#FFFFFF';
    const subtextColor = variant === 'light' ? '#1A1A1A' : (variant === 'white' ? '#FFFFFF' : 'var(--text-secondary)');

    return (
        <div className={`flex items-center gap-4 ${className} ${!collapsed ? 'justify-center' : ''}`}>
            {!collapsed && (
                <div className="flex flex-col leading-none animate-premium-fade text-right">
                    <span className="text-3xl font-black italic tracking-tighter" style={{ color }}>
                        BCL
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 mt-1" style={{ color: subtextColor }}>
                        Crossfit Lounge
                    </span>
                </div>
            )}

            <svg
                width={size}
                height={size}
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="flex-shrink-0"
            >
                {/* Refined Kettlebell Shape */}
                <path
                    d="M50 10C35 10 25 20 25 35V45C15 50 10 60 10 72C10 85 20 95 50 95C80 95 90 85 90 72C90 60 85 50 75 45V35C75 20 65 10 50 10ZM35 35C35 28 40 22 50 22C60 22 65 28 65 35V42H35V35Z"
                    fill={color}
                />
            </svg>
        </div>
    );
}
