"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AttendanceLog() {
    const [checkins, setCheckins] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCheckins();
    }, []);

    const fetchCheckins = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("checkins")
            .select(`
        *,
        member:member_id (name)
      `)
            .order("time", { ascending: false });
        if (!error) setCheckins(data);
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>출석 기록</h1>
                    <p style={{ color: "var(--text-secondary)" }}>시설 이용 및 수업 출석 내역을 실시간으로 확인합니다.</p>
                </div>
                <button className="btn-primary" onClick={() => window.location.href = '/admin/checkin/scanner'}>QR 스캐너 열기</button>
            </header>

            <div className="premium-card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>체크인 시간</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>회원명</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>시설</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>구분</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>상태</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>로딩 중...</td></tr>
                        ) : checkins.length === 0 ? (
                            <tr><td colSpan="5" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>기록이 없습니다.</td></tr>
                        ) : (
                            checkins.map((checkin) => (
                                <tr key={checkin.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                    <td style={{ padding: "16px 24px" }}>
                                        <div style={{ fontSize: "0.9rem", fontWeight: "600" }}>
                                            {new Date(checkin.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                            {new Date(checkin.time).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td style={{ padding: "16px 24px", fontWeight: "500" }}>{checkin.member?.name || checkin.member_name}</td>
                                    <td style={{ padding: "16px 24px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>{checkin.facility}</td>
                                    <td style={{ padding: "16px 24px" }}>
                                        <span className="badge badge-info">{checkin.status === 'Present' ? '시설 이용' : '수업 출석'}</span>
                                    </td>
                                    <td style={{ padding: "16px 24px" }}>
                                        <span className="badge badge-success">{checkin.status}</span>
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
