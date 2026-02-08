"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AccessControlPage() {
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState({ admin: 0, coach: 0, member: 0 });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [updatingUserId, setUpdatingUserId] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // In a real scenario, we might need an edge function or a specific table 
            // but for this implementation we will use a dedicated RPC or direct query if permissions allow.
            // Since we are in an admin context, we fetch from public.profiles or similar if exists,
            // or use a custom RPC to list users if we have one.
            // For now, we will use a fallback logic or assume a 'profiles' view exists.
            const { data, error } = await supabase.from("profiles").select("*");

            if (error) {
                console.error("Error fetching users:", error);
                // Fallback: Try to use a custom RPC or mock if table is missing
            } else {
                setUsers(data);
                calculateStats(data);
            }
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const calculateStats = (userData) => {
        const counts = { admin: 0, coach: 0, member: 0 };
        userData.forEach(u => {
            const role = u.role || 'member';
            if (counts[role] !== undefined) counts[role]++;
            else counts.member++;
        });
        setStats(counts);
    };

    const handleRoleUpdate = async (userId, newRole) => {
        setUpdatingUserId(userId);
        try {
            const { data, error } = await supabase.rpc('update_user_role', {
                user_id: userId,
                new_role: newRole
            });

            if (error) throw error;

            // Update local state
            const updatedUsers = users.map(u =>
                u.id === userId ? { ...u, role: newRole } : u
            );
            setUsers(updatedUsers);
            calculateStats(updatedUsers);
            alert("역할이 성공적으로 변경되었습니다.");
        } catch (error) {
            alert(`에러 발생: ${error.message}`);
        }
        setUpdatingUserId(null);
    };

    const filteredUsers = users.filter(u =>
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>권한 및 접근 제어</h1>
                <p style={{ color: "var(--text-secondary)" }}>사용자 역할별 접근 권한을 관리하고 부여합니다.</p>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "24px", marginBottom: "40px" }}>
                {[
                    { label: "Admin", count: stats.admin, color: "var(--brand-primary)" },
                    { label: "Coach", count: stats.coach, color: "#4F46E5" },
                    { label: "Member", count: stats.member, color: "#10B981" }
                ].map((s) => (
                    <div key={s.label} className="premium-card" style={{ textAlign: "center", borderTop: `4px solid ${s.color}` }}>
                        <h3 style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "8px" }}>{s.label}</h3>
                        <p style={{ fontSize: "2rem", fontWeight: "700" }}>{s.count}</p>
                    </div>
                ))}
            </div>

            <div className="premium-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", gap: "20px" }}>
                    <h3 style={{ margin: 0 }}>사용자 역할 관리</h3>
                    <input
                        type="text"
                        placeholder="이름 또는 이메일 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            padding: "8px 16px",
                            borderRadius: "8px",
                            border: "1px solid var(--border-subtle)",
                            background: "var(--bg-tertiary)",
                            color: "white",
                            width: "300px"
                        }}
                    />
                </div>

                {loading ? (
                    <div style={{ textAlign: "center", padding: "40px" }} className="animate-pulse">데이터 로딩 중...</div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border-subtle)" }}>
                                    <th style={{ padding: "12px" }}>이름</th>
                                    <th style={{ padding: "12px" }}>이메일</th>
                                    <th style={{ padding: "12px" }}>현재 역할</th>
                                    <th style={{ padding: "12px", textAlign: "right" }}>역할 변경</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(u => (
                                    <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                        <td style={{ padding: "12px" }}>{u.full_name || "N/A"}</td>
                                        <td style={{ padding: "12px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>{u.email}</td>
                                        <td style={{ padding: "12px" }}>
                                            <span className={`badge ${u.role === 'admin' ? 'badge-error' : u.role === 'coach' ? 'badge-primary' : 'badge-success'}`}>
                                                {u.role || 'member'}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px", textAlign: "right" }}>
                                            <select
                                                value={u.role || 'member'}
                                                onChange={(e) => handleRoleUpdate(u.id, e.target.value)}
                                                disabled={updatingUserId === u.id}
                                                style={{
                                                    padding: "6px 12px",
                                                    borderRadius: "6px",
                                                    background: "var(--bg-tertiary)",
                                                    color: "white",
                                                    border: "1px solid var(--border-subtle)",
                                                    fontSize: "0.85rem"
                                                }}
                                            >
                                                <option value="member">Member</option>
                                                <option value="coach">Coach</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan="4" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
                                            검색 결과가 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
