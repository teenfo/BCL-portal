"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function HistoricalAttendance() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({ start: "", end: "" });

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setLoading(true);
        const { data } = await supabase
            .from("checkins")
            .select("*, member:members(name)")
            .order("timestamp", { ascending: false })
            .limit(100);

        if (data) setLogs(data);
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>전체 출석 및 입장 로그</h1>
                    <p style={{ color: "var(--text-secondary)" }}>과거 모든 방문 및 수업 출석 이력을 조회하고 관리합니다.</p>
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                    <input type="date" className="input-field" style={{ padding: "8px", borderRadius: "4px", background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", color: "white" }} />
                    <button className="btn-secondary" style={{ padding: "8px 16px" }}>필터 적용</button>
                    <button className="btn-secondary" style={{ padding: "8px 16px" }}>엑셀 다운로드</button>
                </div>
            </header>

            <div className="premium-card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>입장 일시</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>회원명</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>체크인 방식</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>상태</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="4" style={{ padding: "40px", textAlign: "center" }}>로딩 중...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan="4" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>데이터가 없습니다.</td></tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                    <td style={{ padding: "16px 24px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td style={{ padding: "16px 24px", fontWeight: "600" }}>{log.member?.name || 'Unknown'}</td>
                                    <td style={{ padding: "16px 24px" }}>
                                        <span style={{ fontSize: "0.75rem", padding: "4px 8px", borderRadius: "4px", background: "rgba(255,255,255,0.05)" }}>
                                            {log.method || 'Kiosk QR'}
                                        </span>
                                    </td>
                                    <td style={{ padding: "16px 24px" }}>
                                        <span style={{ color: "var(--status-success)", fontSize: "0.85rem" }}>● 정상 입장</span>
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
