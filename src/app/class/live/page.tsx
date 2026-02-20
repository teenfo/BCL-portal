'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { query, rpc } from '@/lib/supabase/query';

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

// ── Static styles (created once) ──
const PAGE_STYLE: React.CSSProperties = {
    minHeight: '100vh', background: '#000000', color: '#ffffff',
    display: 'flex', flexDirection: 'column',
    padding: '3rem',
    fontFamily: "'Lexend', sans-serif",
    position: 'relative', overflow: 'hidden',
};

const BG_GLOW_STYLE: React.CSSProperties = {
    position: 'absolute', top: '30%', right: '-20%',
    width: '60vw', height: '60vw',
    background: 'radial-gradient(circle, rgba(255,107,0,0.04) 0%, transparent 60%)',
    borderRadius: '50%', pointerEvents: 'none',
};

const HEADER_STYLE: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    paddingBottom: '2rem', marginBottom: '2rem',
};

const LIVE_PULSE_STYLE: React.CSSProperties = {
    width: 10, height: 10, borderRadius: '50%', background: '#22C55E',
    display: 'inline-block', animation: 'blink 1.5s ease-in-out infinite',
};

const TITLE_STYLE: React.CSSProperties = {
    fontSize: 'clamp(2.5rem, 5vw, 4rem)',
    fontWeight: 900, letterSpacing: '-0.02em',
    textTransform: 'uppercase',
};

const TIME_DISPLAY_STYLE: React.CSSProperties = {
    fontSize: '2.5rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums',
    willChange: 'contents',
};

const LOADER_STYLE: React.CSSProperties = {
    width: 60, height: 60, border: '3px solid rgba(255,107,0,0.3)',
    borderTopColor: '#FF6B00', borderRadius: '50%', animation: 'spin 1s linear infinite',
};

const STATS_GRID_STYLE: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem',
    marginBottom: '2rem',
};

const STAT_CARD_STYLE: React.CSSProperties = {
    padding: '1.5rem',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '1rem', textAlign: 'center',
};

const MEMBER_GRID_STYLE: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '0.75rem',
};

const FOOTER_STYLE: React.CSSProperties = {
    position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
    opacity: 0.1, pointerEvents: 'none',
    fontSize: '0.75rem', fontWeight: 900,
    letterSpacing: '0.5em', textTransform: 'uppercase',
};

// ── Memoized member card ──
const MemberCard = React.memo(function MemberCard({ member }: { member: LiveMember }) {
    const isActive = member.status === 'active';
    return (
        <div style={{
            padding: '1.25rem',
            background: isActive ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${isActive ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)'}`,
            borderRadius: '1rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
            <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'rgba(255,107,0,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: '1.25rem', color: '#FF6B00', flexShrink: 0,
            }}>
                {member.name.charAt(0)}
            </div>
            <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', textTransform: 'uppercase' }}>
                    {member.name}
                </div>
                <div style={{
                    fontSize: '0.6875rem', fontWeight: 700, marginTop: '0.125rem',
                    color: isActive ? '#22C55E' : 'rgba(255,255,255,0.3)',
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                }}>
                    ● {member.status}
                </div>
            </div>
        </div>
    );
});

// ── Stat item ──
const StatItem = React.memo(function StatItem({ label, value, color }: { label: string; value: string | number; color: string }) {
    return (
        <div style={STAT_CARD_STYLE}>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color }}>{value}</div>
            <div style={{
                fontSize: '0.6875rem', fontWeight: 900, textTransform: 'uppercase',
                letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', marginTop: '0.25rem',
            }}>
                {label}
            </div>
        </div>
    );
});

export default function ClassLivePage() {
    const [session, setSession] = useState<ActiveSession | null>(null);
    const [members, setMembers] = useState<LiveMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [elapsedMinutes, setElapsedMinutes] = useState(0);

    // Clock via rAF + ref (no state re-render per second)
    const clockRef = useRef<HTMLParagraphElement>(null);
    const rafRef = useRef<number | null>(null);
    const lastSecondRef = useRef(-1);

    const tickClock = useCallback((timestamp: number) => {
        const now = new Date();
        const sec = now.getSeconds();
        // Only update DOM when the second changes
        if (sec !== lastSecondRef.current) {
            lastSecondRef.current = sec;
            if (clockRef.current) {
                clockRef.current.textContent = now.toLocaleTimeString('ko-KR', {
                    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
                });
            }
        }
        rafRef.current = requestAnimationFrame(tickClock);
    }, []);

    useEffect(() => {
        rafRef.current = requestAnimationFrame(tickClock);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [tickClock]);

    useEffect(() => { loadLiveData(); }, []);

    // Update elapsed minutes every 30s
    useEffect(() => {
        if (!session) return;
        const update = () => {
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const start = new Date(`${today}T${session.start_time}`);
            setElapsedMinutes(Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60))));
        };
        update();
        const timer = setInterval(update, 30000);
        return () => clearInterval(timer);
    }, [session]);

    async function loadLiveData() {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().slice(0, 8);

        try {
            const { data: sessionData } = await query('sessions')
                
                .select('*')
                .eq('session_date', today)
                .lte('start_time', timeStr)
                .gte('end_time', timeStr)
                .limit(1)
                .single();

            if (sessionData) {
                setSession(sessionData);
                const { data: checkinData } = await query('checkins')
                    
                    .select('member_id, members!checkins_member_id_fkey(name)')
                    .gte('checkin_time', today + 'T00:00:00')
                    .limit(20);

                if (checkinData) {
                    const liveMembers: LiveMember[] = checkinData.map((ci: any, idx: number) => ({
                        id: ci.member_id,
                        name: ci.members?.name || `Member ${idx + 1}`,
                        heartRate: null, calories: null, distance: null,
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
        <main style={PAGE_STYLE}>
            <div style={BG_GLOW_STYLE} />

            {/* Header */}
            <header style={HEADER_STYLE}>
                <div>
                    <p style={{
                        color: '#22C55E', fontWeight: 900, letterSpacing: '0.2em',
                        textTransform: 'uppercase', fontSize: '1rem', marginBottom: '0.5rem',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                    }}>
                        <span style={LIVE_PULSE_STYLE} />
                        LIVE SESSION
                    </p>
                    <h1 style={TITLE_STYLE}>
                        {session?.title || 'NO ACTIVE SESSION'}
                    </h1>
                    {session && (
                        <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.25rem', fontWeight: 700 }}>
                            {session.start_time} ~ {session.end_time} · {elapsedMinutes}min elapsed
                        </p>
                    )}
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p ref={clockRef} style={TIME_DISPLAY_STYLE}>--:--:--</p>
                </div>
            </header>

            {loading ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={LOADER_STYLE} />
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
                    <div style={STATS_GRID_STYLE}>
                        <StatItem label="PARTICIPANTS" value={members.length} color="#FFFFFF" />
                        <StatItem label="ACTIVE" value={activeCount} color="#22C55E" />
                        <StatItem label="CAPACITY" value={session.capacity} color="#FF6B00" />
                        <StatItem label="ELAPSED" value={`${elapsedMinutes}m`} color="#3B82F6" />
                    </div>

                    {/* Members Grid */}
                    <div style={MEMBER_GRID_STYLE}>
                        {members.map(member => (
                            <MemberCard key={member.id} member={member} />
                        ))}
                    </div>
                </>
            )}

            {/* Footer */}
            <div style={FOOTER_STYLE}>
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
