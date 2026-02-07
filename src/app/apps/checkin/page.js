"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function CheckinView() {
    const [profile, setProfile] = useState(null);
    const [timeLeft, setTimeLeft] = useState(180); // 3 minutes

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => setProfile(data));
            }
        });

        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 180));
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds) => {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    };

    return (
        <div className="animate-fade-in" style={{ textAlign: "center" }}>
            <header style={{ marginBottom: "32px" }}>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "4px" }}>QR 체크인</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>시설 입장 또는 수업 출석 시 제시해주세요.</p>
            </header>

            <div className="premium-card" style={{ padding: "40px", position: "relative" }}>
                <div style={{
                    width: "240px",
                    height: "240px",
                    background: "white",
                    margin: "0 auto 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "16px"
                }}>
                    {/* QR Code Placeholder */}
                    <div style={{ width: "200px", height: "200px", background: "url('https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + profile?.id + "') no-repeat center center", backgroundSize: "contain" }}></div>
                </div>

                <p style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "8px" }}>{profile?.full_name || "사용자"}</p>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "20px" }}>회원번호: {profile?.id?.slice(0, 8)}</p>

                <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderRadius: "99px", background: "rgba(59, 130, 246, 0.1)", color: "var(--brand-primary)", fontWeight: "600" }}>
                    <span style={{ fontSize: "0.9rem" }}>⏱ {formatTime(timeLeft)} 남음</span>
                </div>
            </div>

            <p style={{ marginTop: "32px", fontSize: "0.85rem", color: "var(--text-tertiary)", lineHeight: "1.6" }}>
                QR 코드는 매 3분마다 갱신됩니다.<br />
                보안을 위해 타인에게 공유하지 마세요.
            </p>
        </div>
    );
}
