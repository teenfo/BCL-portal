'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface LeaderEntry {
    id: string;
    name: string;
    avatar: string;
    value: string;
    rank: number;
    isCurrentUser?: boolean;
}

type LeaderboardType = 'attendance' | 'wod' | 'streak';

const LEADERBOARD_CONFIG: Record<LeaderboardType, { title: string; icon: string; unit: string }> = {
    attendance: { title: '출석 랭킹', icon: '🏃', unit: '회' },
    wod: { title: 'WOD 챔피언', icon: '🏋️', unit: '기록' },
    streak: { title: '연속 출석', icon: '🔥', unit: '일' },
};

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
    const [type, setType] = useState<LeaderboardType>('attendance');
    const [entries, setEntries] = useState<LeaderEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState('');
    const [period, setPeriod] = useState<'week' | 'month'>('month');

    useEffect(() => {
        loadLeaderboard();
    }, [type, period]);

    async function loadLeaderboard() {
        setLoading(true);
        const supabase: any = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);

        try {
            if (type === 'attendance') {
                const since = new Date();
                if (period === 'week') since.setDate(since.getDate() - 7);
                else since.setMonth(since.getMonth() - 1);

                const { data: checkins }: any = await supabase
                    .from('checkins')
                    .select('member_id, members(name)')
                    .gte('time', since.toISOString());

                if (checkins) {
                    const countMap: Record<string, { count: number; name: string }> = {};
                    checkins.forEach((c: any) => {
                        const id = c.member_id;
                        if (!countMap[id]) countMap[id] = { count: 0, name: c.members?.name || 'Member' };
                        countMap[id].count++;
                    });

                    const sorted = Object.entries(countMap)
                        .sort(([, a], [, b]) => b.count - a.count)
                        .slice(0, 20)
                        .map(([id, data], idx) => ({
                            id,
                            name: data.name,
                            avatar: data.name.charAt(0).toUpperCase(),
                            value: `${data.count}`,
                            rank: idx + 1,
                            isCurrentUser: id === user?.id,
                        }));
                    setEntries(sorted);
                }
            } else if (type === 'streak') {
                // Calculate streak from checkins
                const { data: members }: any = await supabase.from('members').select('id, name');
                const { data: checkins }: any = await supabase
                    .from('checkins')
                    .select('member_id, time')
                    .gte('time', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
                    .order('time', { ascending: false });

                if (members && checkins) {
                    const streakMap: Record<string, number> = {};
                    const memberNames: Record<string, string> = {};
                    members.forEach((m: any) => { memberNames[m.id] = m.name; });

                    // Group by member
                    const memberCheckins: Record<string, string[]> = {};
                    checkins.forEach((c: any) => {
                        if (!memberCheckins[c.member_id]) memberCheckins[c.member_id] = [];
                        memberCheckins[c.member_id].push(c.time);
                    });

                    Object.entries(memberCheckins).forEach(([memberId, times]) => {
                        const days = new Set(times.map(t => new Date(t).toISOString().split('T')[0]));
                        let streak = 0;
                        const today = new Date();
                        for (let i = 0; i < 60; i++) {
                            const d = new Date(today);
                            d.setDate(d.getDate() - i);
                            if (days.has(d.toISOString().split('T')[0])) streak++;
                            else if (i > 0) break;
                        }
                        streakMap[memberId] = streak;
                    });

                    const sorted = Object.entries(streakMap)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 20)
                        .map(([id, streak], idx) => ({
                            id,
                            name: memberNames[id] || 'Member',
                            avatar: (memberNames[id] || 'M').charAt(0).toUpperCase(),
                            value: `${streak}`,
                            rank: idx + 1,
                            isCurrentUser: id === user?.id,
                        }));
                    setEntries(sorted);
                }
            } else {
                // WOD records
                const { data: wods }: any = await supabase
                    .from('session_feedback')
                    .select('member_id, rating, members(name)')
                    .not('rating', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (wods) {
                    const countMap: Record<string, { count: number; name: string }> = {};
                    wods.forEach((w: any) => {
                        const id = w.member_id;
                        if (!countMap[id]) countMap[id] = { count: 0, name: w.members?.name || 'Member' };
                        countMap[id].count++;
                    });

                    const sorted = Object.entries(countMap)
                        .sort(([, a], [, b]) => b.count - a.count)
                        .slice(0, 20)
                        .map(([id, data], idx) => ({
                            id,
                            name: data.name,
                            avatar: data.name.charAt(0).toUpperCase(),
                            value: `${data.count}`,
                            rank: idx + 1,
                            isCurrentUser: id === user?.id,
                        }));
                    setEntries(sorted);
                }
            }
        } catch (err) {
            console.error('Leaderboard error:', err);
        }
        setLoading(false);
    }

    const config = LEADERBOARD_CONFIG[type];

    return (
        <div className="app-page">
            <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                함께 운동하는 동료들과 경쟁하세요
            </p>

            {/* Type Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                {(Object.keys(LEADERBOARD_CONFIG) as LeaderboardType[]).map(t => (
                    <button
                        key={t}
                        className={`app-filter-chip ${type === t ? 'active' : ''}`}
                        onClick={() => setType(t)}
                        style={{ flex: 1, fontSize: '0.8125rem' }}
                    >
                        {LEADERBOARD_CONFIG[t].icon} {LEADERBOARD_CONFIG[t].title.split(' ')[0]}
                    </button>
                ))}
            </div>

            {/* Period Toggle */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {(['week', 'month'] as const).map(p => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        style={{
                            flex: 1,
                            padding: '0.5rem',
                            borderRadius: 8,
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            background: period === p ? 'var(--app-accent-light)' : 'transparent',
                            color: period === p ? 'var(--app-accent)' : 'var(--app-text-muted)',
                            border: `1px solid ${period === p ? 'var(--app-accent)' : 'var(--app-border)'}`,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        {p === 'week' ? '이번 주' : '이번 달'}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="app-skeleton" style={{ height: 64, borderRadius: 16 }} />
                    ))}
                </div>
            ) : entries.length === 0 ? (
                <div className="app-empty-state">
                    <div className="emoji">📊</div>
                    <div className="message">아직 데이터가 없습니다</div>
                    <p style={{ color: 'var(--app-text-muted)', fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                        체크인하고 랭킹에 도전하세요!
                    </p>
                </div>
            ) : (
                <>
                    {/* Top 3 Podium */}
                    {entries.length >= 3 && (
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.5rem', padding: '1rem 0' }}>
                            {[1, 0, 2].map(rank => {
                                const entry = entries[rank];
                                if (!entry) return null;
                                const heights = [120, 100, 90];
                                const avatarSizes = [56, 48, 44];
                                return (
                                    <div key={entry.id} style={{ textAlign: 'center', flex: 1 }}>
                                        <div style={{
                                            width: avatarSizes[rank],
                                            height: avatarSizes[rank],
                                            borderRadius: '50%',
                                            background: rank === 0 ? 'linear-gradient(135deg, #FFD700, #FFA500)' : rank === 1 ? 'linear-gradient(135deg, #C0C0C0, #A0A0A0)' : 'linear-gradient(135deg, #CD7F32, #B8860B)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            margin: '0 auto 0.5rem',
                                            fontSize: rank === 0 ? '1.25rem' : '1rem',
                                            fontWeight: 700,
                                            color: '#fff',
                                            boxShadow: rank === 0 ? '0 4px 12px rgba(255,215,0,0.3)' : 'var(--app-shadow-md)',
                                        }}>
                                            {entry.avatar}
                                        </div>
                                        <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{MEDALS[rank]}</div>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--app-text-primary)', marginBottom: 2 }}>{entry.name}</div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--app-accent)' }}>
                                            {entry.value}{config.unit}
                                        </div>
                                        <div style={{
                                            height: heights[rank],
                                            background: rank === 0 ? 'linear-gradient(to top, var(--app-accent), #E8933A)' : 'var(--app-accent-light)',
                                            borderRadius: '8px 8px 0 0',
                                            marginTop: '0.5rem',
                                        }} />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Rest of the list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {entries.slice(3).map(entry => (
                            <div key={entry.id} className="app-glass-card" style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.875rem 1rem',
                                border: entry.isCurrentUser ? '2px solid var(--app-accent)' : undefined,
                                background: entry.isCurrentUser ? 'var(--app-accent-light)' : undefined,
                            }}>
                                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--app-text-muted)', width: 28, textAlign: 'center' }}>
                                    {entry.rank}
                                </span>
                                <div style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '50%',
                                    background: entry.isCurrentUser ? 'linear-gradient(135deg, var(--app-accent), #E8933A)' : 'var(--app-accent-light)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.875rem',
                                    fontWeight: 700,
                                    color: entry.isCurrentUser ? '#fff' : 'var(--app-accent)',
                                    flexShrink: 0,
                                }}>
                                    {entry.avatar}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--app-text-primary)' }}>
                                        {entry.name} {entry.isCurrentUser && <span style={{ fontSize: '0.75rem', color: 'var(--app-accent)' }}>(나)</span>}
                                    </div>
                                </div>
                                <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--app-accent)' }}>
                                    {entry.value}{config.unit}
                                </span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
