"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function PostManagement() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        setLoading(true);
        const { data } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
        if (data) setPosts(data);
        else {
            setPosts([
                { id: 1, title: "오늘 오운완! 다들 수고하셨습니다.", author: "김운동", category: "자유게시판", created_at: new Date().toISOString() },
                { id: 2, title: "초보를 위한 로잉 팁 공유합니다.", author: "박프로", category: "정보공유", created_at: new Date(Date.now() - 3600000).toISOString() },
                { id: 3, title: "동네 운동 인증 릴레이~", author: "이루틴", category: "자유게시판", created_at: new Date(Date.now() - 7200000).toISOString() }
            ]);
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>게시글 및 커뮤니티 관리</h1>
                <p style={{ color: "var(--text-secondary)" }}>사용자들이 작성한 커뮤니티 게시글을 모니터링하고 관리합니다.</p>
            </header>

            <div className="premium-card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>분류</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>제목</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>작성자</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>작성일</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{ padding: "40px", textAlign: "center" }}>로딩 중...</td></tr>
                        ) : (
                            posts.map((p) => (
                                <tr key={p.id} style={{ borderBottom: "1px solid var(--border-subtle)" }} className="hover-row">
                                    <td style={{ padding: "16px 24px" }}>
                                        <span style={{ fontSize: "0.75rem", color: "var(--brand-primary)" }}>{p.category}</span>
                                    </td>
                                    <td style={{ padding: "16px 24px", fontWeight: "600" }}>{p.title}</td>
                                    <td style={{ padding: "16px 24px" }}>{p.author}</td>
                                    <td style={{ padding: "16px 24px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                                        {new Date(p.created_at).toLocaleTimeString()}
                                    </td>
                                    <td style={{ padding: "16px 24px" }}>
                                        <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem", color: "var(--status-error)" }}>삭제</button>
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
