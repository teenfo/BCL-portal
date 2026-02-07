"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function ProfileView() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
            setProfile({ ...data, email: user.email });
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            {loading ? (
                <p>로딩 중...</p>
            ) : (
                <>
                    <header style={{ textAlign: "center", marginBottom: "32px" }}>
                        <div style={{
                            width: "100px",
                            height: "100px",
                            borderRadius: "50%",
                            background: "var(--bg-tertiary)",
                            margin: "0 auto 16px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "2.5rem",
                            border: "2px solid var(--border-subtle)"
                        }}>
                            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%" }} /> : "👤"}
                        </div>
                        <h2 style={{ fontSize: "1.5rem", marginBottom: "4px" }}>{profile?.full_name || "사용자"}</h2>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{profile?.email}</p>
                    </header>

                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div className="premium-card">
                            <h3 style={{ fontSize: "1rem", marginBottom: "16px" }}>나의 멤버십</h3>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <p style={{ fontSize: "1.1rem", fontWeight: "700" }}>3개월 무제한 이용권</p>
                                    <p style={{ fontSize: "0.8rem", color: "var(--status-success)" }}>D-45 (2026.03.24 만료)</p>
                                </div>
                                <button className="btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }} onClick={() => window.location.href = '/apps/membership'}>연장하기</button>
                            </div>
                        </div>

                        <div className="premium-card" style={{ padding: "0" }}>
                            <button style={{ width: "100%", padding: "20px", background: "none", border: "none", color: "white", textAlign: "left", fontSize: "1rem", display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-subtle)" }}>
                                <span>운동 기록</span>
                                <span>❯</span>
                            </button>
                            <button style={{ width: "100%", padding: "20px", background: "none", border: "none", color: "white", textAlign: "left", fontSize: "1rem", display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-subtle)" }}>
                                <span>결제 내역</span>
                                <span>❯</span>
                            </button>
                            <button style={{ width: "100%", padding: "20px", background: "none", border: "none", color: "white", textAlign: "left", fontSize: "1rem", display: "flex", justifyContent: "space-between" }}>
                                <span>고객 지원</span>
                                <span>❯</span>
                            </button>
                        </div>

                        <button
                            onClick={() => window.location.href = '/auth/logout?from=apps'}
                            style={{
                                marginTop: "16px",
                                padding: "16px",
                                background: "rgba(239, 68, 68, 0.1)",
                                border: "1px solid rgba(239, 68, 68, 0.2)",
                                borderRadius: "12px",
                                color: "var(--status-error)",
                                fontWeight: "600",
                                cursor: "pointer"
                            }}
                        >
                            로그아웃
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
