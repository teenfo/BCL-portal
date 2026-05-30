'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { rpc, query } from '@/lib/supabase/query';
import type { ClassDisplayWod, WodFormatType } from '@/types/p1a';

const FORMAT_LABEL: Record<WodFormatType, string> = {
    for_time: 'FOR TIME',
    amrap: 'AMRAP',
    emom: 'EMOM',
    tabata: 'TABATA',
    chipper: 'CHIPPER',
    strength: 'STRENGTH',
    custom: 'CUSTOM',
};

interface LiveSession {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    session_date: string;
    coach_names: string[];
    booked_count: number;
    checkin_count: number;
    capacity: number;
}

interface RecentPR {
    member_name: string;
    achievement: string;
}

/**
 * /class/screen — 현장 공개 보드 (Screen Mode)
 * 민감 정보(부상, 재등록 위험, 정산 등) 비노출
 * 공개 항목: 수업명, 시간, 코치, 출결 현황, 오늘 WOD, PR 축하
 */
export default function ClassScreenPage() {
    const [wod, setWod] = useState<ClassDisplayWod | null>(null);
    const [liveSession, setLiveSession] = useState<LiveSession | null>(null);
    const [nextSession, setNextSession] = useState<LiveSession | null>(null);
    const [recentPRs, setRecentPRs] = useState<RecentPR[]>([]);
    const [loading, setLoading] = useState(true);
    const [prIdx, setPrIdx] = useState(0);

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

    const loadScreenData = useCallback(async () => {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();

        try {
            // WOD 로드
            const { data: wodData } = await rpc('fn_get_class_display_wod', {
                p_session_id: null,
                p_session_date: today,
                p_facility_id: null,
            });
            if (wodData?.success && wodData.data) {
                setWod(wodData.data as ClassDisplayWod);
            } else {
                setWod(null);
            }

            // 오늘 세션 목록 로드 (코치 이름, 출결 현황 포함)
            const { data: sessionData } = await query('sessions')
                .select(`
                    id, title, start_time, end_time, session_date, capacity,
                    session_coaches!left(
                        coaches!inner(name)
                    ),
                    bookings!left(id, status, attendance_outcome)
                `)
                .eq('session_date', today)
                .neq('status', 'cancelled')
                .order('start_time', { ascending: true });

            if (sessionData) {
                const mapped: LiveSession[] = (sessionData as any[]).map((s) => {
                    const coaches = (s.session_coaches || []).map((sc: any) => sc.coaches?.name).filter(Boolean);
                    const bookings = s.bookings || [];
                    const booked = bookings.filter((b: any) => b.status === 'confirmed' || b.attendance_outcome === 'checked_in').length;
                    const checkin = bookings.filter((b: any) => b.attendance_outcome === 'checked_in').length;
                    return {
                        id: s.id,
                        title: s.title,
                        start_time: s.start_time,
                        end_time: s.end_time,
                        session_date: s.session_date,
                        coach_names: coaches,
                        booked_count: booked,
                        checkin_count: checkin,
                        capacity: s.capacity || 20,
                    };
                });

                const nowStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;
                const live = mapped.find(s => s.start_time <= nowStr && s.end_time >= nowStr);
                const next = mapped.find(s => s.start_time > nowStr);
                setLiveSession(live ?? null);
                setNextSession(next ?? null);
            }

            // 최근 PR (race_records에서 is_pr = true인 최근 5건 — 공개 정보만)
            const { data: prData } = await query('race_records')
                .select(`
                    id, result_distance, is_pr,
                    members!inner(name)
                `)
                .eq('is_pr', true)
                .order('created_at', { ascending: false })
                .limit(5);

            if (prData) {
                const prs: RecentPR[] = (prData as any[]).map((r) => ({
                    member_name: r.members?.name ?? '회원',
                    achievement: `🏆 ${(r.result_distance / 1000).toFixed(1)} km PR`,
                }));
                setRecentPRs(prs);
            }
        } catch (err) {
            if (process.env.NODE_ENV === 'development') console.error('Screen load error:', err);
        }
        setLoading(false);
    }, []);

    useEffect(() => { void loadScreenData(); }, [loadScreenData]);

    // 60초마다 자동 갱신
    useEffect(() => {
        const t = setInterval(() => { void loadScreenData(); }, 60000);
        return () => clearInterval(t);
    }, [loadScreenData]);

    // PR 자동 슬라이드
    useEffect(() => {
        if (recentPRs.length <= 1) return;
        const t = setInterval(() => setPrIdx((i) => (i + 1) % recentPRs.length), 4000);
        return () => clearInterval(t);
    }, [recentPRs.length]);

    const formatTime = (t: string) => t?.slice(0, 5) ?? '';
    const attendancePercent = liveSession
        ? Math.round((liveSession.checkin_count / Math.max(liveSession.booked_count, 1)) * 100)
        : 0;

    return (
        <main style={{
            minHeight: '100vh',
            background: '#050505',
            color: '#ffffff',
            display: 'grid',
            gridTemplateRows: 'auto 1fr auto',
            fontFamily: "'Lexend', 'Inter', sans-serif",
            overflow: 'hidden',
        }}>
            {/* Background ambient glow */}
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(255,107,0,0.05) 0%, transparent 60%)',
                pointerEvents: 'none',
            }} />

            {/* ── HEADER ── */}
            <header style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                padding: '2rem 3rem 1.5rem',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                position: 'relative',
                zIndex: 1,
            }}>
                {/* Logo */}
                <div>
                    <span style={{
                        fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.25em',
                        textTransform: 'uppercase', color: '#FF6B00',
                    }}>BCL</span>
                    <span style={{
                        fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.15em',
                        color: 'rgba(255,255,255,0.3)', marginLeft: '0.75rem',
                        textTransform: 'uppercase',
                    }}>FITNESS</span>
                </div>

                {/* Center: Live session */}
                {liveSession ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.625rem',
                            background: 'rgba(255,107,0,0.12)', border: '1px solid rgba(255,107,0,0.3)',
                            borderRadius: '2rem', padding: '0.375rem 1.25rem',
                        }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF6B00', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#FF6B00', letterSpacing: '0.1em' }}>LIVE NOW</span>
                        </div>
                        <div style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '0.25rem' }}>{liveSession.title}</div>
                    </div>
                ) : nextSession ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                            NEXT CLASS
                        </div>
                        <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{nextSession.title}</div>
                        <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.125rem' }}>
                            {formatTime(nextSession.start_time)} 시작
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'rgba(255,255,255,0.3)' }}>
                        오늘 수업 종료
                    </div>
                )}

                {/* Clock */}
                <div style={{ textAlign: 'right' }}>
                    <p ref={clockRef} style={{
                        fontSize: '2.5rem', fontWeight: 900,
                        fontVariantNumeric: 'tabular-nums',
                        letterSpacing: '-0.02em',
                        willChange: 'contents',
                    }}>
                        --:--:--
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '0.05em' }}>
                        {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
                    </p>
                </div>
            </header>

            {/* ── MAIN CONTENT ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: liveSession ? '1fr 380px' : '1fr',
                gap: '2rem',
                padding: '2rem 3rem',
                position: 'relative', zIndex: 1,
                overflow: 'hidden',
            }}>
                {/* LEFT: WOD */}
                <section>
                    <div style={{
                        fontSize: '0.6875rem', fontWeight: 700, color: '#FF6B00',
                        letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '1rem',
                    }}>
                        WORKOUT OF THE DAY
                    </div>

                    {loading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50%' }}>
                            <div style={{ width: 48, height: 48, border: '3px solid rgba(255,107,0,0.3)', borderTopColor: '#FF6B00', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        </div>
                    ) : !wod ? (
                        <div style={{ opacity: 0.2, textAlign: 'center', paddingTop: '4rem' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏋️</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase' }}>No WOD Posted</div>
                        </div>
                    ) : (
                        <div>
                            {/* WOD Title & Format */}
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                                <h1 style={{
                                    fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                                    fontWeight: 900, letterSpacing: '-0.02em',
                                    textTransform: 'uppercase', fontStyle: 'italic',
                                    lineHeight: 1,
                                }}>
                                    {wod.title || "TODAY'S WOD"}
                                </h1>
                                {wod.format_type && (
                                    <span style={{
                                        padding: '0.375rem 1rem', background: '#FF6B00', borderRadius: '0.5rem',
                                        fontWeight: 900, fontSize: '1rem', letterSpacing: '0.15em',
                                    }}>
                                        {FORMAT_LABEL[wod.format_type] ?? wod.format_type.toUpperCase()}
                                    </span>
                                )}
                                {wod.time_cap_minutes && (
                                    <span style={{
                                        padding: '0.375rem 1rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '0.5rem',
                                        fontWeight: 700, fontSize: '1rem',
                                    }}>
                                        ⏱ {wod.time_cap_minutes} MIN CAP
                                    </span>
                                )}
                            </div>

                            {/* Movement Lines */}
                            {wod.movements && wod.movements.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                                    {wod.movements.map((m, idx) => (
                                        <div key={`${m.sort_order}-${idx}`} style={{
                                            display: 'flex', alignItems: 'center', gap: '1.25rem',
                                            padding: '1.25rem 1.75rem',
                                            background: idx === 0 ? 'rgba(255,107,0,0.07)' : 'rgba(255,255,255,0.025)',
                                            border: `1px solid ${idx === 0 ? 'rgba(255,107,0,0.2)' : 'rgba(255,255,255,0.04)'}`,
                                            borderRadius: '0.875rem',
                                        }}>
                                            <span style={{
                                                fontSize: '1.5rem', fontWeight: 900,
                                                color: idx === 0 ? '#FF6B00' : 'rgba(255,255,255,0.15)',
                                                minWidth: '2.5rem', textAlign: 'center',
                                            }}>
                                                {idx + 1}
                                            </span>
                                            <div style={{ flex: 1 }}>
                                                <div style={{
                                                    fontSize: 'clamp(1.25rem, 2.5vw, 2rem)',
                                                    fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.01em',
                                                }}>
                                                    {m.name || m.custom_label || '—'}
                                                </div>
                                                {(m.target_value !== null && m.target_value !== undefined) || m.distance_meters || m.load_male_rx || m.load_female_rx ? (
                                                    <div style={{
                                                        fontSize: 'clamp(0.75rem, 1.5vw, 1rem)',
                                                        color: 'rgba(255,255,255,0.45)',
                                                        fontWeight: 600, letterSpacing: '0.05em',
                                                        textTransform: 'uppercase', marginTop: '0.25rem',
                                                        display: 'flex', gap: '0.875rem', flexWrap: 'wrap',
                                                    }}>
                                                        {m.target_value !== null && m.target_value !== undefined && (
                                                            <span>{m.target_value} {m.target_unit ?? ''}</span>
                                                        )}
                                                        {m.distance_meters && <span>{m.distance_meters}m</span>}
                                                        {m.load_male_rx && <span>♂ {m.load_male_rx}</span>}
                                                        {m.load_female_rx && <span>♀ {m.load_female_rx}</span>}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : wod.description ? (
                                <div style={{
                                    padding: '1.75rem',
                                    background: 'rgba(255,255,255,0.025)',
                                    border: '1px solid rgba(255,255,255,0.04)',
                                    borderRadius: '0.875rem',
                                    fontSize: 'clamp(1.125rem, 2vw, 1.75rem)',
                                    fontWeight: 700, lineHeight: 1.8, whiteSpace: 'pre-wrap',
                                }}>
                                    {wod.description}
                                </div>
                            ) : null}

                            {/* Class Display Notes (공개용 노트만) */}
                            {wod.class_display_notes && (
                                <div style={{
                                    marginTop: '1.25rem',
                                    padding: '0.875rem 1.25rem',
                                    background: 'rgba(34,197,94,0.06)',
                                    border: '1px solid rgba(34,197,94,0.2)',
                                    borderRadius: '0.75rem',
                                    fontSize: 'clamp(0.875rem, 1.5vw, 1.125rem)',
                                    color: '#22C55E', fontWeight: 600,
                                    whiteSpace: 'pre-wrap', lineHeight: 1.6,
                                }}>
                                    📋 {wod.class_display_notes}
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* RIGHT: Live Session Panel (진행 중 수업이 있을 때만) */}
                {liveSession && (
                    <aside style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* 출결 현황 */}
                        <div style={{
                            padding: '1.5rem',
                            background: 'rgba(255,107,0,0.06)',
                            border: '1px solid rgba(255,107,0,0.2)',
                            borderRadius: '1rem',
                        }}>
                            <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#FF6B00', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                                LIVE ATTENDANCE
                            </div>
                            <div style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1 }}>
                                {liveSession.checkin_count}
                                <span style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                                    /{liveSession.booked_count}
                                </span>
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem' }}>
                                정원 {liveSession.capacity}명 · 출석률 {attendancePercent}%
                            </div>
                            {/* Progress Bar */}
                            <div style={{ marginTop: '0.875rem', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%',
                                    width: `${attendancePercent}%`,
                                    background: attendancePercent >= 80 ? '#22C55E' : '#FF6B00',
                                    borderRadius: 999,
                                    transition: 'width 0.5s ease',
                                }} />
                            </div>
                        </div>

                        {/* 코치 정보 */}
                        {liveSession.coach_names.length > 0 && (
                            <div style={{
                                padding: '1.25rem',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '1rem',
                            }}>
                                <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>
                                    COACH
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {liveSession.coach_names.map((name) => (
                                        <span key={name} style={{
                                            padding: '0.375rem 0.875rem',
                                            background: 'rgba(255,107,0,0.12)',
                                            border: '1px solid rgba(255,107,0,0.25)',
                                            borderRadius: '2rem',
                                            fontSize: '0.9375rem', fontWeight: 700,
                                            color: '#FF6B00',
                                        }}>
                                            {name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 시간 */}
                        <div style={{
                            padding: '1.25rem',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '1rem',
                        }}>
                            <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                CLASS TIME
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                                {formatTime(liveSession.start_time)} — {formatTime(liveSession.end_time)}
                            </div>
                        </div>

                        {/* 최근 PR (공개 데이터만) */}
                        {recentPRs.length > 0 && (
                            <div style={{
                                padding: '1.25rem',
                                background: 'rgba(34,197,94,0.06)',
                                border: '1px solid rgba(34,197,94,0.2)',
                                borderRadius: '1rem',
                                flex: 1,
                                overflow: 'hidden',
                            }}>
                                <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#22C55E', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                                    🏆 RECENT PR
                                </div>
                                <div style={{
                                    fontSize: '1rem', fontWeight: 700,
                                    transition: 'opacity 0.3s ease',
                                    lineHeight: 1.5,
                                }}>
                                    <div style={{ color: '#22C55E', marginBottom: '0.25rem' }}>
                                        {recentPRs[prIdx]?.achievement}
                                    </div>
                                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
                                        {recentPRs[prIdx]?.member_name}
                                    </div>
                                </div>
                            </div>
                        )}
                    </aside>
                )}
            </div>

            {/* ── FOOTER ── */}
            <footer style={{
                padding: '1rem 3rem',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'relative', zIndex: 1,
            }}>
                <span style={{ fontSize: '0.625rem', fontWeight: 900, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.12)' }}>
                    BCL FITNESS • CLASS SCREEN MODE
                </span>
                {/* 민감 정보 없음 표시 */}
                <span style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.1)', letterSpacing: '0.1em' }}>
                    DISPLAY-SAFE • PUBLIC VIEW
                </span>
            </footer>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </main>
    );
}
