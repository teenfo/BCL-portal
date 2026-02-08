"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function HistoricalAttendance() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({ today: 0, peakHour: "19:00" });

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("checkins")
                .select("*, member_id, member_name")
                .order("time", { ascending: false })
                .limit(100);

            if (error) throw error;
            setLogs(data || []);

            // Quick summary logic
            const todayCount = data.filter(l => new Date(l.time).toDateString() === new Date().toDateString()).length;
            setSummary({ today: todayCount, peakHour: "19:00" });
        } catch (err) {
            console.error("Attendance log fetch failed:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px" }}>
                    <div>
                        <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>센터 이용 로그</h1>
                        <p style={{ color: "var(--text-secondary)" }}>지점별 체크인 및 수업 출석 이력을 실시간으로 모니터링합니다.</p>
                    </div>
                    <div style={{ display: "flex", gap: "12px" }}>
                        <button onClick={fetchHistory} className="btn-secondary" style={{ padding: "10px 16px" }}>🔄 새로고침</button>
                        <button className="btn-secondary" style={{ padding: "10px 16px" }}>📥 엑셀 다운로드</button>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                    <div className="premium-card" style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>오늘 전체 입장</p>
                            <p style={{ fontSize: "1.5rem", fontWeight: "700" }}>{summary.today}건</p>
                        </div>
                        <span style={{ fontSize: "1.5rem" }}>🎯</span>
                    </div>
                    <div className="premium-card" style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>실시간 혼잡도</p>
                            <p style={{ fontSize: "1.5rem", fontWeight: "700" }}>보통</p>
                        </div>
                        <span style={{ fontSize: "1.5rem" }}>📉</span>
                    </div>
                </div>
            </header>

            <div className="premium-card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                                <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>입장 일시</th>
                                <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>회원 정보</th>
                                <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>방문 지점</th>
                                <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>상태</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="4" style={{ padding: "60px", textAlign: "center" }} className="animate-pulse">데이터 로드 중...</td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan="4" style={{ padding: "60px", textAlign: "center", color: "var(--text-secondary)" }}>표시할 로그가 없습니다.</td></tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                        <td style={{ padding: "16px 24px" }}>
                                            <div style={{ fontSize: "0.9rem", color: "white" }}>{new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{new Date(log.time).toLocaleDateString()}</div>
                                        </td>
                                        <td style={{ padding: "16px 24px" }}>
                                            <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>{log.member_name || '이름 없음'}</div>
                                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>ID: {log.member_id?.split('-')[0]}</div>
                                        </td>
                                        <td style={{ padding: "16px 24px" }}>
                                            <span style={{ fontSize: "0.85rem", padding: "4px 8px", borderRadius: "6px", background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)" }}>
                                                {log.facility || '기본 지점'}
                                            </span>
                                        </td>
                                        <td style={{ padding: "16px 24px" }}>
                                            <span className="badge badge-success" style={{ fontSize: "0.7rem", padding: "4px 10px" }}>
                                                {log.status || '정상'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
