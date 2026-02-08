"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function PaymentsManagement() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("payments")
            .select("*, member:members(name)")
            .order("created_at", { ascending: false });
        if (data) setPayments(data);
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>결제 내역 관리</h1>
                <p style={{ color: "var(--text-secondary)" }}>전체 회원의 결제 및 결제 취소 내역을 확인합니다.</p>
            </header>

            <div className="premium-card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>결제 일시</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>회원명</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>상품명</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>금액</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>상태</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "right" }}>작업</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>로딩 중...</td></tr>
                        ) : payments.length === 0 ? (
                            <tr><td colSpan="6" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>결제 내역이 없습니다.</td></tr>
                        ) : (
                            payments.map((payment) => (
                                <tr key={payment.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                    <td style={{ padding: "16px 24px", color: "var(--text-secondary)" }}>
                                        {new Date(payment.created_at).toLocaleString()}
                                    </td>
                                    <td style={{ padding: "16px 24px", fontWeight: "500" }}>{payment.member?.name || "-"}</td>
                                    <td style={{ padding: "16px 24px" }}>{payment.plan_name}</td>
                                    <td style={{ padding: "16px 24px", fontWeight: "600" }}>{payment.amount.toLocaleString()}원</td>
                                    <td style={{ padding: "16px 24px" }}>
                                        <span className={`badge ${payment.status === 'Completed' ? 'badge-success' : 'badge-neutral'}`}>
                                            {payment.status === 'Completed' ? '결제 완료' : '대기'}
                                        </span>
                                    </td>
                                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                                        <button className="btn-secondary" style={{ fontSize: "0.8rem", padding: "6px 12px" }}>영수증</button>
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
