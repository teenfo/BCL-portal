"use client";
import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function TicketDetailClient({ params }) {
    const { id } = use(params);
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (id) fetchTicket();
    }, [id]);

    const fetchTicket = async () => {
        setLoading(true);
        const { data } = await supabase.from("support_tickets").select("*").eq("id", id).single();
        if (data) setTicket(data);
        else {
            setTicket({
                id,
                subject: "멤버십 환불 규정 문의",
                content: "개인적인 사정으로 운동을 쉬게 되었는데, 남은 횟수에 대해 환불이 가능한지 궁금합니다.",
                status: "Answered",
                answer: "안녕하세요! BCL입니다. 규정상 시작 7일 이내에는 전액 환불이 가능하며, 그 이후에는 위약금 10%를 제외한 잔여 금액이 환불됩니다. 센터 방문하여 신청해주시면 빠르게 처리해드리겠습니다.",
                created_at: new Date(Date.now() - 86400000).toISOString()
            });
        }
        setLoading(false);
    };

    if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>로딩 중...</div>;
    if (!ticket) return <div style={{ padding: "40px", textAlign: "center" }}>문의 내역을 찾을 수 없습니다.</div>;

    return (
        <div className="animate-fade-in" style={{ paddingBottom: "80px" }}>
            <header style={{ marginBottom: "24px" }}>
                <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--brand-primary)", cursor: "pointer", marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
                    ← 뒤로 가기
                </button>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "700" }}>문의 상세 보기</h2>
            </header>

            <div className="premium-card" style={{ padding: "24px", marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        접수일: {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                    <span className={`badge ${ticket.status === 'Answered' ? 'badge-success' : 'badge-neutral'}`}>
                        {ticket.status === 'Answered' ? '답변 완료' : '처리 중'}
                    </span>
                </div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "16px" }}>Q. {ticket.subject}</h3>
                <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.8)", lineHeight: "1.6" }}>{ticket.content}</p>
            </div>

            {ticket.answer && (
                <div className="premium-card" style={{ padding: "24px", background: "rgba(255,107,0,0.05)", border: "1px solid rgba(255,107,0,0.1)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                        <span style={{ fontSize: "1.2rem" }}>A.</span>
                        <span style={{ fontWeight: "700" }}>BCL 운영팀 답변</span>
                    </div>
                    <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.9)", lineHeight: "1.7" }}>{ticket.answer}</p>
                </div>
            )}
        </div>
    );
}
