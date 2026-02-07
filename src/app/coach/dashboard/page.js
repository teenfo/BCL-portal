"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function CoachDashboard() {
    const [coach, setCoach] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCoachData();
    }, []);

    const fetchCoachData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Fetch Coach Profile
            const { data: coachData } = await supabase
                .from("coaches")
                .select("*")
                .eq("email", user.email)
                .single();

            if (coachData) {
                setCoach(coachData);
                // Fetch Today's Sessions for this coach
                const today = new Date().toISOString().split('T')[0];
                const { data: sessionData } = await supabase
                    .from("sessions")
                    .select("*, reservations(count)")
                    .eq("coach_id", coachData.id)
                    .gte("date", today)
                    .lte("date", today)
                    .order("start_time");

                setSessions(sessionData || []);
            }
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "4px" }}>안녕하세요, {coach?.name || "코치"}님!</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>오늘의 수업 일정을 확인하세요.</p>
            </header>

            {loading ? (
                <p>로딩 중...</p>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {/* Stats Summary */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div className="premium-card" style={{ padding: "16px" }}>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>오늘 수업</p>
                            <p style={{ fontSize: "1.5rem", fontWeight: "700" }}>{sessions.length}</p>
                        </div>
                        <div className="premium-card" style={{ padding: "16px" }}>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>내일 수업</p>
                            <p style={{ fontSize: "1.5rem", fontWeight: "700" }}>-</p>
                        </div>
                    </div>

                    {/* Today's Schedule List */}
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "600" }}>오늘의 수업</h3>
                    {sessions.length === 0 ? (
                        <div className="premium-card" style={{ padding: "32px", textAlign: "center", color: "var(--text-secondary)" }}>
                            오늘은 배정된 수업이 없습니다.
                        </div>
                    ) : (
                        sessions.map(session => (
                            <div key={session.id} className="premium-card" style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <p style={{ color: "var(--brand-primary)", fontSize: "0.8rem", fontWeight: "600", marginBottom: "4px" }}>
                                        {session.start_time} - {session.end_time}
                                    </p>
                                    <h4 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "4px" }}>{session.title}</h4>
                                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                                        👥 {session.reservations?.[0]?.count || 0} / {session.capacity} 명 예약됨
                                    </p>
                                </div>
                                <button className="btn-primary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
                                    출결체크
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
