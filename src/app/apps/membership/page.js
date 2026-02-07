"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function MembershipView() {
    const [membership, setMembership] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        getCurrentUser();
    }, []);

    useEffect(() => {
        if (user) {
            fetchMembershipData();
        }
    }, [user]);

    const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
    };

    const fetchMembershipData = async () => {
        setLoading(true);
        try {
            // 1. Get Member Info & Plan
            const { data: memberData } = await supabase
                .from("members")
                .select(`
                    *,
                    membership_plans (
                        name,
                        price,
                        duration_months
                    )
                `)
                .eq("email", user.email)
                .single();

            if (memberData) {
                setMembership(memberData);

                // 2. Get Payment History (Mocking for now, or fetching from 'payments' table if exists)
                // In Admin Billing, we just showed dummy data or fetched from 'payments'.
                // Let's assume 'payments' table exists.
                const { data: paymentData } = await supabase
                    .from("payments")
                    .select("*")
                    .eq("member_id", memberData.id)
                    .order("payment_date", { ascending: false });

                if (paymentData) setPayments(paymentData);
            }
        } catch (error) {
            console.error("Membership fetch error:", error);
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in" style={{ paddingBottom: "80px" }}>
            <header style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "4px" }}>나의 멤버십</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>이용 중인 플랜과 결제 내역을 확인하세요.</p>
            </header>

            {loading ? (
                <p style={{ color: "var(--text-secondary)" }}>로딩 중...</p>
            ) : !membership ? (
                <div className="premium-card" style={{ padding: "40px", textAlign: "center" }}>
                    <p style={{ color: "var(--text-secondary)" }}>가입된 멤버십이 없습니다.</p>
                </div>
            ) : (
                <>
                    {/* Active Plan Card */}
                    <div className="premium-card" style={{
                        marginBottom: "32px",
                        background: "linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)",
                        border: "1px solid var(--border-subtle)",
                        position: "relative",
                        overflow: "hidden"
                    }}>
                        <div style={{ position: "absolute", top: 0, right: 0, width: "100px", height: "100px", background: "var(--brand-primary)", filter: "blur(60px)", opacity: 0.2 }}></div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                            <div>
                                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "4px" }}>CURRENT PLAN</p>
                                <h3 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--brand-primary)" }}>{membership.membership_plans?.name}</h3>
                            </div>
                            <span className={`badge ${membership.status === 'Active' ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: "0.85rem", padding: "6px 12px" }}>
                                {membership.status}
                            </span>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                            <div>
                                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "4px" }}>시작일</p>
                                <p style={{ fontSize: "1rem", fontWeight: "500" }}>{new Date(membership.start_date || membership.created_at).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "4px" }}>만료일</p>
                                <p style={{ fontSize: "1rem", fontWeight: "500" }}>{membership.end_date ? new Date(membership.end_date).toLocaleDateString() : "-"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Payment History */}
                    <div className="premium-card" style={{ padding: "24px" }}>
                        <h3 style={{ fontSize: "1.1rem", marginBottom: "16px" }}>결제 내역</h3>
                        {payments.length === 0 ? (
                            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)" }}>
                                결제 내역이 없습니다.
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                {payments.map(payment => (
                                    <div key={payment.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px solid var(--border-subtle)" }}>
                                        <div>
                                            <p style={{ fontWeight: "600", marginBottom: "4px" }}>{payment.amount?.toLocaleString()}원</p>
                                            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{new Date(payment.payment_date).toLocaleDateString()}</p>
                                        </div>
                                        <span className="badge badge-neutral" style={{ fontSize: "0.8rem" }}>
                                            {payment.method || "Card"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
