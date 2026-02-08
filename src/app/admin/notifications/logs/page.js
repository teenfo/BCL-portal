"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function NotificationLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        const { data } = await supabase.from("notification_logs").select("*").order("sent_at", { ascending: false }).limit(50);
        if (data) setLogs(data);
        else {
            setLogs([
                { id: 1, recipient: "김태희", type: "SMS", status: "Success", template: "예약 확정", sent_at: new Date().toISOString() },
                { id: 2, recipient: "이효리", type: "Push", status: "Success", template: "웰컴 메시지", sent_at: new Date(Date.now() - 3600000).toISOString() },
                { id: 3, recipient: "박서준", type: "SMS", status: "Failed", template: "결제 실패 알림", sent_at: new Date(Date.now() - 7200000).toISOString() }
            ]);
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>알림 발송 로그</h1>
                <p style={{ color: "var(--text-secondary)" }}>회원에게 발송된 모든 알림의 기록과 도달 상태를 확인합니다.</p>
            </header>

            <div className="premium-card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>발송 일시</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>수신자</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>유형</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>템플릿</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>상태</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{ padding: "40px", textAlign: "center" }}>로딩 중...</td></tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                    <td style={{ padding: "16px 24px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                                        {new Date(log.sent_at).toLocaleString()}
                                    </td>
                                    <td style={{ padding: "16px 24px", fontWeight: "600" }}>{log.recipient}</td>
                                    <td style={{ padding: "16px 24px" }}>{log.type}</td>
                                    <td style={{ padding: "16px 24px", fontSize: "0.9rem" }}>{log.template}</td>
                                    <td style={{ padding: "16px 24px" }}>
                                        <span style={{
                                            fontSize: "0.75rem",
                                            padding: "4px 8px",
                                            borderRadius: "4px",
                                            background: log.status === 'Success' ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)',
                                            color: log.status === 'Success' ? '#2ecc71' : '#e74c3c'
                                        }}>
                                            {log.status === 'Success' ? '발송 완료' : '실패'}
                                        </span>
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
