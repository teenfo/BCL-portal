'use client';

import React from 'react';
import { WidgetDefinition } from '@/types/widget';

interface WidgetDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    availableWidgets: WidgetDefinition[];
    onAddWidget: (widgetId: string) => void;
}

/**
 * 위젯 추가 사이드 패널 (Drawer)
 * - 현재 비활성화된 위젯 목록을 표시
 * - 클릭 시 대시보드에 추가
 */
export default function WidgetDrawer({ isOpen, onClose, availableWidgets, onAddWidget }: WidgetDrawerProps) {
    if (!isOpen) return null;

    const categories = ['finance', 'operations', 'crm', 'insights', 'infrastructure'] as const;
    const categoryLabels: Record<string, string> = {
        finance: '재무 · 회원',
        operations: '운영',
        crm: 'CRM',
        insights: '인사이트',
        infrastructure: '시스템',
    };

    const getIconEmoji = (icon: string) => {
        const map: Record<string, string> = {
            IconMembers: '👥', IconCalendar: '📅', IconFaceId: '✅', IconDollar: '💰',
            IconMegaphone: '📢', IconCreditCard: '💳', IconSettings: '🏋️', IconHand: '🎧',
        };
        return map[icon] || '📊';
    };

    return (
        <div className="fixed inset-0 z-40">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Drawer */}
            <div className="absolute right-0 top-0 bottom-0 w-96 animate-slide-in" style={{ animationDuration: '0.3s' }}>
                <div className="h-full bg-[#0D0D0E] border-l border-white/10 overflow-y-auto custom-scrollbar">
                    {/* Header */}
                    <div className="sticky top-0 bg-[#0D0D0E]/90 backdrop-blur-md z-10 p-8 pb-6 border-b border-white/[0.05]">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-black text-white uppercase tracking-tight">위젯 추가</h2>
                                <p className="text-[10px] text-white/30 mt-1 uppercase tracking-widest">
                                    {availableWidgets.length}개 사용 가능
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.05] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-all"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8 space-y-8">
                        {availableWidgets.length === 0 ? (
                            <div className="py-16 text-center">
                                <p className="text-3xl opacity-20 mb-4">✨</p>
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
                                    All Widgets Active
                                </p>
                                <p className="text-[9px] text-white/10 mt-2">모든 위젯이 대시보드에 표시 중입니다</p>
                            </div>
                        ) : (
                            categories.map(cat => {
                                const widgets = availableWidgets.filter(w => w.category === cat);
                                if (widgets.length === 0) return null;
                                return (
                                    <div key={cat}>
                                        <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 mb-4">
                                            {categoryLabels[cat]}
                                        </h3>
                                        <div className="space-y-3">
                                            {widgets.map(widget => (
                                                <button
                                                    key={widget.id}
                                                    onClick={() => { onAddWidget(widget.id); onClose(); }}
                                                    className="w-full p-5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-left hover:bg-white/[0.05] hover:border-white/10 transition-all group"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div
                                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 transition-transform group-hover:scale-110"
                                                            style={{
                                                                background: `${widget.iconColor}15`,
                                                                border: `1px solid ${widget.iconColor}25`,
                                                            }}
                                                        >
                                                            {getIconEmoji(widget.icon)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-white group-hover:text-[var(--primary)] transition-colors">
                                                                {widget.title}
                                                            </p>
                                                            <p className="text-[9px] text-white/30 mt-0.5 truncate">{widget.description}</p>
                                                        </div>
                                                        <span className="text-white/10 group-hover:text-[var(--primary)] text-lg transition-colors">+</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
