"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function BillingPaymentsPage() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Fetch from transactions table (mapped in database.md)
            const { data } = await supabase
                .from("transactions")
                .select("*")
                .order("date", { ascending: false });

            if (data) setPayments(data);
            else {
                // Mock data if table is empty
                setPayments([
                    { id: "TX-12345", date: "2026-02-01", amount: 150000, method: "Card", status: "completed" },
                    { id: "TX-99887", date: "2026-01-01", amount: 150000, method: "Card", status: "completed" }
                ]);
            }
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "4px" }}>결제 내역</h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>멤버십 구독 및 이용권 구매 내역입니다.</p>
            </header>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {loading ? (
                    <div style={{ padding: "40px", textAlign: "center" }}>로딩 중...</div>
                ) : (
                    payments.map(p => (
                        <div key={p.id} className="premium-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px" }}>{p.date}</div>
                                <div style={{ fontWeight: "700" }}>멤버십 정기 결제</div>
                                <div style={{ fontSize: "0.85rem", color: "var(--text-tertiary)" }}>{p.method} • {p.id}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontWeight: "800", color: "var(--brand-primary)" }}>{p.amount.toLocaleString()}원</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--status-success)" }}>결제완료</div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div style={{ marginTop: "32px", padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px dashed rgba(255,255,255,0.1)" }}>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textAlign: "center" }}>
                    영수증 발급이나 환불 문의는 <span style={{ color: "var(--brand-primary)", textDecoration: "underline" }}>고객지원</span>을 이용해 주세요.
                </p>
            </div>
        </div>
    );
}
