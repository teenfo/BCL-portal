"use client";
export default function RevenueReportPage() {
    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>매출 및 정산 리포트</h1>
                <p style={{ color: "var(--text-secondary)" }}>매출 추이, 결제 수단 분포 및 정산 내역을 통합 관리합니다.</p>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", marginBottom: "32px" }}>
                <div className="premium-card" style={{ borderLeft: "4px solid var(--brand-primary)" }}>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>이번 달 매출 (예상)</p>
                    <p style={{ fontSize: "1.8rem", fontWeight: "700" }}>₩48,250,000</p>
                    <span style={{ fontSize: "0.7rem", color: "var(--brand-primary)" }}>↑ 12% vs 지난 달</span>
                </div>
                <div className="premium-card">
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>누적 미정산 금액</p>
                    <p style={{ fontSize: "1.8rem", fontWeight: "700" }}>₩2,140,000</p>
                </div>
                <div className="premium-card">
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>평균 객단가 (ARPPU)</p>
                    <p style={{ fontSize: "1.8rem", fontWeight: "700" }}>₩185,000</p>
                </div>
            </div>

            <div className="premium-card" style={{ marginBottom: "24px" }}>
                <h3 style={{ marginBottom: "20px" }}>월간 매출 추이 (최근 6개월)</h3>
                <div style={{ height: "250px", display: "flex", alignItems: "flex-end", gap: "20px", padding: "20px 0" }}>
                    {[30, 45, 42, 55, 68, 85].map((h, i) => (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <div style={{ width: "100%", height: `${h}%`, background: "linear-gradient(to top, var(--brand-primary), transparent)", borderRadius: "4px 4px 0 0" }}></div>
                            <span style={{ marginTop: "12px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>{i + 1}월</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="premium-card">
                <h3 style={{ marginBottom: "20px" }}>상품별 매출 비중</h3>
                <div style={{ display: "flex", gap: "40px", alignItems: "center" }}>
                    <div style={{ width: "150px", height: "150px", borderRadius: "50%", border: "15px solid var(--brand-primary)", borderRightColor: "transparent", borderBottomColor: "rgba(255,255,255,0.1)" }}></div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Iron Pulse Pro (연간)</span>
                            <span style={{ fontWeight: "600" }}>65%</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Iron Pulse Elite (월간)</span>
                            <span style={{ fontWeight: "600" }}>25%</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>일일 이용권</span>
                            <span style={{ fontWeight: "600" }}>10%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
