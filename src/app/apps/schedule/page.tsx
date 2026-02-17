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

export default function UserSchedulePage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => { loadSessions(); }, [selectedDate]);

    async function loadSessions() {
        const supabase = createClient();
        setLoading(true);
        const startOfDay = selectedDate + 'T00:00:00+09:00';
        const endOfDay = selectedDate + 'T23:59:59+09:00';

        const { data } = await supabase
            .from('sessions')
            .select('*')
            .gte('start_time', startOfDay)
            .lte('start_time', endOfDay)
            .order('start_time', { ascending: true });

        if (data) setSessions(data);
        setLoading(false);
    }

    // Generate week dates for horizontal scrolling date picker
    function getWeekDates() {
        const dates = [];
        const today = new Date();
        for (let i = -2; i <= 6; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            dates.push(d);
        }
        return dates;
    }

    const weekDates = getWeekDates();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const intensityColors: Record<string, string> = { Low: '#22C55E', Medium: '#F59E0B', High: '#EF4444' };

    return (
        <div className="p-4 pb-24 max-w-lg mx-auto animate-fade-in">
            <h1 className="text-2xl font-bold text-white mb-4">수업 일정</h1>

            {/* Date Picker */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
                {weekDates.map((date) => {
                    const dateStr = date.toISOString().split('T')[0];
                    const isSelected = dateStr === selectedDate;
                    const isToday = dateStr === new Date().toISOString().split('T')[0];
                    return (
                        <button
                            key={dateStr}
                            onClick={() => setSelectedDate(dateStr)}
                            className="flex flex-col items-center min-w-[52px] py-3 px-2 rounded-xl transition-all"
                            style={isSelected ? { background: 'var(--primary)', color: '#fff' } : { background: 'var(--surface)', color: 'var(--text-secondary)' }}
                        >
                            <span className="text-xs font-medium">{dayNames[date.getDay()]}</span>
                            <span className="text-lg font-bold mt-1" style={{ color: isSelected ? '#fff' : 'var(--text-primary)' }}>{date.getDate()}</span>
                            {isToday && <div className="w-1.5 h-1.5 rounded-full mt-1" style={{ background: isSelected ? '#fff' : 'var(--primary)' }}></div>}
                        </button>
                    );
                })}
            </div>

            {/* Sessions */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }}></div>
                </div>
            ) : sessions.length === 0 ? (
                <div className="glass-card p-8 rounded-xl text-center">
                    <p className="text-4xl mb-3">🏋️</p>
                    <p className="text-white font-semibold mb-1">이 날짜에 수업이 없습니다</p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>다른 날짜를 확인해보세요</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sessions.map((session) => {
                        const isFull = session.enrolled >= session.capacity;
                        return (
                            <div key={session.id} className="glass-card p-4 rounded-xl">
                                <div className="flex items-start justify-between">
                                    <div className="flex gap-3">
                                        <div className="text-center pt-1">
                                            <p className="text-white font-bold text-sm">
                                                {new Date(session.start_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                ~{new Date(session.end_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <div className="w-px self-stretch" style={{ background: 'var(--border)' }}></div>
                                        <div>
                                            <h3 className="text-white font-semibold">{session.title}</h3>
                                            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>코치: {session.coach_name}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: `${intensityColors[session.intensity]}20`, color: intensityColors[session.intensity] }}>
                                                    {session.intensity}
                                                </span>
                                                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{session.enrolled}/{session.capacity}명</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        disabled={isFull}
                                        className="px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95"
                                        style={isFull
                                            ? { background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', cursor: 'not-allowed' }
                                            : { background: 'var(--primary)', color: '#fff' }}
                                    >
                                        {isFull ? '마감' : '예약'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
