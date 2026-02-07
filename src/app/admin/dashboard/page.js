"use client";

export default function AdminDashboard() {
    const stats = [
        { label: "신규 회원 (7일)", value: "24명", icon: "📈", trend: "+12%" },
        { label: "오늘의 예약", value: "48건", icon: "📅", trend: "+5%" },
        { label: "현재 시설 이용", value: "18명", icon: "🏢", trend: "정상" },
        { label: "미처리 문의", value: "3건", icon: "🎧", trend: "紧急" },
    ];

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>관리자 대시보드</h1>
                <p style={{ color: "var(--text-secondary)" }}>오늘의 주요 지표와 플랫폼 상태입니다.</p>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
                {stats.map((stat) => (
                    <div key={stat.label} className="premium-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                            <span style={{ fontSize: "1.5rem" }}>{stat.icon}</span>
                            <span className="badge badge-success" style={{ fontSize: "0.7rem" }}>{stat.trend}</span>
                        </div>
                        <h3 style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "4px" }}>{stat.label}</h3>
                        <p style={{ fontSize: "1.8rem", fontWeight: "700" }}>{stat.value}</p>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: "40px", display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
                <div className="premium-card">
                    <h3 style={{ marginBottom: "20px" }}>최근 예약 내역</h3>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem", textAlign: "center", padding: "40px" }}>
                        데이터를 불러오는 중입니다...
                    </div>
                </div>
                <div className="premium-card">
                    <h3 style={{ marginBottom: "20px" }}>실시간 이용 현황</h3>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem", textAlign: "center", padding: "40px" }}>
                        시설 현황을 확인 중입니다...
                    </div>
                </div>
            </div>
        </div>
    );
}
