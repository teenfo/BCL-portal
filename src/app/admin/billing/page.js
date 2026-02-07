"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function BillingManagement() {
    const [plans, setPlans] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newPlan, setNewPlan] = useState({
        name: "",
        price: 0,
        period: 30,
        type: "Unlimited", // Unlimited | Limited
        description: ""
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const [plansResult, paymentsResult] = await Promise.all([
            supabase.from("membership_plans").select("*").order("price", { ascending: true }),
            supabase.from("payments").select("*, member:members(name)").order("created_at", { ascending: false }).limit(10)
        ]);

        if (plansResult.data) setPlans(plansResult.data);
        if (paymentsResult.data) setPayments(paymentsResult.data);
        setLoading(false);
    };

    const handleCreatePlan = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from("membership_plans").insert([newPlan]);
        if (!error) {
            setIsModalOpen(false);
            fetchData();
            setNewPlan({ name: "", price: 0, period: 30, type: "Unlimited", description: "" });
        } else {
            alert("Error creating plan: " + error.message);
        }
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>결제 및 멤버십 관리</h1>
                    <p style={{ color: "var(--text-secondary)" }}>멤버십 플랜 및 회원의 결제 내역을 관리합니다.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="btn-primary">+ 플랜 추가</button>
            </header>

            {/* Membership Plans Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", marginBottom: "40px" }}>
                {loading ? (
                    <p style={{ color: "var(--text-secondary)" }}>로딩 중...</p>
                ) : plans.length === 0 ? (
                    <p style={{ color: "var(--text-secondary)" }}>등록된 멤버십 플랜이 없습니다.</p>
                ) : (
                    plans.map((plan) => (
                        <div key={plan.id} className="premium-card" style={{ borderTop: "4px solid var(--brand-primary)", display: "flex", flexDirection: "column" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                                <h3 style={{ fontSize: "1.2rem", fontWeight: "600" }}>{plan.name}</h3>
                                <span className={`badge ${plan.active ? 'badge-success' : 'badge-neutral'}`}>{plan.active ? '활성' : '비활성'}</span>
                            </div>
                            <div style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "8px", color: "white" }}>
                                {plan.price.toLocaleString()}원
                                <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: "400", marginLeft: "4px" }}>/ {plan.period}일</span>
                            </div>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "24px", flex: 1 }}>{plan.description || "설명이 없습니다."}</p>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                <button className="btn-secondary">수정</button>
                                <button className="btn-secondary" style={{ color: "var(--status-error)", borderColor: "rgba(255, 59, 48, 0.3)" }}>중단</button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Recent Payments Table */}
            <div className="premium-card" style={{ padding: 0, overflow: "hidden" }}>
                <h3 style={{ padding: "24px", borderBottom: "1px solid var(--border-subtle)", margin: 0 }}>최근 결제 내역</h3>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>결제 일시</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>회원명</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>상품명</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>금액</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>상태</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>로딩 중...</td></tr>
                        ) : payments.length === 0 ? (
                            <tr><td colSpan="5" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>결제 내역이 없습니다.</td></tr>
                        ) : (
                            payments.map((payment) => (
                                <tr key={payment.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                    <td style={{ padding: "16px 24px", color: "var(--text-secondary)" }}>
                                        {new Date(payment.created_at).toLocaleString()}
                                    </td>
                                    <td style={{ padding: "16px 24px", fontWeight: "500" }}>{payment.member?.name || "-"}</td>
                                    <td style={{ padding: "16px 24px" }}>{payment.plan_name}</td>
                                    <td style={{ padding: "16px 24px", fontWeight: "600" }}>{payment.amount.toLocaleString()}원</td>
                                    <td style={{ padding: "16px 24px" }}>
                                        <span className={`badge ${payment.status === 'Completed' ? 'badge-success' : 'badge-neutral'}`}>
                                            {payment.status === 'Completed' ? '결제 완료' : '대기'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Plan Modal */}
            {isModalOpen && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
                    <div className="premium-card" style={{ width: "400px", padding: "24px", background: "var(--bg-secondary)" }}>
                        <h2 style={{ marginBottom: "20px" }}>새 멤버십 플랜</h2>
                        <form onSubmit={handleCreatePlan} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>플랜 이름</label>
                                <input type="text" required value={newPlan.name} onChange={e => setNewPlan({ ...newPlan, name: e.target.value })}
                                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }} />
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>가격 (원)</label>
                                <input type="number" required value={newPlan.price} onChange={e => setNewPlan({ ...newPlan, price: parseInt(e.target.value) })}
                                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div>
                                    <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>기간 (일)</label>
                                    <input type="number" required value={newPlan.period} onChange={e => setNewPlan({ ...newPlan, period: parseInt(e.target.value) })}
                                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }} />
                                </div>
                                <div>
                                    <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>유형</label>
                                    <select value={newPlan.type} onChange={e => setNewPlan({ ...newPlan, type: e.target.value })}
                                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }}>
                                        <option value="Unlimited">무제한</option>
                                        <option value="Limited">횟수 제한</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>설명</label>
                                <textarea value={newPlan.description} onChange={e => setNewPlan({ ...newPlan, description: e.target.value })} rows="3"
                                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }}></textarea>
                            </div>
                            <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary" style={{ flex: 1 }}>취소</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>생성</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
