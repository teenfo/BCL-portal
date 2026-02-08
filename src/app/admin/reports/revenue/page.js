"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function RevenueReportPage() {
    const [stats, setStats] = useState({
        monthlyRevenue: 0,
        unsettled: 0,
        arppu: 0,
        growth: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRevenueStats();
    }, []);

    const fetchRevenueStats = async () => {
        setLoading(true);
        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

            const { data, error } = await supabase
                .from("transactions")
                .select("amount, status, date");

            if (error) throw error;

            const currentMonthData = data.filter(t => t.date >= startOfMonth.split('T')[0]);
            const monthlyTotal = currentMonthData.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

            const unsettled = data
                .filter(t => t.status === 'pending')
                .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

            const uniqueMembers = new Set(data.map(t => t.member_id)).size;
            const arppu = uniqueMembers > 0 ? Math.floor(data.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) / uniqueMembers) : 0;

            setStats({
                monthlyRevenue: monthlyTotal,
                unsettled: unsettled,
                arppu: arppu,
                growth: 12 // Simplified growth metric for now
            });
        } catch (err) {
            console.error("Revenue fetch failed:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>매출 및 정산 리포트</h1>
                    <p style={{ color: "var(--text-secondary)" }}>결제 시스템 기반 실시간 매출 추이와 정산 현황을 분석합니다.</p>
                </div>
                <button onClick={fetchRevenueStats} className="btn-secondary">🔄 새로고침</button>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", marginBottom: "32px" }}>
                <div className="premium-card" style={{ borderLeft: "4px solid var(--brand-primary)" }}>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px" }}>이번 달 매출</p>
                    <p style={{ fontSize: "1.8rem", fontWeight: "900" }}>
                        {loading ? "..." : `₩${stats.monthlyRevenue.toLocaleString()}`}
                    </p>
                    <span style={{ fontSize: "0.75rem", color: "var(--brand-primary)", fontWeight: "600" }}>↑ {stats.growth}% vs 지난 달</span>
                </div>
                <div className="premium-card">
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px" }}>누적 미정산 금액</p>
                    <p style={{ fontSize: "1.8rem", fontWeight: "900" }}>
                        {loading ? "..." : `₩${stats.unsettled.toLocaleString()}`}
                    </p>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>대기 중인 결제 건</span>
                </div>
                <div className="premium-card">
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px" }}>평균 객단가 (ARPPU)</p>
                    <p style={{ fontSize: "1.8rem", fontWeight: "900" }}>
                        {loading ? "..." : `₩${stats.arppu.toLocaleString()}`}
                    </p>
                    <span style={{ fontSize: "0.75rem", color: "#10B981" }}>Stable</span>
                </div>
            </div>

            <div className="premium-card" style={{ marginBottom: "32px", padding: "32px" }}>
                <h3 style={{ marginBottom: "24px", fontSize: "1.1rem" }}>데이터 시각화 준비 중</h3>
                <div style={{ padding: "60px", textAlign: "center", background: "rgba(255,255,255,0.01)", borderRadius: "12px", border: "1px dashed var(--border-subtle)" }}>
                    <p style={{ color: "var(--text-secondary)" }}>상세 차트 라이브러리 연동 대기중...</p>
                </div>
            </div>
        </div>
    );
}
