"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CoachRacePage() {
    const router = useRouter();
    const activeRaces = [
        { id: 1, title: "오전 와트바이크 챌린지", participants: 8, status: "Waiting" },
        { id: 2, title: "12:30 로잉 레이스", participants: 12, status: "Ready" }
    ];

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "4px" }}>레이스 관리</h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>라이브 레이스를 생성하고 시작합니다.</p>
            </header>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <button className="btn-primary" style={{ padding: "16px", fontSize: "1rem" }}>+ 새 레이스 생성</button>

                <h3 style={{ fontSize: "1rem", marginTop: "12px", marginBottom: "8px" }}>진행 예정 레이스</h3>
                {activeRaces.map(race => (
                    <div key={race.id} className="premium-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <div style={{ fontWeight: "700", marginBottom: "4px" }}>{race.title}</div>
                            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>참여 예정: {race.participants}명</div>
                        </div>
                        <button
                            className="btn-secondary"
                            style={{ padding: "8px 16px" }}
                            onClick={() => router.push(`/coach/race/live?id=${race.id}`)}
                        >
                            입장
                        </button>
                    </div>
                ))}
            </div>

            <div className="premium-card" style={{ marginTop: "32px", background: "rgba(255,255,255,0.02)" }}>
                <h3 style={{ fontSize: "1rem", marginBottom: "12px" }}>최근 레이스 결과</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", textAlign: "center", padding: "20px" }}>완료된 레이스 기록이 여기에 표시됩니다.</p>
            </div>
        </div>
    );
}
