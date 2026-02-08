"use client";
export default function SessionReportPage() {
    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>세션 운영 리포트</h1>
                <p style={{ color: "var(--text-secondary)" }}>클래스별 예약률, 인기 시간대 및 운영 효율성을 분석합니다.</p>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
                <div className="premium-card">
                    <h3 style={{ marginBottom: "20px" }}>클래스별 예약률 순위</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {[
                            { name: "로잉 베이직 (오전)", rate: 95 },
                            { name: "필라테스 비기너", rate: 88 },
                            { name: "크로스핏 WOD", rate: 82 },
                            { name: "파워 리프팅", rate: 65 },
                            { name: "요가 릴렉스", rate: 45 }
                        ].map((item, i) => (
                            <div key={i}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.9rem" }}>
                                    <span>{item.name}</span>
                                    <span style={{ fontWeight: "700" }}>{item.rate}%</span>
                                </div>
                                <div style={{ height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", overflow: "hidden" }}>
                                    <div style={{ width: `${item.rate}%`, height: "100%", background: "var(--brand-primary)" }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="premium-card">
                    <h3 style={{ marginBottom: "20px" }}>운영 요약 (최근 30일)</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        <div>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>총 세션 수</p>
                            <p style={{ fontSize: "1.2rem", fontWeight: "700" }}>142회</p>
                        </div>
                        <div>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>평균 예약률</p>
                            <p style={{ fontSize: "1.2rem", fontWeight: "700" }}>76.4%</p>
                        </div>
                        <div>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>취소율</p>
                            <p style={{ fontSize: "1.2rem", fontWeight: "700" }}>8.2%</p>
                        </div>
                        <div>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>노쇼(No-show) 발생</p>
                            <p style={{ fontSize: "1.2rem", fontWeight: "700" }}>24건</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
