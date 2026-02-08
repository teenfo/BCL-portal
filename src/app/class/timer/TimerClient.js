"use client";
import { useState, useEffect, useRef } from "react";

export default function TimerClient() {
    const [mode, setMode] = useState("STOPWATCH"); // STOPWATCH, AMRAP, EMOM, TABATA
    const [status, setStatus] = useState("IDLE"); // IDLE, RUNNING, PAUSED, FINISHED
    const [time, setTime] = useState(0); // in seconds
    const [config, setConfig] = useState({ duration: 600, emomInterval: 60, tabataWork: 20, tabataRest: 10, tabataRounds: 8 });
    const [currentRound, setCurrentRound] = useState(1);
    const [phase, setPhase] = useState("READY"); // READY, WORK, REST
    const timerRef = useRef(null);

    // Audio context for "beep" sounds (browser-native)
    const playBeep = (freq = 440, duration = 0.1) => {
        try {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const osc = context.createOscillator();
            const gain = context.createGain();
            osc.connect(gain);
            gain.connect(context.destination);
            osc.frequency.value = freq;
            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + duration);
            osc.stop(context.currentTime + duration);
        } catch (e) {
            console.log("Audio play failed", e);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(Math.abs(seconds) / 60);
        const secs = Math.abs(seconds) % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const startTimer = () => {
        if (status === "RUNNING") return;
        setStatus("RUNNING");
        playBeep(880, 0.2); // Start beep
    };

    const pauseTimer = () => {
        setStatus("PAUSED");
    };

    const resetTimer = () => {
        clearInterval(timerRef.current);
        setStatus("IDLE");
        setTime(mode === "STOPWATCH" ? 0 : config.duration);
        setCurrentRound(1);
        setPhase("READY");
    };

    useEffect(() => {
        if (status === "RUNNING") {
            timerRef.current = setInterval(() => {
                setTime(prev => {
                    if (mode === "STOPWATCH") return prev + 1;
                    if (prev <= 1) {
                        handleCycleEnd();
                        return 0;
                    }
                    if (prev <= 4) playBeep(440, 0.05); // Countdown beeps
                    return prev - 1;
                });
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [status, mode]);

    const handleCycleEnd = () => {
        if (mode === "EMOM") {
            setCurrentRound(prev => prev + 1);
            setTime(config.emomInterval);
            playBeep(880, 0.3);
        } else if (mode === "TABATA") {
            if (phase === "WORK") {
                setPhase("REST");
                setTime(config.tabataRest);
                playBeep(440, 0.3);
            } else {
                if (currentRound >= config.tabataRounds) {
                    setStatus("FINISHED");
                    playBeep(1760, 0.5);
                } else {
                    setPhase("WORK");
                    setCurrentRound(prev => prev + 1);
                    setTime(config.tabataWork);
                    playBeep(880, 0.3);
                }
            }
        } else {
            setStatus("FINISHED");
            playBeep(1760, 0.5);
        }
    };

    const getPhaseColor = () => {
        if (status === "FINISHED") return "var(--status-info)";
        if (mode === "TABATA") {
            return phase === "WORK" ? "var(--status-error)" : "var(--status-success)";
        }
        return "var(--brand-primary)";
    };

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#000000" }}>
            {/* Timer Display */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <div style={{ fontSize: "1.5rem", color: "rgba(255,255,255,0.4)", fontWeight: "700", marginBottom: "20px" }}>
                    {mode} {status === "FINISHED" ? "• COMPLETED" : ""}
                </div>

                <div style={{
                    fontSize: "25vw",
                    fontWeight: "900",
                    lineHeight: "1",
                    fontFamily: "monospace",
                    color: getPhaseColor(),
                    textShadow: `0 0 50px ${getPhaseColor()}44`
                }}>
                    {formatTime(time)}
                </div>

                {(mode === "EMOM" || mode === "TABATA") && status !== "FINISHED" && (
                    <div style={{ fontSize: "3rem", fontWeight: "800", marginTop: "20px", color: "rgba(255,255,255,0.8)" }}>
                        ROUND {currentRound} <span style={{ fontSize: "1.5rem", color: "rgba(255,255,255,0.3)" }}>/ {mode === "TABATA" ? config.tabataRounds : "∞"}</span>
                    </div>
                )}

                {mode === "TABATA" && status !== "FINISHED" && (
                    <div style={{ fontSize: "2rem", fontWeight: "900", color: getPhaseColor(), marginTop: "10px" }}>
                        {phase}
                    </div>
                )}
            </div>

            {/* Controls Bar */}
            <div style={{ height: "180px", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", padding: "0 60px", gap: "40px" }}>
                <div style={{ display: "flex", gap: "10px" }}>
                    {["STOPWATCH", "AMRAP", "EMOM", "TABATA"].map(m => (
                        <button
                            key={m}
                            onClick={() => { setMode(m); resetTimer(); }}
                            style={{
                                padding: "15px 25px",
                                borderRadius: "12px",
                                border: "1px solid rgba(255,255,255,0.1)",
                                background: mode === m ? "rgba(255,255,255,0.1)" : "transparent",
                                color: mode === m ? "white" : "rgba(255,255,255,0.4)",
                                fontWeight: "700",
                                cursor: "pointer"
                            }}
                        >
                            {m}
                        </button>
                    ))}
                </div>

                <div style={{ flex: 1, display: "flex", justifyContent: "center", gap: "20px" }}>
                    {status !== "RUNNING" ? (
                        <button className="btn-primary" onClick={startTimer} style={{ width: "200px", fontSize: "1.5rem", padding: "20px" }}>▶ START</button>
                    ) : (
                        <button className="btn-secondary" onClick={pauseTimer} style={{ width: "200px", fontSize: "1.5rem", padding: "20px", background: "var(--status-warning)", color: "black", border: "none" }}>⏸ PAUSE</button>
                    )}
                    <button className="btn-secondary" onClick={resetTimer} style={{ width: "150px", fontSize: "1.2rem", padding: "20px" }}>↺ RESET</button>
                </div>

                <div style={{ width: "300px", color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>
                    {mode === "AMRAP" && (
                        <div>Duration: {config.duration / 60}m (Adjust in Settings)</div>
                    )}
                    {mode === "EMOM" && (
                        <div>Interval: {config.emomInterval}s</div>
                    )}
                    {mode === "TABATA" && (
                        <div>{config.tabataWork}s Work / {config.tabataRest}s Rest</div>
                    )}
                </div>
            </div>
        </div>
    );
}
