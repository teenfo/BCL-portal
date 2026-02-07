"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function CoachMembers() {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedMember, setSelectedMember] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [coachingNote, setCoachingNote] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchRecentMembers();
    }, []);

    const fetchRecentMembers = async () => {
        setLoading(true);
        // Fetch members who have attended sessions by this coach recently
        // For simplicity, let's fetch all members for now.
        const { data } = await supabase
            .from("members")
            .select("*")
            .limit(20);

        setMembers(data || []);
        setLoading(false);
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { data } = await supabase
            .from("members")
            .select("*")
            .ilike("name", `%${searchTerm}%`);
        setMembers(data || []);
        setLoading(false);
    };

    const openModal = (member) => {
        setSelectedMember(member);
        setCoachingNote(member.coaching_notes || "");
        setIsModalOpen(true);
    };

    const saveNote = async () => {
        setSaving(true);
        const { error } = await supabase
            .from("members")
            .update({ coaching_notes: coachingNote })
            .eq("id", selectedMember.id);

        if (!error) {
            alert("노트가 저장되었습니다.");
            setIsModalOpen(false);
            fetchRecentMembers();
        } else {
            alert("저장 실패: " + error.message);
        }
        setSaving(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "4px" }}>회원 케어</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>회원별 코칭 노트를 기록하세요.</p>
            </header>

            <form onSubmit={handleSearch} style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
                <input
                    type="text"
                    placeholder="회원 이름 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }}
                />
                <button type="submit" className="btn-secondary" style={{ padding: "0 16px" }}>검색</button>
            </form>

            {loading ? (
                <p>로딩 중...</p>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {members.map(member => (
                        <div key={member.id} className="premium-card" style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <h4 style={{ fontSize: "1.1rem", fontWeight: "600" }}>{member.name}</h4>
                                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{member.phone || member.email}</p>
                            </div>
                            <button className="btn-secondary" onClick={() => openModal(member)} style={{ fontSize: "0.8rem", padding: "8px 12px" }}>
                                노트 작성
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Coaching Note Modal */}
            {isModalOpen && (
                <div className="modal-overlay" style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "20px"
                }}>
                    <div className="premium-card" style={{ width: "100%", maxWidth: "400px", padding: "24px" }}>
                        <h3 style={{ marginBottom: "16px" }}>{selectedMember.name} 회원 코칭 노트</h3>
                        <textarea
                            value={coachingNote}
                            onChange={(e) => setCoachingNote(e.target.value)}
                            placeholder="특이사항, 운동 상태 등을 기록하세요..."
                            style={{ width: "100%", height: "150px", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white", marginBottom: "20px", resize: "none" }}
                        />
                        <div style={{ display: "flex", gap: "12px" }}>
                            <button className="btn-secondary" onClick={() => setIsModalOpen(false)} style={{ flex: 1 }}>취소</button>
                            <button className="btn-primary" onClick={saveNote} disabled={saving} style={{ flex: 1 }}>
                                {saving ? "저장 중..." : "저장하기"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
