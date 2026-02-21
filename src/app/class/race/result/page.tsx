'use client';

/**
 * Race Result — Post-race leaderboard with multi-metric competition
 * ==================================================================
 * Shows final standings with detailed metrics:
 * - Distance ranking
 * - Max Watts competition
 * - Avg SPM comparison
 * - HR peak
 * - Calories burned
 */

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { query } from '@/lib/supabase/query';

interface RaceRecord {
    id: string;
    event_id: string;
    member_id: string;
    result_distance: number | null;
    result_time: number | null;
    max_watts: number | null;
    avg_spm: number | null;
    avg_hr_bpm: number | null;
    max_hr_bpm: number | null;
    is_pr: boolean;
    finish_rank: number | null;
    members?: { name: string };
}

interface RaceEvent {
    id: string;
    name: string;
    event_type: string;
    distance_meters: number;
    status: string;
    event_date: string;
}

type SortMetric = 'distance' | 'watts' | 'spm' | 'hr' | 'calories';

export default function ClassRaceResultPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
                Loading Results...
            </div>
        }>
            <RaceResultInner />
        </Suspense>
    );
}

function RaceResultInner() {
    const searchParams = useSearchParams();
    const eventId = searchParams.get('event') || searchParams.get('eventId');

    const [event, setEvent] = useState<RaceEvent | null>(null);
    const [records, setRecords] = useState<RaceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<SortMetric>('distance');

    useEffect(() => {
        if (!eventId) { setLoading(false); return; }
        loadResults(eventId);
    }, [eventId]);

    async function loadResults(eid: string) {
        try {
            const [eventRes, recordsRes] = await Promise.all([
                query('race_events').select('*').eq('id', eid).single(),
                query('race_records')
                    .select('*, members!race_records_member_id_fkey(name)')
                    .eq('event_id', eid)
                    .order('finish_rank', { ascending: true }),
            ]);

            if (eventRes.data) setEvent(eventRes.data as unknown as RaceEvent);
            if (recordsRes.data) setRecords(recordsRes.data as unknown as RaceRecord[]);
        } catch (e) {
            console.error('Load results error:', e);
        }
        setLoading(false);
    }

    // Sort records by selected metric
    const sortedRecords = [...records].sort((a, b) => {
        switch (sortBy) {
            case 'distance': return (b.result_distance || 0) - (a.result_distance || 0);
            case 'watts': return (b.max_watts || 0) - (a.max_watts || 0);
            case 'spm': return (b.avg_spm || 0) - (a.avg_spm || 0);
            case 'hr': return (b.max_hr_bpm || 0) - (a.max_hr_bpm || 0);
            default: return 0;
        }
    });

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh', background: '#0A0A0F',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.3)', fontSize: '1.25rem',
            }}>
                Loading...
            </div>
        );
    }

    if (!eventId || !event) {
        return (
            <div style={{
                minHeight: '100vh', background: '#0A0A0F',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem',
            }}>
                <div style={{ fontSize: '4rem', opacity: 0.15 }}>🏁</div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.125rem', fontWeight: 600 }}>
                    레이스 이벤트를 선택해주세요
                </p>
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.875rem' }}>
                    URL: /class/race/result?event=EVENT_ID
                </p>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh', background: '#0A0A0F',
            color: '#fff', fontFamily: "'Inter', system-ui, sans-serif",
            padding: '1.5rem',
        }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{
                    fontSize: '2rem', fontWeight: 900,
                    background: 'linear-gradient(135deg, #FF6A00 0%, #FF9A40 100%)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    marginBottom: '0.5rem',
                }}>
                    🏆 RACE RESULTS
                </h1>
                <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
                    {event.name}
                </p>
                <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem' }}>
                    {event.event_type} · {event.distance_meters}m · {new Date(event.event_date).toLocaleDateString('ko-KR')}
                </p>
            </div>

            {/* Top 3 Podium */}
            {sortedRecords.length >= 3 && (
                <div style={{
                    display: 'flex', justifyContent: 'center', gap: '1rem',
                    marginBottom: '2rem', alignItems: 'flex-end',
                }}>
                    {/* 2nd */}
                    <PodiumCard record={sortedRecords[1]} rank={2} height={140} sortBy={sortBy} />
                    {/* 1st */}
                    <PodiumCard record={sortedRecords[0]} rank={1} height={180} sortBy={sortBy} />
                    {/* 3rd */}
                    <PodiumCard record={sortedRecords[2]} rank={3} height={110} sortBy={sortBy} />
                </div>
            )}

            {/* Metric Switch Tabs */}
            <div style={{
                display: 'flex', gap: '0.375rem', marginBottom: '1.25rem',
                justifyContent: 'center', flexWrap: 'wrap',
            }}>
                {([
                    { key: 'distance', label: '🏅 거리', },
                    { key: 'watts', label: '⚡ Max Watts' },
                    { key: 'spm', label: '🔄 SPM' },
                    { key: 'hr', label: '❤️ HR' },
                ] as { key: SortMetric; label: string }[]).map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setSortBy(tab.key)}
                        style={{
                            padding: '0.5rem 1rem', borderRadius: 20, border: 'none',
                            background: sortBy === tab.key ? '#FF6A00' : 'rgba(255,255,255,0.06)',
                            color: sortBy === tab.key ? '#fff' : 'rgba(255,255,255,0.5)',
                            fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Full Leaderboard */}
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
                {sortedRecords.map((record, idx) => (
                    <div key={record.id} style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.75rem 1rem', marginBottom: '0.375rem',
                        borderRadius: 12,
                        background: idx < 3 ? `rgba(255,106,0,${0.08 - idx * 0.02})` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${idx === 0 ? 'rgba(255,106,0,0.3)' : 'rgba(255,255,255,0.04)'}`,
                    }}>
                        {/* Rank */}
                        <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: idx < 3 ? ['#FF6A00', '#8B8B8B', '#CD7F32'][idx] : 'rgba(255,255,255,0.08)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 900, fontSize: '0.75rem', color: idx < 3 ? '#fff' : 'rgba(255,255,255,0.3)',
                            flexShrink: 0,
                        }}>
                            {idx + 1}
                        </div>

                        {/* Name */}
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontSize: '0.875rem', fontWeight: 700, color: '#fff',
                                display: 'flex', alignItems: 'center', gap: '0.375rem',
                            }}>
                                {record.members?.name || 'Unknown'}
                                {record.is_pr && (
                                    <span style={{
                                        fontSize: '0.5625rem', fontWeight: 800,
                                        background: 'rgba(245,158,11,0.2)', color: '#F59E0B',
                                        padding: '1px 6px', borderRadius: 8,
                                    }}>PR</span>
                                )}
                            </div>
                        </div>

                        {/* Metrics */}
                        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.6875rem', color: 'rgba(255,255,255,0.5)' }}>
                            <MetricValue
                                label="거리"
                                value={`${record.result_distance?.toFixed(0) || '-'}m`}
                                highlight={sortBy === 'distance'}
                            />
                            <MetricValue
                                label="최대W"
                                value={record.max_watts ? `${record.max_watts}W` : '-'}
                                highlight={sortBy === 'watts'}
                            />
                            <MetricValue
                                label="SPM"
                                value={record.avg_spm?.toFixed(1) || '-'}
                                highlight={sortBy === 'spm'}
                            />
                            <MetricValue
                                label="HR"
                                value={record.max_hr_bpm || '-'}
                                highlight={sortBy === 'hr'}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Sub Components ──────────────────────────────

function PodiumCard({ record, rank, height, sortBy }: {
    record: RaceRecord; rank: number; height: number; sortBy: SortMetric
}) {
    const medals = ['🥇', '🥈', '🥉'];
    const colors = ['#FF6A00', '#8B8B8B', '#CD7F32'];

    const metricValue = (() => {
        switch (sortBy) {
            case 'distance': return `${record.result_distance?.toFixed(0) || '-'}m`;
            case 'watts': return `${record.max_watts || '-'}W`;
            case 'spm': return `${record.avg_spm?.toFixed(1) || '-'}`;
            case 'hr': return `${record.max_hr_bpm || '-'}`;
            default: return '-';
        }
    })();

    return (
        <div style={{
            width: 130, height,
            background: `linear-gradient(180deg, ${colors[rank - 1]}22 0%, rgba(0,0,0,0.3) 100%)`,
            borderRadius: 16, border: `1px solid ${colors[rank - 1]}44`,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'flex-end', padding: '1rem 0.75rem',
            textAlign: 'center',
        }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.375rem' }}>{medals[rank - 1]}</div>
            <div style={{
                fontSize: '0.8125rem', fontWeight: 800, color: '#fff',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%',
            }}>
                {record.members?.name || 'Unknown'}
            </div>
            <div style={{
                fontSize: '1.25rem', fontWeight: 900, fontFamily: 'monospace',
                color: colors[rank - 1], marginTop: '0.25rem',
            }}>
                {metricValue}
            </div>
            {record.is_pr && (
                <span style={{
                    fontSize: '0.5625rem', fontWeight: 800, marginTop: '0.25rem',
                    background: 'rgba(245,158,11,0.2)', color: '#F59E0B',
                    padding: '1px 8px', borderRadius: 8,
                }}>🏆 PR</span>
            )}
        </div>
    );
}

function MetricValue({ label, value, highlight }: { label: string; value: string | number; highlight: boolean }) {
    return (
        <div style={{ textAlign: 'center', minWidth: 45 }}>
            <div style={{
                fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)',
                fontWeight: 600, marginBottom: 1,
            }}>{label}</div>
            <div style={{
                fontSize: '0.8125rem', fontWeight: highlight ? 900 : 600,
                color: highlight ? '#FF6A00' : 'rgba(255,255,255,0.7)',
            }}>
                {value}
            </div>
        </div>
    );
}
