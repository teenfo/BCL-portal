"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function ErrorLogsPage() {
    const [errors, setErrors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock errors for now
        setErrors([
            { id: 1, type: "AuthError", message: "Invalid login attempt", user: "user_123", created_at: new Date().toISOString() },
            { id: 2, type: "DatabaseError", message: "Timeout during RLS check", user: "system", created_at: new Date(Date.now() - 3600000).toISOString() },
            { id: 3, type: "APIError", message: "Rate limit exceeded for /apps/dashboard", user: "user_456", created_at: new Date(Date.now() - 7200000).toISOString() }
        ]);
        setLoading(false);
    }, []);

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>시스템 에러 로그</h1>
                <p style={{ color: "var(--text-secondary)" }}>애플리케이션 및 인프라에서 발생한 에러를 추적합니다.</p>
            </header>

            <div className="premium-card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>시간</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>유형</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>메시지</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>대상</th>
                        </tr>
                    </thead>
                    <tbody>
                        {errors.map(err => (
                            <tr key={err.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                <td style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                                    {new Date(err.created_at).toLocaleString()}
                                </td>
                                <td style={{ padding: "16px 24px" }}>
                                    <span className="badge badge-error">{err.type}</span>
                                </td>
                                <td style={{ padding: "16px 24px", fontWeight: "500" }}>{err.message}</td>
                                <td style={{ padding: "16px 24px", fontSize: "0.85rem" }}>{err.user}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
