'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { query } from '@/lib/supabase/query';
import type { MemberAlertFlagType } from '@/types/p1a';

interface AlertCounts {
    trial: number;
    vip_attention: number;
    renewal_due: number;
    returning_after_absence: number;
    injury: number;
    total: number;
    critical: number;
}

const INITIAL: AlertCounts = {
    trial: 0,
    vip_attention: 0,
    renewal_due: 0,
    returning_after_absence: 0,
    injury: 0,
    total: 0,
    critical: 0,
};

export default function TodayAlertSummary() {
    const [counts, setCounts] = useState<AlertCounts>(INITIAL);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const nowIso = new Date().toISOString();
                const { data, error } = await query('member_alert_flags')
                    .select('flag_type, severity, ends_at')
                    .is('resolved_at', null)
                    .or(`ends_at.is.null,ends_at.gt.${nowIso}`);
                if (cancelled) return;
                if (error || !data) {
                    setCounts(INITIAL);
                } else {
                    const next: AlertCounts = { ...INITIAL };
                    for (const row of data as Array<{ flag_type: MemberAlertFlagType; severity: string }>) {
                        next.total += 1;
                        if (row.severity === 'critical') next.critical += 1;
                        if (row.flag_type in next) {
                            (next as any)[row.flag_type] += 1;
                        }
                    }
                    setCounts(next);
                }
            } catch {
                if (!cancelled) setCounts(INITIAL);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    if (loading) {
        return (
            <div className="app-glass-card" style={{ padding: '0.875rem 1rem', marginBottom: '1.5rem' }}>
                <div className="app-skeleton" style={{ height: 14, width: '40%', marginBottom: 8 }} />
                <div className="app-skeleton" style={{ height: 48, borderRadius: 8 }} />
            </div>
        );
    }

    if (counts.total === 0) return null;

    return (
        <Link href="/coach/members" style={{ textDecoration: 'none' }}>
            <div className="app-glass-card" style={{
                padding: '0.875rem 1rem',
                marginBottom: '1.5rem',
                border: counts.critical > 0 ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(96,165,250,0.25)',
                background: counts.critical > 0
                    ? 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.02) 100%)'
                    : 'linear-gradient(135deg, rgba(96,165,250,0.08) 0%, rgba(96,165,250,0.02) 100%)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: counts.critical > 0 ? '#EF4444' : '#60A5FA' }}>
                        {counts.critical > 0 ? '🚨' : '🔔'} 오늘의 회원 경고 {counts.total}건
                        {counts.critical > 0 && (
                            <span style={{ marginLeft: 6, fontSize: '0.625rem', color: '#EF4444' }}>
                                · Critical {counts.critical}
                            </span>
                        )}
                    </div>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--app-text-muted)', fontWeight: 600 }}>회원 보기 →</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                    <AlertStat emoji="🎟" value={counts.trial} label="체험" />
                    <AlertStat emoji="⭐" value={counts.vip_attention} label="VIP 주의" accent="#F59E0B" />
                    <AlertStat emoji="⏳" value={counts.renewal_due} label="만기 예정" accent="#F59E0B" />
                    <AlertStat emoji="🔄" value={counts.returning_after_absence} label="복귀" accent="#22C55E" />
                    <AlertStat emoji="🩹" value={counts.injury} label="부상" accent="#EF4444" />
                </div>
            </div>
        </Link>
    );
}

function AlertStat({ emoji, value, label, accent }: { emoji: string; value: number; label: string; accent?: string }) {
    const isZero = value === 0;
    return (
        <div style={{ textAlign: 'center', opacity: isZero ? 0.4 : 1 }}>
            <div style={{ fontSize: '1.125rem', fontWeight: 800, color: isZero ? 'var(--app-text-muted)' : (accent || 'var(--app-text-primary)') }}>
                {emoji} {value}
            </div>
            <div style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--app-text-muted)', marginTop: 2 }}>
                {label}
            </div>
        </div>
    );
}
