"use client";
export default function MembershipPolicyPage() {
    const plans = [
        { id: 1, name: "1개월 무제한", price: 150000, status: "Active" },
        { id: 2, name: "10회 이용권", price: 200000, status: "Active" },
        { id: 3, name: "오픈 기념 특가", price: 100000, status: "Disabled" }
    ];

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>멤버십 상품 정책</h1>
                    <p style={{ color: "var(--text-secondary)" }}>판매되는 멤버십 상품 및 이용권의 가격과 혜택을 구성합니다.</p>
                </div>
                <button className="btn-primary">+ 신규 상품 구성</button>
            </header>

            <div className="premium-card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>상품명</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>가격</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>상태</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {plans.map(p => (
                            <tr key={p.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                <td style={{ padding: "16px 24px", fontWeight: "600" }}>{p.name}</td>
                                <td style={{ padding: "16px 24px" }}>{p.price.toLocaleString()}원</td>
                                <td style={{ padding: "16px 24px" }}>
                                    <span className={`badge ${p.status === 'Active' ? 'badge-success' : 'badge-neutral'}`}>{p.status}</span>
                                </td>
                                <td style={{ padding: "16px 24px" }}>
                                    <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>설정</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
