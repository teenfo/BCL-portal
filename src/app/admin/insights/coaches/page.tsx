'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface CoachPerformance {
    id: string;
    name: string;
    email: string;
    specialty: string;
    status: string;
    totalSessions: number;
    avgRating: number;
    totalMembers: number;
    retention: number;
}

export default function CoachesReportPage() {
    const [coaches, setCoaches] = useState<CoachPerformance[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'rating' | 'sessions' | 'members'>('rating');

    const loadData = useCallback(async () => {
        const supabase = createClient();
        setLoading(true);

        const { data: coachData } = await supabase
            .from('coaches')
            .select('*')
            .eq('status', 'active');

        if (coachData && coachData.length > 0) {
            // Assign mock performance data to real coaches
            const performances: CoachPerformance[] = coachData.map((c, i) => ({
                id: c.id,
                name: c.name,
                email: c.email || '',
                specialty: c.specialty || 'General',
                status: c.status,
                totalSessions: Math.floor(Math.random() * 200) + 50,
                avgRating: Number((4 + Math.random()).toFixed(1)),
                totalMembers: Math.floor(Math.random() * 40) + 10,
                retention: Number((70 + Math.random() * 25).toFixed(1)),
            }));
            setCoaches(performances);
        } else {
            setCoaches([
                { id: '1', name: 'Coach Park', email: 'park@bcl.com', specialty: 'CrossFit', status: 'active', totalSessions: 186, avgRating: 4.9, totalMembers: 42, retention: 92.3 },
                { id: '2', name: 'Coach Kim', email: 'kim@bcl.com', specialty: 'Olympic Lifting', status: 'active', totalSessions: 164, avgRating: 4.8, totalMembers: 38, retention: 88.7 },
                { id: '3', name: 'Coach Lee', email: 'lee@bcl.com', specialty: 'Endurance', status: 'active', totalSessions: 152, avgRating: 4.7, totalMembers: 35, retention: 85.2 },
                { id: '4', name: 'Coach Choi', email: 'choi@bcl.com', specialty: 'Rowing', status: 'active', totalSessions: 120, avgRating: 4.6, totalMembers: 28, retention: 82.0 },
                { id: '5', name: 'Coach Yoon', email: 'yoon@bcl.com', specialty: 'Functional', status: 'active', totalSessions: 98, avgRating: 4.5, totalMembers: 22, retention: 78.5 },
            ]);
        }
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const sortedCoaches = [...coaches].sort((a, b) => {
        if (sortBy === 'rating') return b.avgRating - a.avgRating;
        if (sortBy === 'sessions') return b.totalSessions - a.totalSessions;
        return b.totalMembers - a.totalMembers;
    });

    const overallAvgRating = coaches.length > 0 ? (coaches.reduce((s, c) => s + c.avgRating, 0) / coaches.length).toFixed(1) : '0';
    const totalSessions = coaches.reduce((s, c) => s + c.totalSessions, 0);
    const avgRetention = coaches.length > 0 ? (coaches.reduce((s, c) => s + c.retention, 0) / coaches.length).toFixed(1) : '0';

    const maxSessions = Math.max(...coaches.map(c => c.totalSessions), 1);

    return (
        <div className="p-8 lg:p-12">
            <header className="flex items-end justify-between mb-12">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="w-2 h-2 rounded-full bg-[var(--primary)]"></span>
                        <span className="text-[11px] font-black text-[var(--primary)] uppercase tracking-[0.5em]">Insights</span>
                    </div>
                    <h1 className="text-4xl font-black text-white uppercase">Coach <span className="opacity-20 font-light ml-2">Performance</span></h1>
                </div>
                <div className="flex gap-2">
                    {(['rating', 'sessions', 'members'] as const).map((s) => (
                        <button key={s} onClick={() => setSortBy(s)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sortBy === s ? 'bg-[var(--primary)] text-white' : 'bg-white/[0.03] border border-white/5 text-[var(--text-muted)]'}`}>
                            {s === 'rating' ? '평점순' : s === 'sessions' ? '수업순' : '회원순'}
                        </button>
                    ))}
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center py-64"><div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div></div>
            ) : (
                <div className="space-y-10">
                    {/* KPI */}
                    <div className="grid grid-cols-12 gap-6">
                        <div className="col-span-3 kpi-card">
                            <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Active Coaches</h4>
                            <p className="text-4xl font-black text-white mt-4">{coaches.length}</p>
                        </div>
                        <div className="col-span-3 kpi-card">
                            <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Avg Rating</h4>
                            <p className="text-4xl font-black text-yellow-400 mt-4">{overallAvgRating} ★</p>
                        </div>
                        <div className="col-span-3 kpi-card">
                            <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Total Sessions</h4>
                            <p className="text-4xl font-black text-white mt-4">{totalSessions}</p>
                        </div>
                        <div className="col-span-3 kpi-card">
                            <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Avg Retention</h4>
                            <p className="text-4xl font-black text-green-400 mt-4">{avgRetention}%</p>
                        </div>
                    </div>

                    {/* Coach Rankings */}
                    <div className="glass-card p-8">
                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8">🏆 Coach Rankings</h3>
                        <div className="space-y-4">
                            {sortedCoaches.map((coach, rank) => (
                                <div key={coach.id} className="grid grid-cols-12 gap-4 items-center p-5 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:border-white/10 transition-all group">
                                    {/* Rank */}
                                    <div className="col-span-1 text-center">
                                        <span className={`text-xl font-black ${rank === 0 ? 'text-yellow-400' : rank === 1 ? 'text-gray-300' : rank === 2 ? 'text-amber-600' : 'text-white/20'}`}>
                                            {rank < 3 ? ['🥇', '🥈', '🥉'][rank] : `#${rank + 1}`}
                                        </span>
                                    </div>

                                    {/* Coach Info */}
                                    <div className="col-span-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black" style={{ background: 'linear-gradient(135deg, rgba(255,107,0,0.3), rgba(255,107,0,0.1))', color: 'var(--primary)' }}>
                                                {coach.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-white group-hover:text-[var(--primary)] transition-colors">{coach.name}</h4>
                                                <p className="text-[9px] text-[var(--text-muted)]">{coach.specialty}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rating */}
                                    <div className="col-span-2 text-center">
                                        <p className="text-lg font-black text-yellow-400">{coach.avgRating}</p>
                                        <p className="text-[8px] text-[var(--text-muted)] uppercase">Rating</p>
                                    </div>

                                    {/* Sessions Bar */}
                                    <div className="col-span-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${(coach.totalSessions / maxSessions) * 100}%`, background: 'var(--primary)' }} />
                                            </div>
                                            <span className="text-xs font-black text-white w-10 text-right">{coach.totalSessions}</span>
                                        </div>
                                        <p className="text-[8px] text-[var(--text-muted)] uppercase mt-1">Sessions</p>
                                    </div>

                                    {/* Members */}
                                    <div className="col-span-1 text-center">
                                        <p className="text-sm font-black text-white">{coach.totalMembers}</p>
                                        <p className="text-[8px] text-[var(--text-muted)] uppercase">Members</p>
                                    </div>

                                    {/* Retention */}
                                    <div className="col-span-2 text-center">
                                        <p className={`text-sm font-black ${coach.retention >= 90 ? 'text-green-400' : coach.retention >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>{coach.retention}%</p>
                                        <p className="text-[8px] text-[var(--text-muted)] uppercase">Retention</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Performance Insight Cards */}
                    <div className="grid grid-cols-12 gap-8">
                        <div className="col-span-6 glass-card p-8">
                            <h3 className="text-lg font-black text-white uppercase tracking-tight mb-6">🎯 Top Performer</h3>
                            {sortedCoaches[0] && (
                                <div className="text-center space-y-4">
                                    <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl font-black" style={{ background: 'linear-gradient(135deg, rgba(255,107,0,0.4), rgba(255,107,0,0.1))', color: 'var(--primary)' }}>
                                        {sortedCoaches[0].name.charAt(0)}
                                    </div>
                                    <h4 className="text-xl font-black text-white">{sortedCoaches[0].name}</h4>
                                    <p className="text-xs text-[var(--text-muted)]">{sortedCoaches[0].specialty}</p>
                                    <div className="flex justify-center gap-8 mt-4">
                                        <div><p className="text-2xl font-black text-yellow-400">{sortedCoaches[0].avgRating}</p><p className="text-[8px] text-[var(--text-muted)] uppercase">Rating</p></div>
                                        <div><p className="text-2xl font-black text-[var(--primary)]">{sortedCoaches[0].totalSessions}</p><p className="text-[8px] text-[var(--text-muted)] uppercase">Sessions</p></div>
                                        <div><p className="text-2xl font-black text-green-400">{sortedCoaches[0].retention}%</p><p className="text-[8px] text-[var(--text-muted)] uppercase">Retention</p></div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="col-span-6 glass-card p-8">
                            <h3 className="text-lg font-black text-white uppercase tracking-tight mb-6">📊 Specialty Distribution</h3>
                            <div className="space-y-4">
                                {[...new Set(coaches.map(c => c.specialty))].map((spec) => {
                                    const count = coaches.filter(c => c.specialty === spec).length;
                                    const pct = ((count / coaches.length) * 100).toFixed(0);
                                    return (
                                        <div key={spec} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                                            <span className="text-sm font-bold text-white">{spec}</span>
                                            <div className="flex items-center gap-3">
                                                <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${pct}%` }} />
                                                </div>
                                                <span className="text-xs font-black text-[var(--primary)]">{count}명</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
