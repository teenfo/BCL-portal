"use client";
export default function NotificationRulesPage() {
    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>자동 발송 규칙</h1>
                <p style={{ color: "var(--text-secondary)" }}>특정 이벤트 발생 시 자동으로 알림이 발송되도록 규칙을 설정합니다.</p>
            </header>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div className="premium-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                        <div>
                            <h3 style={{ fontSize: "1.1rem", marginBottom: "4px" }}>회원 가입 축하 알림</h3>
                            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>트리거: 신규 회원 가입 완료 시</p>
                        </div>
                        <div className="badge badge-success">활성</div>
                    </div>
                    <div style={{ padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", fontSize: "0.9rem" }}>
                        대상: 신규 가입 회원 전체 | 채널: 카카오 알림톡/SMS
                    </div>
                </div>

                <div className="premium-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                        <div>
                            <h3 style={{ fontSize: "1.1rem", marginBottom: "4px" }}>수업 예약 확정 알림</h3>
                            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>트리거: 예약 신청 즉시 발송</p>
                        </div>
                        <div className="badge badge-success">활성</div>
                    </div>
                    <div style={{ padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", fontSize: "0.9rem" }}>
                        대상: 예약자 | 채널: 앱푸시
                    </div>
                </div>
            </div>
        </div>
    );
}
