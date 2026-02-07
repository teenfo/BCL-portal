"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function MembershipView() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        const { data, error } = await supabase.from("membership_plans").select("*");
        if (!error) setPlans(data);
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "4px" }}>멤버십 플랜</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>나에게 맞는 최적의 플랜을 선택하세요.</p>
            </header>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {loading ? (
                    <p>로딩 중...</p>
                ) : (
                    plans.map((plan) => (
                        <div key={plan.id} className="premium-card" style={{
                            background: plan.name.includes('무제한') ? "linear-gradient(135deg, var(--bg-secondary), #1e293b)" : "var(--bg-secondary)",
                            border: plan.name.includes('무제한') ? "1px solid var(--brand-primary)" : "1px solid var(--border-subtle)"
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                                <h3 style={{ fontSize: "1.2rem" }}>{plan.name}</h3>
                                {plan.name.includes('무제한') && <span className="badge badge-success">추천</span>}
                            </div>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "20px", lineHeight: "1.5" }}>
                                {plan.description}
                            </p>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "24px" }}>
                                <p style={{ fontSize: "1.6rem", fontWeight: "700" }}>
                                    {plan.price.toLocaleString()}원
                                </p>
                                <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>/ {plan.period}</span>
                            </div>
                            <button className={plan.name.includes('무제한') ? "btn-primary" : "btn-secondary"} style={{ width: "100%" }}>
                                플랜 선택하기
                            </button>
                        </div>
                    ))
                )}
            </div>

            <div className="premium-card" style={{ marginTop: "32px", background: "rgba(59, 130, 246, 0.05)", border: "1px dashed var(--brand-primary)" }}>
                <h3 style={{ fontSize: "0.95rem", marginBottom: "8px" }}>💡 기업 제휴 할인</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    BCL과 제휴된 기업의 임직원이라면 추가 10% 할인을 받으실 수 있습니다. 자세한 내용은 고객 지원으로 문의해주세요.
                </p>
            </div>
        </div>
    );
}
