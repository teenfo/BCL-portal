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

            <div style={{ marginTop: "40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div className="premium-card">
                    <h3 style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                        📈 주간 방문자 추이
                    </h3>
                    <div style={{ height: "200px", display: "flex", alignItems: "flex-end", gap: "12px", padding: "20px 0" }}>
                        {[40, 65, 45, 90, 55, 70, 85].map((height, i) => (
                            <div key={i} style={{ flex: 1, position: "relative" }}>
                                <div style={{
                                    height: `${height}%`,
                                    background: i === 6 ? "var(--brand-primary)" : "rgba(255, 107, 0, 0.2)",
                                    borderRadius: "4px 4px 0 0",
                                    transition: "height 1s ease-out"
                                }}></div>
                                <span style={{ position: "absolute", bottom: "-24px", left: "50%", transform: "translateX(-50%)", fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                                    {['월', '화', '수', '목', '금', '토', '일'][i]}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="premium-card">
                    <h3 style={{ marginBottom: "20px" }}>🔔 실시간 알림</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {[
                            { text: "김철수 회원님 체크인", time: "5분 전" },
                            { text: "이영희 회원님 수강권 만료 D-3", time: "15분 전" },
                            { text: "신규 공지사항 게시 완료", time: "1시간 전" }
                        ].map((item, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", padding: "8px", borderRadius: "6px", background: "rgba(255,255,255,0.03)" }}>
                                <span>{item.text}</span>
                                <span style={{ color: "var(--text-secondary)" }}>{item.time}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
                <div className="premium-card">
                    <h3 style={{ marginBottom: "20px" }}>🗓️ 오늘의 수업 일정</h3>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                        {loading ? "데이터를 불러오는 중입니다..." : (
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border-subtle)" }}>
                                        <th style={{ padding: "12px 8px" }}>수업명</th>
                                        <th style={{ padding: "12px 8px" }}>시간</th>
                                        <th style={{ padding: "12px 8px" }}>예약</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: "12px 8px" }}>오전 요가 클래스</td>
                                        <td style={{ padding: "12px 8px" }}>10:00 - 11:00</td>
                                        <td style={{ padding: "12px 8px" }}><span className="badge badge-success">8/10</span></td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: "12px 8px" }}>필라테스 비기너</td>
                                        <td style={{ padding: "12px 8px" }}>14:00 - 15:00</td>
                                        <td style={{ padding: "12px 8px" }}><span className="badge badge-success">5/12</span></td>
                                    </tr>
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
                <div className="premium-card">
                    <h3 style={{ marginBottom: "20px" }}>🏥 시설 상태</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "0.9rem" }}>메인 센터</span>
                            <span className="badge badge-success">운영 중</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "0.9rem" }}>GX 룸</span>
                            <span className="badge badge-success">운영 중</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "0.9rem" }}>탈의실/샤워실</span>
                            <span className="badge badge-warning">청소 중</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
