"use client";
import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AttendanceDetailClient({ params }) {
    const { id } = use(params);
    const [session, setSession] = useState(null);
    const [roster, setRoster] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (id) fetchAttendanceData();
    }, [id]);

    const fetchAttendanceData = async () => {
        setLoading(true);
        // Fetch session
        const { data: sessionData } = await supabase.from("sessions").select("*").eq("id", id).single();
        setSession(sessionData);

        // Fetch roster (reservations)
        const { data: rosterData } = await supabase.from("reservations").select("*, member:members(*)").eq("session_id", id);
        setRoster(rosterData || []);
        setLoading(false);
    };

    const toggleAttendance = async (resId, currentStatus) => {
        const newStatus = currentStatus === 'Attended' ? 'Confirmed' : 'Attended';
        const { error } = await supabase.from("reservations").update({ status: newStatus }).eq("id", resId);
        if (!error) {
            setRoster(roster.map(r => r.id === resId ? { ...r, status: newStatus } : r));
        }
    };

    if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>로딩 중...</div>;

    return (
        <div className="animate-fade-in" style={{ paddingBottom: "100px" }}>
            <header style={{ marginBottom: "24px" }}>
                <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--brand-primary)", cursor: "pointer", marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
                    ← 뒤로 가기
                </button>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "700" }}>출석부 상세</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{session?.title} | {new Date(session?.start_time).toLocaleString()}</p>
            </header>

            <div className="premium-card" style={{ padding: "0", overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: "600" }}>명단 ({roster.length}명)</span>
                    <span style={{ fontSize: "0.85rem", color: "var(--brand-primary)" }}>출석 {roster.filter(r => r.status === 'Attended').length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                    {roster.map((res) => (
                        <div key={res.id} style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <p style={{ fontWeight: "600", fontSize: "1rem", marginBottom: "4px" }}>{res.member?.name}</p>
                                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{res.member?.membership_type}</p>
                            </div>
                            <button
                                onClick={() => toggleAttendance(res.id, res.status)}
                                className={res.status === 'Attended' ? 'btn-primary' : 'btn-secondary'}
                                style={{ padding: "8px 16px", minWidth: "80px", fontSize: "0.85rem" }}
                            >
                                {res.status === 'Attended' ? '출석완료' : '결석처리'}
                            </button>
                        </div>
                    ))}
                    {roster.length === 0 && (
                        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>예약된 회원이 없습니다.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
