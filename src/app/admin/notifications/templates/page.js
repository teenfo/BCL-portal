"use client";
export default function NotificationTemplatesPage() {
    const templates = [
        { id: 1, name: "예약 완료 안내", type: "AlimTalk", content: "#{name}님, #{session} 예약이 완료되었습니다." },
        { id: 2, name: "멤버십 만료 예고", type: "SMS", content: "멤버십 만료가 3일 남았습니다. 재구독 혜택을 확인하세요." },
        { id: 3, name: "신규 공지 알림", type: "Push", content: "새로운 공지사항이 등록되었습니다: #{title}" }
    ];

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>알림 템플릿 관리</h1>
                    <p style={{ color: "var(--text-secondary)" }}>사용자에게 발송되는 알림의 문구와 형식을 관리합니다.</p>
                </div>
                <button className="btn-primary">템플릿 추가</button>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
                {templates.map(t => (
                    <div key={t.id} className="premium-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                            <h4 style={{ fontWeight: "700" }}>{t.name}</h4>
                            <span className="badge badge-secondary">{t.type}</span>
                        </div>
                        <div style={{ background: "rgba(0,0,0,0.1)", padding: "12px", borderRadius: "6px", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "16px", minHeight: "60px" }}>
                            {t.content}
                        </div>
                        <div style={{ display: "flex", gap: "10px" }}>
                            <button className="btn-secondary" style={{ flex: 1, fontSize: "0.8rem" }}>수정</button>
                            <button className="btn-secondary" style={{ flex: 1, fontSize: "0.8rem" }}>테스트 발송</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
