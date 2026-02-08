"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function ReservationsManagement() {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReservations();
    }, []);

    const fetchReservations = async () => {
        setLoading(true);
        // Assuming a join between reservations, members, and sessions
        const { data, error } = await supabase
            .from("reservations")
            .select("*, member:members(name), session:sessions(title, start_time)")
            .order("created_at", { ascending: false });

        if (data) setReservations(data);
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>예약 및 대기열 관리</h1>
                <p style={{ color: "var(--text-secondary)" }}>수업 예약 현황 및 대기 명단을 관리하며, 예약을 승인하거나 취소할 수 있습니다.</p>
            </header>

            <div className="premium-card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>예약 회시</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>회원명</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>수업명 (일정)</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>상태</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "right" }}>작업</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>로딩 중...</td></tr>
                        ) : reservations.length === 0 ? (
                            <tr><td colSpan="5" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>예약 내역이 없습니다.</td></tr>
                        ) : (
                            reservations.map((res) => (
                                <tr key={res.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                    <td style={{ padding: "16px 24px", color: "var(--text-secondary)" }}>
                                        {new Date(res.created_at).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: "16px 24px", fontWeight: "500" }}>{res.member?.name || "알수없음"}</td>
                                    <td style={{ padding: "16px 24px" }}>
                                        <div>{res.session?.title || "삭제된 수업"}</div>
                                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                            {res.session?.start_time ? new Date(res.session.start_time).toLocaleString() : "-"}
                                        </div>
                                    </td>
                                    <td style={{ padding: "16px 24px" }}>
                                        <span className={`badge ${res.status === 'Confirmed' ? 'badge-success' : res.status === 'Waitlist' ? 'badge-warning' : 'badge-neutral'}`}>
                                            {res.status === 'Confirmed' ? '예약확정' : res.status === 'Waitlist' ? '대기' : '취소'}
                                        </span>
                                    </td>
                                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                                        <button className="btn-secondary" style={{ fontSize: "0.8rem", padding: "6px 12px" }}>관리</button>
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
