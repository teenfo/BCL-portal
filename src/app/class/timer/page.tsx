'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

type TimerMode = 'countdown' | 'countup' | 'emom' | 'tabata';

interface TabataConfig {
    workSeconds: number;
    restSeconds: number;
    rounds: number;
}

interface EmomConfig {
    intervalSeconds: number;
    totalRounds: number;
}

export default function ClassTimerPage() {
    const [mode, setMode] = useState<TimerMode>('countdown');
    const [isRunning, setIsRunning] = useState(false);
    const [elapsed, setElapsed] = useState(0); // seconds
    const [countdownTotal, setCountdownTotal] = useState(600); // 10 minutes default
    const [currentRound, setCurrentRound] = useState(1);
    const [isWork, setIsWork] = useState(true); // tabata work/rest phase

    const [tabataConfig, setTabataConfig] = useState<TabataConfig>({
        workSeconds: 20, restSeconds: 10, rounds: 8,
    });
    const [emomConfig, setEmomConfig] = useState<EmomConfig>({
        intervalSeconds: 60, totalRounds: 10,
    });

    const [inputMinutes, setInputMinutes] = useState('10');
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // beep sound
    const playBeep = useCallback(() => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.value = 0.3;
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } catch { }
    }, []);

    const playFinalBeep = useCallback(() => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 440;
            gain.gain.value = 0.5;
            osc.start();
            osc.stop(ctx.currentTime + 0.8);
        } catch { }
    }, []);

    // Timer logic
    useEffect(() => {
        if (!isRunning) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }

        intervalRef.current = setInterval(() => {
            setElapsed(prev => {
                const next = prev + 1;

                if (mode === 'countdown') {
                    if (next >= countdownTotal) {
                        setIsRunning(false);
                        playFinalBeep();
                        return countdownTotal;
                    }
                    // 3-2-1 countdown beep
                    const remaining = countdownTotal - next;
                    if (remaining <= 3 && remaining > 0) playBeep();
                }

                if (mode === 'emom') {
                    const total = emomConfig.intervalSeconds * emomConfig.totalRounds;
                    if (next >= total) {
                        setIsRunning(false);
                        playFinalBeep();
                        return total;
                    }
                    const newRound = Math.floor(next / emomConfig.intervalSeconds) + 1;
                    if (newRound !== currentRound) {
                        setCurrentRound(newRound);
                        playBeep();
                    }
                }

                if (mode === 'tabata') {
                    const cycleLength = tabataConfig.workSeconds + tabataConfig.restSeconds;
                    const totalTime = cycleLength * tabataConfig.rounds;
                    if (next >= totalTime) {
                        setIsRunning(false);
                        playFinalBeep();
                        return totalTime;
                    }
                    const cycleElapsed = next % cycleLength;
                    const newRound = Math.floor(next / cycleLength) + 1;
                    const newIsWork = cycleElapsed < tabataConfig.workSeconds;

                    if (newRound !== currentRound) setCurrentRound(newRound);
                    if (newIsWork !== isWork) {
                        setIsWork(newIsWork);
                        playBeep();
                    }
                }

                return next;
            });
        }, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isRunning, mode, countdownTotal, emomConfig, tabataConfig, currentRound, isWork, playBeep, playFinalBeep]);

    function formatTime(seconds: number) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    function getDisplayTime() {
        if (mode === 'countdown') return formatTime(Math.max(0, countdownTotal - elapsed));
        if (mode === 'countup') return formatTime(elapsed);
        if (mode === 'emom') {
            const inRound = elapsed % emomConfig.intervalSeconds;
            return formatTime(emomConfig.intervalSeconds - inRound);
        }
        if (mode === 'tabata') {
            const cycleLength = tabataConfig.workSeconds + tabataConfig.restSeconds;
            const cycleElapsed = elapsed % cycleLength;
            if (isWork) return formatTime(tabataConfig.workSeconds - cycleElapsed);
            return formatTime(tabataConfig.workSeconds + tabataConfig.restSeconds - cycleElapsed);
        }
        return '00:00';
    }

    function handleStart() {
        if (mode === 'countdown') {
            setCountdownTotal(parseInt(inputMinutes || '10') * 60);
        }
        setElapsed(0);
        setCurrentRound(1);
        setIsWork(true);
        setIsRunning(true);
    }

    function handleStop() {
        setIsRunning(false);
    }

    function handleReset() {
        setIsRunning(false);
        setElapsed(0);
        setCurrentRound(1);
        setIsWork(true);
    }

    const isComplete = (() => {
        if (mode === 'countdown') return elapsed >= countdownTotal;
        if (mode === 'emom') return elapsed >= emomConfig.intervalSeconds * emomConfig.totalRounds;
        if (mode === 'tabata') return elapsed >= (tabataConfig.workSeconds + tabataConfig.restSeconds) * tabataConfig.rounds;
        return false;
    })();

    const tabataColor = isWork ? '#22C55E' : '#EF4444';
    const displayColor = mode === 'tabata' && isRunning ? tabataColor : isComplete ? '#EF4444' : '#FFFFFF';

    return (
        <main style={{
            minHeight: '100vh', background: '#000000', color: '#ffffff',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '2rem',
            fontFamily: "'Lexend', sans-serif",
            position: 'relative', overflow: 'hidden',
        }}>
            {/* Background pulse */}
            {isRunning && (
                <div style={{
                    position: 'absolute', inset: 0,
                    background: mode === 'tabata' && !isWork
                        ? 'radial-gradient(circle at 50% 50%, rgba(239,68,68,0.05) 0%, transparent 70%)'
                        : 'radial-gradient(circle at 50% 50%, rgba(255,107,0,0.05) 0%, transparent 70%)',
                    animation: 'pulse 2s ease-in-out infinite',
                    pointerEvents: 'none',
                }} />
            )}

            {/* Mode Selector */}
            {!isRunning && (
                <div style={{
                    display: 'flex', gap: '0.5rem', marginBottom: '2rem',
                    position: 'relative', zIndex: 10,
                }}>
                    {([
                        { key: 'countdown', label: 'COUNTDOWN' },
                        { key: 'countup', label: 'COUNT UP' },
                        { key: 'emom', label: 'EMOM' },
                        { key: 'tabata', label: 'TABATA' },
                    ] as { key: TimerMode; label: string }[]).map(m => (
                        <button
                            key={m.key}
                            onClick={() => { setMode(m.key); handleReset(); }}
                            style={{
                                padding: '0.75rem 1.5rem',
                                borderRadius: '0.75rem',
                                fontWeight: 900, fontSize: '1rem',
                                letterSpacing: '0.15em',
                                textTransform: 'uppercase',
                                border: mode === m.key ? '2px solid #FF6B00' : '1px solid rgba(255,255,255,0.1)',
                                background: mode === m.key ? 'rgba(255,107,0,0.15)' : 'rgba(255,255,255,0.03)',
                                color: mode === m.key ? '#FF6B00' : 'rgba(255,255,255,0.4)',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                            }}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Timer Config (when not running) */}
            {!isRunning && (
                <div style={{ marginBottom: '2rem', textAlign: 'center', position: 'relative', zIndex: 10 }}>
                    {mode === 'countdown' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <input
                                type="number"
                                value={inputMinutes}
                                onChange={e => setInputMinutes(e.target.value)}
                                style={{
                                    width: 80, padding: '0.75rem',
                                    borderRadius: '0.75rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#fff', fontWeight: 900, fontSize: '1.5rem',
                                    textAlign: 'center', outline: 'none',
                                }}
                            />
                            <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.3)', fontSize: '1.25rem' }}>MINUTES</span>
                        </div>
                    )}
                    {mode === 'emom' && (
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 900, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>INTERVAL (SEC)</label>
                                <input type="number" value={emomConfig.intervalSeconds} onChange={e => setEmomConfig(p => ({ ...p, intervalSeconds: +e.target.value || 60 }))}
                                    style={{ width: 80, padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 900, fontSize: '1.25rem', textAlign: 'center', outline: 'none' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 900, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>ROUNDS</label>
                                <input type="number" value={emomConfig.totalRounds} onChange={e => setEmomConfig(p => ({ ...p, totalRounds: +e.target.value || 10 }))}
                                    style={{ width: 80, padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 900, fontSize: '1.25rem', textAlign: 'center', outline: 'none' }} />
                            </div>
                        </div>
                    )}
                    {mode === 'tabata' && (
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 900, letterSpacing: '0.15em', color: '#22C55E', marginBottom: 4 }}>WORK (SEC)</label>
                                <input type="number" value={tabataConfig.workSeconds} onChange={e => setTabataConfig(p => ({ ...p, workSeconds: +e.target.value || 20 }))}
                                    style={{ width: 80, padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22C55E', fontWeight: 900, fontSize: '1.25rem', textAlign: 'center', outline: 'none' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 900, letterSpacing: '0.15em', color: '#EF4444', marginBottom: 4 }}>REST (SEC)</label>
                                <input type="number" value={tabataConfig.restSeconds} onChange={e => setTabataConfig(p => ({ ...p, restSeconds: +e.target.value || 10 }))}
                                    style={{ width: 80, padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontWeight: 900, fontSize: '1.25rem', textAlign: 'center', outline: 'none' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 900, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>ROUNDS</label>
                                <input type="number" value={tabataConfig.rounds} onChange={e => setTabataConfig(p => ({ ...p, rounds: +e.target.value || 8 }))}
                                    style={{ width: 80, padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 900, fontSize: '1.25rem', textAlign: 'center', outline: 'none' }} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Round/Phase Display */}
            {(mode === 'emom' || mode === 'tabata') && isRunning && (
                <div style={{ marginBottom: '1rem', textAlign: 'center', position: 'relative', zIndex: 10 }}>
                    <p style={{
                        fontSize: '2rem', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase',
                        color: mode === 'tabata' ? (isWork ? '#22C55E' : '#EF4444') : '#FF6B00',
                    }}>
                        {mode === 'tabata' ? (isWork ? '💪 WORK' : '😮‍💨 REST') : `ROUND ${currentRound} / ${emomConfig.totalRounds}`}
                    </p>
                    {mode === 'tabata' && (
                        <p style={{ fontSize: '1rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginTop: '0.25rem' }}>
                            Round {currentRound} / {tabataConfig.rounds}
                        </p>
                    )}
                </div>
            )}

            {/* Main Timer Display */}
            <div style={{
                fontSize: 'clamp(6rem, 20vw, 14rem)',
                fontWeight: 900,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
                color: displayColor,
                textShadow: isRunning ? `0 0 60px ${displayColor}40` : 'none',
                transition: 'color 0.3s ease, text-shadow 0.3s ease',
                position: 'relative', zIndex: 10,
                lineHeight: 1,
            }}>
                {getDisplayTime()}
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem', position: 'relative', zIndex: 10 }}>
                {!isRunning ? (
                    <button
                        onClick={handleStart}
                        style={{
                            padding: '1.25rem 3rem',
                            borderRadius: '1rem',
                            background: '#FF6B00',
                            color: '#fff',
                            fontWeight: 900, fontSize: '1.5rem',
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase',
                            border: 'none', cursor: 'pointer',
                            boxShadow: '0 0 30px rgba(255,107,0,0.3)',
                            transition: 'all 0.3s ease',
                        }}
                    >
                        {elapsed > 0 && !isComplete ? 'RESUME' : 'START'}
                    </button>
                ) : (
                    <button
                        onClick={handleStop}
                        style={{
                            padding: '1.25rem 3rem',
                            borderRadius: '1rem',
                            background: 'rgba(239,68,68,0.15)',
                            border: '2px solid #EF4444',
                            color: '#EF4444',
                            fontWeight: 900, fontSize: '1.5rem',
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                        }}
                    >
                        STOP
                    </button>
                )}
                <button
                    onClick={handleReset}
                    style={{
                        padding: '1.25rem 2rem',
                        borderRadius: '1rem',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.4)',
                        fontWeight: 900, fontSize: '1.5rem',
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                    }}
                >
                    RESET
                </button>
            </div>

            {/* Footer */}
            <div style={{
                position: 'absolute', bottom: '2rem',
                opacity: 0.15, pointerEvents: 'none',
                fontSize: '0.75rem', fontWeight: 900,
                letterSpacing: '0.5em', textTransform: 'uppercase',
            }}>
                BCL FITNESS • CLASS TIMER
            </div>

            <audio ref={audioRef} />

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 1; }
                }
            `}</style>
        </main>
    );
}
