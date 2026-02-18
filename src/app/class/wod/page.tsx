'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface WodItem {
    id: string;
    title: string;
    description: string;
    wod_type: string;
    time_cap_minutes: number | null;
    rounds: number | null;
    movements: string[] | null;
    session_date: string;
}

export default function ClassWodPage() {
    const [wod, setWod] = useState<WodItem | null>(null);
    const [currentTime, setCurrentTime] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTodayWod();
    }, []);

    useEffect(() => {
        const tick = () => {
            setCurrentTime(new Date().toLocaleTimeString('ko-KR', {
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
            }));
        };
        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, []);

    async function loadTodayWod() {
        const supabase: any = createClient();
        const today = new Date().toISOString().split('T')[0];

        try {
            const { data } = await supabase
                .from('wods')
                .select('*')
                .eq('session_date', today)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (data) setWod(data);
        } catch (error) {
            console.error('WOD load error:', error);
        }
        setLoading(false);
    }

    const wodTypeLabel: Record<string, string> = {
        'for_time': 'FOR TIME',
        'amrap': 'AMRAP',
        'emom': 'EMOM',
        'tabata': 'TABATA',
        'chipper': 'CHIPPER',
    };

    return (
        <main style={{
            minHeight: '100vh',
            background: '#000000',
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: "'Lexend', sans-serif",
        }}>
            {/* Background glow */}
            <div style={{
                position: 'absolute', top: '-20%', left: '-10%',
                width: '50vw', height: '50vw',
                background: 'radial-gradient(circle, rgba(255,107,0,0.06) 0%, transparent 70%)',
                borderRadius: '50%',
                pointerEvents: 'none',
            }} />

            {/* Header */}
            <header style={{
                width: '100%', maxWidth: '1400px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                paddingBottom: '2rem', marginBottom: '3rem',
            }}>
                <div>
                    <p style={{
                        color: '#FF6B00', fontWeight: 900, letterSpacing: '0.2em',
                        textTransform: 'uppercase', fontSize: '1.25rem', marginBottom: '0.5rem',
                    }}>
                        Workout of the Day
                    </p>
                    <h1 style={{
                        fontSize: 'clamp(3rem, 7vw, 5rem)',
                        fontWeight: 900, letterSpacing: '-0.03em',
                        textTransform: 'uppercase', fontStyle: 'italic',
                        lineHeight: 1,
                    }}>
                        {wod?.title || "TODAY'S WOD"}
                    </h1>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '3rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                        {currentTime}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                    </p>
                </div>
            </header>

            {/* WOD Content */}
            {loading ? (
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 60, height: 60, border: '3px solid rgba(255,107,0,0.3)', borderTopColor: '#FF6B00', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
            ) : !wod ? (
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '5rem', marginBottom: '1rem', opacity: 0.15 }}>🏋️</div>
                    <p style={{
                        fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase',
                        letterSpacing: '0.2em', color: 'rgba(255,255,255,0.15)',
                    }}>
                        No WOD Today
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.1)', marginTop: '0.5rem' }}>
                        오늘의 WOD가 아직 등록되지 않았습니다
                    </p>
                </div>
            ) : (
                <div style={{ width: '100%', maxWidth: '1400px' }}>
                    {/* WOD Type Badge */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center' }}>
                        <span style={{
                            padding: '0.5rem 1.5rem',
                            background: '#FF6B00',
                            borderRadius: '0.75rem',
                            fontWeight: 900, fontSize: '1.25rem',
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase',
                        }}>
                            {wodTypeLabel[wod.wod_type] || wod.wod_type?.toUpperCase() || 'WOD'}
                        </span>
                        {wod.time_cap_minutes && (
                            <span style={{
                                padding: '0.5rem 1.5rem',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '0.75rem',
                                fontWeight: 900, fontSize: '1.25rem',
                                letterSpacing: '0.1em',
                            }}>
                                ⏱ {wod.time_cap_minutes} MIN CAP
                            </span>
                        )}
                        {wod.rounds && (
                            <span style={{
                                padding: '0.5rem 1.5rem',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '0.75rem',
                                fontWeight: 900, fontSize: '1.25rem',
                                letterSpacing: '0.1em',
                            }}>
                                🔁 {wod.rounds} ROUNDS
                            </span>
                        )}
                    </div>

                    {/* Movements */}
                    {wod.movements && wod.movements.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {wod.movements.map((movement, idx) => (
                                <div key={idx} style={{
                                    display: 'flex', alignItems: 'center', gap: '1.5rem',
                                    padding: '1.5rem 2rem',
                                    background: idx === 0 ? 'rgba(255,107,0,0.08)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${idx === 0 ? 'rgba(255,107,0,0.2)' : 'rgba(255,255,255,0.05)'}`,
                                    borderRadius: '1rem',
                                    transition: 'all 0.3s ease',
                                }}>
                                    <span style={{
                                        fontSize: '2rem', fontWeight: 900,
                                        color: idx === 0 ? '#FF6B00' : 'rgba(255,255,255,0.2)',
                                        minWidth: '3rem', textAlign: 'center',
                                    }}>
                                        {idx + 1}
                                    </span>
                                    <span style={{
                                        fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
                                        fontWeight: 800,
                                        letterSpacing: '-0.01em',
                                        textTransform: 'uppercase',
                                    }}>
                                        {movement}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : wod.description ? (
                        <div style={{
                            padding: '2rem',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '1rem',
                            fontSize: 'clamp(1.25rem, 2.5vw, 2rem)',
                            fontWeight: 700,
                            lineHeight: 1.8,
                            whiteSpace: 'pre-wrap',
                        }}>
                            {wod.description}
                        </div>
                    ) : null}
                </div>
            )}

            {/* Footer */}
            <div style={{
                position: 'absolute', bottom: '2rem',
                opacity: 0.15, pointerEvents: 'none',
                fontSize: '0.75rem', fontWeight: 900,
                letterSpacing: '0.5em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.5)',
            }}>
                BCL FITNESS • LIVE DISPLAY
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </main>
    );
}
