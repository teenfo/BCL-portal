"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function MembershipPlans() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        const { data } = await supabase.from("membership_plans").select("*").order("price", { ascending: true });
        if (data) setPlans(data);
        else {
            setPlans([
                { id: 1, name: "Starter 10", price: 150000, type: "Sessions", description: "10회 이용권 / 1개월 유효", sessions: 10 },
                { id: 2, name: "Regular 30", price: 390000, type: "Sessions", description: "30회 이용권 / 3개월 유효", sessions: 30 },
                { id: 3, name: "Unlimited VIP", price: 990000, type: "Unlimited", description: "6개월 무제한 이용권 / 모든 브랜치 사용", sessions: 999 }
            ]);
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in" style={{ paddingBottom: "80px" }}>
            <header style={{ marginBottom: "24px" }}>
                <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--brand-primary)", cursor: "pointer", marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
                    ← 뒤로 가기
                </button>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "700" }}>멤버십 플랜 선택</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>회원님께 가장 접합한 플랜을 선택하세요.</p>
            </header>

            {loading ? (
                <p>로딩 중...</p>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {plans.map((plan) => (
                        <div key={plan.id} className="premium-card" style={{ padding: "24px", border: plan.id === 2 ? "2px solid var(--brand-primary)" : "1px solid var(--border-subtle)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                                <h3 style={{ fontSize: "1.25rem", fontWeight: "800" }}>{plan.name}</h3>
                                {plan.id === 2 && <span style={{ fontSize: "0.75rem", background: "var(--brand-primary)", color: "white", padding: "4px 8px", borderRadius: "12px" }}>추천</span>}
                            </div>
                            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "20px" }}>{plan.description}</p>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "24px" }}>
                                <span style={{ fontSize: "1.5rem", fontWeight: "900" }}>{plan.price.toLocaleString()}원</span>
                                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>/ {plan.type}</span>
                            </div>
                            <button className="btn-primary" style={{ width: "100%", padding: "12px" }}>선택하기</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
