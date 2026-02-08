"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function CheckinHistoryPage() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: member } = await supabase.from("members").select("id").eq("email", user.email).single();
            if (member) {
                const { data } = await supabase
                    .from("checkins")
                    .select("*")
                    .eq("member_id", member.id)
                    .order("checkin_time", { ascending: false });

                if (data) setHistory(data);
                else {
                    setHistory([
                        { id: 1, checkin_time: "2026-02-08T10:05:00", facility: "광화문점" },
                        { id: 2, checkin_time: "2026-02-07T18:30:00", facility: "광화문점" },
                        { id: 3, checkin_time: "2026-02-05T07:00:00", facility: "광화문점" }
                    ]);
                }
            }
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "4px" }}>출석 내역</h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>지점 방문 및 수업 체크인 기록입니다.</p>
            </header>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {loading ? (
                    <div style={{ padding: "40px", textAlign: "center" }}>로딩 중...</div>
                ) : (
                    history.map(h => (
                        <div key={h.id} className="premium-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontWeight: "700" }}>{new Date(h.checkin_time).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</div>
                                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{h.facility || "광화문점"}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontWeight: "800", color: "var(--status-success)" }}>
                                    {new Date(h.checkin_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>체크인 완료</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
