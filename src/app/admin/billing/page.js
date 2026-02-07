"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function BillingManagement() {
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
            <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>결제 및 멤버십 관리</h1>
                    <p style={{ color: "var(--text-secondary)" }}>멤버십 플랜 및 회원의 결제 내역을 관리합니다.</p>
                </div>
                <button className="btn-primary">+ 플랜 추가</button>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", marginBottom: "40px" }}>
                {loading ? (
                    <p>로딩 중...</p>
                ) : (
                    plans.map((plan) => (
                        <div key={plan.id} className="premium-card" style={{ borderTop: "4px solid var(--brand-primary)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                                <h3 style={{ fontSize: "1.1rem" }}>{plan.name}</h3>
                                <span className="badge badge-success">활성</span>
                            </div>
                            <p style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "8px" }}>
                                {plan.price.toLocaleString()}원 <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: "400" }}>/ {plan.period}</span>
                            </p>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "24px" }}>{plan.description}</p>
                            <div style={{ display: "flex", gap: "10px" }}>
                                <button className="btn-secondary" style={{ flex: 1 }}>수정</button>
                                <button className="btn-secondary" style={{ flex: 1, color: "var(--status-error)" }}>중단</button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="premium-card">
                <h3 style={{ marginBottom: "20px" }}>최근 결제 내역</h3>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem", textAlign: "center", padding: "40px" }}>
                    결제 내역 데이터를 불러오는 중입니다...
                </div>
            </div>
        </div>
    );
}
