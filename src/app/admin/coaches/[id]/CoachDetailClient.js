"use client";
import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function CoachDetailClient({ params }) {
    const { id } = use(params);
    const [coach, setCoach] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const router = useRouter();

    useEffect(() => {
        if (id) fetchCoach();
    }, [id]);

    const fetchCoach = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("coaches")
                .select("*")
                .eq("id", id)
                .single();

            if (error) throw error;
            setCoach(data);
            setFormData(data);
        } catch (error) {
            console.error("Error fetching coach:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const { error } = await supabase
                .from("coaches")
                .update(formData)
                .eq("id", id);

            if (error) throw error;
            setCoach(formData);
            setEditing(false);
            alert("코치 정보가 수정되었습니다.");
        } catch (error) {
            alert("저장 중 오류가 발생했습니다.");
        }
    };

    if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>로딩 중...</div>;
    if (!coach) return <div style={{ padding: "40px", textAlign: "center" }}>코치를 찾을 수 없습니다.</div>;

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
                    <h1 style={{ fontSize: "1.75rem" }}>코치 상세 프로필</h1>
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2.5fr", gap: "24px" }}>
                {/* Profile Photo Card */}
                <div className="premium-card" style={{ textAlign: "center", padding: "40px 24px" }}>
                    <div style={{
                        width: "160px", height: "160px", borderRadius: "50%",
                        background: "var(--bg-tertiary)", border: "3px solid var(--brand-primary)",
                        margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "4rem", overflow: "hidden"
                    }}>
                        {coach.image_url ? <img src={coach.image_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
                    </div>
                    <h2 style={{ fontSize: "1.5rem", marginBottom: "4px" }}>{coach.name}</h2>
                    <p style={{ color: "var(--brand-primary)", fontWeight: "700", marginBottom: "20px" }}>{coach.specialty}</p>
                    <span className={`badge ${coach.status === 'Active' ? 'badge-success' : 'badge-secondary'}`}>
                        {coach.status === 'Active' ? '재직중' : '휴직/퇴사'}
                    </span>
                </div>

                {/* Detail Information */}
                <div className="premium-card" style={{ padding: "32px" }}>
                    <h3 style={{ fontSize: "1.2rem", marginBottom: "24px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>상세 정보</h3>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px" }}>코치 성명</label>
                            {editing ? (
                                <input
                                    className="input-field"
                                    value={formData.name || ""}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            ) : (
                                <p style={{ fontSize: "1.1rem", fontWeight: "600" }}>{coach.name || "-"}</p>
                            )}
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px" }}>전문 분야</label>
                            {editing ? (
                                <input
                                    className="input-field"
                                    value={formData.specialty || ""}
                                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                                />
                            ) : (
                                <p style={{ fontSize: "1.1rem", fontWeight: "600" }}>{coach.specialty || "-"}</p>
                            )}
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px" }}>소개 (Bio)</label>
                            {editing ? (
                                <textarea
                                    className="input-field"
                                    rows="5"
                                    value={formData.bio || ""}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                />
                            ) : (
                                <p style={{ fontSize: "1rem", lineHeight: "1.6", color: "var(--text-primary)" }}>{coach.bio || "소개글이 등록되지 않았습니다."}</p>
                            )}
                        </div>
                    </div>

                    <h3 style={{ fontSize: "1.2rem", marginTop: "40px", marginBottom: "24px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>운영 지표 (최근 30일)</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                        <div style={{ background: "rgba(255,255,255,0.03)", padding: "20px", borderRadius: "16px", textAlign: "center" }}>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "8px" }}>배정 세션</p>
                            <p style={{ fontSize: "1.75rem", fontWeight: "800" }}>42회</p>
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.03)", padding: "20px", borderRadius: "16px", textAlign: "center" }}>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "8px" }}>평균 출석률</p>
                            <p style={{ fontSize: "1.75rem", fontWeight: "800", color: "var(--brand-primary)" }}>92%</p>
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.03)", padding: "20px", borderRadius: "16px", textAlign: "center" }}>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "8px" }}>회원 만족도</p>
                            <p style={{ fontSize: "1.75rem", fontWeight: "800", color: "#FFD700" }}>4.9/5</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
