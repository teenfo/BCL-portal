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
        if (!error) setNotices(data);
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "4px" }}>공지사항</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>새로운 소식과 안내를 확인하세요.</p>
            </header>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {loading ? (
                    <p>로딩 중...</p>
                ) : notices.length === 0 ? (
                    <div className="premium-card" style={{ textAlign: "center", padding: "40px" }}>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>공지사항이 없습니다.</p>
                    </div>
                ) : (
                    notices.map((notice) => (
                        <div key={notice.id} className="premium-card" style={{ cursor: "pointer" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                <span className="badge badge-info" style={{ fontSize: "0.65rem" }}>{notice.category}</span>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                                    {new Date(notice.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <h3 style={{ fontSize: "1rem", marginBottom: "8px" }}>{notice.title}</h3>
                            <p style={{
                                color: "var(--text-secondary)",
                                fontSize: "0.85rem",
                                lineHeight: "1.5",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden"
                            }}>
                                {notice.content}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
