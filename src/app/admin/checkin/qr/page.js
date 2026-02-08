"use client";
export default function CheckinQRPage() {
    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>체크인 QR 코드 관리</h1>
                <p style={{ color: "var(--text-secondary)" }}>센터 입구에 비치할 체크인용 QR 코드를 생성하고 관리합니다.</p>
            </header>

            <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
                <div className="premium-card" style={{ padding: "40px" }}>
                    <div style={{ marginBottom: "24px" }}>
                        <h3 style={{ marginBottom: "8px" }}>메인 센터 입구용 QR</h3>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>생성일: 2026.02.08 | 유효기간: 무제한</p>
                    </div>

                    <div style={{ width: "250px", height: "250px", background: "white", margin: "0 auto 32px", padding: "10px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {/* Placeholder for QR Code */}
                        <div style={{ width: "100%", height: "100%", background: "repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 50% / 20px 20px", borderRadius: "4px" }}></div>
                    </div>

                    <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                        <button className="btn-primary">이미지 다운로드</button>
                        <button className="btn-secondary">QR 새로고침</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
