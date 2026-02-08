"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function LiveCheckinPage() {
    const [liveCheckins, setLiveCheckins] = useState([
        { id: 1, name: "김철수", time: "10:25:30", session: "로잉 베이직", type: "Member" },
        { id: 2, name: "이영희", time: "10:20:15", session: "필라테스", type: "Member" },
        { id: 3, name: "박지민", time: "10:18:45", session: "방문 상담", type: "Guest" }
    ]);

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>실시간 체크인 현황</h1>
                    <p style={{ color: "var(--text-secondary)" }}>현재 센터에 입장한 인원과 세션 참여 상태를 확인합니다.</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "8px", height: "8px", background: "#4caf50", borderRadius: "50%", animation: "pulse 2s infinite" }}></div>
                    <span style={{ fontSize: "0.9rem", color: "#4caf50" }}>Live 모니터링 중</span>
                </div>
            </header>

            <div style={{ display: "grid", gap: "16px" }}>
                {liveCheckins.map(checkin => (
                    <div key={checkin.id} className="premium-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                            <div style={{ width: "45px", height: "45px", borderRadius: "50%", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>
                                👤
                            </div>
                            <div>
                                <div style={{ fontWeight: "700", fontSize: "1.1rem" }}>{checkin.name}</div>
                                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{checkin.session}</div>
                            </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontWeight: "600" }}>{checkin.time}</div>
                            <span className={`badge ${checkin.type === 'Member' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: "0.7rem" }}>{checkin.type}</span>
                        </div>
                    </div>
                ))}
            </div>

            <style jsx>{`
                @keyframes pulse {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.2); }
                    100% { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
}
