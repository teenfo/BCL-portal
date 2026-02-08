"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function NotificationTemplates() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        const { data } = await supabase.from("notification_templates").select("*");
        if (data) setTemplates(data);
        else {
            // Mock data for demo
            setTemplates([
                { id: 1, name: "웰컴 메시지", type: "Push/SMS", content: "안녕하세요 {name}님! BCL에 오신 것을 환영합니다.", created_at: new Date().toISOString() },
                { id: 2, name: "예약 확정 알림", type: "Push", content: "[BCL] {session_name} 수업 예약이 확정되었습니다. {time}에 만나요!", created_at: new Date().toISOString() },
                { id: 3, name: "멤버십 만료 예고", type: "SMS", content: "회원님의 멤버십이 {days}일 후 만료될 예정입니다. 갱신을 서둘러주세요.", created_at: new Date().toISOString() }
            ]);
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>알림 템플릿 관리</h1>
                    <p style={{ color: "var(--text-secondary)" }}>자동 발송되는 메시지의 템플릿을 구성하고 관리합니다.</p>
                </div>
                <button className="btn-primary">+ 새 템플릿 추가</button>
            </header>

            <div className="premium-card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>템플릿 명칭</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>유형</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>내용 요약</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="4" style={{ padding: "40px", textAlign: "center" }}>로딩 중...</td></tr>
                        ) : (
                            templates.map((t) => (
                                <tr key={t.id} style={{ borderBottom: "1px solid var(--border-subtle)" }} className="hover-row">
                                    <td style={{ padding: "16px 24px", fontWeight: "600" }}>{t.name}</td>
                                    <td style={{ padding: "16px 24px" }}>
                                        <span style={{ fontSize: "0.75rem", padding: "4px 8px", borderRadius: "4px", background: "rgba(255,255,255,0.05)" }}>{t.type}</span>
                                    </td>
                                    <td style={{ padding: "16px 24px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                                        {t.content.length > 50 ? t.content.substring(0, 50) + "..." : t.content}
                                    </td>
                                    <td style={{ padding: "16px 24px" }}>
                                        <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>수정</button>
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
