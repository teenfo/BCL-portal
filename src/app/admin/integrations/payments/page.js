"use client";
export default function PaymentSettingsPage() {
    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>결제 연동 설정</h1>
                <p style={{ color: "var(--text-secondary)" }}>PG사 연동, 결제 수단 관리 및 영수증 설정을 구성합니다.</p>
            </header>

            <div className="premium-card" style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                    <div>
                        <h3 style={{ fontSize: "1.1rem" }}>활성 PG사: 토스페이먼츠</h3>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>상태: 정상 작동 중</p>
                    </div>
                    <button className="btn-secondary">연동 관리</button>
                </div>

                <div style={{ display: "grid", gap: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px" }}>
                        <span>클라이언트 키</span>
                        <span style={{ fontFamily: "monospace", color: "var(--text-secondary)" }}>test_ck_... (마스킹됨)</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px" }}>
                        <span>웹훅 URL</span>
                        <span style={{ fontSize: "0.85rem" }}>https://api.bcl.com/webhooks/toss</span>
                    </div>
                </div>
            </div>

            <div className="premium-card">
                <h3 style={{ marginBottom: "20px" }}>허용 결제 수단</h3>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                    <div style={{ padding: "12px 20px", background: "var(--bg-tertiary)", borderRadius: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <input type="checkbox" defaultChecked />
                        <span>카드 결제</span>
                    </div>
                    <div style={{ padding: "12px 20px", background: "var(--bg-tertiary)", borderRadius: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <input type="checkbox" defaultChecked />
                        <span>계좌 이체</span>
                    </div>
                    <div style={{ padding: "12px 20px", background: "var(--bg-tertiary)", borderRadius: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <input type="checkbox" defaultChecked />
                        <span>가상 계좌</span>
                    </div>
                    <div style={{ padding: "12px 20px", background: "var(--bg-tertiary)", borderRadius: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <input type="checkbox" />
                        <span>간편 결제 (Pay)</span>
                    </div>
                </div>
                <button className="btn-primary" style={{ marginTop: "24px" }}>설정 저장</button>
            </div>
        </div>
    );
}
