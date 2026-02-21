'use client';

import { useEffect, useState, useRef } from 'react';

const RACE_SERVER_URL = process.env.NEXT_PUBLIC_RACE_SERVER_URL || 'http://localhost:8001';

interface LaneData {
    lane: number;
    device_serial: string;
    member_id?: string;
    member_name?: string;
    team_id?: string;
    d: number;       // distance
    p: number;       // power
    spm: number;     // stroke rate
    hr: number | null;
    cal: number;
    max_w: number;
}

type RaceStatus = 'setup' | 'lobby' | 'countdown' | 'racing' | 'finished';

export default function ClassRaceRunPage() {
    const [raceStatus, setRaceStatus] = useState<RaceStatus>('setup');
    const [eventId, setEventId] = useState<string | null>(null);
    const [liveData, setLiveData] = useState<LaneData[]>([]);
    const [elapsedTime, setElapsedTime] = useState(0);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const raceStartRef = useRef<number>(0);

    useEffect(() => {
        // Poll race server for live data
        pollRef.current = setInterval(async () => {
            try {
                const res = await fetch(`${RACE_SERVER_URL}/api/race/live`);
                const data = await res.json();

                if (data.status) {
                    setRaceStatus(data.status);
                    setEventId(data.event_id);
                }

                if (data.data) {
                    const entries = Object.entries(data.data).map(([serial, d]: [string, any]) => ({
                        lane: d.lane || 0,
                        device_serial: serial,
                        member_id: d.member_id,
                        member_name: d.member_name,
                        team_id: d.team_id,
                        d: d.d || 0,
                        p: d.p || 0,
                        spm: d.spm || 0,
                        hr: d.hr || null,
                        cal: d.cal || 0,
                        max_w: d.max_w || 0,
                    }));
                    // Sort by distance descending (ranking)
                    entries.sort((a, b) => b.d - a.d);
                    setLiveData(entries);
                }
            } catch {
                // silently retry
            }
        }, 300);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // Track elapsed time when racing
    useEffect(() => {
        if (raceStatus === 'racing') {
            if (!raceStartRef.current) raceStartRef.current = Date.now();
            timerRef.current = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - raceStartRef.current) / 1000));
            }, 100);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
            if (raceStatus === 'setup' || raceStatus === 'lobby') {
                raceStartRef.current = 0;
                setElapsedTime(0);
            }
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [raceStatus]);

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
                <div>
                    <h1 style={{
                        fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.02em',
                        background: 'linear-gradient(135deg, #FF6A00 0%, #FF9A40 100%)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                        🏁 RACE LIVE
                    </h1>
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

            {/* Waiting Screen */}
            {(raceStatus === 'setup' || raceStatus === 'lobby') && liveData.length === 0 && (
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

            {/* Race Grid */}
            {liveData.length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: liveData.length <= 4
                        ? 'repeat(2, 1fr)'
                        : liveData.length <= 9
                            ? 'repeat(3, 1fr)'
                            : 'repeat(4, 1fr)',
                    gap: '0.75rem',
                }}>
                    {liveData.map((lane, idx) => (
                        <LaneCard key={lane.device_serial} lane={lane} rank={idx + 1} isRacing={raceStatus === 'racing'} />
                    ))}
                </div>
            )}

            {/* Finished Summary */}
            {raceStatus === 'finished' && liveData.length > 0 && (
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
                </div>
            )}
        </div>
    );
}

// ─── Sub Components ──────────────────────────────

function LaneCard({ lane, rank, isRacing }: { lane: LaneData; rank: number; isRacing: boolean }) {
    const isFirst = rank === 1 && isRacing;

    return (
        <div style={{
            background: isFirst
                ? 'linear-gradient(135deg, rgba(255,106,0,0.2) 0%, rgba(255,106,0,0.05) 100%)'
                : 'rgba(255,255,255,0.03)',
            border: `1px solid ${isFirst ? 'rgba(255,106,0,0.4)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: 16, padding: '1rem',
            position: 'relative', overflow: 'hidden',
            transition: 'all 0.3s ease',
        }}>
            {/* Rank badge */}
            <div style={{
                position: 'absolute', top: 8, right: 8,
                width: 28, height: 28, borderRadius: '50%',
                background: rank <= 3 ? ['#FF6A00', '#8B8B8B', '#CD7F32'][rank - 1] : 'rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: '0.75rem', color: rank <= 3 ? '#fff' : 'rgba(255,255,255,0.3)',
            }}>
                {rank}
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
                {lane.d.toFixed(1)}<span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>m</span>
            </div>

            {/* Metrics row */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.375rem',
            }}>
                <MetricChip label="WATTS" value={lane.p} highlight={false} />
                <MetricChip label="SPM" value={lane.spm.toFixed(1)} highlight={false} />
                <MetricChip label="HR" value={lane.hr ?? '-'} highlight={false} />
            </div>

            {/* Max watts / calories */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem',
                fontSize: '0.625rem', color: 'rgba(255,255,255,0.3)',
            }}>
                <span>MAX: {lane.max_w}W</span>
                <span>CAL: {lane.cal}</span>
            </div>
        </div>
    );
}

function MetricChip({ label, value, highlight }: { label: string; value: string | number; highlight: boolean }) {
    return (
        <div style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: 6,
            padding: '0.25rem 0.375rem', textAlign: 'center',
        }}>
            <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.05em' }}>
                {label}
            </div>
            <div style={{
                fontSize: '0.8125rem', fontWeight: 800,
                color: highlight ? '#FF6A00' : 'rgba(255,255,255,0.8)',
            }}>
                {value}
            </div>
        </div>
    );
}

function StatusPill({ status }: { status: RaceStatus }) {
    const colors: Record<RaceStatus, string> = {
        setup: '#6B7280',
        lobby: '#3B82F6',
        countdown: '#F59E0B',
        racing: '#22C55E',
        finished: '#8B5CF6',
    };
    const labels: Record<RaceStatus, string> = {
        setup: 'STANDBY',
        lobby: 'LOBBY',
        countdown: 'COUNTDOWN',
        racing: 'RACING',
        finished: 'FINISHED',
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
