"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function CoachManagement() {
    const [coaches, setCoaches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newCoach, setNewCoach] = useState({
        name: "",
        specialty: "",
        bio: "",
        status: "Active"
    });

    useEffect(() => {
        fetchCoaches();
    }, []);

    const fetchCoaches = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("coaches")
            .select("*")
            .order("created_at", { ascending: false });
        if (!error) setCoaches(data || []);
        setLoading(false);
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
            <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>코치 관리</h1>
                    <p style={{ color: "var(--text-secondary)" }}>전문 코치진 프로필 및 활동 정보를 관리합니다.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="btn-primary">+ 코치 등록</button>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px" }}>
                {loading ? (
                    <p style={{ color: "var(--text-secondary)" }}>로딩 중...</p>
                ) : coaches.length === 0 ? (
                    <div className="premium-card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "48px" }}>
                        <p style={{ color: "var(--text-secondary)" }}>등록된 코치가 없습니다.</p>
                    </div>
                ) : (
                    coaches.map((coach) => (
                        <div key={coach.id} className="premium-card" style={{ display: "flex", flexDirection: "column" }}>
                            <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
                                <div style={{
                                    width: "64px",
                                    height: "64px",
                                    borderRadius: "50%",
                                    background: "var(--bg-tertiary)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "1.5rem",
                                    border: "2px solid var(--border-subtle)"
                                }}>
                                    {coach.image_url ? <img src={coach.image_url} alt={coach.name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : "👤"}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: "1.1rem" }}>{coach.name}</h3>
                                    <p style={{ color: "var(--brand-primary)", fontSize: "0.85rem", fontWeight: "600" }}>{coach.specialty}</p>
                                    <span className={`badge ${coach.status === 'Active' ? 'badge-success' : 'badge-neutral'}`} style={{ marginTop: "4px", display: "inline-block" }}>
                                        {coach.status === 'Active' ? '재직중' : '휴직/퇴사'}
                                    </span>
                                </div>
                            </div>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "20px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", flex: 1 }}>
                                {coach.bio || "소개글이 없습니다."}
                            </p>
                            <div style={{ display: "flex", gap: "10px" }}>
                                <button className="btn-secondary" style={{ flex: 1, fontSize: "0.85rem" }}>상세보기</button>
                                <button className="btn-secondary" style={{ flex: 1, fontSize: "0.85rem" }}>일정관리</button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Coach Modal */}
            {isModalOpen && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
                    <div className="premium-card" style={{ width: "400px", padding: "24px", background: "var(--bg-secondary)" }}>
                        <h2 style={{ marginBottom: "20px" }}>새 코치 등록</h2>
                        <form onSubmit={handleCreateCoach} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>이름</label>
                                <input type="text" required value={newCoach.name} onChange={e => setNewCoach({ ...newCoach, name: e.target.value })}
                                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }} />
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>전문 분야</label>
                                <input type="text" required value={newCoach.specialty} onChange={e => setNewCoach({ ...newCoach, specialty: e.target.value })} placeholder="예: 요가, 필라테스"
                                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }} />
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>소개 (Bio)</label>
                                <textarea value={newCoach.bio} onChange={e => setNewCoach({ ...newCoach, bio: e.target.value })} rows="4"
                                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }}></textarea>
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>상태</label>
                                <select value={newCoach.status} onChange={e => setNewCoach({ ...newCoach, status: e.target.value })}
                                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }}>
                                    <option value="Active">Active (재직)</option>
                                    <option value="Inactive">Inactive (휴직/퇴사)</option>
                                </select>
                            </div>
                            <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary" style={{ flex: 1 }}>취소</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>등록</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
