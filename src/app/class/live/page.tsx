'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface LiveMember {
    id: string;
    name: string;
    heartRate: number | null;
    calories: number | null;
    distance: number | null;
    status: 'active' | 'resting' | 'finished';
}

interface ActiveSession {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    capacity: number;
    coach_name?: string;
}

export default function ClassLivePage() {
    const [session, setSession] = useState<ActiveSession | null>(null);
    const [members, setMembers] = useState<LiveMember[]>([]);
    const [currentTime, setCurrentTime] = useState('');
    const [loading, setLoading] = useState(true);
    const [elapsedMinutes, setElapsedMinutes] = useState(0);

    useEffect(() => {
        loadLiveData();
    }, []);

    useEffect(() => {
        const tick = () => {
            setCurrentTime(new Date().toLocaleTimeString('ko-KR', {
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
            }));
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, []);

    // Update elapsed
    useEffect(() => {
        if (!session) return;
        const update = () => {
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const start = new Date(`${today}T${session.start_time}`);
            const diff = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60)));
            setElapsedMinutes(diff);
        };
        update();
        const timer = setInterval(update, 30000);
        return () => clearInterval(timer);
    }, [session]);

    async function loadLiveData() {
        const supabase: any = createClient();
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().slice(0, 8);

        try {
            // 현재 진행 중 세션
            const { data: sessionData } = await supabase
                .from('sessions')
                .select('*')
                .eq('session_date', today)
                .lte('start_time', timeStr)
                .gte('end_time', timeStr)
                .limit(1)
                .single();

            if (sessionData) {
                setSession(sessionData);

                // 해당 세션의 체크인된 회원 목록
                const { data: checkinData } = await supabase
                    .from('checkins')
                    .select('member_id, members!checkins_member_id_fkey(name)')
                    .gte('checkin_time', today + 'T00:00:00')
                    .limit(20);

                if (checkinData) {
                    const liveMembers: LiveMember[] = checkinData.map((ci: any, idx: number) => ({
                        id: ci.member_id,
                        name: ci.members?.name || `Member ${idx + 1}`,
                        heartRate: null, // 실시간 데이터 연동 시 사용
                        calories: null,
                        distance: null,
                        status: 'active' as const,
                    }));
                    setMembers(liveMembers);
                }
            }
        } catch (error) {
            console.error('Live data load error:', error);
        }
        setLoading(false);
    }

    const activeCount = members.filter(m => m.status === 'active').length;

    return (
        <main style={{
            minHeight: '100vh', background: '#000000', color: '#ffffff',
            display: 'flex', flexDirection: 'column',
            padding: '3rem',
            fontFamily: "'Lexend', sans-serif",
            position: 'relative', overflow: 'hidden',
        }}>
            {/* Background */}
            <div style={{
                position: 'absolute', top: '30%', right: '-20%',
                width: '60vw', height: '60vw',
                background: 'radial-gradient(circle, rgba(255,107,0,0.04) 0%, transparent 60%)',
                borderRadius: '50%', pointerEvents: 'none',
            }} />

            {/* Header */}
            <header style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                paddingBottom: '2rem', marginBottom: '2rem',
            }}>
                <div>
                    <p style={{
                        color: '#22C55E', fontWeight: 900, letterSpacing: '0.2em',
                        textTransform: 'uppercase', fontSize: '1rem', marginBottom: '0.5rem',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                    }}>
                        <span style={{
                            width: 10, height: 10, borderRadius: '50%', background: '#22C55E',
                            display: 'inline-block', animation: 'blink 1.5s ease-in-out infinite',
                        }} />
                        LIVE SESSION
                    </p>
                    <h1 style={{
                        fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                        fontWeight: 900, letterSpacing: '-0.02em',
                        textTransform: 'uppercase',
                    }}>
                        {session?.title || 'NO ACTIVE SESSION'}
                    </h1>
                    {session && (
                        <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.25rem', fontWeight: 700 }}>
                            {session.start_time} ~ {session.end_time} · {elapsedMinutes}min elapsed
                        </p>
                    )}
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '2.5rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
                        {currentTime}
                    </p>
                </div>
            </header>

            {loading ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 60, height: 60, border: '3px solid rgba(255,107,0,0.3)', borderTopColor: '#FF6B00', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
            ) : !session ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: '6rem', marginBottom: '1.5rem', opacity: 0.1 }}>📡</div>
                    <p style={{
                        fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase',
                        letterSpacing: '0.3em', color: 'rgba(255,255,255,0.1)',
                    }}>
                        Waiting for session
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.07)', marginTop: '0.5rem' }}>
                        현재 진행 중인 수업이 없습니다
                    </p>
                </div>
            ) : (
                <>
                    {/* Stats Bar */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem',
                        marginBottom: '2rem',
                    }}>
                        {[
                            { label: 'PARTICIPANTS', value: members.length, color: '#FFFFFF' },
                            { label: 'ACTIVE', value: activeCount, color: '#22C55E' },
                            { label: 'CAPACITY', value: session.capacity, color: '#FF6B00' },
                            { label: 'ELAPSED', value: `${elapsedMinutes}m`, color: '#3B82F6' },
                        ].map(stat => (
                            <div key={stat.label} style={{
                                padding: '1.5rem',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                borderRadius: '1rem',
                                textAlign: 'center',
                            }}>
                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: stat.color }}>
                                    {stat.value}
                                </div>
                                <div style={{
                                    fontSize: '0.6875rem', fontWeight: 900, textTransform: 'uppercase',
                                    letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', marginTop: '0.25rem',
                                }}>
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Members Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '0.75rem',
                    }}>
                        {members.map(member => (
                            <div key={member.id} style={{
                                padding: '1.25rem',
                                background: member.status === 'active' ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${member.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)'}`,
                                borderRadius: '1rem',
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                            }}>
                                <div style={{
                                    width: 48, height: 48, borderRadius: '50%',
                                    background: 'rgba(255,107,0,0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 900, fontSize: '1.25rem', color: '#FF6B00',
                                    flexShrink: 0,
                                }}>
                                    {member.name.charAt(0)}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '1rem', textTransform: 'uppercase' }}>
                                        {member.name}
                                    </div>
                                    <div style={{
                                        fontSize: '0.6875rem', fontWeight: 700, marginTop: '0.125rem',
                                        color: member.status === 'active' ? '#22C55E' : 'rgba(255,255,255,0.3)',
                                        textTransform: 'uppercase', letterSpacing: '0.1em',
                                    }}>
                                        ● {member.status}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Footer */}
            <div style={{
                position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
                opacity: 0.1, pointerEvents: 'none',
                fontSize: '0.75rem', fontWeight: 900,
                letterSpacing: '0.5em', textTransform: 'uppercase',
            }}>
                BCL FITNESS • LIVE HUB
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
            `}</style>
        </main>
    );
}
