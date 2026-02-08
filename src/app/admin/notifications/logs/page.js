"use client";
import { useState, useEffect } from "react";

export default function NotificationLogsPage() {
    const logs = [
        { id: 1, recipient: "김철수", type: "AlimTalk", status: "Sent", time: "2026-02-08 18:30" },
        { id: 2, recipient: "이영희", type: "SMS", status: "Fail", time: "2026-02-08 18:25" },
        { id: 3, recipient: "박지성", type: "Push", status: "Sent", time: "2026-02-08 18:20" }
    ];

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>발송 로그</h1>
                <p style={{ color: "var(--text-secondary)" }}>사용자에게 발송된 모든 알림의 기록입니다.</p>
            </header>

            <div className="premium-card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>시간</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>수신자</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>채널</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>상태</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                <td style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>{log.time}</td>
                                <td style={{ padding: "16px 24px", fontWeight: "600" }}>{log.recipient}</td>
                                <td style={{ padding: "16px 24px" }}>{log.type}</td>
                                <td style={{ padding: "16px 24px" }}>
                                    <span className={`badge ${log.status === 'Sent' ? 'badge-success' : 'badge-error'}`}>{log.status}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
