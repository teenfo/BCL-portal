"use client";
import { useRouter } from "next/navigation";

export default function SupportPage() {
    const router = useRouter();

    return (
        <div className="animate-fade-in" style={{ paddingBottom: "80px" }}>
            <header style={{ marginBottom: "24px" }}>
                <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--brand-primary)", cursor: "pointer", marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
                    ← 뒤로 가기
                </button>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "700" }}>고객 지원</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>무엇을 도와드릴까요?</p>
            </header>

            <div className="premium-card" style={{ padding: "24px", marginBottom: "24px" }}>
                <h3 style={{ fontSize: "1.1rem", marginBottom: "16px" }}>1:1 문의하기</h3>
                <textarea
                    placeholder="문의하실 내용을 입력해주세요. 관리자가 확인 후 답변드립니다."
                    style={{ width: "100%", height: "150px", padding: "16px", borderRadius: "12px", background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", color: "white", marginBottom: "16px", resize: "none" }}
                />
                <button className="btn-primary" style={{ width: "100%", padding: "12px" }}>문의 제출</button>
            </div>

            <div className="premium-card" style={{ padding: "24px", marginBottom: "24px" }}>
                <h3 style={{ fontSize: "1.1rem", marginBottom: "16px" }}>나의 문의 내역</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {[
                        { id: 1, subject: "멤버십 환불 규정 문의", status: "Answered", date: "2026.02.06" },
                        { id: 2, subject: "로그인 오류 관련 문의", status: "Pending", date: "2026.02.07" }
                    ].map((ticket) => (
                        <div
                            key={ticket.id}
                            onClick={() => router.push(`/apps/support/${ticket.id}`)}
                            style={{
                                padding: "12px 0",
                                borderBottom: "1px solid var(--border-subtle)",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                cursor: "pointer"
                            }}
                        >
                            <div>
                                <p style={{ fontSize: "0.9rem", fontWeight: "500", marginBottom: "4px" }}>{ticket.subject}</p>
                                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{ticket.date}</p>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span className={`badge ${ticket.status === 'Answered' ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: "0.7rem" }}>
                                    {ticket.status === 'Answered' ? '답변완료' : '검토중'}
                                </span>
                                <span style={{ color: "var(--text-secondary)" }}>›</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="premium-card" style={{ padding: "24px" }}>
                <h3 style={{ fontSize: "1.1rem", marginBottom: "16px" }}>자주 묻는 질문 (FAQ)</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {[
                        "수업 예약은 언제까지 가능한가요?",
                        "회원권 환불 규정이 궁금합니다.",
                        "주차 등록은 어떻게 하나요?"
                    ].map((q, idx) => (
                        <div key={idx} style={{ padding: "12px 0", borderBottom: idx < 2 ? "1px solid var(--border-subtle)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "0.9rem" }}>{q}</span>
                            <span style={{ color: "var(--text-secondary)" }}>›</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
