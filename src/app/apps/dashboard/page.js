"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AppsDashboard() {
    const [nextSession, setNextSession] = useState(null);
    const [latestNotice, setLatestNotice] = useState(null);
    const [loading, setLoading] = useState(true);

    const quickActions = [
        { name: "수업 예약", icon: "📅", path: "/apps/schedule" },
        { name: "QR 체크인", icon: "QR", path: "/apps/checkin" },
        { name: "나의 멤버십", icon: "💳", path: "/apps/profile" },
        { name: "공지사항", icon: "📣", path: "/apps/notices" },
    ];

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Fetch next session
            const { data: sessionData } = await supabase
                .from("sessions")
                .select("*")
                .gte("start_time", new Date().toISOString())
                .order("start_time", { ascending: true })
                .limit(1)
                .maybeSingle();
            setNextSession(sessionData);

            // Fetch latest notice
            const { data: noticeData } = await supabase
                .from("notices")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            setLatestNotice(noticeData);
        } catch (error) {
            console.error("Dashboard fetch error:", error);
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "4px" }}>안녕하세요! 👋</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>오늘도 즐거운 운동 되세요.</p>
            </header>

            {/* Quick Actions */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "32px" }}>
                {quickActions.map((action) => (
                    <a key={action.name} href={action.path} className="premium-card" style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "12px",
                        padding: "20px"
                    }}>
                        <span style={{ fontSize: "2rem" }}>{action.icon}</span>
                        <span style={{ fontSize: "0.9rem", fontWeight: "600" }}>{action.name}</span>
                    </a>
                ))}
            </div>

            {/* Next Session */}
            <div className="premium-card" style={{ marginBottom: "32px", background: "linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary))" }}>
                <h3 style={{ fontSize: "1rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>🔔</span> 다음 수업 안내
                </h3>
                {loading ? (
                    <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>불러오는 중...</p>
                ) : nextSession ? (
                    <div style={{ padding: "12px", borderLeft: "4px solid var(--brand-primary)", background: "rgba(255,255,255,0.03)", borderRadius: "0 8px 8px 0" }}>
                        <p style={{ fontWeight: "600", marginBottom: "4px" }}>{nextSession.title}</p>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                            {new Date(nextSession.start_time).toLocaleString('ko-KR', {
                                month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })} • {nextSession.coach_name} 코치
                        </p>
                    </div>
                ) : (
                    <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>예정된 수업이 없습니다.</p>
                )}
            </div>

            {/* Announcements */}
            <section>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h3 style={{ fontSize: "1.1rem" }}>공지사항</h3>
                    <a href="/apps/notices" style={{ fontSize: "0.85rem", color: "var(--brand-primary)" }}>전체보기</a>
                </div>
                <div className="premium-card" style={{ padding: "16px" }}>
                    {loading ? (
                        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", textAlign: "center" }}>불러오는 중...</p>
                    ) : latestNotice ? (
                        <div>
                            <p style={{ fontWeight: "600", fontSize: "0.95rem", marginBottom: "4px" }}>{latestNotice.title}</p>
                            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
                                {latestNotice.content}
                            </p>
                        </div>
                    ) : (
                        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", textAlign: "center" }}>새로운 공지사항이 없습니다.</p>
                    )}
                </div>
            </section>
        </div>
    );
}
