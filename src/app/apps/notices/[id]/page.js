"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";

export default function NoticeDetail() {
    const { id } = useParams();
    const router = useRouter();
    const [notice, setNotice] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchNotice();
    }, [id]);

    const fetchNotice = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("notices")
            .select("*")
            .eq("id", id)
            .single();

        if (data) setNotice(data);
        setLoading(false);
    };

    if (loading) return <div className="animate-fade-in" style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)" }}>로딩 중...</div>;
    if (!notice) return <div className="animate-fade-in" style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)" }}>공지사항을 찾을 수 없습니다.</div>;

    return (
        <div className="animate-fade-in" style={{ paddingBottom: "40px" }}>
            <button onClick={() => router.back()} style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                marginBottom: "16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.9rem"
            }}>
                ← 목록으로
            </button>

            <article className="premium-card" style={{ padding: "24px" }}>
                <header style={{ marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid var(--border-subtle)" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                        {notice.category === 'Urgent' && <span className="badge badge-error">긴급</span>}
                        <span style={{ color: "var(--brand-primary)", fontWeight: "600", fontSize: "0.9rem" }}>{notice.category}</span>
                    </div>
                    <h1 style={{ fontSize: "1.5rem", marginBottom: "12px", lineHeight: "1.3" }}>{notice.title}</h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                        {new Date(notice.created_at).toLocaleString()}
                    </p>
                </header>

                <div style={{ lineHeight: "1.8", fontSize: "1rem", whiteSpace: "pre-line", color: "var(--text-primary)" }}>
                    {notice.content}
                </div>
            </article>
        </div>
    );
}
