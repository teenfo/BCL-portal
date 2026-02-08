"use client";

export default function IntegrationsPage() {
    const integrations = [
        { name: "Supabase", category: "Database/Auth", status: "Connected", icon: "⚡" },
        { name: "Toss Payments", category: "Payment Gateway", status: "Active", icon: "💳" },
        { name: "Aligo SMS", category: "Messaging", status: "Connected", icon: "💬" },
        { name: "Slack Webhook", category: "Monitoring", status: "Disconnected", icon: "🐝" },
    ];

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>외부 연동 및 통합</h1>
                <p style={{ color: "var(--text-secondary)" }}>서비스 운영에 필요한 외부 API 및 결제 모듈 연동 상태를 관리합니다.</p>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
                {integrations.map((item, idx) => (
                    <div key={idx} className="premium-card" style={{ padding: "24px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>
                                {item.icon}
                            </div>
                            <span className={`badge ${item.status === 'Connected' || item.status === 'Active' ? 'badge-success' : 'badge-neutral'}`}>
                                {item.status}
                            </span>
                        </div>
                        <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "4px" }}>{item.name}</h3>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "20px" }}>{item.category}</p>
                        <button className="btn-secondary" style={{ width: "100%", padding: "10px" }}>설정 관리</button>
                    </div>
                ))}
            </div>
        </div>
    );
}
