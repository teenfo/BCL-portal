'use client';

import type { AttendanceOutcome } from './types';

interface AttendanceOutcomeChipProps {
    outcome: AttendanceOutcome;
    size?: 'sm' | 'md';
}

const OUTCOME_CONFIG: Record<AttendanceOutcome, { label: string; emoji: string; color: string; bg: string }> = {
    pending: { label: '대기', emoji: '⚪', color: 'rgba(255,255,255,0.7)', bg: 'rgba(255,255,255,0.08)' },
    checked_in: { label: '출석', emoji: '✅', color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
    no_show: { label: '노쇼', emoji: '🚫', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
    late_cancel: { label: '지각취소', emoji: '⏰', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
    coach_excused: { label: '예외처리', emoji: '🛡', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
    walk_in: { label: '워크인', emoji: '🚶', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
};

export default function AttendanceOutcomeChip({ outcome, size = 'sm' }: AttendanceOutcomeChipProps) {
    const cfg = OUTCOME_CONFIG[outcome] ?? OUTCOME_CONFIG.pending;
    const padding = size === 'md' ? '0.375rem 0.625rem' : '0.125rem 0.5rem';
    const fontSize = size === 'md' ? '0.75rem' : '0.6875rem';
    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding,
            fontSize,
            fontWeight: 700,
            borderRadius: 999,
            color: cfg.color,
            background: cfg.bg,
            whiteSpace: 'nowrap',
        }}>
            <span aria-hidden>{cfg.emoji}</span>
            {cfg.label}
        </span>
    );
}

export function attendanceOutcomeLabel(outcome: AttendanceOutcome): string {
    return OUTCOME_CONFIG[outcome]?.label ?? '대기';
}
