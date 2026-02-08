"use client";
import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function MemberDetailClient({ params }) {
    const { id } = use(params);
    const [member, setMember] = useState(null);
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (id) fetchMember();
    }, [id]);

    const fetchMember = async () => {
        setLoading(true);
        const { data } = await supabase.from("members").select("*").eq("id", id).single();
        setMember(data);
        setNotes(data?.coaching_notes || "");
        setLoading(false);
    };

    const handleSaveNotes = async () => {
        const { error } = await supabase.from("members").update({ coaching_notes: notes }).eq("id", id);
        if (!error) alert("상담 일지가 저장되었습니다.");
    };

    if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>로딩 중...</div>;

    return (
        <div className="animate-fade-in" style={{ paddingBottom: "100px" }}>
            <header style={{ marginBottom: "24px" }}>
                <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--brand-primary)", cursor: "pointer", marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
                    ← 뒤로 가기
                </button>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "700" }}>회원 상세 관리</h2>
            </header>

            <div className="premium-card" style={{ padding: "24px", marginBottom: "24px", textAlign: "center" }}>
                <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "var(--bg-tertiary)", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>
                    👤
                </div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "700" }}>{member?.name}</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{member?.membership_type} | 잔여 {member?.remaining_sessions}회</p>
            </div>

            <div className="premium-card" style={{ padding: "24px" }}>
                <h4 style={{ marginBottom: "16px", fontSize: "1rem" }}>코칭 노하우 및 상담 일지</h4>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="회원의 특이사항이나 운동 능력, 상담 내용을 기록하세요."
                    style={{ width: "100%", height: "200px", padding: "16px", borderRadius: "12px", background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", color: "white", marginBottom: "16px", resize: "none" }}
                />
                <button onClick={handleSaveNotes} className="btn-primary" style={{ width: "100%", padding: "12px" }}>내용 저장하기</button>
            </div>
        </div>
    );
}
