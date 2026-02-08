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
        const { data } = await supabase.from("notices").select("*").order("created_at", { ascending: false });
        if (data) setNotices(data);
        else {
            setNotices([
                { id: 1, title: "2월 휴관 및 운영 시간 안내", author: "관리자", views: 125, created_at: new Date().toISOString() },
                { id: 2, title: "신규 프로그램 '로잉 베이직' 개설 알림", author: "메인 코치", views: 89, created_at: new Date(Date.now() - 86400000).toISOString() },
                { id: 3, title: "센터 샤워실 보수 공사 완료", author: "시설팀", views: 45, created_at: new Date(Date.now() - 172800000).toISOString() }
            ]);
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>공지사항 관리</h1>
                    <p style={{ color: "var(--text-secondary)" }}>회원들에게 노출되는 공식 공지사항을 작성하고 게시합니다.</p>
                </div>
                <button className="btn-primary">+ 새 공지 작성</button>
            </header>

            <div className="premium-card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>제목</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>작성자</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>조회수</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>게시일</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{ padding: "40px", textAlign: "center" }}>로딩 중...</td></tr>
                        ) : (
                            notices.map((n) => (
                                <tr key={n.id} style={{ borderBottom: "1px solid var(--border-subtle)" }} className="hover-row">
                                    <td style={{ padding: "16px 24px", fontWeight: "600" }}>{n.title}</td>
                                    <td style={{ padding: "16px 24px" }}>{n.author}</td>
                                    <td style={{ padding: "16px 24px" }}>{n.views}</td>
                                    <td style={{ padding: "16px 24px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                                        {new Date(n.created_at).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: "16px 24px" }}>
                                        <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>수정</button>
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
