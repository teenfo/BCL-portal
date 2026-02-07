"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function NoticesView() {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotices();
    }, []);

    const fetchNotices = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("notices")
            .select("*")
            .order("created_at", { ascending: false });

        if (!error) setNotices(data || []);
        setLoading(false);
    };

    return (
        <div className="animate-fade-in" style={{ paddingBottom: "40px" }}>
            <header style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "4px" }}>공지사항</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>센터의 새로운 소식을 확인하세요.</p>
            </header>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {loading ? (
                    <p style={{ color: "var(--text-secondary)" }}>로딩 중...</p>
                ) : notices.length === 0 ? (
                    <div className="premium-card" style={{ padding: "40px", textAlign: "center" }}>
                        <p style={{ color: "var(--text-secondary)" }}>등록된 공지사항이 없습니다.</p>
                    </div>
                ) : (
                    notices.map((notice) => (
                        <a key={notice.id} href={`/apps/notices/${notice.id}`} className="premium-card" style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                            textDecoration: "none",
                            color: "var(--text-primary)",
                            padding: "20px"
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                    {notice.category === 'Urgent' && <span className="badge badge-error">긴급</span>}
                                    <span style={{ fontSize: "0.8rem", color: "var(--brand-primary)", fontWeight: "600" }}>{notice.category || "General"}</span>
                                </div>
                                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{new Date(notice.created_at).toLocaleDateString()}</span>
                            </div>
                            <h3 style={{ fontSize: "1.1rem", fontWeight: "600", lineHeight: "1.4" }}>{notice.title}</h3>
                            <p style={{
                                color: "var(--text-secondary)",
                                fontSize: "0.9rem",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                lineHeight: "1.5"
                            }}>
                                {notice.content}
                            </p>
                        </a>
                    ))
                )}
            </div>
        </div>
    );
}
