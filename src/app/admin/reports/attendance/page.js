"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AttendanceReportPage() {
    const [stats, setStats] = useState({
        todayCount: 0,
        weeklyAvg: 0,
        peakTime: "19:00 - 21:00",
        inactiveCount: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Fetch today's checkins from CORRECT table
            const { count: todayCount } = await supabase
                .from("checkins")
                .select("*", { count: "exact", head: true })
                .gte("time", today.toISOString());

            const { count: totalMembers } = await supabase
                .from("members")
                .select("*", { count: "exact", head: true });

            setStats(prev => ({
                ...prev,
                todayCount: todayCount || 0,
                inactiveCount: Math.floor((totalMembers || 0) * 0.12)
            }));
        } catch (error) {
            console.error("Error fetching attendance stats:", error);
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>출석 리포트</h1>
                    <p style={{ color: "var(--text-secondary)" }}>일별/월별 센터 이용 통계를 시각화하여 운영 인사이트를 제공합니다.</p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button className="btn-secondary">📤 CSV 내보내기</button>
                    <button onClick={fetchStats} className="btn-primary">🔄 새로고침</button>
                </div>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "32px" }}>
                <div className="premium-card" style={{ borderTop: "3px solid var(--brand-primary)" }}>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>오늘 입장</p>
                    <p style={{ fontSize: "1.6rem", fontWeight: "800" }}>{loading ? "..." : `${stats.todayCount}건`}</p>
                </div>
                <div className="premium-card">
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>주간 평균</p>
                    <p style={{ fontSize: "1.6rem", fontWeight: "800" }}>42.5건</p>
                </div>
                <div className="premium-card">
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>피크 타임</p>
                    <p style={{ fontSize: "1.6rem", fontWeight: "800" }}>{stats.peakTime}</p>
                </div>
                <div className="premium-card">
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>장기 미방문</p>
                    <p style={{ fontSize: "1.6rem", fontWeight: "800" }}>{loading ? "..." : `${stats.inactiveCount}명`}</p>
                    <span style={{ fontSize: "0.7rem", color: "#ff4444" }}>대상자 알림 발송 필요</span>
                </div>
            </div>

            <div className="premium-card" style={{ padding: "32px" }}>
                <h3 style={{ marginBottom: "24px", fontSize: "1.1rem" }}>요일별 입장 트렌드</h3>
                <div style={{ height: "300px", display: "flex", alignItems: "flex-end", gap: "30px", padding: "40px 20px" }}>
                    {[65, 59, 80, 81, 56, 40, 30].map((h, i) => (
                        <div key={i} style={{ flex: 1, position: "relative" }}>
                            <div style={{ height: `${h}%`, background: "linear-gradient(to top, var(--brand-primary), rgba(255,107,0,0.3))", borderRadius: "6px" }}></div>
                            <span style={{ position: "absolute", bottom: "-30px", left: "50%", transform: "translateX(-50%)", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                                {['월', '화', '수', '목', '금', '토', '일'][i]}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
