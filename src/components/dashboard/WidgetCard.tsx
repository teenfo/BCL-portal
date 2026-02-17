'use client';

import React from 'react';
import { WidgetDefinition, WidgetAction } from '@/types/widget';
import { useWidgetData } from '@/hooks/useWidgetData';
import WidgetCardContent from './WidgetCardContent';
import WidgetActionFooter from './WidgetActionFooter';

interface WidgetCardProps {
    definition: WidgetDefinition;
    onAction: (action: WidgetAction) => void;
    isDragging?: boolean;
}

/**
 * 개별 위젯 카드 컴포넌트
 * - 헤더: 아이콘 + 타이틀 + 배지
 * - 바디: Hero Metric + Context + Progress (WidgetCardContent)
 * - 푸터: Action 버튼들 (WidgetActionFooter)
 */
export default function WidgetCard({ definition, onAction, isDragging }: WidgetCardProps) {
    const { data, loading, error } = useWidgetData(definition);

    return (
        <div
            className={`
        glass-card p-6 flex flex-col gap-5 transition-all duration-300
        ${isDragging ? 'opacity-50 scale-95 shadow-2xl ring-2 ring-[var(--primary)]/30' : 'hover:border-white/10'}
      `}
            style={{ minHeight: '280px' }}
        >
            {/* Header */}
            <div className="flex items-center gap-3">
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{
                        background: `${definition.iconColor}15`,
                        border: `1px solid ${definition.iconColor}25`,
                        color: definition.iconColor,
                    }}
                >
                    {getIconEmoji(definition.icon)}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black text-white uppercase tracking-wide truncate">
                        {definition.title}
                    </h4>
                    <p className="text-[9px] text-white/30 truncate">{definition.description}</p>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1">
                <WidgetCardContent
                    definition={definition}
                    data={data}
                    loading={loading}
                    error={error}
                />
            </div>

            {/* Footer – Actions */}
            {definition.actions.length > 0 && (
                <div className="border-t border-white/[0.05] pt-4">
                    <WidgetActionFooter
                        actions={definition.actions}
                        onAction={onAction}
                    />
                </div>
            )}
        </div>
    );
}

/**
 * 아이콘 이름 → 이모지 매핑 (실제 아이콘 컴포넌트 대체용)
 */
function getIconEmoji(iconName: string): string {
    const map: Record<string, string> = {
        IconMembers: '👥',
        IconCalendar: '📅',
        IconFaceId: '✅',
        IconDollar: '💰',
        IconMegaphone: '📢',
        IconCreditCard: '💳',
        IconSettings: '🏋️',
        IconHand: '🎧',
        IconPlus: '➕',
        IconSearch: '🔍',
        IconAlert: '⚠️',
        IconClose: '❌',
        IconSwap: '🔄',
        IconUndo: '↩️',
        IconRefund: '💸',
        IconClock: '⏰',
        IconPause: '⏸️',
        IconExtend: '📆',
        IconReply: '💬',
    };
    return map[iconName] || '📊';
}
