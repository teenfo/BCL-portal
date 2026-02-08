"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function CheckinHistory() {
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
                    .from("checkins")
                    .select("*")
                    .eq("member_id", memberData.id)
                    .order("timestamp", { ascending: false });
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
                <h2 style={{ fontSize: "1.5rem", fontWeight: "700" }}>출석 내역</h2>
            </header>

            {loading ? (
                <p style={{ color: "var(--text-secondary)" }}>로딩 중...</p>
            ) : history.length === 0 ? (
                <div className="premium-card" style={{ padding: "60px", textAlign: "center", color: "var(--text-secondary)" }}>
                    출석 내역이 없습니다.
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {history.map((item) => (
                        <div key={item.id} className="premium-card" style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <p style={{ fontWeight: "600", fontSize: "1rem" }}>센터 입장</p>
                                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                                    {new Date(item.timestamp).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                            <span style={{ fontSize: "0.8rem", padding: "4px 10px", borderRadius: "20px", background: "rgba(46, 204, 113, 0.1)", color: "#2ecc71" }}>
                                완료
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
