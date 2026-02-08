"use client";
export default function CoachPerformancePage() {
    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>코치 성과 리포트</h1>
                <p style={{ color: "var(--text-secondary)" }}>코치별 수업 배정 현황, 회원 만족도 및 응대 지표를 확인합니다.</p>
            </header>

            <div className="premium-card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>코치명</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>수업 수 (월)</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>평균 예약률</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>만족도</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "right" }}>성과급 산정</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            { name: "James Wilson", sessions: 48, rate: 92, rating: 4.9 },
                            { name: "Sarah Kim", sessions: 42, rate: 85, rating: 4.8 },
                            { name: "Michael Lee", sessions: 36, rate: 78, rating: 4.5 },
                            { name: "Emma Davis", sessions: 30, rate: 70, rating: 4.7 }
                        ].map((coach, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }} className="hover-row">
                                <td style={{ padding: "16px 24px", fontWeight: "600" }}>{coach.name}</td>
                                <td style={{ padding: "16px 24px" }}>{coach.sessions}회</td>
                                <td style={{ padding: "16px 24px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <div style={{ width: "80px", height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px" }}>
                                            <div style={{ width: `${coach.rate}%`, height: "100%", background: "var(--brand-primary)", borderRadius: "3px" }}></div>
                                        </div>
                                        <span style={{ fontSize: "0.8rem" }}>{coach.rate}%</span>
                                    </div>
                                </td>
                                <td style={{ padding: "16px 24px" }}>⭐ {coach.rating}</td>
                                <td style={{ padding: "16px 24px", textAlign: "right" }}>
                                    <button className="btn-secondary" style={{ fontSize: "0.75rem" }}>상세 통계</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
