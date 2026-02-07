"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function SupportManagement() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("support_tickets")
            .select("*, profiles:profile_id (full_name)")
            .order("created_at", { ascending: false });
        if (!error) setTickets(data);
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>고객 지원</h1>
                <p style={{ color: "var(--text-secondary)" }}>사용자 문의 및 요청 사항을 처리합니다.</p>
            </header>

            <div style={{ display: "grid", gap: "20px" }}>
                {loading ? (
                    <p>로딩 중...</p>
                ) : tickets.length === 0 ? (
                    <div className="premium-card" style={{ textAlign: "center", padding: "48px" }}>
                        <p style={{ color: "var(--text-secondary)" }}>접수된 문의가 없습니다.</p>
                    </div>
                ) : (
                    tickets.map((ticket) => (
                        <div key={ticket.id} className="premium-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                                    <span className={`badge ${ticket.status === 'open' ? 'badge-warning' : 'badge-success'}`}>
                                        {ticket.status === 'open' ? '대기 중' : '답변 완료'}
                                    </span>
                                    <h3 style={{ fontSize: "1.1rem" }}>{ticket.subject}</h3>
                                </div>
                                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "4px" }}>
                                    회원: {ticket.profiles?.full_name} • 작성일: {new Date(ticket.created_at).toLocaleDateString()}
                                </p>
                                <p style={{ fontSize: "0.9rem", color: "var(--text-tertiary)", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                    {ticket.content}
                                </p>
                            </div>
                            <button className="btn-primary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>답변하기</button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
