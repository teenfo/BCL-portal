'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { rpc } from '@/lib/supabase/query';
import type { ClassDisplayWod, WodFormatType } from '@/types/p1a';

const FORMAT_LABEL: Record<WodFormatType, string> = {
    for_time: 'FOR TIME',
    amrap: 'AMRAP',
    emom: 'EMOM',
    tabata: 'TABATA',
    chipper: 'CHIPPER',
    strength: 'STRENGTH',
    custom: 'CUSTOM',
    station_circuit: 'STATION CIRCUIT',
};

export default function ClassWodPage() {
    const [wod, setWod] = useState<ClassDisplayWod | null>(null);
    const [loading, setLoading] = useState(true);

    const loadTodayWod = useCallback(async () => {
        const today = new Date().toISOString().split('T')[0];
        try {
            const { data } = await rpc('fn_get_class_display_wod', {
                p_session_id: null,
                p_session_date: today,
                p_facility_id: null,
            });
            if (data?.success && data.data) setWod(data.data as ClassDisplayWod);
            else setWod(null);
        } catch (error) {
            if (process.env.NODE_ENV === 'development') console.error('WOD load error:', error);
            setWod(null);
        }
        setLoading(false);
    }, []);

    useEffect(() => { void loadTodayWod(); }, [loadTodayWod]);

    // Refresh every 60s so newly published WOD appears without manual reload
    useEffect(() => {
        const t = setInterval(() => { void loadTodayWod(); }, 60000);
        return () => clearInterval(t);
    }, [loadTodayWod]);

    // Clock via rAF + ref
    const clockRef = useRef<HTMLParagraphElement>(null);
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

    const formatLabel = wod?.format_type ? (FORMAT_LABEL[wod.format_type] ?? wod.format_type.toUpperCase()) : null;

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
                    <p ref={clockRef} style={{ fontSize: '3rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', willChange: 'contents' }}>
                        --:--:--
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
                        오늘의 WOD가 아직 게시되지 않았습니다
                    </p>
                </div>
            ) : (
                <div style={{ width: '100%', maxWidth: '1400px' }}>
                    {/* Badges */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {formatLabel && (
                            <span style={{
                                padding: '0.5rem 1.5rem',
                                background: '#FF6B00',
                                borderRadius: '0.75rem',
                                fontWeight: 900, fontSize: '1.25rem',
                                letterSpacing: '0.15em',
                                textTransform: 'uppercase',
                            }}>
                                {formatLabel}
                            </span>
                        )}
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
                    </div>

                    {/* Movement lines */}
                    {wod.movements && wod.movements.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {wod.movements.map((m, idx) => (
                                <div key={`${m.sort_order}-${idx}`} style={{
                                    display: 'flex', alignItems: 'center', gap: '1.5rem',
                                    padding: '1.5rem 2rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    borderRadius: '1rem',
                                    transition: 'all 0.3s ease',
                                }}>
                                    <span style={{
                                        fontSize: '2rem', fontWeight: 900,
                                        color: 'rgba(255,255,255,0.2)',
                                        minWidth: '3rem', textAlign: 'center',
                                    }}>
                                        {idx + 1}
                                    </span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
                                            fontWeight: 800,
                                            letterSpacing: '-0.01em',
                                            textTransform: 'uppercase',
                                        }}>
                                            {/* WodMovementSnapshot.name = 게시 시점 라이브러리 이름 스냅샷, custom_label = 자유 텍스트 */}
                                            {m.name || m.custom_label || '—'}
                                        </div>
                                        {(m.target_value !== null && m.target_value !== undefined || m.distance_meters || m.load_male_rx || m.load_female_rx) && (
                                            <div style={{
                                                fontSize: 'clamp(0.875rem, 1.5vw, 1.125rem)',
                                                color: 'rgba(255,255,255,0.5)',
                                                fontWeight: 600, letterSpacing: '0.05em',
                                                textTransform: 'uppercase', marginTop: '0.25rem',
                                                display: 'flex', flexWrap: 'wrap', gap: '1rem',
                                            }}>
                                                {m.target_value !== null && m.target_value !== undefined && (
                                                    <span>{m.target_value} {m.target_unit ?? ''}</span>
                                                )}
                                                {m.distance_meters && <span>{m.distance_meters}m</span>}
                                                {m.load_male_rx && <span>♂ {m.load_male_rx}</span>}
                                                {m.load_female_rx && <span>♀ {m.load_female_rx}</span>}
                                            </div>
                                        )}
                                    </div>
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

                    {wod.class_display_notes && (
                        <div style={{
                            marginTop: '1.5rem',
                            padding: '1rem 1.5rem',
                            background: 'rgba(34,197,94,0.06)',
                            border: '1px solid rgba(34,197,94,0.2)',
                            borderRadius: '0.75rem',
                            fontSize: 'clamp(0.875rem, 1.5vw, 1.125rem)',
                            color: '#22C55E',
                            fontWeight: 600,
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.6,
                        }}>
                            📺 {wod.class_display_notes}
                        </div>
                    )}
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
        </main >
    );
}
