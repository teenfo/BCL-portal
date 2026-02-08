"use client";
import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function NoticeDetailClient({ params }) {
    const { id } = use(params);
    const [notice, setNotice] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (id) fetchNotice();
    }, [id]);

    const fetchNotice = async () => {
        setLoading(true);
        const { data } = await supabase.from("notices").select("*").eq("id", id).single();
        setNotice(data);
        setLoading(false);
    };

    if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>로딩 중...</div>;
    if (!notice) return <div style={{ padding: "40px", textAlign: "center" }}>공지사항을 찾을 수 없습니다.</div>;

    return (
        <div className="animate-fade-in" style={{ paddingBottom: "80px" }}>
            <header style={{ marginBottom: "24px" }}>
                <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--brand-primary)", cursor: "pointer", marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
                    ← 뒤로 가기
                </button>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
                    {notice.category === 'Urgent' && <span className="badge badge-error">긴급</span>}
                    <h2 style={{ fontSize: "1.5rem", fontWeight: "800", lineHeight: "1.3" }}>{notice.title}</h2>
                </div>
                <div style={{ display: "flex", gap: "12px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    <span>작성일: {new Date(notice.created_at).toLocaleDateString()}</span>
                    <span>조회: {notice.views || 0}</span>
                </div>
            </header>

            <div className="premium-card" style={{ padding: "32px", lineHeight: "1.8", whiteSpace: "pre-wrap" }}>
                {notice.content}

                {notice.image_url && (
                    <img src={notice.image_url} style={{ width: "100%", borderRadius: "12px", marginTop: "24px" }} />
                )}
            </div>

            <div style={{ marginTop: "40px", textAlign: "center" }}>
                <button onClick={() => router.push("/apps/notices")} className="btn-secondary" style={{ padding: "12px 32px" }}>
                    목록으로 돌아가기
                </button>
            </div>
        </div>
    );
}
