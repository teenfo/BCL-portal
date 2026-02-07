"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function MemberManagement() {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("All");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        fetchMembers();
    }, [page, filterStatus]);

    // Debounce search term to avoid excessive API calls
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1); // Reset to page 1 on search
            fetchMembers();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchMembers = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("members")
                .select("*", { count: "exact" });

            if (filterStatus !== "All") {
                query = query.eq("status", filterStatus);
            }

            if (searchTerm) {
                query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
            }

            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            const { data, error, count } = await query
                .order("created_at", { ascending: false })
                .range(from, to);

            if (error) throw error;

            setMembers(data || []);
            setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
        } catch (error) {
            console.error("Error fetching members:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>회원 관리</h1>
                    <p style={{ color: "var(--text-secondary)" }}>총 {members.length}명의 회원이 검색되었습니다.</p>
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <select
                        value={filterStatus}
                        onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                        style={{
                            padding: "10px 16px",
                            borderRadius: "8px",
                            border: "1px solid var(--border-subtle)",
                            background: "var(--bg-tertiary)",
                            color: "white",
                            outline: "none",
                            cursor: "pointer"
                        }}
                    >
                        <option value="All">전체 상태</option>
                        <option value="Active">활성 (Active)</option>
                        <option value="Inactive">비활성 (Inactive)</option>
                        <option value="Pending">대기 (Pending)</option>
                    </select>

                    <input
                        type="text"
                        placeholder="이름 또는 이메일 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
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
                    <button className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>➕</span> 회원 등록
                    </button>
                </div>
            </header>

            <div className="premium-card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>회원 정보</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>이메일 / 연락처</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>가입일</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>상태</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "right" }}>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{ padding: "60px", textAlign: "center", color: "var(--text-secondary)" }}>데이터를 불러오는 중입니다...</td></tr>
                        ) : members.length === 0 ? (
                            <tr><td colSpan="5" style={{ padding: "60px", textAlign: "center", color: "var(--text-secondary)" }}>검색 결과가 없습니다.</td></tr>
                        ) : (
                            members.map((member) => (
                                <tr key={member.id} style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background 0.2s" }} className="hover-row">
                                    <td style={{ padding: "16px 24px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                            <div style={{
                                                width: "40px", height: "40px", borderRadius: "50%",
                                                background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)",
                                                display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center",
                                                fontSize: "1.2rem"
                                            }}>
                                                {member.avatar_url ? <img src={member.avatar_url} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%" }} /> : "👤"}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: "600", color: "white" }}>{member.name || "이름 없음"}</div>
                                                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>ID: {member.id.substring(0, 8)}...</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: "16px 24px" }}>
                                        <div style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>{member.email || "-"}</div>
                                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{member.phone || "연락처 없음"}</div>
                                    </td>
                                    <td style={{ padding: "16px 24px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                                        {new Date(member.created_at).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: "16px 24px" }}>
                                        <span className={`badge ${member.status === 'Active' ? 'badge-success' : member.status === 'Pending' ? 'badge-warning' : 'badge-secondary'}`}>
                                            {member.status || 'Unknown'}
                                        </span>
                                    </td>
                                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                                        <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>상세보기</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 0 && (
                    <div style={{ padding: "16px 24px", display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", borderTop: "1px solid var(--border-subtle)" }}>
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="btn-secondary"
                            style={{ padding: "8px 16px", opacity: page === 1 ? 0.5 : 1 }}
                        >
                            이전
                        </button>
                        <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                            Page {page} of {totalPages}
                        </span>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            className="btn-secondary"
                            style={{ padding: "8px 16px", opacity: page === totalPages ? 0.5 : 1 }}
                        >
                            다음
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
