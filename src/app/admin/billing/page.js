"use client";
import { useRouter } from "next/navigation";

export default function BillingDashboard() {
    const router = useRouter();

    const menuItems = [
        { title: "멤버십 플랜 관리", desc: "상품 생성 및 가격 정책 설정", path: "/admin/billing/plans", icon: "💳" },
        { title: "결제 내역 조회", desc: "전체 회원 결제 로그 및 상태 확인", path: "/admin/billing/payments", icon: "🧾" },
        { title: "환불 및 정산", desc: "환불 처리 및 기간별 매출 정산", path: "/admin/billing/settlements", icon: "💰" }
    ];

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>결제 및 멤버십</h1>
                <p style={{ color: "var(--text-secondary)" }}>재무 및 상품 관련 하위 메뉴를 선택하여 관리하세요.</p>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
                {menuItems.map((item, idx) => (
                    <div
                        key={idx}
                        className="premium-card hover-row"
                        style={{ cursor: "pointer", padding: "32px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}
                        onClick={() => router.push(item.path)}
                    >
                        <div style={{ fontSize: "3rem", marginBottom: "20px" }}>{item.icon}</div>
                        <h3 style={{ fontSize: "1.25rem", marginBottom: "8px" }}>{item.title}</h3>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
