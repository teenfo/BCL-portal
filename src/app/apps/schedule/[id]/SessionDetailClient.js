"use client";
import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function SessionDetailClient({ params }) {
    const { id } = use(params);
    const [session, setSession] = useState(null);
    const [isBooked, setIsBooked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const router = useRouter();

    useEffect(() => {
        getCurrentUser();
    }, []);

    useEffect(() => {
        if (id && user) {
            fetchSessionData();
        }
    }, [id, user]);

    const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
    };

    const fetchSessionData = async () => {
        setLoading(true);
        try {
            // Fetch session
            const { data: sessionData } = await supabase
                .from("sessions")
                .select("*")
                .eq("id", id)
                .single();
            setSession(sessionData);

            // Check if already booked
            const { data: memberData } = await supabase.from("members").select("id").eq("email", user.email).single();
            if (memberData) {
                const { data: booking } = await supabase
                    .from("reservations")
                    .select("id")
                    .eq("session_id", id)
                    .eq("member_id", memberData.id)
                    .single();
                setIsBooked(!!booking);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleBooking = async () => {
        if (!session || !user) return;

        try {
            const { data: memberData } = await supabase.from("members").select("id").eq("email", user.email).single();
            if (!memberData) throw new Error("Member not found");

            const { error } = await supabase.from("reservations").insert([
                { session_id: session.id, member_id: memberData.id, status: 'Confirmed' }
            ]);

            if (error) throw error;
            setIsBooked(true);
            alert("예약이 완료되었습니다!");
        } catch (error) {
            alert("예약 실패: " + error.message);
        }
    };

    if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>로딩 중...</div>;
    if (!session) return <div style={{ padding: "40px", textAlign: "center" }}>수업을 찾을 수 없습니다.</div>;

    return (
        <div className="animate-fade-in" style={{ paddingBottom: "100px" }}>
            <header style={{ marginBottom: "24px" }}>
                <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--brand-primary)", cursor: "pointer", marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
                    ← 뒤로 가기
                </button>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "700" }}>{session.title}</h2>
            </header>

            <div className="premium-card" style={{ padding: "24px", marginBottom: "24px" }}>
                <div style={{ display: "grid", gap: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>수업 일시</span>
                        <span style={{ fontWeight: "600" }}>{new Date(session.start_time).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>코치</span>
                        <span>{session.coach_name || "전문 강사"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>강도</span>
                        <span>{session.intensity}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>정원</span>
                        <span>{session.enrolled} / {session.capacity}명</span>
                    </div>
                </div>

                <div style={{ marginTop: "32px", borderTop: "1px solid var(--border-subtle)", paddingTop: "24px" }}>
                    <h4 style={{ marginBottom: "12px", fontSize: "0.95rem" }}>수업 설명</h4>
                    <p style={{ color: "var(--text-secondary)", lineHeight: "1.6", fontSize: "0.9rem" }}>
                        이 수업은 {session.title} 프로그램으로, {session.intensity} 강도로 진행됩니다.
                        전문 코치팀과 함께 기초부터 탄탄하게 배워보세요.
                        (준비물: 간편한 복장, 실내용 운동화, 마실 물)
                    </p>
                </div>
            </div>

            {isBooked ? (
                <div className="premium-card" style={{ textAlign: "center", padding: "20px", background: "rgba(46, 204, 113, 0.1)", border: "1px solid rgba(46, 204, 113, 0.3)" }}>
                    <p style={{ color: "var(--status-success)", fontWeight: "600" }}>✅ 이미 예약된 수업입니다.</p>
                </div>
            ) : session.enrolled >= session.capacity ? (
                <button disabled className="btn-secondary" style={{ width: "100%", padding: "16px", cursor: "not-allowed", opacity: 0.7 }}>
                    ⛔ 정원 마감
                </button>
            ) : (
                <button onClick={handleBooking} className="btn-primary" style={{ width: "100%", padding: "16px", fontSize: "1.1rem" }}>
                    예약하기
                </button>
            )}
        </div>
    );
}
