"use client";
import { useState, useEffect } from "react";

export default function ClassLeaderboardPage() {
    const [stats, setStats] = useState([
        { id: 1, name: "정지훈", score: 1250, delta: 5, avatar: "👑" },
        { id: 2, name: "강다니엘", score: 1180, delta: 2, avatar: "🔥" },
        { id: 3, name: "박보검", score: 1150, delta: -1, avatar: "💪" },
        { id: 4, name: "송중기", score: 1100, delta: 0, avatar: "⚡" },
        { id: 5, name: "이민호", score: 1050, delta: 3, avatar: "🌟" },
    ]);

    return (
        <div className="animate-fade-in" style={{ padding: "40px", height: "100%", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "40px" }}>
                <div>
                    <h2 style={{ fontSize: "3rem", fontWeight: "900", color: "var(--brand-primary)", lineHeight: "1" }}>LEADERBOARD</h2>
                    <p style={{ fontSize: "1.2rem", color: "rgba(255,255,255,0.4)", marginTop: "8px" }}>TODAY'S TOP PERFORMERS</p>
                </div>
                <div style={{ textAlign: "right", color: "rgba(255,255,255,0.3)" }}>
                    <div style={{ fontSize: "1rem" }}>SESSION: WATTBIKE CHALLENGE</div>
                    <div style={{ fontSize: "0.9rem" }}>UPDATED 3 SECONDS AGO</div>
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {stats.map((s, idx) => (
                    <div key={s.id} style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "24px 40px",
                        background: idx === 0 ? "linear-gradient(90deg, rgba(255,107,0,0.2) 0%, rgba(255,107,0,0.05) 100%)" : "rgba(255,255,255,0.03)",
                        borderRadius: "20px",
                        border: idx === 0 ? "1px solid var(--brand-primary)" : "1px solid rgba(255,255,255,0.05)",
                        transition: "transform 0.2s ease"
                    }}>
                        <div style={{ fontSize: "2.5rem", fontWeight: "900", width: "80px", color: idx === 0 ? "var(--brand-primary)" : "rgba(255,255,255,0.2)" }}>
                            {idx + 1}
                        </div>
                        <div style={{ fontSize: "2rem", marginRight: "24px" }}>{s.avatar}</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "1.8rem", fontWeight: "800" }}>{s.name}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "2.2rem", fontWeight: "900", color: "var(--brand-primary)" }}>{s.score} <span style={{ fontSize: "1rem", color: "rgba(255,255,255,0.3)" }}>PTS</span></div>
                            <div style={{
                                fontSize: "1rem",
                                color: s.delta > 0 ? "var(--status-success)" : s.delta < 0 ? "var(--status-error)" : "rgba(255,255,255,0.3)",
                                fontWeight: "700"
                            }}>
                                {s.delta > 0 ? `▲ ${s.delta}` : s.delta < 0 ? `▼ ${Math.abs(s.delta)}` : "-"}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: "40px", padding: "32px", background: "rgba(255,107,0,0.1)", borderRadius: "24px", border: "1px dashed var(--brand-primary)", textAlign: "center" }}>
                <p style={{ fontSize: "1.1rem", color: "var(--brand-primary)", fontWeight: "600" }}>
                    🚀 MY RANK: 12th (920 PTS) | TOP 5% REACHED
                </p>
            </div>
        </div>
    );
}
