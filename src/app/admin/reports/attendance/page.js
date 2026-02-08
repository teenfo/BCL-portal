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
            // Fetch today's checkins
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { count: todayCount } = await supabase
                .from("attendance")
                .select("*", { count: "exact", head: true })
                .gte("time", today.toISOString());

            // Fetch total members for proportion (mocking total for now)
            const { count: totalMembers } = await supabase
                .from("members")
                .select("*", { count: "exact", head: true });

            setStats(prev => ({
                ...prev,
                todayCount: todayCount || 0,
                inactiveCount: Math.floor((totalMembers || 100) * 0.15) // Example logic
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
                    <p style={{ color: "var(--text-secondary)" }}>회원들의 기간별 출석 데이터와 트렌드를 분석합니다.</p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button className="btn-secondary">CSV 내보내기</button>
                    <button className="btn-primary">필터 적용</button>
                </div>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "32px" }}>
                <div className="premium-card">
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>오늘 출석 수</p>
                    <p style={{ fontSize: "1.5rem", fontWeight: "700" }}>{loading ? "..." : `${stats.todayCount}건`}</p>
                    <span style={{ fontSize: "0.7rem", color: "var(--brand-primary)" }}>실시간 집계</span>
                </div>
                <div className="premium-card">
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>평균 주간 출석</p>
                    <p style={{ fontSize: "1.5rem", fontWeight: "700" }}>3.2회</p>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>안정적</span>
                </div>
                <div className="premium-card">
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>피크 타임</p>
                    <p style={{ fontSize: "1.5rem", fontWeight: "700" }}>{stats.peakTime}</p>
                </div>
                <div className="premium-card">
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>미출석 회원(7일+)</p>
                    <p style={{ fontSize: "1.5rem", fontWeight: "700" }}>{loading ? "..." : `${stats.inactiveCount}명`}</p>
                    <span style={{ fontSize: "0.7rem", color: "#ff4d4d" }}>주의 필요</span>
                </div>
            </div>


            <div className="premium-card">
                <h3 style={{ marginBottom: "20px" }}>요일별 출석 분포</h3>
                <div style={{ height: "300px", display: "flex", alignItems: "flex-end", gap: "30px", padding: "40px 20px" }}>
                    {[65, 59, 80, 81, 56, 40, 30].map((h, i) => (
                        <div key={i} style={{ flex: 1, position: "relative" }}>
                            <div style={{ height: `${h}%`, background: "var(--brand-primary)", opacity: 0.8, borderRadius: "4px" }}></div>
                            <span style={{ position: "absolute", bottom: "-30px", left: "50%", transform: "translateX(-50%)", fontSize: "0.8rem" }}>
                                {['월', '화', '수', '목', '금', '토', '일'][i]}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
