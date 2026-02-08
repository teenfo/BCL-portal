"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function BillingHistory() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: memberData } = await supabase.from("members").select("id").eq("email", user.email).single();
            if (memberData) {
                const { data } = await supabase
                    .from("payments")
                    .select("*")
                    .eq("member_id", memberData.id)
                    .order("created_at", { ascending: false });
                setHistory(data || []);
            }
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in" style={{ paddingBottom: "80px" }}>
            <header style={{ marginBottom: "24px" }}>
                <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--brand-primary)", cursor: "pointer", marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
                    ← 뒤로 가기
                </button>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "700" }}>결제 내역</h2>
            </header>

            {loading ? (
                <p style={{ color: "var(--text-secondary)" }}>로딩 중...</p>
            ) : history.length === 0 ? (
                <div className="premium-card" style={{ padding: "60px", textAlign: "center", color: "var(--text-secondary)" }}>
                    결제 내역이 없습니다.
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {history.map((item) => (
                        <div key={item.id} className="premium-card" style={{ padding: "20px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                                <p style={{ fontWeight: "700", fontSize: "1.1rem" }}>{item.plan_name}</p>
                                <span style={{ color: "var(--brand-primary)", fontWeight: "600" }}>{item.amount.toLocaleString()}원</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                                <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                <span className="badge badge-success">{item.status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
