"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function SessionSchedule() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("sessions")
            .select("*")
            .order("start_time", { ascending: true });
        if (!error) setSessions(data);
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>수업 일정 관리</h1>
                    <p style={{ color: "var(--text-secondary)" }}>클래스 스케줄 및 예약 현황을 관리합니다.</p>
                </div>
                <button className="btn-primary">+ 수업 등록</button>
            </header>

            <div className="premium-card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>시간</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>수업명</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>시설</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>코치</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>예약 현황</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>로딩 중...</td></tr>
                        ) : sessions.length === 0 ? (
                            <tr><td colSpan="6" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>등록된 수업이 없습니다.</td></tr>
                        ) : (
                            sessions.map((session) => (
                                <tr key={session.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                    <td style={{ padding: "16px 24px" }}>
                                        <div style={{ fontSize: "0.9rem", fontWeight: "600" }}>
                                            {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                            {new Date(session.start_time).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td style={{ padding: "16px 24px", fontWeight: "500" }}>{session.title}</td>
                                    <td style={{ padding: "16px 24px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>{session.intensity}</td>
                                    <td style={{ padding: "16px 24px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                                        {session.coach_name}
                                    </td>
                                    <td style={{ padding: "16px 24px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <div style={{ flex: 1, height: "4px", background: "var(--bg-tertiary)", borderRadius: "2px", width: "60px" }}>
                                                <div style={{ width: `${(session.enrolled / session.capacity) * 100}%`, height: "100%", background: "var(--brand-primary)", borderRadius: "2px" }}></div>
                                            </div>
                                            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{session.enrolled}/{session.capacity}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                                        <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>상세</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
