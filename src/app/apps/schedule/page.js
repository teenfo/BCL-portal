"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function ScheduleView() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("sessions")
            .select(`
        *,
        coaches:coach_id (profiles:profile_id (full_name)),
        facilities:facility_id (name)
      `)
            .order("start_time", { ascending: true });
        if (!error) setSessions(data);
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "4px" }}>수업 일정</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>원하는 수업을 예약하고 참여하세요.</p>
            </header>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {loading ? (
                    <p>로딩 중...</p>
                ) : sessions.length === 0 ? (
                    <div className="premium-card" style={{ textAlign: "center", padding: "40px" }}>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>진행 예정인 수업이 없습니다.</p>
                    </div>
                ) : (
                    sessions.map((session) => (
                        <div key={session.id} className="premium-card">
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--brand-primary)" }}>
                                    {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                    {session.current_capacity}/{session.max_capacity}명
                                </span>
                            </div>
                            <h3 style={{ fontSize: "1.1rem", marginBottom: "4px" }}>{session.title}</h3>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "16px" }}>
                                {session.facilities?.name} • {session.coaches?.profiles?.full_name} 코치
                            </p>

                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div style={{ flex: 1, height: "4px", background: "var(--bg-tertiary)", borderRadius: "2px" }}>
                                    <div style={{
                                        width: `${(session.current_capacity / session.max_capacity) * 100}%`,
                                        height: "100%",
                                        background: session.current_capacity >= session.max_capacity ? "var(--status-error)" : "var(--brand-primary)",
                                        borderRadius: "2px"
                                    }}></div>
                                </div>
                                <button
                                    className="btn-primary"
                                    style={{ padding: "8px 20px", fontSize: "0.85rem" }}
                                    disabled={session.current_capacity >= session.max_capacity}
                                >
                                    {session.current_capacity >= session.max_capacity ? "마감" : "예약하기"}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
