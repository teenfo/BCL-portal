'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Session {
    id: string;
    title: string;
    coach_name: string;
    start_time: string;
    end_time: string;
    intensity: string;
    capacity: number;
    enrolled: number;
}

interface Notice {
    id: string;
    title: string;
    category: string;
    date: string;
}

export default function UserDashboardPage() {
    const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadDashboard(); }, []);

    async function loadDashboard() {
        const supabase = createClient();
        const [sessionsRes, noticesRes] = await Promise.all([
            supabase.from('sessions').select('*').gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(3),
            supabase.from('notices').select('*').order('date', { ascending: false }).limit(4),
        ]);
        if (sessionsRes.data) setUpcomingSessions(sessionsRes.data);
        if (noticesRes.data) setNotices(noticesRes.data);
        setLoading(false);
    }

    const intensityColors: Record<string, string> = { Low: '#22C55E', Medium: '#F59E0B', High: '#EF4444' };

    const categoryIcons: Record<string, string> = { Important: '🔴', General: '📢', Event: '🎉' };

    return (
        <div className="p-4 pb-24 max-w-lg mx-auto animate-fade-in">
            {/* Header */}
            <div className="mb-6">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                </p>
                <h1 className="text-2xl font-bold text-white mt-1">안녕하세요! 👋</h1>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }}></div>
                </div>
            ) : (
                <>
                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <a href="/apps/schedule" className="glass-card p-4 rounded-xl flex items-center gap-3 transition-transform active:scale-95">
                            <span className="text-2xl">📅</span>
                            <div>
                                <p className="text-white font-semibold text-sm">수업 예약</p>
                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>일정 확인</p>
                            </div>
                        </a>
                        <a href="/apps/checkin" className="glass-card p-4 rounded-xl flex items-center gap-3 transition-transform active:scale-95">
                            <span className="text-2xl">✅</span>
                            <div>
                                <p className="text-white font-semibold text-sm">체크인</p>
                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>QR 출석</p>
                            </div>
                        </a>
                    </div>

                    {/* Upcoming Sessions */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-semibold text-white">다가오는 수업</h2>
                            <a href="/apps/schedule" className="text-sm" style={{ color: 'var(--primary)' }}>전체 →</a>
                        </div>
                        {upcomingSessions.length === 0 ? (
                            <div className="glass-card p-6 rounded-xl text-center">
                                <p className="text-3xl mb-2">📭</p>
                                <p style={{ color: 'var(--text-secondary)' }}>예정된 수업이 없습니다</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {upcomingSessions.map((session) => (
                                    <div key={session.id} className="glass-card p-4 rounded-xl">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-white font-semibold">{session.title}</h3>
                                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: `${intensityColors[session.intensity]}20`, color: intensityColors[session.intensity] }}>
                                                {session.intensity}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <div style={{ color: 'var(--text-secondary)' }}>
                                                <p>{new Date(session.start_time).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })} {new Date(session.start_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</p>
                                                <p className="mt-0.5">코치: {session.coach_name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold" style={{ color: session.enrolled >= session.capacity ? 'var(--error)' : 'var(--success)' }}>
                                                    {session.enrolled}/{session.capacity}
                                                </p>
                                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                    {session.enrolled >= session.capacity ? '마감' : `${session.capacity - session.enrolled}자리 남음`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Notices */}
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold text-white mb-3">공지사항</h2>
                        <div className="space-y-2">
                            {notices.map((notice) => (
                                <div key={notice.id} className="glass-card p-3 rounded-xl flex items-center gap-3">
                                    <span className="text-lg">{categoryIcons[notice.category] || '📢'}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-medium truncate">{notice.title}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{notice.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
