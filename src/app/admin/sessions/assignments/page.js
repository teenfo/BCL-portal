"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function SessionAssignmentsPage() {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAssignments();
    }, []);

    const fetchAssignments = async () => {
        setLoading(true);
        // Mocking for now as assignments table might not exist in SSOT but is in sitemap
        setAssignments([
            { id: 1, session: "로잉 베이직 (월 10:00)", coach: "김로잉", status: "Confirmed" },
            { id: 2, session: "와트바이크 인터벌 (화 19:00)", coach: "이페달", status: "Pending" },
            { id: 3, session: "코어 스트레칭 (수 09:00)", coach: "박유연", status: "Confirmed" }
        ]);
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>수업 담당 배정</h1>
                    <p style={{ color: "var(--text-secondary)" }}>각 세션에 담당 코치를 배정하고 상태를 관리합니다.</p>
                </div>
                <button className="btn-primary">배정 추가</button>
            </header>

            <div className="premium-card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>수업명</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>담당 코치</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>상태</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="4" style={{ padding: "40px", textAlign: "center" }}>로딩 중...</td></tr>
                        ) : (
                            assignments.map((a) => (
                                <tr key={a.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                    <td style={{ padding: "16px 24px", fontWeight: "600" }}>{a.session}</td>
                                    <td style={{ padding: "16px 24px" }}>{a.coach}</td>
                                    <td style={{ padding: "16px 24px" }}>
                                        <span className={`badge ${a.status === 'Confirmed' ? 'badge-success' : 'badge-warning'}`}>
                                            {a.status === 'Confirmed' ? '확정' : '대기'}
                                        </span>
                                    </td>
                                    <td style={{ padding: "16px 24px" }}>
                                        <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>변경</button>
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
