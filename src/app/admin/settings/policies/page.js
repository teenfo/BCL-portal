"use client";
export default function OperatingPoliciesPage() {
    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>운영 정책 관리</h1>
                <p style={{ color: "var(--text-secondary)" }}>센터 운영, 예약 취소 및 환불 정책을 설정합니다.</p>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div className="premium-card">
                    <h3 style={{ marginBottom: "20px" }}>수업 예약 정책</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div>
                            <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem" }}>예약 가능 시점 (시간 전)</label>
                            <input type="number" defaultValue={24} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }} />
                        </div>
                        <div>
                            <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem" }}>최소 취소 가능 시간 (시간 전)</label>
                            <input type="number" defaultValue={2} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }} />
                        </div>
                        <button className="btn-primary">정책 업데이트</button>
                    </div>
                </div>

                <div className="premium-card">
                    <h3 style={{ marginBottom: "20px" }}>환불 및 노쇼 정책</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <input type="checkbox" defaultChecked />
                            <span>노쇼 시 횟수 차감 여부</span>
                        </div>
                        <div>
                            <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem" }}>부분 환불 위약금 (%)</label>
                            <input type="number" defaultValue={10} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }} />
                        </div>
                        <button className="btn-primary">정책 업데이트</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
