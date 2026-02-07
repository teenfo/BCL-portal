"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function NoticeManagement() {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotices();
    }, []);

    const fetchNotices = async () => {
        setLoading(true);
        const { data, error } = await supabase.from("notices").select("*").order("created_at", { ascending: false });
        if (!error) setNotices(data);
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>공지 관리</h1>
                    <p style={{ color: "var(--text-secondary)" }}>사용자 앱에 표시될 공지사항을 작성하고 관리합니다.</p>
                </div>
                <button className="btn-primary">+ 공지 작성</button>
            </header>

            <div className="premium-card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>제목</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>카테고리</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>작성일</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>상태</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>로딩 중...</td></tr>
                        ) : notices.length === 0 ? (
                            <tr><td colSpan="5" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>공지사항이 없습니다.</td></tr>
                        ) : (
                            notices.map((notice) => (
                                <tr key={notice.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                    <td style={{ padding: "16px 24px", fontWeight: "500" }}>{notice.title}</td>
                                    <td style={{ padding: "16px 24px" }}><span className="badge badge-info">{notice.category}</span></td>
                                    <td style={{ padding: "16px 24px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                                        {new Date(notice.created_at).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: "16px 24px" }}>
                                        <span className={notice.is_published ? "badge badge-success" : "badge badge-warning"}>
                                            {notice.is_published ? "게시됨" : "초안"}
                                        </span>
                                    </td>
                                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                                        <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>관리</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
