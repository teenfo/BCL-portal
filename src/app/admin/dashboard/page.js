"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminDashboard() {
    const [counts, setCounts] = useState({
        members: 0,
        sessions: 0,
        checkins: 0,
        notices: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        setLoading(true);
        try {
            const [members, sessions, checkins, notices] = await Promise.all([
                supabase.from("members").select("count", { count: "exact" }),
                supabase.from("sessions").select("count", { count: "exact" }),
                supabase.from("checkins").select("count", { count: "exact" }),
                supabase.from("notices").select("count", { count: "exact" })
            ]);

            setCounts({
                members: members.count || 0,
                sessions: sessions.count || 0,
                checkins: checkins.count || 0,
                notices: notices.count || 0
            });
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
        setLoading(false);
    };

    const stats = [
        { label: "총 회원 수", value: `${counts.members}명`, icon: "👥", trend: "실시간" },
        { label: "전체 세션", value: `${counts.sessions}개`, icon: "📅", trend: "활성" },
        { label: "오늘의 체크인", value: `${counts.checkins}건`, icon: "✅", trend: "0시 기준" },
        { label: "등록된 공지", value: `${counts.notices}건`, icon: "📣", trend: "게시됨" },
    ];

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>관리자 대시보드</h1>
                <p style={{ color: "var(--text-secondary)" }}>오늘의 주요 지표와 플랫폼 상태입니다.</p>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
                {stats.map((stat) => (
                    <div key={stat.label} className="premium-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                            <span style={{ fontSize: "1.5rem" }}>{stat.icon}</span>
                            <span className="badge badge-success" style={{ fontSize: "0.7rem" }}>{stat.trend}</span>
                        </div>
                        <h3 style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "4px" }}>{stat.label}</h3>
                        <p style={{ fontSize: "1.8rem", fontWeight: "700" }}>{loading ? "..." : stat.value}</p>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: "40px", display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
                <div className="premium-card">
                    <h3 style={{ marginBottom: "20px" }}>최근 예약 내역</h3>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem", textAlign: "center", padding: "40px" }}>
                        {loading ? "데이터를 불러오는 중입니다..." : "최근 예약 내역이 없습니다."}
                    </div>
                </div>
                <div className="premium-card">
                    <h3 style={{ marginBottom: "20px" }}>실시간 이용 현황</h3>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem", textAlign: "center", padding: "40px" }}>
                        {loading ? "시설 현황을 확인 중입니다..." : "현재 이용 중인 시설이 없습니다."}
                    </div>
                </div>
            </div>
        </div>
    );
}
