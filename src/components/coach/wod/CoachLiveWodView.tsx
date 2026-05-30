'use client';

import { useCallback, useEffect, useState } from 'react';
import { rpc } from '@/lib/supabase/query';
import type { ClassDisplayWod, SessionWodDetail, WodFormatType } from '@/types/p1a';

interface CoachLiveWodViewProps {
    sessionId: string;
    facilityId: string | null;
    sessionDate: string;
    checkedInCount: number;
    totalConfirmed: number;
}

const FORMAT_LABEL: Record<WodFormatType, string> = {
    for_time: 'FOR TIME',
    amrap: 'AMRAP',
    emom: 'EMOM',
    tabata: 'TABATA',
    chipper: 'CHIPPER',
    strength: 'STRENGTH',
    custom: 'CUSTOM',
    station_circuit: 'CIRCUIT',
};

export default function CoachLiveWodView({
    sessionId,
    facilityId,
    sessionDate,
    checkedInCount,
    totalConfirmed,
}: CoachLiveWodViewProps) {
    const [loading, setLoading] = useState(true);
    const [wodDetail, setWodDetail] = useState<SessionWodDetail | null>(null);
    const [classDisplay, setClassDisplay] = useState<ClassDisplayWod | null>(null);
    const [expanded, setExpanded] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [detailRes, displayRes] = await Promise.all([
                rpc('fn_get_session_wod', { p_session_id: sessionId }),
                rpc('fn_get_class_display_wod', {
                    p_session_id: sessionId,
                    p_session_date: sessionDate,
                    p_facility_id: facilityId,
                }),
            ]);
            if (detailRes.data?.success && detailRes.data.data) {
                setWodDetail(detailRes.data.data as SessionWodDetail);
            }
            if (displayRes.data?.success && displayRes.data.data) {
                setClassDisplay(displayRes.data.data as ClassDisplayWod);
            }
        } catch {
            // ignore
        }
        setLoading(false);
    }, [sessionId, facilityId, sessionDate]);

    useEffect(() => { void load(); }, [load]);

    if (loading) {
        return (
            <div style={{
                padding: '1rem',
                background: 'var(--app-surface)',
                borderRadius: 16,
                border: '1px solid var(--app-border)',
                marginBottom: '1.25rem',
                color: 'var(--app-text-muted)',
                fontSize: '0.8125rem',
            }}>
                WOD 로딩 중...
            </div>
        );
    }

    const isPublished = wodDetail?.publish_state === 'published';
    const lines = wodDetail?.movements_snapshot ?? [];
    const title = wodDetail?.title_override;
    const format = wodDetail?.format_override as WodFormatType | null;
    const timeCap = wodDetail?.time_cap_override;
    const coachNotes = wodDetail?.coach_notes;
    const rxLines = lines.filter(l => l.load_male_rx || l.load_female_rx);

    return (
        <section style={{ marginBottom: '1.25rem' }}>
            {/* Section Header */}
            <button
                onClick={() => setExpanded(p => !p)}
                style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '0.5rem 0', marginBottom: expanded ? '0.625rem' : 0,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                        ▶ 라이브 WOD
                    </span>
                    {isPublished ? (
                        <span style={{
                            padding: '0.125rem 0.5rem', borderRadius: 999,
                            background: 'rgba(34,197,94,0.12)', color: '#22C55E',
                            fontSize: '0.625rem', fontWeight: 700,
                        }}>게시됨</span>
                    ) : (
                        <span style={{
                            padding: '0.125rem 0.5rem', borderRadius: 999,
                            background: 'rgba(245,158,11,0.12)', color: '#F59E0B',
                            fontSize: '0.625rem', fontWeight: 700,
                        }}>초안</span>
                    )}
                    <span style={{ fontSize: '0.6875rem', color: 'var(--app-text-muted)' }}>
                        출석 {checkedInCount}/{totalConfirmed}명
                    </span>
                </div>
                <span style={{ color: 'var(--app-text-muted)', fontSize: '0.75rem' }}>
                    {expanded ? '▲' : '▼'}
                </span>
            </button>

            {expanded && (
                <div style={{
                    background: 'var(--app-surface)',
                    border: '1px solid var(--app-border)',
                    borderRadius: 16,
                    overflow: 'hidden',
                }}>
                    {/* Format banner */}
                    {(format || timeCap) && (
                        <div style={{
                            background: 'rgba(255,106,0,0.08)',
                            borderBottom: '1px solid rgba(255,106,0,0.15)',
                            padding: '0.75rem 1rem',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                            <div>
                                {title && (
                                    <div style={{
                                        fontSize: '1.25rem', fontWeight: 800,
                                        letterSpacing: '-0.01em', color: 'var(--app-text-primary)',
                                        lineHeight: 1.1, marginBottom: 2,
                                    }}>
                                        {title}
                                    </div>
                                )}
                                <span style={{
                                    fontSize: '0.6875rem', fontWeight: 800, letterSpacing: '0.1em',
                                    textTransform: 'uppercase', color: 'var(--app-accent)',
                                }}>
                                    {format ? FORMAT_LABEL[format] : ''}
                                    {timeCap && ` · ${format === 'station_circuit' ? `${timeCap}초/Station` : `${timeCap}분 Cap`}`}
                                </span>
                            </div>
                            {/* 전체 RX 배너 */}
                            {rxLines.length > 0 && rxLines.every(l => l.load_male_rx === rxLines[0].load_male_rx && l.load_female_rx === rxLines[0].load_female_rx) && (
                                <div style={{
                                    textAlign: 'right', fontSize: '0.875rem', fontWeight: 700,
                                    color: 'var(--app-text-primary)',
                                }}>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--app-text-muted)', marginBottom: 2 }}>RX</div>
                                    <div>♂ {rxLines[0].load_male_rx}</div>
                                    <div>♀ {rxLines[0].load_female_rx}</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Movement list */}
                    {lines.length === 0 ? (
                        <div style={{
                            padding: '1.5rem 1rem', textAlign: 'center',
                            color: 'var(--app-text-muted)', fontSize: '0.8125rem',
                        }}>
                            등록된 WOD 동작이 없습니다.
                        </div>
                    ) : (
                        <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {lines.map((m, idx) => (
                                <div key={`${m.sort_order}-${idx}`} style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    borderRadius: 12,
                                    padding: '0.875rem 1rem',
                                }}>
                                    {/* Row 1: 번호 + 이름 + 수량 */}
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <span style={{
                                            fontSize: '0.75rem', fontWeight: 900,
                                            color: 'var(--app-accent)', minWidth: 20,
                                        }}>
                                            {idx + 1}.
                                        </span>
                                        <span style={{
                                            fontSize: '1.125rem', fontWeight: 800,
                                            textTransform: 'uppercase', letterSpacing: '-0.01em',
                                            color: 'var(--app-text-primary)', flex: 1,
                                        }}>
                                            {m.name || m.custom_label || '—'}
                                        </span>
                                        <span style={{
                                            fontSize: '1rem', fontWeight: 700,
                                            color: 'var(--app-text-secondary)',
                                        }}>
                                            {m.target_value !== null && m.target_value !== undefined && `${m.target_value} ${m.target_unit ?? ''}`}
                                            {m.distance_meters && ` ${m.distance_meters}m`}
                                            {m.duration_seconds && ` ${m.duration_seconds}초`}
                                        </span>
                                    </div>

                                    {/* Row 2: RX 중량 (동작별로 다를 때만) */}
                                    {(m.load_male_rx || m.load_female_rx) && (
                                        <div style={{
                                            marginTop: 4, paddingLeft: 20,
                                            fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)',
                                            display: 'flex', gap: 8,
                                        }}>
                                            {m.load_male_rx && <span>♂ {m.load_male_rx}</span>}
                                            {m.load_female_rx && <span>♀ {m.load_female_rx}</span>}
                                        </div>
                                    )}

                                    {/* Row 3: 스케일링 노트 — 항상 노출 */}
                                    {m.scaling_notes && (
                                        <div style={{
                                            marginTop: 6, paddingLeft: 20,
                                            padding: '0.375rem 0.75rem',
                                            marginLeft: 20,
                                            background: 'rgba(167,139,250,0.08)',
                                            border: '1px solid rgba(167,139,250,0.2)',
                                            borderRadius: 8,
                                            fontSize: '0.8125rem', color: '#C4B5FD',
                                            fontWeight: 600,
                                        }}>
                                            ↕ {m.scaling_notes}
                                        </div>
                                    )}

                                    {/* Row 4: RX 노트 */}
                                    {m.rx_notes && (
                                        <div style={{
                                            marginTop: 4, paddingLeft: 20,
                                            fontSize: '0.75rem', color: 'var(--app-accent)',
                                            fontStyle: 'italic',
                                        }}>
                                            📌 {m.rx_notes}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Coach Notes — 항상 하단 고정 노출 */}
                    {coachNotes && (
                        <div style={{
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                            padding: '0.75rem 1rem',
                            background: 'rgba(255,106,0,0.05)',
                        }}>
                            <div style={{
                                fontSize: '0.6875rem', fontWeight: 800, color: 'var(--app-accent)',
                                letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4,
                            }}>
                                🎯 Coach Note
                            </div>
                            <p style={{
                                fontSize: '0.875rem', color: 'var(--app-text-primary)',
                                whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: 0,
                            }}>
                                {coachNotes}
                            </p>
                        </div>
                    )}

                    {/* Class Display Note — 공개 보드와 동일한 메모 */}
                    {classDisplay?.class_display_notes && (
                        <div style={{
                            borderTop: '1px solid rgba(34,197,94,0.15)',
                            padding: '0.625rem 1rem',
                            background: 'rgba(34,197,94,0.05)',
                        }}>
                            <div style={{
                                fontSize: '0.6875rem', fontWeight: 800, color: '#22C55E',
                                letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3,
                            }}>
                                📺 클래스 화면 메모
                            </div>
                            <p style={{
                                fontSize: '0.8125rem', color: '#22C55E',
                                whiteSpace: 'pre-wrap', lineHeight: 1.5, margin: 0,
                            }}>
                                {classDisplay.class_display_notes}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
