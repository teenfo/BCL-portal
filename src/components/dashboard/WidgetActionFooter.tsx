'use client';

import React from 'react';
import Link from 'next/link';
import { WidgetAction } from '@/types/widget';

interface WidgetActionFooterProps {
    actions: WidgetAction[];
    onAction: (action: WidgetAction) => void;
}

/**
 * 위젯 카드 하단 액션 그리드
 * - group: primary → 채워진 버튼
 * - group: secondary → 아웃라인 버튼
 * - group: link → 텍스트 링크
 */
export default function WidgetActionFooter({ actions, onAction }: WidgetActionFooterProps) {
    const primary = actions.filter(a => a.group === 'primary');
    const secondary = actions.filter(a => a.group === 'secondary');
    const links = actions.filter(a => a.group === 'link');

    return (
        <div className="space-y-2 pt-1">
            {/* Primary Actions */}
            {primary.length > 0 && (
                <div className={`grid gap-2 ${primary.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {primary.map((action) => (
                        <button
                            key={action.label}
                            onClick={() => onAction(action)}
                            title={action.description}
                            className="w-full py-2.5 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                            style={{
                                background: 'var(--primary)',
                                boxShadow: '0 0 20px var(--primary-glow)',
                            }}
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Secondary Actions */}
            {secondary.length > 0 && (
                <div className={`grid gap-2 ${secondary.length <= 2 ? `grid-cols-${secondary.length}` : 'grid-cols-2'}`}>
                    {secondary.map((action) => {
                        if (action.type === 'link' && action.href) {
                            return (
                                <Link
                                    key={action.label}
                                    href={action.href}
                                    title={action.description}
                                    className="w-full py-2 px-3 rounded-xl text-[9px] font-black uppercase tracking-wider text-white/50 bg-white/[0.03] border border-white/[0.05] text-center hover:bg-white/[0.06] hover:text-white/70 transition-all"
                                >
                                    {action.label}
                                </Link>
                            );
                        }
                        return (
                            <button
                                key={action.label}
                                onClick={() => onAction(action)}
                                title={action.description}
                                className="w-full py-2 px-3 rounded-xl text-[9px] font-black uppercase tracking-wider text-white/50 bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] hover:text-white/70 transition-all"
                            >
                                {action.label}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Link Actions */}
            {links.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                    {links.map((action) => (
                        action.href ? (
                            <Link
                                key={action.label}
                                href={action.href}
                                className="text-[9px] font-bold text-[var(--primary)]/60 hover:text-[var(--primary)] uppercase tracking-widest transition-colors"
                            >
                                {action.label}
                            </Link>
                        ) : (
                            <button
                                key={action.label}
                                onClick={() => onAction(action)}
                                className="text-[9px] font-bold text-[var(--primary)]/60 hover:text-[var(--primary)] uppercase tracking-widest transition-colors"
                            >
                                {action.label}
                            </button>
                        )
                    ))}
                </div>
            )}
        </div>
    );
}
