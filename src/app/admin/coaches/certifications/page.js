"use client";
import { useState, useEffect } from "react";

export default function CoachCertificationsPage() {
    const certs = [
        { id: 1, coach: "김로잉", certName: "Indoor Rowing Instructor L2", issueDate: "2025-01-10", status: "Verified" },
        { id: 2, coach: "이페달", certName: "Wattbike Professional Coach", issueDate: "2024-11-20", status: "Verified" },
        { id: 3, coach: "박유연", certName: "Pilates Reformer L3", issueDate: "2025-02-01", status: "Pending" }
    ];

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>코치 자격 검증</h1>
                    <p style={{ color: "var(--text-secondary)" }}>코치진의 전문 자격증 및 인증 내역을 관리합니다.</p>
                </div>
                <button className="btn-primary">+ 자격증 등록</button>
            </header>

            <div className="premium-card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>코치</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>자격증명</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>취득일</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>상태</th>
                        </tr>
                    </thead>
                    <tbody>
                        {certs.map(c => (
                            <tr key={c.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                <td style={{ padding: "16px 24px" }}>{c.coach}</td>
                                <td style={{ padding: "16px 24px", fontWeight: "600" }}>{c.certName}</td>
                                <td style={{ padding: "16px 24px" }}>{c.issueDate}</td>
                                <td style={{ padding: "16px 24px" }}>
                                    <span className={`badge ${c.status === 'Verified' ? 'badge-success' : 'badge-warning'}`}>
                                        {c.status === 'Verified' ? '인증완료' : '검토중'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
