"use client";
import { useState, useEffect } from "react";

export default function LiveRacePage() {
    const [status, setStatus] = useState("Waiting"); // Waiting -> Racing -> Finished
    const [participants, setParticipants] = useState([
        { id: 1, name: "김철수", power: 245, distance: 1.2, rank: 1 },
        { id: 2, name: "이영희", power: 210, distance: 1.1, rank: 2 },
        { id: 3, name: "박지민", power: 230, distance: 1.1, rank: 3 },
    ]);

    useEffect(() => {
        if (status === "Racing") {
            const interval = setInterval(() => {
                setParticipants(prev => prev.map(p => ({
                    ...p,
                    power: Math.floor(Math.random() * 50) + 200,
                    distance: parseFloat((p.distance + Math.random() * 0.05).toFixed(2))
                })).sort((a, b) => b.distance - a.distance).map((p, idx) => ({ ...p, rank: idx + 1 })));
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [status]);

    return (
        <div className="animate-fade-in" style={{ paddingBottom: "40px" }}>
            <header style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: "1.2rem", fontWeight: "800" }}>라이브 레이스</h1>
                    <span className={`badge ${status === 'Racing' ? 'badge-error' : 'badge-warning'}`}>
                        {status === 'Racing' ? 'LIVE' : '대기 중'}
                    </span>
                </div>
                {status === 'Waiting' ? (
                    <button className="btn-primary" onClick={() => setStatus("Racing")}>레이스 시작</button>
                ) : (
                    <button className="btn-secondary" onClick={() => setStatus("Waiting")}>종료</button>
                )}
            </header>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {participants.map(p => (
                    <div key={p.id} className="premium-card" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div style={{ fontSize: "1.2rem", fontWeight: "900", color: p.rank === 1 ? "var(--brand-primary)" : "var(--text-secondary)", width: "30px" }}>
                            {p.rank}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: "700" }}>{p.name}</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{p.power}W | {p.distance}km</div>
                        </div>
                        <div style={{ width: "100px", height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", overflow: "hidden" }}>
                            <div style={{ width: `${(p.distance / 5) * 100}%`, height: "100%", background: "var(--brand-primary)" }}></div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: "32px", padding: "16px", background: "rgba(0,0,0,0.2)", borderRadius: "12px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                ℹ️ 실제 장비(Wattbike/Concept2) 연동 시에는 실시간 센서 데이터가 여기에 표시됩니다.
            </div>
        </div>
    );
}
