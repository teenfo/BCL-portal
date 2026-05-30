'use client';

import React, { useEffect, useState } from 'react';
import { rpc } from '@/lib/supabase/query';

interface SessionData {
    id: string;
    title: string;
    coach_name?: string;
    start_time: string;
    end_time?: string;
    intensity?: string;
    capacity?: number;
    enrolled?: number;
    category?: string;
    session_date?: string;
    wod_description?: string;
    description?: string;
}

interface SessionDetailModalProps {
    session: SessionData | null;
    isOpen: boolean;
    onClose: () => void;
    onBook?: (sessionId: string) => void;
    isBooked?: boolean;
}

export default function SessionDetailModal({
    session,
    isOpen,
    onClose,
    onBook,
    isBooked = false,
}: SessionDetailModalProps) {
    const [wodDetail, setWodDetail] = useState<{
        title: string | null;
        format_override: string | null;
        time_cap_override: number | null;
        movements: any[];
    } | null>(null);

    useEffect(() => {
        if (!isOpen || !session?.id) {
            setWodDetail(null);
            return;
        }

        async function fetchWod() {
            try {
                const { data } = await rpc('fn_get_session_wod', { p_session_id: session.id });
                if (data?.success && data.data) {
                    const d = data.data;
                    setWodDetail({
                        title: d.title_override,
                        format_override: d.format_override,
                        time_cap_override: d.time_cap_override,
                        movements: d.movements_snapshot || [],
                    });
                }
            } catch {
                // 에러 무시
            }
        }
        void fetchWod();
    }, [isOpen, session?.id]);

    if (!isOpen || !session) return null;

    const isFull = session.capacity != null && session.enrolled != null && session.enrolled >= session.capacity;
    const spotsLeft = session.capacity != null && session.enrolled != null
        ? Math.max(0, session.capacity - session.enrolled)
        : null;

    const formatTime = (t: string) => {
        try {
            return new Date(t).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
        } catch {
            return t;
        }
    };

    const intensityLabel: Record<string, { text: string; color: string; bg: string }> = {
        beginner: { text: 'Beginner', color: '#16A34A', bg: 'rgba(34,197,94,0.08)' },
        low: { text: 'Low', color: '#16A34A', bg: 'rgba(34,197,94,0.08)' },
        medium: { text: 'Medium', color: '#D97706', bg: 'rgba(245,158,11,0.1)' },
        high: { text: 'High', color: '#DC2626', bg: 'rgba(239,68,68,0.1)' },
    };

    const badge = session.intensity ? intensityLabel[session.intensity.toLowerCase()] : null;

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.4)',
                    zIndex: 999,
                    animation: 'appFadeIn 0.2s ease',
                }}
            />

            {/* Modal */}
            <div
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    maxWidth: 480,
                    margin: '0 auto',
                    animation: 'appSlideUp 0.3s ease',
                }}
            >
                <div
                    style={{
                        background: 'var(--app-surface, #fff)',
                        borderRadius: 'var(--app-radius-xl, 20px) var(--app-radius-xl, 20px) 0 0',
                        padding: '1.5rem',
                        paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
                        boxShadow: '0 -8px 32px rgba(0,0,0,0.1)',
                    }}
                >
                    {/* Drag Handle */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                        <div style={{
                            width: 40, height: 4, borderRadius: 2,
                            background: 'var(--app-border-strong, rgba(0,0,0,0.1))',
                        }} />
                    </div>

                    {/* Title + Badge */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--app-text-primary)', margin: 0 }}>
                                {session.title}
                            </h3>
                            {session.category && (
                                <div style={{ fontSize: '0.8125rem', color: 'var(--app-text-secondary)', marginTop: '0.25rem' }}>
                                    {session.category}
                                </div>
                            )}
                        </div>
                        {badge && (
                            <span style={{
                                padding: '0.25rem 0.625rem',
                                borderRadius: 'var(--app-radius-full)',
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                color: badge.color,
                                background: badge.bg,
                                flexShrink: 0,
                            }}>
                                {badge.text}
                            </span>
                        )}
                    </div>

                    {/* Info Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '0.75rem',
                        marginBottom: '1.25rem',
                    }}>
                        <InfoItem icon="⏰" label="시간" value={`${formatTime(session.start_time)}${session.end_time ? ` – ${formatTime(session.end_time)}` : ''}`} />
                        <InfoItem icon="👤" label="코치" value={session.coach_name || '미정'} />
                        <InfoItem icon="📅" label="날짜" value={session.session_date || '-'} />
                        <InfoItem
                            icon="👥"
                            label="정원"
                            value={
                                session.capacity != null
                                    ? `${session.enrolled ?? 0} / ${session.capacity}${spotsLeft != null && spotsLeft <= 3 && spotsLeft > 0 ? ` (${spotsLeft}자리)` : ''}`
                                    : '제한 없음'
                            }
                        />
                    </div>

                    {/* WOD Area (Hybrid Rendering) */}
                    {wodDetail && wodDetail.format_override === 'station_circuit' ? (
                        <div style={{
                            background: 'rgba(255,107,0,0.03)',
                            border: '1px solid rgba(255,107,0,0.2)',
                            borderRadius: 'var(--app-radius-md, 12px)',
                            padding: '1rem',
                            marginBottom: '1.25rem',
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '0.625rem',
                            }}>
                                <span style={{
                                    fontSize: '0.6875rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    color: 'var(--primary, #FF6B00)',
                                }}>
                                    🔄 순환 서킷 로테이션 WOD
                                </span>
                                <span style={{
                                    fontSize: '0.6875rem',
                                    fontWeight: 600,
                                    color: 'var(--app-text-secondary)',
                                }}>
                                    동작당 {wodDetail.time_cap_override ?? 300}초 · {wodDetail.movements.length} Stations
                                </span>
                            </div>
                            
                            {/* Horizontal scrolling matrix cards */}
                            <div style={{
                                display: 'flex',
                                gap: '0.625rem',
                                overflowX: 'auto',
                                paddingBottom: '0.5rem',
                                scrollbarWidth: 'thin',
                            }}>
                                {wodDetail.movements.map((m, idx) => (
                                    <div 
                                        key={idx}
                                        style={{
                                            flex: '0 0 160px',
                                            background: 'rgba(255,255,255,0.02)',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                            borderRadius: '8px',
                                            padding: '0.625rem',
                                        }}
                                    >
                                        <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--primary, #FF6B00)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Station {idx + 1}
                                        </div>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--app-text-primary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {m.name || m.custom_label || '—'}
                                        </div>
                                        
                                        {(m.target_value || m.load_male_rx || m.load_female_rx) && (
                                            <div style={{ fontSize: '9px', color: 'var(--app-text-secondary)', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                {m.target_value && <span>🎯 {m.target_value} {m.target_unit ?? ''}</span>}
                                                {(m.load_male_rx || m.load_female_rx) && (
                                                    <span>🏋️ ♂{m.load_male_rx || '-'} · ♀{m.load_female_rx || '-'}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : wodDetail && wodDetail.movements.length > 0 ? (
                        <div style={{
                            background: 'var(--app-accent-light, rgba(210,105,30,0.08))',
                            border: '1px solid rgba(210,105,30,0.15)',
                            borderRadius: 'var(--app-radius-md)',
                            padding: '1rem',
                            marginBottom: '1.25rem',
                        }}>
                            <div style={{
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                color: 'var(--app-accent)',
                                marginBottom: '0.5rem',
                            }}>
                                WOD {wodDetail.title ? `· ${wodDetail.title}` : ''}
                            </div>
                            <ol style={{ margin: 0, paddingLeft: '1.125rem', fontSize: '0.8125rem', color: 'var(--app-text-primary)', lineHeight: 1.6 }}>
                                {wodDetail.movements.map((m, idx) => (
                                    <li key={idx}>
                                        <strong>{m.name || m.custom_label || '—'}</strong>
                                        {m.target_value && ` — ${m.target_value} ${m.target_unit ?? ''}`}
                                        {m.load_male_rx ? ` · ♂ ${m.load_male_rx}` : ''}
                                        {m.load_female_rx ? ` · ♀ ${m.load_female_rx}` : ''}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    ) : session.wod_description ? (
                        <div style={{
                            background: 'var(--app-accent-light, rgba(210,105,30,0.08))',
                            border: '1px solid rgba(210,105,30,0.15)',
                            borderRadius: 'var(--app-radius-md)',
                            padding: '1rem',
                            marginBottom: '1.25rem',
                        }}>
                            <div style={{
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                color: 'var(--app-accent)',
                                marginBottom: '0.5rem',
                            }}>
                                WOD
                            </div>
                            <div style={{
                                fontSize: '0.875rem',
                                color: 'var(--app-text-primary)',
                                lineHeight: 1.6,
                                whiteSpace: 'pre-wrap',
                            }}>
                                {session.wod_description}
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px dashed rgba(255,255,255,0.08)',
                            borderRadius: 'var(--app-radius-md)',
                            padding: '0.875rem 1rem',
                            marginBottom: '1.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.625rem',
                        }}>
                            <span style={{ fontSize: '1.125rem', opacity: 0.4 }}>🏋️</span>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--app-text-muted)', margin: 0 }}>
                                오늘의 WOD는 수업 당일 코치가 공개합니다.
                            </p>
                        </div>
                    )}

                    {/* Description */}
                    {session.description && !session.wod_description && (
                        <div style={{
                            fontSize: '0.875rem',
                            color: 'var(--app-text-secondary)',
                            lineHeight: 1.6,
                            marginBottom: '1.25rem',
                        }}>
                            {session.description}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            className="app-btn-secondary"
                            onClick={onClose}
                            style={{ flex: 1, padding: '0.75rem', justifyContent: 'center' }}
                        >
                            닫기
                        </button>
                        {onBook && (
                            <button
                                className={isBooked ? 'app-btn-outline' : isFull ? 'app-btn-outline' : 'app-btn-primary'}
                                onClick={() => onBook(session.id)}
                                disabled={isBooked}
                                style={{ flex: 2, padding: '0.75rem', justifyContent: 'center' }}
                            >
                                {isBooked ? '예약 완료' : isFull ? 'Waitlist 등록' : '예약하기'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

function InfoItem({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
        }}>
            <span style={{ fontSize: '1rem', lineHeight: 1.3, flexShrink: 0 }}>{icon}</span>
            <div>
                <div style={{
                    fontSize: '0.6875rem',
                    color: 'var(--app-text-muted)',
                    fontWeight: 500,
                    marginBottom: '0.125rem',
                }}>
                    {label}
                </div>
                <div style={{
                    fontSize: '0.875rem',
                    color: 'var(--app-text-primary)',
                    fontWeight: 600,
                }}>
                    {value}
                </div>
            </div>
        </div>
    );
}
