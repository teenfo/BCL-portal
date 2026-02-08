"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function MyBookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: memberData } = await supabase.from("members").select("id").eq("email", user.email).single();
            if (memberData) {
                const { data } = await supabase
                    .from("reservations")
                    .select("*, session:sessions(*)")
                    .eq("member_id", memberData.id)
                    .order("created_at", { ascending: false });
                setBookings(data || []);
            }
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in" style={{ paddingBottom: "80px" }}>
            <header style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "700" }}>내 예약 관리</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>현재 예약된 수업과 과거 참여 내역입니다.</p>
            </header>

            <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
                <button className="btn-primary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>전체</button>
                <button className="btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>예약 확정</button>
                <button className="btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>정산/참여</button>
            </div>

            {loading ? (
                <p>로딩 중...</p>
            ) : bookings.length === 0 ? (
                <div className="premium-card" style={{ padding: "60px", textAlign: "center", color: "var(--text-secondary)" }}>
                    예약 내역이 없습니다.
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {bookings.map((booking) => (
                        <div
                            key={booking.id}
                            className="premium-card"
                            style={{ padding: "20px", cursor: "pointer" }}
                            onClick={() => router.push(`/apps/bookings/${booking.id}`)}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                                <div>
                                    <h4 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "4px" }}>{booking.session?.title}</h4>
                                    <p style={{ fontSize: "0.85rem", color: "var(--brand-primary)" }}>
                                        {new Date(booking.session?.start_time).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <span className={`badge ${booking.status === 'Confirmed' ? 'badge-success' : 'badge-neutral'}`}>
                                    {booking.status === 'Confirmed' ? '예약 확정' : booking.status}
                                </span>
                            </div>
                            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }}>
                                <span>코치: {booking.session?.coach_name || "전문 강사"}</span>
                                <span>상세보기 ›</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
