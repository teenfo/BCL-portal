"use client";
import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function BookingDetailClient({ params }) {
    const { id } = use(params);
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (id) fetchBookingDetail();
    }, [id]);

    const fetchBookingDetail = async () => {
        setLoading(true);
        const { data } = await supabase
            .from("reservations")
            .select("*, session:sessions(*)")
            .eq("id", id)
            .single();
        setBooking(data);
        setLoading(false);
    };

    const handleCancel = async () => {
        if (!window.confirm("정말로 예약을 취소하시겠습니까? (수업 시작 2시간 전까지만 가능)")) return;

        const { error } = await supabase
            .from("reservations")
            .update({ status: 'Cancelled' })
            .eq("id", id);

        if (!error) {
            alert("예약이 취소되었습니다.");
            router.back();
        } else {
            alert("취소 실패: " + error.message);
        }
    };

    if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>로딩 중...</div>;
    if (!booking) return <div style={{ padding: "40px", textAlign: "center" }}>예약 정보를 찾을 수 없습니다.</div>;

    return (
        <div className="animate-fade-in" style={{ paddingBottom: "100px" }}>
            <header style={{ marginBottom: "24px" }}>
                <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--brand-primary)", cursor: "pointer", marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
                    ← 뒤로 가기
                </button>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "700" }}>예약 상세 정보</h2>
            </header>

            <div className="premium-card" style={{ padding: "24px", marginBottom: "24px" }}>
                <div style={{ textAlign: "center", marginBottom: "32px", borderBottom: "1px solid var(--border-subtle)", pb: "24px" }}>
                    <div className={`badge ${booking.status === 'Confirmed' ? 'badge-success' : 'badge-neutral'}`} style={{ marginBottom: "12px", fontSize: "0.9rem", padding: "6px 16px" }}>
                        {booking.status === 'Confirmed' ? '예약 확정 (참가 대기)' : booking.status}
                    </div>
                    <h3 style={{ fontSize: "1.75rem", fontWeight: "800" }}>{booking.session?.title}</h3>
                </div>

                <div style={{ display: "grid", gap: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>수업 일시</span>
                        <span style={{ fontWeight: "600" }}>{new Date(booking.session?.start_time).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>장소</span>
                        <span>{booking.session?.room || "Main Studio (B1)"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>진행 코치</span>
                        <span>{booking.session?.coach_name || "전문 강사"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>운동 강도</span>
                        <span>{booking.session?.intensity}</span>
                    </div>
                </div>
            </div>

            <div className="premium-card" style={{ padding: "20px", marginBottom: "32px", background: "rgba(255,255,255,0.02)" }}>
                <h4 style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "12px" }}>유의 사항</h4>
                <ul style={{ paddingLeft: "20px", fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", lineHeight: "1.6" }}>
                    <li>수업 시작 10분 전까지 입실해주시기 바랍니다.</li>
                    <li>예약 취소는 수업 시작 2시간 전까지만 가능합니다.</li>
                    <li>무단 결석 시 향후 예약에 제한이 있을 수 있습니다.</li>
                </ul>
            </div>

            {booking.status === 'Confirmed' && (
                <button
                    onClick={handleCancel}
                    className="btn-secondary"
                    style={{ width: "100%", padding: "16px", color: "var(--status-error)", borderColor: "var(--status-error)" }}
                >
                    예약 취소하기
                </button>
            )}
        </div>
    );
}
