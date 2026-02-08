"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function NewBookingPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.id;
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bookingState, setBookingState] = useState("idle"); // idle, processing, success, error

    useEffect(() => {
        fetchSessionDetails();
    }, [sessionId]);

    const fetchSessionDetails = async () => {
        const { data } = await supabase.from("sessions").select("*").eq("id", sessionId).single();
        if (data) setSession(data);
        setLoading(false);
    };

    const handleConfirmBooking = async () => {
        setBookingState("processing");
        const { data: { user } } = await supabase.auth.getUser();

        // 1. Get member ID
        const { data: member } = await supabase.from("members").select("id").eq("email", user.email).single();

        if (!member) {
            setBookingState("error");
            return;
        }

        // 2. Create reservation
        const { error } = await supabase.from("reservations").insert({
            member_id: member.id,
            session_id: sessionId,
            status: "Confirmed"
        });

        if (error) {
            setBookingState("error");
        } else {
            // 3. Update session enrollment
            await supabase.rpc('increment_enrollment', { row_id: sessionId });
            setBookingState("success");
            setTimeout(() => {
                router.push('/apps/bookings');
            }, 2000);
        }
    };

    if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>로딩 중...</div>;
    if (!session) return <div style={{ padding: "40px", textAlign: "center" }}>세션을 찾을 수 없습니다.</div>;

    return (
        <div className="animate-fade-in" style={{ paddingBottom: "40px" }}>
            <header style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "4px" }}>예약 확정</h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>선택하신 수업의 정보를 확인해 주세요.</p>
            </header>

            <div className="premium-card" style={{ marginBottom: "24px" }}>
                <div style={{ marginBottom: "20px" }}>
                    <div style={{ fontSize: "0.85rem", color: "var(--brand-primary)", fontWeight: "700", marginBottom: "4px" }}>SESSION INFO</div>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: "800" }}>{session.title}</h2>
                </div>

                <div style={{ display: "grid", gap: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
                        <span style={{ color: "var(--text-secondary)" }}>담당 코치</span>
                        <span style={{ fontWeight: "600" }}>{session.coach_name}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
                        <span style={{ color: "var(--text-secondary)" }}>일시</span>
                        <span style={{ fontWeight: "600" }}>{new Date(session.start_time).toLocaleString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
                        <span style={{ color: "var(--text-secondary)" }}>소요 시간</span>
                        <span style={{ fontWeight: "600" }}>{session.duration || 60}분</span>
                    </div>
                </div>
            </div>

            <div className="premium-card" style={{ background: "rgba(255,107,0,0.05)", border: "1px dashed var(--brand-primary)" }}>
                <h3 style={{ fontSize: "0.95rem", marginBottom: "12px", color: "var(--brand-primary)" }}>유의사항</h3>
                <ul style={{ paddingLeft: "20px", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.6" }}>
                    <li>수업 시작 2시간 전까지만 취소가 가능합니다.</li>
                    <li>노쇼(No-show) 발생 시 횟수권이 차감될 수 있습니다.</li>
                    <li>시작 10분 전까지 지점에 도착하여 체크인 해주세요.</li>
                </ul>
            </div>

            <div style={{ position: "fixed", bottom: "90px", left: "20px", right: "20px", display: "flex", gap: "12px" }}>
                <button
                    className="btn-secondary"
                    style={{ flex: 1, padding: "16px" }}
                    onClick={() => router.back()}
                    disabled={bookingState === "processing"}
                >
                    취소
                </button>
                <button
                    className="btn-primary"
                    style={{ flex: 2, padding: "16px", fontSize: "1rem" }}
                    onClick={handleConfirmBooking}
                    disabled={bookingState !== "idle"}
                >
                    {bookingState === "processing" ? "처리 중..." :
                        bookingState === "success" ? "예약 완료!" : "지금 예약하기"}
                </button>
            </div>

            {bookingState === "success" && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div className="premium-card" style={{ textAlign: "center", padding: "40px" }}>
                        <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🎉</div>
                        <h2>예약이 완료되었습니다!</h2>
                        <p style={{ color: "var(--text-secondary)", marginTop: "12px" }}>내 예약 목록으로 이동합니다.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
