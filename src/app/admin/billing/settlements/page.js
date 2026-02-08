"use client";
export default function SettlementsPage() {
    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>환불 및 정산 관리</h1>
                <p style={{ color: "var(--text-secondary)" }}>지점별 매출 정산 주기 및 환불 요청을 승인하고 관리합니다.</p>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
                <div className="premium-card">
                    <h3 style={{ marginBottom: "20px" }}>결제 취소/환불 요청</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {[
                            { user: "김철수", amount: "₩150,000", reason: "개인 사정", status: "Pending" },
                            { user: "이영희", amount: "₩85,000", reason: "이사", status: "Approved" }
                        ].map((req, i) => (
                            <div key={i} style={{ padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                    <span style={{ fontWeight: "600" }}>{req.user} - {req.amount}</span>
                                    <span className={`badge ${req.status === 'Pending' ? 'badge-warning' : 'badge-success'}`}>{req.status}</span>
                                </div>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>사유: {req.reason}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="premium-card">
                    <h3 style={{ marginBottom: "20px" }}>지점 정산 현황</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "12px", borderBottom: "1px solid var(--border-subtle)" }}>
                            <span>정산 대상 기간</span>
                            <span style={{ fontWeight: "600" }}>2026.01.01 - 2026.01.31</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "12px", borderBottom: "1px solid var(--border-subtle)" }}>
                            <span>총 정산액</span>
                            <span style={{ fontWeight: "600", color: "var(--brand-primary)" }}>₩12,450,000</span>
                        </div>
                        <button className="btn-primary" style={{ marginTop: "10px" }}>정산서 발행</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
