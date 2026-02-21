'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRaceRealtime, type LaneData, type RaceStatus, type TeamData } from '@/hooks/useRaceRealtime';

export default function ClassRaceRunPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '1.25rem' }}>Loading...</div>}>
            <ClassRaceRunInner />
        </Suspense>
    );
}

function ClassRaceRunInner() {
    const searchParams = useSearchParams();
    const eventId = searchParams.get('event') || searchParams.get('eventId');
    const [fallbackEventId, setFallbackEventId] = useState<string | null>(null);

    // If no event ID in URL, try to get it from the race server
    useEffect(() => {
        if (eventId) return;
        (async () => {
            try {
                const url = process.env.NEXT_PUBLIC_RACE_SERVER_URL || 'http://localhost:8001';
                const res = await fetch(`${url}/api/race/status`);
                const data = await res.json();
                if (data.event_id) setFallbackEventId(data.event_id);
            } catch { /* silent */ }
        })();
    }, [eventId]);

    const activeEventId = eventId || fallbackEventId;
    const { laneData, raceStatus, elapsedTime, teams, isConnected, error } = useRaceRealtime(activeEventId);

    function formatTimer(seconds: number) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    // Full-screen display optimized for big screen / projector
    return (
        <div style={{
            minHeight: '100vh', background: '#0A0A0F',
            color: '#fff', fontFamily: "'Inter', system-ui, sans-serif",
            padding: '1.5rem',
        }}>
            {/* Header Bar */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '1.5rem',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h1 style={{
                        fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.02em',
                        background: 'linear-gradient(135deg, #FF6A00 0%, #FF9A40 100%)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                        🏁 RACE LIVE
                    </h1>
                    {/* Connection indicator */}
                    <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: isConnected ? '#22C55E' : '#EF4444',
                        boxShadow: `0 0 6px ${isConnected ? '#22C55E' : '#EF4444'}`,
                    }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    {raceStatus === 'racing' && (
                        <div style={{
                            fontSize: '2rem', fontWeight: 900, fontFamily: 'monospace',
                            color: '#FF6A00', letterSpacing: '0.1em',
                        }}>
                            {formatTimer(elapsedTime)}
                        </div>
                    )}
                    <StatusPill status={raceStatus} />
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 10, padding: '8px 12px', marginBottom: '1rem',
                    fontSize: '0.75rem', color: '#EF4444',
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Waiting Screen */}
            {(raceStatus === 'setup' || raceStatus === 'lobby') && laneData.length === 0 && (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', height: '60vh', gap: '1rem',
                }}>
                    <div style={{ fontSize: '4rem', opacity: 0.2 }}>🏁</div>
                    <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                        {raceStatus === 'setup' ? '레이스 대기 중...' : '선수 입장 중...'}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.2)' }}>
                        코치가 레이스를 시작하면 자동으로 표시됩니다
                    </p>
                </div>
            )}

            {/* Team Scoreboard (if team race) */}
            {teams.length > 0 && (
                <div style={{
                    display: 'flex', gap: '0.75rem', marginBottom: '1rem',
                    overflowX: 'auto', paddingBottom: '0.25rem',
                }}>
                    {teams.map(team => (
                        <div key={team.team_id} style={{
                            flex: '0 0 auto', minWidth: 180,
                            background: `${team.team_color}15`,
                            border: `1px solid ${team.team_color}44`,
                            borderRadius: 12, padding: '0.75rem 1rem',
                        }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                marginBottom: '0.25rem',
                            }}>
                                <div style={{
                                    width: 22, height: 22, borderRadius: '50%',
                                    background: team.team_color, color: '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 900, fontSize: '0.625rem',
                                }}>{team.rank}</div>
                                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: team.team_color }}>
                                    {team.team_name}
                                </span>
                            </div>
                            <div style={{
                                fontSize: '1.5rem', fontWeight: 900, fontFamily: 'monospace',
                                color: '#fff',
                            }}>
                                {team.total_distance_m.toFixed(1)}m
                            </div>
                            <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.3)' }}>
                                {team.member_count}명
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Race Grid */}
            {laneData.length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: laneData.length <= 4
                        ? 'repeat(2, 1fr)'
                        : laneData.length <= 9
                            ? 'repeat(3, 1fr)'
                            : 'repeat(4, 1fr)',
                    gap: '0.75rem',
                }}>
                    {laneData.map((lane) => (
                        <LaneCard key={lane.device_serial} lane={lane} isRacing={raceStatus === 'racing'} />
                    ))}
                </div>
            )}

            {/* Finished Summary */}
            {raceStatus === 'finished' && laneData.length > 0 && (
                <div style={{
                    marginTop: '2rem', textAlign: 'center',
                    background: 'linear-gradient(135deg, rgba(255,106,0,0.1) 0%, rgba(139,92,246,0.1) 100%)',
                    borderRadius: 16, padding: '2rem',
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏆</div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#FF6A00' }}>
                        RACE COMPLETE
                    </h2>
                    <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.5rem' }}>
                        총 경주 시간: {formatTimer(elapsedTime)}
                    </p>
                    {/* Top 3 podium */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1.5rem' }}>
                        {laneData.slice(0, 3).map((lane, idx) => (
                            <div key={lane.device_serial} style={{ textAlign: 'center' }}>
                                <div style={{
                                    fontSize: '2rem', marginBottom: '0.25rem',
                                }}>
                                    {['🥇', '🥈', '🥉'][idx]}
                                </div>
                                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>
                                    {lane.member_name || `Lane ${lane.lane}`}
                                </div>
                                <div style={{
                                    fontSize: '1.125rem', fontWeight: 900, fontFamily: 'monospace',
                                    color: idx === 0 ? '#FF6A00' : 'rgba(255,255,255,0.7)',
                                }}>
                                    {lane.distance_m.toFixed(1)}m
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Sub Components ──────────────────────────────

function LaneCard({ lane, isRacing }: { lane: LaneData; isRacing: boolean }) {
    const isFirst = lane.rank === 1 && isRacing;
    const isOffline = lane.connection_status === 'offline' || lane.connection_status === 'disconnected';

    return (
        <div style={{
            background: isOffline
                ? 'rgba(107,114,128,0.1)'
                : isFirst
                    ? 'linear-gradient(135deg, rgba(255,106,0,0.2) 0%, rgba(255,106,0,0.05) 100%)'
                    : 'rgba(255,255,255,0.03)',
            border: `1px solid ${isFirst ? 'rgba(255,106,0,0.4)' : isOffline ? 'rgba(107,114,128,0.3)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: 16, padding: '1rem',
            position: 'relative', overflow: 'hidden',
            transition: 'all 0.3s ease',
            filter: isOffline ? 'grayscale(0.7)' : 'none',
            opacity: isOffline ? 0.6 : 1,
        }}>
            {/* Offline/Disconnected badge */}
            {isOffline && (
                <div style={{
                    position: 'absolute', top: 6, left: 8,
                    background: 'rgba(239,68,68,0.2)', borderRadius: 4,
                    padding: '1px 6px', fontSize: '0.5625rem', color: '#EF4444',
                    fontWeight: 700,
                }}>
                    {lane.connection_status === 'offline' ? 'OFFLINE' : 'DISCONNECTED'}
                </div>
            )}

            {/* Rank badge */}
            <div style={{
                position: 'absolute', top: 8, right: 8,
                width: 28, height: 28, borderRadius: '50%',
                background: lane.rank <= 3 ? ['#FF6A00', '#8B8B8B', '#CD7F32'][lane.rank - 1] : 'rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: '0.75rem',
                color: lane.rank <= 3 ? '#fff' : 'rgba(255,255,255,0.3)',
            }}>
                {lane.rank}
            </div>

            {/* Name */}
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: '0.75rem' }}>
                {lane.member_name || `Lane ${lane.lane}`}
            </div>

            {/* Distance — big number */}
            <div style={{
                fontSize: '2rem', fontWeight: 900, fontFamily: 'monospace',
                color: isFirst ? '#FF6A00' : '#fff', letterSpacing: '-0.03em',
                marginBottom: '0.5rem',
            }}>
                {lane.distance_m.toFixed(1)}<span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>m</span>
            </div>

            {/* Metrics row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.375rem' }}>
                <MetricChip label="WATTS" value={lane.power_w} />
                <MetricChip label="SPM" value={lane.stroke_rate_spm.toFixed(1)} />
                <MetricChip label="HR" value={lane.hr_bpm ?? '-'} />
            </div>

            {/* Max watts / calories */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem',
                fontSize: '0.625rem', color: 'rgba(255,255,255,0.3)',
            }}>
                <span>MAX: {lane.max_watts}W</span>
                <span>CAL: {lane.calories_burned}</span>
            </div>
        </div>
    );
}

function MetricChip({ label, value }: { label: string; value: string | number }) {
    return (
        <div style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: 6,
            padding: '0.25rem 0.375rem', textAlign: 'center',
        }}>
            <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.05em' }}>
                {label}
            </div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'rgba(255,255,255,0.8)' }}>
                {value}
            </div>
        </div>
    );
}

function StatusPill({ status }: { status: RaceStatus }) {
    const colors: Record<RaceStatus, string> = {
        setup: '#6B7280', lobby: '#3B82F6', countdown: '#F59E0B',
        racing: '#22C55E', finished: '#8B5CF6',
    };
    const labels: Record<RaceStatus, string> = {
        setup: 'STANDBY', lobby: 'LOBBY', countdown: 'COUNTDOWN',
        racing: 'RACING', finished: 'FINISHED',
    };
    return (
        <span style={{
            padding: '0.375rem 0.875rem', borderRadius: 20,
            background: `${colors[status]}22`, color: colors[status],
            fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em',
            border: `1px solid ${colors[status]}44`,
        }}>
            {labels[status]}
        </span>
    );
}
