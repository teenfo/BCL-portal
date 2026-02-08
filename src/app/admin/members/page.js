"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";

export default function MemberManagement() {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("All");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [summary, setSummary] = useState({ total: 0, active: 0, newThisMonth: 0 });
    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        fetchMembers();
        fetchSummary();
    }, [page, filterStatus]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            fetchMembers();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchSummary = async () => {
        try {
            const { data, error } = await supabase.from("members").select("status, created_at");
            if (error) throw error;

            const total = data.length;
            const active = data.filter(m => m.status === 'Active').length;
            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const newThisMonth = data.filter(m => new Date(m.created_at) >= firstDayOfMonth).length;

            setSummary({ total, active, newThisMonth });
        } catch (err) {
            console.error("Summary fetch failed:", err);
        }
    };

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

    const toggleSelectAll = () => {
        if (selectedIds.size === members.length && members.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(members.map(m => m.id)));
        }
    };

    const toggleSelect = (id) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleExportCSV = () => {
        if (members.length === 0) return;
        const headers = ["ID", "Name", "Email", "Phone", "Status", "Plan", "Joined Date"];
        const rows = members.map(m => [m.id, m.name, m.email, m.phone, m.status, m.plan, m.created_at]);
        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(r => r.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `bcl_members_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                    <div>
                        <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>회원 관리</h1>
                        <p style={{ color: "var(--text-secondary)" }}>센터 회원의 전체 명단과 상세 이용 내역을 관리합니다.</p>
                    </div>
                    <button
                        onClick={() => window.location.href = '/admin/members/new'}
                        className="btn-primary"
                        style={{ display: "flex", alignItems: "center", gap: "8px" }}
                    >
                        <span>➕</span> 신규 회원 등록
                    </button>
                </div>

                {/* Summary Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
                    {[
                        { label: "전체 회원", value: summary.total, icon: "👥", color: "var(--brand-primary)" },
                        { label: "활성 회원", value: summary.active, icon: "✅", color: "#10B981" },
                        { label: "이번 달 신규", value: summary.newThisMonth, icon: "✨", color: "#4F46E5" }
                    ].map(s => (
                        <div key={s.label} className="premium-card" style={{ padding: "20px", borderLeft: `4px solid ${s.color}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "4px" }}>{s.label}</p>
                                    <p style={{ fontSize: "1.5rem", fontWeight: "700" }}>{s.value}명</p>
                                </div>
                                <span style={{ fontSize: "1.5rem" }}>{s.icon}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </header>

            <div className="premium-card" style={{ padding: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
                    <div style={{ display: "flex", gap: "12px" }}>
                        <select
                            value={filterStatus}
                            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                            style={{
                                padding: "10px 16px",
                                borderRadius: "8px",
                                border: "1px solid var(--border-subtle)",
                                background: "var(--bg-tertiary)",
                                color: "white",
                                cursor: "pointer"
                            }}
                        >
                            <option value="All">모든 상태</option>
                            <option value="Active">활성</option>
                            <option value="Inactive">비활성</option>
                            <option value="Pending">대기</option>
                        </select>
                        <button onClick={handleExportCSV} className="btn-secondary" style={{ fontSize: "0.9rem" }}>
                            📥 CSV 내보내기
                        </button>
                    </div>

                    <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }}>🔍</span>
                        <input
                            type="text"
                            placeholder="이름 또는 이메일 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                padding: "10px 16px 10px 36px",
                                borderRadius: "8px",
                                border: "1px solid var(--border-subtle)",
                                background: "var(--bg-tertiary)",
                                color: "white",
                                width: "280px",
                                outline: "none"
                            }}
                        />
                    </div>
                </div>

                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                <th style={{ padding: "16px 12px", width: "40px" }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size === members.length && members.length > 0}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th style={{ padding: "16px 12px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>회원</th>
                                <th style={{ padding: "16px 12px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>연락처</th>
                                <th style={{ padding: "16px 12px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>수강권</th>
                                <th style={{ padding: "16px 12px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>상태</th>
                                <th style={{ padding: "16px 12px", fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "right" }}>액션</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ padding: "60px", textAlign: "center" }} className="animate-pulse">로딩 중...</td></tr>
                            ) : (
                                members.map((member) => (
                                    <tr key={member.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                        <td style={{ padding: "16px 12px" }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(member.id)}
                                                onChange={() => toggleSelect(member.id)}
                                            />
                                        </td>
                                        <td style={{ padding: "16px 12px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>👤</div>
                                                <div>
                                                    <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>{member.name}</div>
                                                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>ID: {member.id.split('-')[0]}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: "16px 12px" }}>
                                            <div style={{ fontSize: "0.9rem" }}>{member.email}</div>
                                            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{member.phone || "연락처 미등록"}</div>
                                        </td>
                                        <td style={{ padding: "16px 12px" }}>
                                            <div style={{ fontSize: "0.9rem" }}>{member.plan || "플랜 없음"}</div>
                                            <div style={{ fontSize: "0.8rem", color: "var(--brand-primary)" }}>{member.credits || 0}회 남음</div>
                                        </td>
                                        <td style={{ padding: "16px 12px" }}>
                                            <span className={`badge ${member.status === 'Active' ? 'badge-success' : 'badge-secondary'}`}>
                                                {member.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: "16px 12px", textAlign: "right" }}>
                                            <button
                                                onClick={() => window.location.href = `/admin/members/${member.id}`}
                                                className="btn-secondary"
                                                style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                                            >
                                                상세보기
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && totalPages > 1 && (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "16px", marginTop: "32px" }}>
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary" style={{ padding: "6px 12px", opacity: page === 1 ? 0.5 : 1 }}>이전</button>
                        <span style={{ fontSize: "0.9rem" }}>{page} / {totalPages}</span>
                        <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary" style={{ padding: "6px 12px", opacity: page === totalPages ? 0.5 : 1 }}>다음</button>
                    </div>
                )}
            </div>

            {/* Floating Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div style={{
                    position: "fixed",
                    bottom: "40px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--brand-primary)",
                    borderRadius: "12px",
                    padding: "16px 32px",
                    display: "flex",
                    alignItems: "center",
                    gap: "24px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                    zIndex: 1000,
                    animation: "slideUp 0.3s ease-out"
                }}>
                    <span style={{ fontSize: "0.95rem", fontWeight: "600" }}>{selectedIds.size}명 선택됨</span>
                    <div style={{ display: "flex", gap: "12px" }}>
                        <button className="btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>🔔 알림 발송</button>
                        <button className="btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>🔄 상태 일괄 변경</button>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.85rem" }}
                        >
                            취소
                        </button>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes slideUp {
                    from { transform: translate(-50%, 100%); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
