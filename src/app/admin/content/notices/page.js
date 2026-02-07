"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function NoticeManagement() {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newNotice, setNewNotice] = useState({
        title: "",
        content: "",
        category: "General", // General, Event, Urgent
        is_pinned: false
    });

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

    const handleCreateNotice = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from("notices").insert([newNotice]);
        if (!error) {
            setIsModalOpen(false);
            fetchNotices();
            setNewNotice({ title: "", content: "", category: "General", is_pinned: false });
        } else {
            alert("Error creating notice: " + error.message);
        }
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>공지사항 관리</h1>
                    <p style={{ color: "var(--text-secondary)" }}>회원 대상 공지 및 이벤트 소식을 관리합니다.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="btn-primary">+ 공지 등록</button>
            </header>

            <div style={{ display: "grid", gap: "16px" }}>
                {loading ? (
                    <p style={{ color: "var(--text-secondary)" }}>로딩 중...</p>
                ) : notices.length === 0 ? (
                    <div className="premium-card" style={{ textAlign: "center", padding: "48px" }}>
                        <p style={{ color: "var(--text-secondary)" }}>등록된 공지사항이 없습니다.</p>
                    </div>
                ) : (
                    notices.map((notice) => (
                        <div key={notice.id} className="premium-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                                    {notice.is_pinned && <span className="badge badge-accent">고정</span>}
                                    <span className={`badge ${notice.category === 'Urgent' ? 'badge-error' : 'badge-neutral'}`}>
                                        {notice.category === 'Urgent' ? '긴급' : notice.category === 'Event' ? '이벤트' : '일반'}
                                    </span>
                                    <h3 style={{ fontSize: "1.1rem", margin: 0 }}>{notice.title}</h3>
                                </div>
                                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                    {notice.content}
                                </p>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "8px" }}>
                                    {new Date(notice.created_at).toLocaleDateString()}
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: "10px" }}>
                                <button className="btn-secondary">수정</button>
                                <button className="btn-secondary" style={{ color: "var(--status-error)" }}>삭제</button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Notice Modal */}
            {isModalOpen && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
                    <div className="premium-card" style={{ width: "500px", padding: "24px", background: "var(--bg-secondary)" }}>
                        <h2 style={{ marginBottom: "20px" }}>새 공지 등록</h2>
                        <form onSubmit={handleCreateNotice} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>제목</label>
                                <input type="text" required value={newNotice.title} onChange={e => setNewNotice({ ...newNotice, title: e.target.value })}
                                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div>
                                    <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>카테고리</label>
                                    <select value={newNotice.category} onChange={e => setNewNotice({ ...newNotice, category: e.target.value })}
                                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }}>
                                        <option value="General">일반</option>
                                        <option value="Event">이벤트</option>
                                        <option value="Urgent">긴급</option>
                                    </select>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "28px" }}>
                                    <input type="checkbox" id="is_pinned" checked={newNotice.is_pinned} onChange={e => setNewNotice({ ...newNotice, is_pinned: e.target.checked })}
                                        style={{ width: "20px", height: "20px" }} />
                                    <label htmlFor="is_pinned" style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>상단 고정</label>
                                </div>
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>내용</label>
                                <textarea required value={newNotice.content} onChange={e => setNewNotice({ ...newNotice, content: e.target.value })} rows="6"
                                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }}></textarea>
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
