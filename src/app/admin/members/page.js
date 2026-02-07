"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function MemberManagement() {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        setLoading(true);
        const { data, error } = await supabase.from("members").select("*").order("created_at", { ascending: false });
        if (!error) setMembers(data);
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>회원 관리</h1>
                    <p style={{ color: "var(--text-secondary)" }}>가입된 회원 프로필 및 이용 현황을 관리합니다.</p>
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                    <input
                        type="text"
                        placeholder="회원 이름 또는 이메일 검색"
                        style={{
                            padding: "10px 16px",
                            borderRadius: "8px",
                            border: "1px solid var(--border-subtle)",
                            background: "var(--bg-tertiary)",
                            color: "white",
                            width: "240px",
                            outline: "none"
                        }}
                    />
                    <button className="btn-primary">검색</button>
                </div>
            </header>

            <div className="premium-card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>회원</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>이메일</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>가입일</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>상태</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>로딩 중...</td></tr>
                        ) : members.length === 0 ? (
                            <tr><td colSpan="5" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>회원이 없습니다.</td></tr>
                        ) : (
                            members.map((member) => (
                                <tr key={member.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                    <td style={{ padding: "16px 24px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyItems: "center", fontSize: "0.8rem" }}>
                                                {"👤"}
                                            </div>
                                            <span style={{ fontWeight: "500" }}>{member.name || "이름 없음"}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: "16px 24px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>{member.email || "정보 없음"}</td>
                                    <td style={{ padding: "16px 24px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                                        {new Date(member.created_at).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: "16px 24px" }}>
                                        <span className={`badge ${member.status === 'Active' ? 'badge-success' : 'badge-secondary'}`}>{member.status}</span>
                                    </td>
                                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                                        <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>관리</button>
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
