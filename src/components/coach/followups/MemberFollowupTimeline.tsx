'use client';

import { useCallback, useEffect, useState } from 'react';

import { rpc } from '@/lib/supabase/query';
import FollowupList from './FollowupList';
import FollowupCreateModal from './FollowupCreateModal';
import type { CoachFollowup } from '@/types/p2';

interface MemberFollowupTimelineProps {
    memberId: string;
    memberName: string;
}

/** 회원 상세 — 후속 조치 타임라인 (P25). 코치 본인 것만 조회/관리. */
export default function MemberFollowupTimeline({ memberId, memberName }: MemberFollowupTimelineProps) {
    const [followups, setFollowups] = useState<CoachFollowup[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'open' | 'all'>('open');

    const load = useCallback(async () => {
        try {
            const { data } = await rpc('fn_get_my_followups', {
                p_status: statusFilter === 'all' ? 'all' : 'open',
                p_member_id: memberId,
                p_limit: 30,
            });
            setFollowups(data?.success && Array.isArray(data.data) ? data.data : []);
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
            setFollowups([]);
        }
        setLoading(false);
    }, [memberId, statusFilter]);

    useEffect(() => {
        setLoading(true);
        load();
    }, [load]);

    return (
        <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                    후속 조치 ({followups.length}건)
                </div>
                <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                    {(['open', 'all'] as const).map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)} style={{
                            padding: '0.25rem 0.5rem', borderRadius: 6, border: 'none', cursor: 'pointer',
                            fontSize: '0.6875rem', fontWeight: 600,
                            background: statusFilter === s ? 'var(--app-accent-bg)' : 'var(--app-surface)',
                            color: statusFilter === s ? 'var(--app-accent)' : 'var(--app-text-muted)',
                        }}>
                            {s === 'open' ? '진행 중' : '전체'}
                        </button>
                    ))}
                    <button onClick={() => setShowModal(true)} style={{
                        padding: '0.25rem 0.625rem', borderRadius: 6, border: 'none', cursor: 'pointer',
                        fontSize: '0.6875rem', fontWeight: 700,
                        background: 'var(--app-accent)', color: '#fff',
                    }}>
                        + 생성
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="app-skeleton" style={{ height: 60, borderRadius: 'var(--app-radius-md)' }} />
            ) : (
                <FollowupList
                    followups={followups}
                    onChanged={load}
                    emptyText={statusFilter === 'open' ? '진행 중인 후속 조치가 없습니다.' : '후속 조치 이력이 없습니다.'}
                    compact
                />
            )}

            {showModal && (
                <FollowupCreateModal
                    members={[{ member_id: memberId, member_name: memberName }]}
                    onClose={() => setShowModal(false)}
                    onCreated={load}
                />
            )}
        </div>
    );
}
