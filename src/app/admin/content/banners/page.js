"use client";
export default function BannerManagementPage() {
    const banners = [
        { id: 1, title: "신규 회원 20% 할인", status: "Active", period: "2026.02.01 - 2026.02.28" },
        { id: 2, title: "와트바이크 챌린지 안내", status: "Active", period: "2026.02.10 - 2026.03.10" }
    ];

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>배너 관리</h1>
                    <p style={{ color: "var(--text-secondary)" }}>회원 앱 및 웹 대시보드에 노출되는 홍보 배너를 관리합니다.</p>
                </div>
                <button className="btn-primary">+ 배너 추가</button>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: "24px" }}>
                {banners.map(b => (
                    <div key={b.id} className="premium-card">
                        <div style={{ width: "100%", height: "160px", background: "var(--bg-tertiary)", borderRadius: "12px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)" }}>
                            미리보기 이미지 (1200x400)
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <h3 style={{ fontSize: "1.1rem" }}>{b.title}</h3>
                            <span className="badge badge-success">{b.status}</span>
                        </div>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>게시 기간: {b.period}</p>
                        <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                            <button className="btn-secondary" style={{ flex: 1 }}>수정</button>
                            <button className="btn-secondary" style={{ flex: 1, color: "var(--status-error)" }}>삭제</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
