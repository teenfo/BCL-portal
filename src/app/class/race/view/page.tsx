'use client';

/**
 * 2.5D Race Visualization — CSS 3D Perspective Track
 * ====================================================
 * Rowers as animated sprites that move along a perspective track.
 * Smooth LERP interpolation via useRaceAnimator hook.
 * Optimized for projection/big-screen display.
 */

import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRaceRealtime, type RaceStatus } from '@/hooks/useRaceRealtime';
import { useRaceAnimator, type AnimatedLane } from '@/hooks/useRaceAnimator';

const RACE_SERVER_URL = process.env.NEXT_PUBLIC_RACE_SERVER_URL || 'http://localhost:8001';

// ─── Constants ───────────────────────────────────

const TRACK_COLORS = ['#FF6A00', '#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#EF4444', '#6366F1'];
const WATER_PARTICLES = 30;

export default function ClassRaceViewPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', background: '#0A0F1A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
                Loading 2.5D View...
            </div>
        }>
            <RaceViewInner />
        </Suspense>
    );
}

function RaceViewInner() {
    const searchParams = useSearchParams();
    const eventId = searchParams.get('event') || searchParams.get('eventId');
    const [fallbackEventId, setFallbackEventId] = useState<string | null>(null);
    const [targetDistance, setTargetDistance] = useState(2000);

    // Fallback: get event from server
    useEffect(() => {
        if (eventId) return;
        (async () => {
            try {
                const res = await fetch(`${RACE_SERVER_URL}/api/race/status`);
                const data = await res.json();
                if (data.event_id) setFallbackEventId(data.event_id);
            } catch { /* silent */ }
        })();
    }, [eventId]);

    const activeEventId = eventId || fallbackEventId;
    const { laneData, raceStatus, elapsedTime, isConnected } = useRaceRealtime(activeEventId);
    const { animatedLanes, start, stop, updateTargets } = useRaceAnimator();

    // Sync realtime data → animator
    useEffect(() => {
        updateTargets(laneData);
    }, [laneData, updateTargets]);

    // Start/stop animation based on race status
    useEffect(() => {
        if (raceStatus === 'racing' || raceStatus === 'countdown') {
            start(targetDistance);
        } else if (raceStatus === 'finished') {
            // Keep last frame
        } else {
            stop();
        }
    }, [raceStatus, targetDistance, start, stop]);

    function formatTimer(s: number) {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }

    return (
        <div style={{
            minHeight: '100vh', background: 'linear-gradient(180deg, #0A0F1A 0%, #0D1B2A 60%, #1B263B 100%)',
            color: '#fff', fontFamily: "'Inter', system-ui, sans-serif",
            overflow: 'hidden', position: 'relative',
        }}>
            {/* ─── HUD: Top bar ─── */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                padding: '1rem 1.5rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                zIndex: 20,
                background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h1 style={{
                        fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em',
                        background: 'linear-gradient(135deg, #FF6A00 0%, #FF9A40 100%)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                        🚣 BCL RACE
                    </h1>
                    <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: isConnected ? '#22C55E' : '#EF4444',
                        boxShadow: `0 0 8px ${isConnected ? '#22C55E' : '#EF4444'}`,
                    }} />
                </div>

                {/* Timer */}
                {(raceStatus === 'racing' || raceStatus === 'finished') && (
                    <div style={{
                        fontSize: '2.5rem', fontWeight: 900, fontFamily: 'monospace',
                        color: raceStatus === 'finished' ? '#22C55E' : '#FF6A00',
                        letterSpacing: '0.1em',
                        textShadow: '0 0 20px rgba(255,106,0,0.3)',
                    }}>
                        {formatTimer(elapsedTime)}
                    </div>
                )}

                <StatusBadge status={raceStatus} />
            </div>

            {/* ─── HUD: Leaderboard sidebar ─── */}
            <div style={{
                position: 'absolute', top: 80, right: 16, zIndex: 20,
                width: 200, background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(8px)', borderRadius: 12,
                padding: '0.75rem', border: '1px solid rgba(255,255,255,0.06)',
            }}>
                <div style={{
                    fontSize: '0.625rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)',
                    letterSpacing: '0.1em', marginBottom: '0.5rem',
                }}>
                    LEADERBOARD
                </div>
                {laneData.slice(0, 8).map((lane, idx) => (
                    <div key={lane.device_serial} style={{
                        display: 'flex', alignItems: 'center', gap: '0.375rem',
                        padding: '0.25rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}>
                        <span style={{
                            width: 18, fontSize: '0.625rem', fontWeight: 900,
                            color: idx < 3 ? TRACK_COLORS[idx % TRACK_COLORS.length] : 'rgba(255,255,255,0.3)',
                        }}>
                            {idx + 1}
                        </span>
                        <span style={{ flex: 1, fontSize: '0.6875rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lane.member_name || `L${lane.lane}`}
                        </span>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 800, fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)' }}>
                            {lane.distance_m.toFixed(0)}m
                        </span>
                    </div>
                ))}
            </div>

            {/* ─── 2.5D Track Area ─── */}
            <TrackView
                animatedLanes={animatedLanes}
                raceStatus={raceStatus}
                laneCount={laneData.length}
            />

            {/* ─── Water Particles ─── */}
            <WaterEffect isRacing={raceStatus === 'racing'} />

            {/* ─── Waiting overlay ─── */}
            {raceStatus === 'setup' && laneData.length === 0 && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 30,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: '1rem',
                }}>
                    <div style={{ fontSize: '5rem', opacity: 0.15 }}>🚣</div>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>
                        Waiting for Race...
                    </p>
                </div>
            )}

            {/* ─── Finish overlay ─── */}
            {raceStatus === 'finished' && laneData.length > 0 && (
                <div style={{
                    position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
                    zIndex: 30, display: 'flex', gap: '2rem', alignItems: 'flex-end',
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                    borderRadius: 16, padding: '1.5rem 2rem',
                    border: '1px solid rgba(255,106,0,0.3)',
                }}>
                    {laneData.slice(0, 3).map((lane, idx) => (
                        <div key={lane.device_serial} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem' }}>{['🥇', '🥈', '🥉'][idx]}</div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#fff', marginTop: 4 }}>
                                {lane.member_name || `Lane ${lane.lane}`}
                            </div>
                            <div style={{
                                fontSize: '1.25rem', fontWeight: 900, fontFamily: 'monospace',
                                color: idx === 0 ? '#FF6A00' : 'rgba(255,255,255,0.7)',
                            }}>
                                {lane.distance_m.toFixed(1)}m
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}


// ─── Track Rendering ─────────────────────────────

function TrackView({
    animatedLanes,
    raceStatus,
    laneCount,
}: {
    animatedLanes: React.MutableRefObject<Map<string, AnimatedLane>>;
    raceStatus: RaceStatus;
    laneCount: number;
}) {
    const trackRef = useRef<HTMLDivElement>(null);
    const frameRef = useRef<number | null>(null);

    // rAF render loop — direct DOM manipulation for 60fps
    useEffect(() => {
        function render() {
            if (!trackRef.current) {
                frameRef.current = requestAnimationFrame(render);
                return;
            }

            const lanes = animatedLanes.current;
            const rowerElements = trackRef.current.querySelectorAll<HTMLElement>('[data-rower]');

            for (const el of rowerElements) {
                const serial = el.getAttribute('data-rower');
                if (!serial) continue;

                const lane = lanes.get(serial);
                if (!lane) continue;

                // Position: X based on currentX (0→1), Y based on lane index
                const xPercent = lane.currentX * 85 + 5; // 5% → 90% of track width
                el.style.left = `${xPercent}%`;

                // Power bar width
                const powerBar = el.querySelector<HTMLElement>('[data-power-bar]');
                if (powerBar) {
                    const powerPercent = Math.min(100, (lane.currentPower / 350) * 100);
                    powerBar.style.width = `${powerPercent}%`;
                }

                // Distance text
                const distEl = el.querySelector<HTMLElement>('[data-distance]');
                if (distEl) {
                    distEl.textContent = `${lane.distance.toFixed(0)}m`;
                }

                // Offline styling
                if (lane.connectionStatus === 'offline' || lane.connectionStatus === 'disconnected') {
                    el.style.opacity = '0.35';
                    el.style.filter = 'grayscale(0.8)';
                } else {
                    el.style.opacity = '1';
                    el.style.filter = 'none';
                }

                // 1st place glow
                if (lane.rank === 1 && raceStatus === 'racing') {
                    el.style.boxShadow = '0 0 20px rgba(255,106,0,0.5)';
                } else {
                    el.style.boxShadow = 'none';
                }
            }

            frameRef.current = requestAnimationFrame(render);
        }

        frameRef.current = requestAnimationFrame(render);
        return () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, [animatedLanes, raceStatus]);

    const displayLanes = Array.from(animatedLanes.current.values());

    return (
        <div
            ref={trackRef}
            style={{
                position: 'absolute',
                top: '15%', bottom: '10%', left: 0, right: 0,
                perspective: '800px',
                perspectiveOrigin: '50% 30%',
            }}
        >
            {/* Track lanes — CSS 3D perspective */}
            <div style={{
                position: 'absolute', inset: 0,
                transform: 'rotateX(25deg)',
                transformOrigin: '50% 100%',
                background: 'linear-gradient(180deg, rgba(13,27,42,0.3) 0%, rgba(27,38,59,0.6) 100%)',
            }}>
                {/* Lane lines */}
                {Array.from({ length: Math.max(laneCount, displayLanes.length) + 1 }).map((_, i) => (
                    <div key={`lane-line-${i}`} style={{
                        position: 'absolute',
                        top: `${(i / (Math.max(laneCount, displayLanes.length) || 1)) * 100}%`,
                        left: 0, right: 0, height: 1,
                        background: 'rgba(255,255,255,0.04)',
                    }} />
                ))}

                {/* Distance markers */}
                {[0.25, 0.5, 0.75, 1.0].map(pct => (
                    <div key={`marker-${pct}`} style={{
                        position: 'absolute',
                        left: `${pct * 85 + 5}%`,
                        top: 0, bottom: 0, width: 1,
                        background: `rgba(255,255,255,${pct === 1 ? 0.15 : 0.04})`,
                    }}>
                        <span style={{
                            position: 'absolute', bottom: -20,
                            left: '50%', transform: 'translateX(-50%)',
                            fontSize: '0.5625rem', color: 'rgba(255,255,255,0.2)',
                            fontWeight: 600,
                        }}>
                            {pct === 1 ? 'FINISH' : `${(pct * 100).toFixed(0)}%`}
                        </span>
                    </div>
                ))}
            </div>

            {/* Rower sprites */}
            {displayLanes.map((lane, idx) => {
                const totalLanes = displayLanes.length || 1;
                const yPercent = ((idx + 0.5) / totalLanes) * 100;
                const color = TRACK_COLORS[idx % TRACK_COLORS.length];

                return (
                    <div
                        key={lane.serial}
                        data-rower={lane.serial}
                        style={{
                            position: 'absolute',
                            top: `${yPercent}%`,
                            left: `${lane.currentX * 85 + 5}%`,
                            transform: 'translate(-50%, -50%)',
                            transition: 'opacity 0.3s, filter 0.3s',
                            zIndex: 10,
                        }}
                    >
                        {/* Rower boat/avatar */}
                        <div style={{
                            width: 44, height: 44, borderRadius: '50%',
                            background: `linear-gradient(135deg, ${color}cc, ${color}66)`,
                            border: `2px solid ${color}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.125rem',
                            boxShadow: `0 0 12px ${color}44`,
                        }}>
                            🚣
                        </div>

                        {/* Name + distance label */}
                        <div style={{
                            position: 'absolute', top: -22, left: '50%',
                            transform: 'translateX(-50%)', whiteSpace: 'nowrap',
                            fontSize: '0.625rem', fontWeight: 700, color: '#fff',
                            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                        }}>
                            {lane.memberName}
                        </div>

                        {/* Distance chip */}
                        <div style={{
                            position: 'absolute', bottom: -18, left: '50%',
                            transform: 'translateX(-50%)', whiteSpace: 'nowrap',
                            fontSize: '0.5625rem', fontWeight: 800, fontFamily: 'monospace',
                            color, textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                        }}
                            data-distance
                        >
                            {lane.distance.toFixed(0)}m
                        </div>

                        {/* Mini power bar */}
                        <div style={{
                            position: 'absolute', bottom: -26, left: '50%',
                            transform: 'translateX(-50%)', width: 36, height: 3,
                            borderRadius: 2, background: 'rgba(255,255,255,0.1)',
                            overflow: 'hidden',
                        }}>
                            <div
                                data-power-bar
                                style={{
                                    height: '100%', borderRadius: 2,
                                    background: color,
                                    width: `${Math.min(100, (lane.currentPower / 350) * 100)}%`,
                                    transition: 'width 0.1s linear',
                                }}
                            />
                        </div>
                    </div>
                );
            })}

            {/* START / FINISH flags */}
            <div style={{
                position: 'absolute', left: '5%', top: 0, bottom: 0, width: 2,
                background: 'rgba(255,255,255,0.15)',
            }}>
                <span style={{
                    position: 'absolute', top: -16, left: -10,
                    fontSize: '0.625rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)',
                }}>START</span>
            </div>
            <div style={{
                position: 'absolute', left: '90%', top: 0, bottom: 0, width: 3,
                background: 'linear-gradient(180deg, #FF6A00, #FF9A40)',
                opacity: 0.4,
            }}>
                <span style={{
                    position: 'absolute', top: -16, left: -10,
                    fontSize: '0.625rem', fontWeight: 800, color: '#FF6A00',
                }}>🏁 FINISH</span>
            </div>
        </div>
    );
}


// ─── Water Effect ────────────────────────────────

function WaterEffect({ isRacing }: { isRacing: boolean }) {
    if (!isRacing) return null;

    return (
        <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '12%',
            overflow: 'hidden', pointerEvents: 'none', zIndex: 5,
        }}>
            {Array.from({ length: WATER_PARTICLES }).map((_, i) => {
                const x = Math.random() * 100;
                const delay = Math.random() * 3;
                const duration = 2 + Math.random() * 2;
                const size = 2 + Math.random() * 3;

                return (
                    <div
                        key={i}
                        style={{
                            position: 'absolute',
                            left: `${x}%`,
                            bottom: `${Math.random() * 80}%`,
                            width: size, height: size,
                            borderRadius: '50%',
                            background: 'rgba(59,130,246,0.3)',
                            animation: `waterFloat ${duration}s ease-in-out ${delay}s infinite`,
                        }}
                    />
                );
            })}

            <style>{`
                @keyframes waterFloat {
                    0%, 100% { transform: translate(0, 0); opacity: 0.3; }
                    50% { transform: translate(${Math.random() > 0.5 ? '' : '-'}${5 + Math.random() * 10}px, -${5 + Math.random() * 8}px); opacity: 0.7; }
                }
            `}</style>
        </div>
    );
}


// ─── Status Badge ────────────────────────────────

function StatusBadge({ status }: { status: RaceStatus }) {
    const config: Record<RaceStatus, { label: string; color: string }> = {
        setup: { label: 'STANDBY', color: '#6B7280' },
        lobby: { label: 'LOBBY', color: '#3B82F6' },
        countdown: { label: 'COUNTDOWN', color: '#F59E0B' },
        racing: { label: 'RACING', color: '#22C55E' },
        finished: { label: 'FINISHED', color: '#8B5CF6' },
    };
    const c = config[status];
    return (
        <span style={{
            padding: '0.375rem 0.875rem', borderRadius: 20,
            background: `${c.color}22`, color: c.color,
            fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em',
            border: `1px solid ${c.color}44`,
        }}>
            {c.label}
        </span>
    );
}
