"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AuditLogsPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        // Using a mock or real audit log table if available
        const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50);
        if (data) setLogs(data);
        else {
            setLogs([
                { id: 1, user: "admin@bcl.com", action: "DELETE_MEMBER", detail: "회원 ID: 125 삭제", ip: "125.1.2.3", created_at: new Date().toISOString() },
                { id: 2, user: "coach@bcl.com", action: "UPDATE_SESSION", detail: "로잉 베이직 10:00 -> 11:00 변경", ip: "211.5.5.5", created_at: new Date(Date.now() - 3600000).toISOString() },
                { id: 3, user: "admin@bcl.com", action: "UPDATE_SETTINGS", detail: "지점 운영 시간 변경", ip: "125.1.2.3", created_at: new Date(Date.now() - 7200000).toISOString() }
            ]);
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>시스템 감사 로그</h1>
                <p style={{ color: "var(--text-secondary)" }}>관리자 및 시스템에 의해 수행된 모든 주요 변경 이력을 추적합니다.</p>
            </header>

            <div className="premium-card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>시간</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>작업자</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>액션</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>상세 내용</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>IP 주소</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => (
                            <tr key={log.id} style={{ borderBottom: "1px solid var(--border-subtle)" }} className="hover-row">
                                <td style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                                    {new Date(log.created_at).toLocaleString()}
                                </td>
                                <td style={{ padding: "16px 24px", fontWeight: "600" }}>{log.user}</td>
                                <td style={{ padding: "16px 24px" }}>
                                    <span style={{ fontSize: "0.75rem", background: "rgba(255,107,0,0.1)", color: "var(--brand-primary)", padding: "4px 8px", borderRadius: "4px" }}>
                                        {log.action}
                                    </span>
                                </td>
                                <td style={{ padding: "16px 24px" }}>{log.detail}</td>
                                <td style={{ padding: "16px 24px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>{log.ip}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
