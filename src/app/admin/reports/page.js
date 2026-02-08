"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function ReportingDashboard() {
    const [stats, setStats] = useState({
        totalRevenue: 0,
        activeMembers: 0,
        avgAttendance: 0,
        growthRate: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mocking stats for visualization demo
        setTimeout(() => {
            setStats({
                totalRevenue: 12540000,
                activeMembers: 245,
                avgAttendance: 18,
                growthRate: 12.5
            });
            setLoading(false);
        }, 800);
    }, []);

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>데이터 리포트 및 분석</h1>
                <p style={{ color: "var(--text-secondary)" }}>센터 운영 현황을 지표로 확인하고 기간별 추이를 분석합니다.</p>
            </header>

            {/* Key Metrics Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "40px" }}>
                {[
                    { label: "누적 매출", value: `${stats.totalRevenue.toLocaleString()}원`, trend: "+8.2%", color: "var(--brand-primary)" },
                    { label: "활성 회원 수", value: `${stats.activeMembers}명`, trend: "+12명", color: "var(--status-success)" },
                    { label: "평균 출석률", value: `${stats.avgAttendance}%`, trend: "-2.1%", color: "#FFD700" },
                    { label: "월간 성장률", value: `${stats.growthRate}%`, trend: "Stable", color: "#AF52DE" }
                ].map((stat, idx) => (
                    <div key={idx} className="premium-card" style={{ padding: "24px" }}>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "12px" }}>{stat.label}</p>
                        <p style={{ fontSize: "1.75rem", fontWeight: "800", marginBottom: "8px" }}>{stat.value}</p>
                        <span style={{ fontSize: "0.8rem", color: stat.trend.startsWith('+') ? 'var(--status-success)' : stat.trend.startsWith('-') ? 'var(--status-error)' : 'var(--text-secondary)' }}>
                            {stat.trend} vs last month
                        </span>
                    </div>
                ))}
            </div>

            {/* Charts Area (CSS-based Visuals) */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
                <div className="premium-card" style={{ height: "400px" }}>
                    <h3 style={{ marginBottom: "24px" }}>월간 매출 추이</h3>
                    <div style={{ height: "250px", display: "flex", alignItems: "flex-end", gap: "12px", padding: "20px 0" }}>
                        {[40, 65, 50, 85, 70, 95, 100].map((height, i) => (
                            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                                <div style={{
                                    width: "100%",
                                    height: `${height}%`,
                                    background: i === 6 ? 'var(--brand-primary)' : 'rgba(255,107,0,0.3)',
                                    borderRadius: "4px 4px 0 0",
                                    transition: "height 1s ease-out"
                                }}></div>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{i + 1}월</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="premium-card">
                    <h3 style={{ marginBottom: "24px" }}>회원 구성비</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {[
                            { label: "Standard", p: 65, color: "#999" },
                            { label: "Premium", p: 25, color: "var(--brand-primary)" },
                            { label: "VIP", p: 10, color: "#FFD700" }
                        ].map((item, idx) => (
                            <div key={idx}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.85rem" }}>
                                    <span>{item.label}</span>
                                    <span>{item.p}%</span>
                                </div>
                                <div style={{ height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", overflow: "hidden" }}>
                                    <div style={{ width: `${item.p}%`, height: "100%", background: item.color }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
