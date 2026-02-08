"use client";
import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function MemberDetailClient({ params }) {
    const { id } = use(params);
    const [member, setMember] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const router = useRouter();

    useEffect(() => {
        if (id) fetchMember();
    }, [id]);

    const fetchMember = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("members")
                .select("*")
                .eq("id", id)
                .single();

            if (error) throw error;
            setMember(data);
            setFormData(data);
        } catch (error) {
            console.error("Error fetching member:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const { error } = await supabase
                .from("members")
                .update(formData)
                .eq("id", id);

            if (error) throw error;
            setMember(formData);
            setEditing(false);
            alert("회원 정보가 수정되었습니다.");
        } catch (error) {
            alert("저장 중 오류가 발생했습니다.");
        }
    };

    if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>로딩 중...</div>;
    if (!member) return <div style={{ padding: "40px", textAlign: "center" }}>회원을 찾을 수 없습니다.</div>;

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <button
                        onClick={() => router.back()}
                        style={{ background: "none", border: "none", color: "var(--brand-primary)", cursor: "pointer", marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px" }}
                    >
                        ← 목록으로 돌아가기
                    </button>
                    <h1 style={{ fontSize: "1.75rem" }}>회원 상세 정보</h1>
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                    {editing ? (
                        <>
                            <button className="btn-secondary" onClick={() => setEditing(false)}>취소</button>
                            <button className="btn-primary" onClick={handleSave}>변경사항 저장</button>
                        </>
                    ) : (
                        <button className="btn-primary" onClick={() => setEditing(true)}>정보 수정</button>
                    )}
                </div>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
                {/* Profile Card */}
                <div className="premium-card" style={{ textAlign: "center", padding: "40px 24px" }}>
                    <div style={{
                        width: "120px", height: "120px", borderRadius: "50%",
                        background: "var(--bg-tertiary)", border: "2px solid var(--brand-primary)",
                        margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "3rem", overflow: "hidden"
                    }}>
                        {member.avatar_url ? <img src={member.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
                    </div>
                    <h2 style={{ fontSize: "1.5rem", marginBottom: "4px" }}>{member.name}</h2>
                    <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>{member.email}</p>
                    <span className={`badge ${member.status === 'Active' ? 'badge-success' : 'badge-secondary'}`}>
                        {member.status}
                    </span>
                </div>

                {/* Info Tabs/Grid */}
                <div className="premium-card" style={{ padding: "32px" }}>
                    <h3 style={{ fontSize: "1.2rem", marginBottom: "24px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>기본 정보</h3>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px" }}>이름</label>
                            {editing ? (
                                <input
                                    className="input-field"
                                    value={formData.name || ""}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            ) : (
                                <p style={{ fontSize: "1.1rem" }}>{member.name || "-"}</p>
                            )}
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px" }}>연락처</label>
                            {editing ? (
                                <input
                                    className="input-field"
                                    value={formData.phone || ""}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            ) : (
                                <p style={{ fontSize: "1.1rem" }}>{member.phone || "-"}</p>
                            )}
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px" }}>멤버십 종류</label>
                            {editing ? (
                                <select
                                    className="input-field"
                                    value={formData.membership_type || ""}
                                    onChange={(e) => setFormData({ ...formData, membership_type: e.target.value })}
                                >
                                    <option value="Standard">Standard</option>
                                    <option value="Premium">Premium</option>
                                    <option value="VIP">VIP</option>
                                </select>
                            ) : (
                                <p style={{ fontSize: "1.1rem" }}>{member.membership_type || "-"}</p>
                            )}
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px" }}>잔여 횟수</label>
                            {editing ? (
                                <input
                                    type="number"
                                    className="input-field"
                                    value={formData.remaining_sessions || 0}
                                    onChange={(e) => setFormData({ ...formData, remaining_sessions: parseInt(e.target.value) })}
                                />
                            ) : (
                                <p style={{ fontSize: "1.1rem" }}>{member.remaining_sessions || 0}회</p>
                            )}
                        </div>
                    </div>

                    <h3 style={{ fontSize: "1.2rem", marginTop: "40px", marginBottom: "24px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>활동 요약</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                        <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "12px", textAlign: "center" }}>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>총 출석</p>
                            <p style={{ fontSize: "1.5rem", fontWeight: "700" }}>24회</p>
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "12px", textAlign: "center" }}>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>이번 달</p>
                            <p style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--brand-primary)" }}>8회</p>
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "12px", textAlign: "center" }}>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>노쇼(No-show)</p>
                            <p style={{ fontSize: "1.5rem", fontWeight: "700", color: "#FF4D4D" }}>1회</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
