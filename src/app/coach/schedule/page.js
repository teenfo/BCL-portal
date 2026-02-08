"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function CoachSchedule() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        fetchSchedule();
    }, [selectedDate]);

    const fetchSchedule = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: coachData } = await supabase
                .from("coaches")
                .select("id")
                .eq("email", user.email)
                .single();

            if (coachData) {
                const { data } = await supabase
                    .from("sessions")
                    .select("*, reservations(count)")
                    .eq("coach_id", coachData.id)
                    .eq("date", selectedDate)
                    .order("start_time");

                setSessions(data || []);
            }
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "4px" }}>내 스케줄</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>날짜별 수업 일정을 관리하세요.</p>
            </header>

            <div className="premium-card" style={{ padding: "16px", marginBottom: "24px" }}>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }}
                />
            </div>

            {loading ? (
                <p>로딩 중...</p>
            ) : sessions.length === 0 ? (
                <div className="premium-card" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
                    {selectedDate}에 배정된 수업이 없습니다.
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {sessions.map(session => (
                        <div key={session.id} className="premium-card" style={{ padding: "20px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                                <div>
                                    <h4 style={{ fontSize: "1.1rem", fontWeight: "600" }}>{session.title}</h4>
                                    <p style={{ fontSize: "0.9rem", color: "var(--brand-primary)" }}>{session.start_time} - {session.end_time}</p>
                                </div>
                                <span className={`badge ${session.capacity > (session.reservations?.[0]?.count || 0) ? 'badge-success' : 'badge-neutral'}`}>
                                    {session.reservations?.[0]?.count || 0} / {session.capacity}
                                </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", gap: "16px" }}>
                                    <span>📍 {session.room || "Main Room"}</span>
                                    <span>⚡ {session.intensity || "Medium"}</span>
                                </div>
                                <button
                                    onClick={() => window.location.href = `/coach/schedule/attendance/${session.id}`}
                                    className="btn-secondary"
                                    style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                                >
                                    출석부 확인
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
