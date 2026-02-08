"use client";
export default function BillingHelpPage() {
    const faqs = [
        { q: "환불 정책은 어떻게 되나요?", a: "수업 시작 2시간 전 취소 시 전액 환불/횟수 복구가 가능합니다. 그 이후에는 정책에 따라 위약금이 발생할 수 있습니다." },
        { q: "정기 결제 수단을 변경하고 싶어요.", a: "프로필 > 결제 수단 관리에서 새로운 카드를 등록하고 기본 결제 수단으로 설정하실 수 있습니다." },
        { q: "회원권 일시 정지(홀딩)가 가능한가요?", a: "증빙 서류(진단서 등)가 있는 경우 최대 30일까지 연기가 가능합니다. 지점 데스크에 문의 바랍니다." }
    ];

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "4px" }}>결제/환불 안내</h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>결제 관련 자주 묻는 질문입니다.</p>
            </header>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {faqs.map((faq, i) => (
                    <div key={i} className="premium-card">
                        <div style={{ fontWeight: "700", marginBottom: "12px", color: "var(--brand-primary)", display: "flex", gap: "8px" }}>
                            <span>Q.</span>
                            <span>{faq.q}</span>
                        </div>
                        <div style={{ fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: "1.6", display: "flex", gap: "8px" }}>
                            <span>A.</span>
                            <span>{faq.a}</span>
                        </div>
                    </div>
                ))}

                <button className="btn-primary" style={{ marginTop: "12px", padding: "16px" }}>1:1 문의하기</button>
            </div>
        </div>
    );
}
