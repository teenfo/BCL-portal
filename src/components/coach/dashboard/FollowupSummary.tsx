'use client';

import { useCallback, useEffect, useState } from 'react';

import { rpc } from '@/lib/supabase/query';
import FollowupList from '@/components/coach/followups/FollowupList';
import type { CoachFollowup } from '@/types/p2';

/** Coach Dashboard — 미완료 후속 조치 요약 위젯 (P25) */
export default function FollowupSummary() {
    const [followups, setFollowups] = useState<CoachFollowup[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    const load = useCallback(async () => {
        try {
            const { data } = await rpc('fn_get_my_followups', { p_status: 'open', p_limit: 20 });
            setFollowups(data?.success && Array.isArray(data.data) ? data.data : []);
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
            setFollowups([]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    if (loading) {
        return (
            <div className="app-glass-card" style={{ padding: '0.875rem 1rem', marginBottom: '1.5rem' }}>
                <div className="app-skeleton" style={{ height: 14, width: '40%', marginBottom: 8 }} />
                <div className="app-skeleton" style={{ height: 48, borderRadius: 8 }} />
            </div>
        );
    }

    if (followups.length === 0) return null;

    const overdueCount = followups.filter(f => f.is_overdue).length;
    const visible = expanded ? followups : followups.slice(0, 3);

    return (
        <div className="app-glass-card" style={{
            padding: '0.875rem 1rem',
            marginBottom: '1.5rem',
            border: overdueCount > 0 ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(34,197,94,0.25)',
            background: overdueCount > 0
                ? 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.02) 100%)'
                : 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.02) 100%)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: overdueCount > 0 ? '#EF4444' : '#22C55E' }}>
                    📝 미완료 후속 조치 {followups.length}건
                    {overdueCount > 0 && (
                        <span style={{ marginLeft: 6, fontSize: '0.625rem', color: '#EF4444' }}>
                            · 기한 초과 {overdueCount}
                        </span>
                    )}
                </div>
                {followups.length > 3 && (
                    <button
                        onClick={() => setExpanded(v => !v)}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: '0.6875rem', color: 'var(--app-text-muted)', fontWeight: 600, padding: 0,
                        }}
                    >
                        {expanded ? '접기 ↑' : `전체 보기 (${followups.length}) ↓`}
                    </button>
                )}
            </div>
            <FollowupList followups={visible} onChanged={load} compact />
        </div>
    );
}
