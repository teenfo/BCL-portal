"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AppsDashboard() {
    const [nextSession, setNextSession] = useState(null);
    const [latestNotice, setLatestNotice] = useState(null);
    const [membership, setMembership] = useState(null);
    const [loading, setLoading] = useState(true);

    const quickActions = [
        { name: "수업 예약", icon: "📅", path: "/apps/schedule" },
        { name: "QR 체크인", icon: "📱", path: "/apps/checkin" },
        { name: "나의 멤버십", icon: "💳", path: "/apps/membership" },
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

            // Fetch Membership (Simulated for now, or fetch from 'members' table if joined)
            // Ideally we get the current user's ID
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: memberData } = await supabase
                    .from("members")
                    .select("*, membership_plans(name)")
                    .eq("email", user.email) // Assuming email match for now
                    .single();
                setMembership(memberData);
            }

        } catch (error) {
            console.error("Dashboard fetch error:", error);
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in" style={{ paddingBottom: "80px" }}>
            <header style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "4px" }}>
                    안녕하세요, {membership?.name || "회원"}님! 👋
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>오늘도 즐거운 운동 되세요.</p>
            </header>

            {/* Membership Status Card */}
            <div className="premium-card" style={{ marginBottom: "24px", background: "linear-gradient(135deg, #FF6B00 0%, #FF9100 100%)", color: "white", border: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div>
                        <p style={{ fontSize: "0.85rem", opacity: 0.9 }}>이용 중인 멤버십</p>
                        <h3 style={{ fontSize: "1.2rem", fontWeight: "700" }}>{membership?.membership_plans?.name || "무료 회원"}</h3>
                    </div>
                    <span style={{ background: "rgba(255,255,255,0.2)", padding: "4px 8px", borderRadius: "12px", fontSize: "0.8rem" }}>
                        {membership?.status || "Inactive"}
                    </span>
                </div>
                <p style={{ fontSize: "0.85rem", opacity: 0.9 }}>
                    만료일: {membership?.end_date ? new Date(membership.end_date).toLocaleDateString() : "-"}
                </p>
            </div>

            {/* Quick Actions */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "32px" }}>
                {quickActions.map((action) => (
                    <a key={action.name} href={action.path} style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "8px",
                        textDecoration: "none",
                        color: "var(--text-primary)"
                    }}>
                        <div style={{
                            width: "50px",
                            height: "50px",
                            borderRadius: "16px",
                            background: "var(--bg-secondary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.5rem",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                        }}>
                            {action.icon}
                        </div>
                        <span style={{ fontSize: "0.8rem", fontWeight: "500" }}>{action.name}</span>
                    </a>
                ))}
            </div>

            {/* Next Session */}
            <div className="premium-card" style={{ marginBottom: "24px" }}>
                <h3 style={{ fontSize: "1rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>🔔</span> 다음 수업 안내
                </h3>
                {loading ? (
                    <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>불러오는 중...</p>
                ) : nextSession ? (
                    <div style={{ padding: "16px", background: "var(--bg-tertiary)", borderRadius: "12px", borderLeft: "4px solid var(--brand-primary)" }}>
                        <p style={{ fontWeight: "600", marginBottom: "4px" }}>{nextSession.title}</p>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                            {new Date(nextSession.start_time).toLocaleString('ko-KR', {
                                month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                        </p>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{nextSession.coach_name} 코치</p>
                    </div>
                ) : (
                    <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>예정된 수업이 없습니다.</p>
                )}
            </div>

            {/* Announcements */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 style={{ fontSize: "1.1rem" }}>공지사항</h3>
                <a href="/apps/notices" style={{ fontSize: "0.85rem", color: "var(--brand-primary)" }}>전체보기</a>
            </div>
            <div className="premium-card" style={{ padding: "16px" }}>
                {loading ? (
                    <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", textAlign: "center" }}>불러오는 중...</p>
                ) : latestNotice ? (
                    <div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                            {latestNotice.category === 'Urgent' && <span className="badge badge-error" style={{ fontSize: "0.7rem", padding: "2px 6px" }}>긴급</span>}
                            <p style={{ fontWeight: "600", fontSize: "0.95rem" }}>{latestNotice.title}</p>
                        </div>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
                            {latestNotice.content}
                        </p>
                    </div>
                ) : (
                    <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", textAlign: "center" }}>새로운 공지사항이 없습니다.</p>
                )}
            </div>
        </div>
    );
}
