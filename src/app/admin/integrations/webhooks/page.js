"use client";
export default function WebhooksPage() {
    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>외부 시스템 연동 (Webhooks)</h1>
                <p style={{ color: "var(--text-secondary)" }}>서드파티 서비스와의 실시간 데이터 통신을 위한 엔드포인트를 관리합니다.</p>
            </header>

            <div className="premium-card" style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h3 style={{ fontSize: "1.1rem" }}>활성 웹훅 목록</h3>
                    <button className="btn-primary">웹훅 생성</button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {[
                        { name: "Slack 알림 봇", url: "https://hooks.slack.com/...", event: "New Member", status: "Active" },
                        { name: "CRM 마케팅 연동", url: "https://api.crm.com/...", event: "Payment Success", status: "Inactive" }
                    ].map((hook, i) => (
                        <div key={i} style={{ padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                <span style={{ fontWeight: "600" }}>{hook.name}</span>
                                <span className={`badge ${hook.status === 'Active' ? 'badge-success' : 'badge-secondary'}`}>{hook.status}</span>
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>URL: {hook.url}</div>
                            <div style={{ fontSize: "0.8rem" }}>이벤트: <span className="badge badge-primary" style={{ fontSize: "0.7rem" }}>{hook.event}</span></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
