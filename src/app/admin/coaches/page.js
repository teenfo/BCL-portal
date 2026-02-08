"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function CoachManagement() {
    const [coaches, setCoaches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({ total: 0, active: 0, specialties: 0 });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newCoach, setNewCoach] = useState({ name: "", specialty: "", bio: "", status: "Active" });

    useEffect(() => {
        fetchCoaches();
    }, []);

    const fetchCoaches = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("coaches")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setCoaches(data || []);

            // Calculate Summary
            const active = data.filter(c => c.status === 'Active').length;
            const uniqueSpecialties = new Set(data.map(c => c.specialty)).size;
            setSummary({ total: data.length, active, specialties: uniqueSpecialties });

        } catch (err) {
            console.error("Coach fetch failed:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCoach = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from("coaches").insert([newCoach]);
        if (!error) {
            setIsModalOpen(false);
            fetchCoaches();
            setNewCoach({ name: "", specialty: "", bio: "", status: "Active" });
        } else {
            alert("Error creating coach: " + error.message);
        }
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                    <div>
                        <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>코치 관리</h1>
                        <p style={{ color: "var(--text-secondary)" }}>전문 코치진 프로필 및 활동 정보를 관리합니다.</p>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>➕</span> 코치 신규 등록
                    </button>
                </div>

                {/* Summary Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
                    {[
                        { label: "전체 코치", value: summary.total, icon: "🏃", color: "var(--brand-primary)" },
                        { label: "활동 중", value: summary.active, icon: "✅", color: "#10B981" },
                        { label: "전문 분야", value: `${summary.specialties}종`, icon: "🏅", color: "#4F46E5" }
                    ].map(s => (
                        <div key={s.label} className="premium-card" style={{ padding: "20px", borderLeft: `4px solid ${s.color}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "4px" }}>{s.label}</p>
                                    <p style={{ fontSize: "1.5rem", fontWeight: "700" }}>{s.value}</p>
                                </div>
                                <span style={{ fontSize: "1.5rem" }}>{s.icon}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
                {loading ? (
                    <div style={{ gridColumn: "1/-1", padding: "60px", textAlign: "center" }} className="animate-pulse">데이터 로딩 중...</div>
                ) : coaches.length === 0 ? (
                    <div className="premium-card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "48px" }}>
                        <p style={{ color: "var(--text-secondary)" }}>등록된 코치가 없습니다.</p>
                    </div>
                ) : (
                    coaches.map((coach) => (
                        <div key={coach.id} className="premium-card hover-lift" style={{ display: "flex", flexDirection: "column", padding: "24px" }}>
                            <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
                                <div style={{
                                    width: "72px",
                                    height: "72px",
                                    borderRadius: "16px",
                                    background: "var(--bg-tertiary)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "1.8rem",
                                    border: "1px solid var(--border-subtle)"
                                }}>
                                    {coach.image_url ? <img src={coach.image_url} alt={coach.name} style={{ width: "100%", height: "100%", borderRadius: "16px", objectFit: "cover" }} /> : "👤"}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                        <h3 style={{ fontSize: "1.15rem", fontWeight: "700" }}>{coach.name}</h3>
                                        <span className={`badge ${coach.status === 'Active' ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: "0.7rem" }}>
                                            {coach.status === 'Active' ? '재직' : '비활성'}
                                        </span>
                                    </div>
                                    <p style={{ color: "var(--brand-primary)", fontSize: "0.85rem", fontWeight: "600", marginTop: "4px" }}>{coach.specialty}</p>
                                    <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                                        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>📅 {new Date(coach.created_at).toLocaleDateString()} 가입</span>
                                    </div>
                                </div>
                            </div>

                            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "24px", minHeight: "3.6em", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: "1.8" }}>
                                {coach.bio || "소개글이 작성되지 않은 코치입니다."}
                            </p>

                            <div style={{ display: "flex", gap: "12px", marginTop: "auto" }}>
                                <button
                                    onClick={() => window.location.href = `/admin/coaches/${coach.id}`}
                                    className="btn-secondary"
                                    style={{ flex: 1, fontSize: "0.85rem", fontWeight: "600" }}
                                >
                                    상세 프로필
                                </button>
                                <button
                                    onClick={() => window.location.href = `/admin/sessions/schedule?coach=${coach.id}`}
                                    className="btn-secondary"
                                    style={{ flex: 1, fontSize: "0.85rem", fontWeight: "600" }}
                                >
                                    스케줄 확인
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Coach Modal */}
            {isModalOpen && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
                    <div className="premium-card animate-scale-in" style={{ width: "450px", padding: "32px", background: "var(--bg-secondary)", borderRadius: "20px", border: "1px solid var(--border-subtle)" }}>
                        <h2 style={{ marginBottom: "24px", fontSize: "1.5rem" }}>신규 코치 등록</h2>
                        <form onSubmit={handleCreateCoach} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            <div>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", fontWeight: "600" }}>코치 성함</label>
                                <input type="text" required value={newCoach.name} onChange={e => setNewCoach({ ...newCoach, name: e.target.value })} placeholder="성함을 입력하세요"
                                    style={inputStyle} />
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", fontWeight: "600" }}>전문 분야</label>
                                <input type="text" required value={newCoach.specialty} onChange={e => setNewCoach({ ...newCoach, specialty: e.target.value })} placeholder="예: HIIT, 요가, 필라테스"
                                    style={inputStyle} />
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", fontWeight: "600" }}>프로필 소개</label>
                                <textarea value={newCoach.bio} onChange={e => setNewCoach({ ...newCoach, bio: e.target.value })} rows="4" placeholder="코치의 약력이나 스타일을 소개하세요"
                                    style={inputStyle}></textarea>
                            </div>
                            <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary" style={{ flex: 1 }}>취소</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>최종 등록</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "8px",
    border: "1px solid var(--border-subtle)",
    background: "var(--bg-tertiary)",
    color: "white",
    outline: "none",
    fontSize: "0.95rem"
};
