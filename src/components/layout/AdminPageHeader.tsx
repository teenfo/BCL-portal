'use client';

import React from 'react';

interface AdminPageHeaderProps {
    category: string;
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
}

export default function AdminPageHeader({ category, title, subtitle, actions }: AdminPageHeaderProps) {
    return (
        <header
            className="admin-page-header"
        >
            <div className="flex flex-col">
                <div className="flex items-center gap-2.5 mb-1.5 overflow-hidden">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--primary)', boxShadow: '0 0 10px var(--primary)' }} />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--primary)] whitespace-nowrap">
                        {category}
                    </span>
                </div>
                <h1 className="text-2xl font-black tracking-tighter text-white uppercase leading-none">
                    {title} {subtitle && <span className="text-white/10 font-thin ml-1 lowercase tracking-normal">{subtitle}</span>}
                </h1>
            </div>

            <div className="flex items-center gap-4">
                {actions}
            </div>
        </header>
    );
}
