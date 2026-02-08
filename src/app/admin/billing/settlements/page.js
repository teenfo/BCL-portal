"use client";

export default function SettlementsManagement() {
    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>환불 및 정산 관리</h1>
                <p style={{ color: "var(--text-secondary)" }}>매출 정산 및 환불 요청 건을 관리합니다.</p>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div className="premium-card">
                    <h3 style={{ marginBottom: "20px" }}>정산 대상 현황</h3>
                    <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
                        <p>현재 정산 처리할 내역이 없습니다.</p>
                    </div>
                </div>
                <div className="premium-card">
                    <h3 style={{ marginBottom: "20px" }}>취소/환불 요청</h3>
                    <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
                        <p>대기 중인 환불 요청이 없습니다.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
