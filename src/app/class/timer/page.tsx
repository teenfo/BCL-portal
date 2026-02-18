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

// Static styles (prevent re-creation on each render)
const PAGE_STYLE: React.CSSProperties = {
    minHeight: '100vh', background: '#000000', color: '#ffffff',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '2rem',
    fontFamily: "'Lexend', sans-serif",
    position: 'relative', overflow: 'hidden',
};

const TIMER_DISPLAY_STYLE: React.CSSProperties = {
    fontSize: 'clamp(6rem, 20vw, 14rem)',
    fontWeight: 900,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.02em',
    position: 'relative', zIndex: 10,
    lineHeight: 1,
    willChange: 'contents',
};

const FOOTER_STYLE: React.CSSProperties = {
    position: 'absolute', bottom: '2rem',
    opacity: 0.15, pointerEvents: 'none',
    fontSize: '0.75rem', fontWeight: 900,
    letterSpacing: '0.5em', textTransform: 'uppercase',
};

const BTN_BASE: React.CSSProperties = {
    borderRadius: '1rem',
    fontWeight: 900, fontSize: '1.5rem',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
};

const MODE_SELECTOR_STYLE: React.CSSProperties = {
    display: 'flex', gap: '0.5rem', marginBottom: '2rem',
    position: 'relative', zIndex: 10,
};

const CONFIG_STYLE: React.CSSProperties = {
    marginBottom: '2rem', textAlign: 'center', position: 'relative', zIndex: 10,
};

const INPUT_BASE: React.CSSProperties = {
    padding: '0.5rem', borderRadius: '0.5rem',
    fontWeight: 900, fontSize: '1.25rem', textAlign: 'center', outline: 'none',
};

export default function ClassTimerPage() {
    const [mode, setMode] = useState<TimerMode>('countdown');
    const [isRunning, setIsRunning] = useState(false);
    const [inputMinutes, setInputMinutes] = useState('10');
    const [isComplete, setIsComplete] = useState(false);

    const [tabataConfig, setTabataConfig] = useState<TabataConfig>({
        workSeconds: 20, restSeconds: 10, rounds: 8,
    });
    const [emomConfig, setEmomConfig] = useState<EmomConfig>({
        intervalSeconds: 60, totalRounds: 10,
    });

    // Refs for rAF-driven timer (no state updates per tick)
    const displayRef = useRef<HTMLDivElement>(null);
    const phaseRef = useRef<HTMLDivElement>(null);
    const elapsedRef = useRef(0);
    const countdownTotalRef = useRef(600);
    const currentRoundRef = useRef(1);
    const isWorkRef = useRef(true);
    const rafRef = useRef<number | null>(null);
    const lastTickRef = useRef(0);
    const audioCtxRef = useRef<AudioContext | null>(null);

    // beep (lightweight, cached AudioContext)
    const getAudioCtx = useCallback(() => {
        if (!audioCtxRef.current) {
            try {
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            } catch { }
        }
        return audioCtxRef.current;
    }, []);

    const playBeep = useCallback((freq = 880, duration = 0.15, vol = 0.3) => {
        try {
            const ctx = getAudioCtx();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq;
            gain.gain.value = vol;
            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch { }
    }, [getAudioCtx]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    /** rAF loop — updates DOM directly, no React state */
    const tick = useCallback((timestamp: number) => {
        if (!lastTickRef.current) lastTickRef.current = timestamp;
        const delta = timestamp - lastTickRef.current;

        if (delta >= 1000) {
            lastTickRef.current = timestamp - (delta % 1000);
            elapsedRef.current += 1;
            const elapsed = elapsedRef.current;

            let displayTime = '00:00';
            let displayColor = '#FFFFFF';
            let phaseText = '';
            let done = false;

            if (mode === 'countdown') {
                const remaining = Math.max(0, countdownTotalRef.current - elapsed);
                displayTime = formatTime(remaining);
                if (remaining <= 0) { done = true; displayColor = '#EF4444'; }
                else if (remaining <= 3) playBeep();
            } else if (mode === 'countup') {
                displayTime = formatTime(elapsed);
            } else if (mode === 'emom') {
                const total = emomConfig.intervalSeconds * emomConfig.totalRounds;
                if (elapsed >= total) { done = true; displayColor = '#EF4444'; displayTime = '00:00'; }
                else {
                    const inRound = elapsed % emomConfig.intervalSeconds;
                    displayTime = formatTime(emomConfig.intervalSeconds - inRound);
                    const newRound = Math.floor(elapsed / emomConfig.intervalSeconds) + 1;
                    if (newRound !== currentRoundRef.current) {
                        currentRoundRef.current = newRound;
                        playBeep();
                    }
                    phaseText = `ROUND ${currentRoundRef.current} / ${emomConfig.totalRounds}`;
                    displayColor = '#FF6B00';
                }
            } else if (mode === 'tabata') {
                const cycleLength = tabataConfig.workSeconds + tabataConfig.restSeconds;
                const totalTime = cycleLength * tabataConfig.rounds;
                if (elapsed >= totalTime) { done = true; displayColor = '#EF4444'; displayTime = '00:00'; }
                else {
                    const cycleElapsed = elapsed % cycleLength;
                    const newRound = Math.floor(elapsed / cycleLength) + 1;
                    const newIsWork = cycleElapsed < tabataConfig.workSeconds;
                    if (newRound !== currentRoundRef.current) currentRoundRef.current = newRound;
                    if (newIsWork !== isWorkRef.current) {
                        isWorkRef.current = newIsWork;
                        playBeep();
                    }
                    displayColor = newIsWork ? '#22C55E' : '#EF4444';
                    if (newIsWork) displayTime = formatTime(tabataConfig.workSeconds - cycleElapsed);
                    else displayTime = formatTime(tabataConfig.workSeconds + tabataConfig.restSeconds - cycleElapsed);
                    phaseText = `${newIsWork ? '💪 WORK' : '😮‍💨 REST'}`;
                }
            }

            // Direct DOM update (no setState)
            if (displayRef.current) {
                displayRef.current.textContent = displayTime;
                displayRef.current.style.color = displayColor;
                displayRef.current.style.textShadow = done ? 'none' : `0 0 60px ${displayColor}40`;
            }
            if (phaseRef.current) {
                phaseRef.current.textContent = phaseText;
                if (mode === 'tabata') phaseRef.current.style.color = isWorkRef.current ? '#22C55E' : '#EF4444';
                else phaseRef.current.style.color = '#FF6B00';
            }

            if (done) {
                setIsRunning(false);
                setIsComplete(true);
                playBeep(440, 0.8, 0.5);
                return;
            }
        }

        rafRef.current = requestAnimationFrame(tick);
    }, [mode, emomConfig, tabataConfig, playBeep]);

    useEffect(() => {
        if (isRunning) {
            lastTickRef.current = 0;
            rafRef.current = requestAnimationFrame(tick);
        }
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [isRunning, tick]);

    function handleStart() {
        if (mode === 'countdown') {
            countdownTotalRef.current = parseInt(inputMinutes || '10') * 60;
        }
        elapsedRef.current = 0;
        currentRoundRef.current = 1;
        isWorkRef.current = true;
        setIsComplete(false);
        // Set initial display
        if (displayRef.current) {
            if (mode === 'countdown') displayRef.current.textContent = formatTime(countdownTotalRef.current);
            else displayRef.current.textContent = '00:00';
            displayRef.current.style.color = '#FFFFFF';
            displayRef.current.style.textShadow = '0 0 60px rgba(255,255,255,0.25)';
        }
        if (phaseRef.current) phaseRef.current.textContent = '';
        setIsRunning(true);
    }

    function handleStop() {
        setIsRunning(false);
    }

    function handleReset() {
        setIsRunning(false);
        setIsComplete(false);
        elapsedRef.current = 0;
        currentRoundRef.current = 1;
        isWorkRef.current = true;
        if (displayRef.current) {
            if (mode === 'countdown') displayRef.current.textContent = formatTime(parseInt(inputMinutes || '10') * 60);
            else displayRef.current.textContent = '00:00';
            displayRef.current.style.color = '#FFFFFF';
            displayRef.current.style.textShadow = 'none';
        }
        if (phaseRef.current) phaseRef.current.textContent = '';
    }

    // Initial display text (for SSR/first paint)
    const initialDisplay = mode === 'countdown'
        ? formatTime(parseInt(inputMinutes || '10') * 60)
        : '00:00';

    return (
        <main style={PAGE_STYLE}>
            {/* Background pulse */}
            {isRunning && (
                <div style={{
                    position: 'absolute', inset: 0,
                    background: mode === 'tabata' && !isWorkRef.current
                        ? 'radial-gradient(circle at 50% 50%, rgba(239,68,68,0.05) 0%, transparent 70%)'
                        : 'radial-gradient(circle at 50% 50%, rgba(255,107,0,0.05) 0%, transparent 70%)',
                    animation: 'pulse 2s ease-in-out infinite',
                    pointerEvents: 'none',
                }} />
            )}

            {/* Mode Selector */}
            {!isRunning && (
                <div style={MODE_SELECTOR_STYLE}>
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
                                letterSpacing: '0.15em', textTransform: 'uppercase',
                                border: mode === m.key ? '2px solid #FF6B00' : '1px solid rgba(255,255,255,0.1)',
                                background: mode === m.key ? 'rgba(255,107,0,0.15)' : 'rgba(255,255,255,0.03)',
                                color: mode === m.key ? '#FF6B00' : 'rgba(255,255,255,0.4)',
                                cursor: 'pointer', transition: 'all 0.3s ease',
                            }}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Timer Config (when not running) */}
            {!isRunning && (
                <div style={CONFIG_STYLE}>
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
                                    style={{ ...INPUT_BASE, width: 80, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 900, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>ROUNDS</label>
                                <input type="number" value={emomConfig.totalRounds} onChange={e => setEmomConfig(p => ({ ...p, totalRounds: +e.target.value || 10 }))}
                                    style={{ ...INPUT_BASE, width: 80, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                            </div>
                        </div>
                    )}
                    {mode === 'tabata' && (
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 900, letterSpacing: '0.15em', color: '#22C55E', marginBottom: 4 }}>WORK (SEC)</label>
                                <input type="number" value={tabataConfig.workSeconds} onChange={e => setTabataConfig(p => ({ ...p, workSeconds: +e.target.value || 20 }))}
                                    style={{ ...INPUT_BASE, width: 80, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22C55E' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 900, letterSpacing: '0.15em', color: '#EF4444', marginBottom: 4 }}>REST (SEC)</label>
                                <input type="number" value={tabataConfig.restSeconds} onChange={e => setTabataConfig(p => ({ ...p, restSeconds: +e.target.value || 10 }))}
                                    style={{ ...INPUT_BASE, width: 80, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 900, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>ROUNDS</label>
                                <input type="number" value={tabataConfig.rounds} onChange={e => setTabataConfig(p => ({ ...p, rounds: +e.target.value || 8 }))}
                                    style={{ ...INPUT_BASE, width: 80, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Round/Phase Display (rAF-driven via ref) */}
            {(mode === 'emom' || mode === 'tabata') && (
                <div style={{ marginBottom: '1rem', textAlign: 'center', position: 'relative', zIndex: 10 }}>
                    <p ref={phaseRef} style={{
                        fontSize: '2rem', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase',
                        color: '#FF6B00', willChange: 'contents',
                    }} />
                    {mode === 'tabata' && isRunning && (
                        <p style={{ fontSize: '1rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginTop: '0.25rem' }}>
                            Round {currentRoundRef.current} / {tabataConfig.rounds}
                        </p>
                    )}
                </div>
            )}

            {/* Main Timer Display (rAF-driven via ref) */}
            <div ref={displayRef} style={TIMER_DISPLAY_STYLE}>
                {initialDisplay}
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem', position: 'relative', zIndex: 10 }}>
                {!isRunning ? (
                    <button
                        onClick={handleStart}
                        style={{
                            ...BTN_BASE,
                            padding: '1.25rem 3rem',
                            background: '#FF6B00', color: '#fff',
                            border: 'none',
                            boxShadow: '0 0 30px rgba(255,107,0,0.3)',
                        }}
                    >
                        {elapsedRef.current > 0 && !isComplete ? 'RESUME' : 'START'}
                    </button>
                ) : (
                    <button
                        onClick={handleStop}
                        style={{
                            ...BTN_BASE,
                            padding: '1.25rem 3rem',
                            background: 'rgba(239,68,68,0.15)',
                            border: '2px solid #EF4444', color: '#EF4444',
                        }}
                    >
                        STOP
                    </button>
                )}
                <button
                    onClick={handleReset}
                    style={{
                        ...BTN_BASE,
                        padding: '1.25rem 2rem',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.4)',
                    }}
                >
                    RESET
                </button>
            </div>

            {/* Footer */}
            <div style={FOOTER_STYLE}>
                BCL FITNESS • CLASS TIMER
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 1; }
                }
            `}</style>
        </main>
    );
}
