"use client";
import { useState } from "react";

export default function WodBoardClient() {
    const wodData = {
        date: "2026-02-07",
        title: "FRAN",
        warmup: [
            "3 Rounds:",
            "10 PVC Pipe Pass-throughs",
            "10 Air Squats",
            "10 Scapular Pull-ups"
        ],
        strength: {
            title: "Overhead Squat",
            description: "Build to a heavy set of 3 in 12 minutes"
        },
        metcon: {
            title: "FRAN",
            format: "21-15-9 Reps for Time",
            movements: [
                { name: "Thrusters", rx: "95/65 lbs", scale: "65/45 lbs" },
                { name: "Pull-ups", rx: "Chest to Bar", scale: "Ring Rows" }
            ],
            goal: "Sub 5:00 minutes"
        },
        cooldown: [
            "2 min Pigeon Stretch (each side)",
            "1 min Foam Roll Quads"
        ]
    };

    return (
        <div style={{ height: "100%", overflowY: "auto", padding: "60px" }} className="custom-scrollbar">
            <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
                <div style={{ textAlign: "center", marginBottom: "60px" }}>
                    <h2 style={{ fontSize: "4rem", fontWeight: "900", color: "var(--brand-primary)", letterSpacing: "-2px" }}>
                        {wodData.title}
                    </h2>
                    <div style={{ fontSize: "1.5rem", color: "rgba(255,255,255,0.4)" }}>
                        {wodData.metcon.format}
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "40px" }}>
                    {/* Left: Main Workout Flow */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
                        <section className="premium-card">
                            <h3 style={{ color: "var(--status-success)", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                                <span>🔥</span> 1. WARM-UP
                            </h3>
                            <ul style={{ listStyle: "none", padding: 0, fontSize: "1.3rem", lineHeight: "1.8" }}>
                                {wodData.warmup.map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        </section>

                        <section className="premium-card" style={{ borderLeft: "8px solid var(--status-info)" }}>
                            <h3 style={{ color: "var(--status-info)", marginBottom: "15px" }}>2. STRENGTH</h3>
                            <div style={{ fontSize: "1.8rem", fontWeight: "800", marginBottom: "10px" }}>{wodData.strength.title}</div>
                            <p style={{ fontSize: "1.2rem", color: "rgba(255,255,255,0.6)" }}>{wodData.strength.description}</p>
                        </section>

                        <section className="premium-card" style={{ background: "linear-gradient(135deg, #2a1400 0%, #1c1c1e 100%)", borderWidth: "1px", borderColor: "var(--brand-primary)" }}>
                            <h3 style={{ color: "var(--brand-primary)", marginBottom: "25px", fontSize: "1.5rem" }}>⚡ 3. METCON (FRAN)</h3>
                            <div style={{ display: "grid", gap: "15px" }}>
                                {wodData.metcon.movements.map((move, i) => (
                                    <div key={i} style={{ padding: "25px", background: "rgba(255,255,255,0.05)", borderRadius: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div style={{ fontSize: "1.8rem", fontWeight: "900" }}>{move.name}</div>
                                        <div style={{ textAlign: "right" }}>
                                            <div style={{ color: "var(--brand-secondary)", fontWeight: "800", fontSize: "1.2rem" }}>RX: {move.rx}</div>
                                            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>Scale: {move.scale}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: "30px", padding: "15px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "8px", color: "var(--status-success)", fontSize: "1.1rem", fontWeight: "600", textAlign: "center" }}>
                                🎯 GOAL: {wodData.metcon.goal}
                            </div>
                        </section>
                    </div>

                    {/* Right: Info & Strategy */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
                        <div className="premium-card">
                            <h4 style={{ marginBottom: "15px", color: "rgba(255,255,255,0.4)" }}>💡 STRATEGY & TIPS</h4>
                            <div style={{ fontSize: "1.1rem", lineHeight: "1.6", color: "rgba(255,255,255,0.8)" }}>
                                <p style={{ marginBottom: "15px" }}>- This is a sprint. Choose a thruster weight you can do unbroken for 21 reps when fresh.</p>
                                <p style={{ marginBottom: "15px" }}>- Keep pull-ups efficient. If you struggle with high volume, break them into two sets and shake out early.</p>
                                <p>- Focus on smooth transitions. Breathe deeply between the thrusters and the bar.</p>
                            </div>
                        </div>

                        <div className="premium-card">
                            <h3 style={{ color: "#a1a1aa", marginBottom: "20px" }}>🧊 4. COOL DOWN</h3>
                            <ul style={{ listStyle: "none", padding: 0, fontSize: "1.2rem", lineHeight: "1.6", color: "rgba(255,255,255,0.6)" }}>
                                {wodData.cooldown.map((item, i) => (
                                    <li key={i} style={{ marginBottom: "10px" }}>- {item}</li>
                                ))}
                            </ul>
                        </div>

                        <div style={{ padding: "30px", background: "rgba(255, 107, 0, 0.1)", borderRadius: "20px", textAlign: "center", border: "1px solid var(--brand-primary)" }}>
                            <div style={{ fontSize: "0.9rem", color: "var(--brand-primary)", fontWeight: "700", marginBottom: "10px" }}>Ready to roll?</div>
                            <button className="btn-primary" style={{ fontSize: "1.2rem", width: "100%", padding: "15px" }} onClick={() => window.location.href = '/class/timer'}>
                                OPEN WORKOUT TIMER
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
