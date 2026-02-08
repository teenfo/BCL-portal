"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function NotificationInbox() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });
            setNotifications(data || []);
        } else {
            // Mock data for demo
            setNotifications([
                { id: 1, title: "수업 예약 확격", message: "내일 오후 7시 '바디 챌린지' 수업 예약이 확정되었습니다.", created_at: new Date().toISOString(), read: false },
                { id: 2, title: "새로운 공지사항", message: "2월 설 연휴 센터 운영 시간 변경 안내 드립니다.", created_at: new Date(Date.now() - 86400000).toISOString(), read: true },
                { id: 3, title: "결제 완료", message: "Starter 10 패키지 결제가 성공적으로 완료되었습니다.", created_at: new Date(Date.now() - 172800000).toISOString(), read: true }
            ]);
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in" style={{ paddingBottom: "80px" }}>
            <header style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "700" }}>알림함</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>센터 소식과 나의 활동 알림을 확인하세요.</p>
            </header>

            {loading ? (
                <p>로딩 중...</p>
            ) : notifications.length === 0 ? (
                <div className="premium-card" style={{ padding: "60px", textAlign: "center", color: "var(--text-secondary)" }}>
                    알림이 없습니다.
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {notifications.map((notif) => (
                        <div key={notif.id} className="premium-card" style={{ padding: "16px", opacity: notif.read ? 0.7 : 1, borderLeft: notif.read ? "1px solid var(--border-subtle)" : "4px solid var(--brand-primary)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                                <h4 style={{ fontSize: "1rem", fontWeight: "700" }}>{notif.title}</h4>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                    {new Date(notif.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.8)", lineHeight: "1.5" }}>{notif.message}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
