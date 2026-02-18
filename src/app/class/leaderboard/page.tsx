"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

type RecordType = 'For Time' | 'AMRAP' | 'Weight';

interface Entry {
    rank: number;
    name: string;
    record: string;
    category: 'RX' | 'Scaled';
    is_pr: boolean;
}

export default function LeaderboardPage() {
    const [activeType, setActiveType] = useState<RecordType>('For Time');
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);

    // Clock via rAF + ref (avoid per-second state re-render)
    const clockRef = useRef<HTMLSpanElement>(null);
    const rafRef = useRef<number | null>(null);
    const lastSecRef = useRef(-1);

    const tickClock = useCallback(() => {
        const now = new Date();
        const sec = now.getSeconds();
        if (sec !== lastSecRef.current) {
            lastSecRef.current = sec;
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

    useEffect(() => {
        loadLeaderboard();
    }, [activeType]);

    async function loadLeaderboard() {
        setLoading(true);
        const supabase: any = createClient();

        try {
            // race_records에서 최근 이벤트 기록 조회
            const typeMap: Record<RecordType, string> = {
                'For Time': 'for_time',
                'AMRAP': 'amrap',
                'Weight': 'weight',
            };

            const { data: eventData } = await supabase
                .from('race_events')
                .select('id')
                .eq('event_type', typeMap[activeType])
                .order('event_date', { ascending: false })
                .limit(1)
                .single();

            if (eventData) {
                const { data: records } = await supabase
                    .from('race_records')
                    .select('*, members!race_records_member_id_fkey(name)')
                    .eq('event_id', eventData.id)
                    .order('result_time', { ascending: activeType === 'For Time' })
                    .limit(10);

                if (records && records.length > 0) {
                    const mapped: Entry[] = records.map((r: any, idx: number) => ({
                        rank: idx + 1,
                        name: r.members?.name || `Athlete ${idx + 1}`,
                        record: formatResult(r.result_time, r.result_distance, activeType),
                        category: r.notes?.includes('Scaled') ? 'Scaled' as const : 'RX' as const,
                        is_pr: r.is_pr || false,
                    }));
                    setEntries(mapped);
                    setLoading(false);
                    return;
                }
            }

            // Fallback: 데이터 없으면 빈 리스트
            setEntries([]);
        } catch (error) {
            console.error('Leaderboard load error:', error);
            setEntries([]);
        }
        setLoading(false);
    }

    function formatResult(time: number | null, distance: number | null, type: RecordType): string {
        if (type === 'Weight' && distance) return `${distance} kg`;
        if (type === 'AMRAP' && distance) return `${distance} reps`;
        if (time) {
            const m = Math.floor(time / 60);
            const s = Math.floor(time % 60);
            return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return '-';
    }

    return (
        <main style={{
            minHeight: '100vh', background: '#000000', color: '#ffffff',
            padding: '3rem', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'flex-start',
            position: 'relative', overflow: 'hidden',
            fontFamily: "'Lexend', sans-serif",
        }}>
            {/* Background */}
            <div style={{
                position: 'absolute', top: '-10%', left: '-10%',
                width: '50vw', height: '50vw',
                background: 'radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 60%)',
                borderRadius: '50%', pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', top: '20%', right: '-10%',
                width: '40vw', height: '40vw',
                background: 'radial-gradient(circle, rgba(255,107,0,0.04) 0%, transparent 60%)',
                borderRadius: '50%', pointerEvents: 'none',
            }} />

            {/* Header */}
            <header style={{
                width: '100%', maxWidth: '1400px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                paddingBottom: '2rem', marginBottom: '2.5rem',
                position: 'relative', zIndex: 10,
            }}>
                <div>
                    <p style={{
                        color: '#FF6B00', fontWeight: 900, letterSpacing: '0.2em',
                        textTransform: 'uppercase', fontSize: '1.25rem', marginBottom: '0.5rem',
                    }}>
                        Live Leaderboard
                    </p>
                    <h1 style={{
                        fontSize: 'clamp(3rem, 7vw, 5rem)',
                        fontWeight: 900, letterSpacing: '-0.03em',
                        textTransform: 'uppercase', fontStyle: 'italic', lineHeight: 1,
                    }}>
                        The Champions
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {(['For Time', 'AMRAP', 'Weight'] as RecordType[]).map((type) => (
                        <button
                            key={type}
                            onClick={() => setActiveType(type)}
                            style={{
                                padding: '0.75rem 2rem',
                                borderRadius: '0.75rem',
                                fontSize: '1rem', fontWeight: 900,
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                                border: activeType === type ? '2px solid #FF6B00' : '1px solid rgba(255,255,255,0.1)',
                                background: activeType === type ? '#FF6B00' : 'rgba(255,255,255,0.03)',
                                color: activeType === type ? '#ffffff' : 'rgba(255,255,255,0.4)',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: activeType === type ? '0 0 20px rgba(255,107,0,0.3)' : 'none',
                            }}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </header>

            {/* Live time */}
            <div style={{
                width: '100%', maxWidth: '1400px', textAlign: 'right',
                marginBottom: '1rem', position: 'relative', zIndex: 10,
            }}>
                <span ref={clockRef} style={{
                    fontSize: '1rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                    color: 'rgba(255,255,255,0.2)', willChange: 'contents',
                }}>
                    🔴 LIVE · --:--:--
                </span>
            </div>

            {/* Ranking Table */}
            <div style={{ width: '100%', maxWidth: '1400px', position: 'relative', zIndex: 10 }}>
                {/* Table Header */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '80px 1fr 200px 120px',
                    padding: '1rem 2rem',
                    fontSize: '0.75rem', fontWeight: 900,
                    letterSpacing: '0.2em', textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.25)',
                }}>
                    <span>Rank</span>
                    <span>Athlete</span>
                    <span style={{ textAlign: 'right' }}>Result</span>
                    <span style={{ textAlign: 'right' }}>Category</span>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem' }}>
                        <div style={{
                            width: 50, height: 50, border: '3px solid rgba(255,107,0,0.3)',
                            borderTopColor: '#FF6B00', borderRadius: '50%',
                            margin: '0 auto', animation: 'spin 1s linear infinite',
                        }} />
                    </div>
                ) : entries.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '5rem' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.1 }}>🏆</div>
                        <p style={{
                            fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase',
                            letterSpacing: '0.3em', color: 'rgba(255,255,255,0.1)',
                        }}>
                            No Records Yet
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {entries.map((entry) => (
                            <div
                                key={entry.rank}
                                style={{
                                    display: 'grid', gridTemplateColumns: '80px 1fr 200px 120px',
                                    alignItems: 'center',
                                    padding: '1.5rem 2rem',
                                    borderRadius: '1.25rem',
                                    background: entry.rank <= 3 ? 'rgba(255,255,255,0.04)' : 'transparent',
                                    border: entry.rank <= 3 ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                {/* Rank */}
                                <span style={{
                                    fontSize: '3rem', fontWeight: 900, fontStyle: 'italic',
                                    color: entry.rank === 1 ? '#FF6B00'
                                        : entry.rank === 2 ? '#C0C0C0'
                                            : entry.rank === 3 ? '#CD7F32'
                                                : 'rgba(255,255,255,0.15)',
                                }}>
                                    {entry.rank}
                                </span>

                                {/* Name */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        width: 48, height: 48, borderRadius: '50%',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 900, fontSize: '1.25rem', color: 'rgba(255,255,255,0.3)',
                                    }}>
                                        {entry.name.charAt(0)}
                                    </div>
                                    <span style={{
                                        fontSize: '2rem', fontWeight: 800,
                                        letterSpacing: '-0.01em', textTransform: 'uppercase',
                                    }}>
                                        {entry.name}
                                    </span>
                                    {entry.is_pr && (
                                        <span style={{ fontSize: '1.25rem' }}>🏆</span>
                                    )}
                                </div>

                                {/* Result */}
                                <span style={{
                                    fontSize: '2.5rem', fontWeight: 900,
                                    fontVariantNumeric: 'tabular-nums',
                                    letterSpacing: '-0.02em',
                                    textAlign: 'right',
                                    color: 'rgba(255,255,255,0.9)',
                                }}>
                                    {entry.record}
                                </span>

                                {/* Category */}
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{
                                        padding: '0.375rem 0.75rem',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.75rem', fontWeight: 900,
                                        letterSpacing: '0.15em',
                                        border: entry.category === 'RX' ? '1px solid rgba(255,107,0,0.4)' : '1px solid rgba(255,255,255,0.1)',
                                        color: entry.category === 'RX' ? '#FF6B00' : 'rgba(255,255,255,0.3)',
                                    }}>
                                        {entry.category}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{
                marginTop: '3rem', opacity: 0.1, pointerEvents: 'none',
                fontSize: '0.75rem', fontWeight: 900,
                letterSpacing: '0.5em', textTransform: 'uppercase',
            }}>
                Live Update Active • Sync via BCL Cloud
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
