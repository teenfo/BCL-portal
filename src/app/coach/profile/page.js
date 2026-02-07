"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function CoachProfile() {
    const router = useRouter();
    const [coach, setCoach] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCoach();
    }, []);

    const fetchCoach = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from("coaches")
                .select("*")
                .eq("email", user.email)
                .single();
            setCoach(data);
        }
        setLoading(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/coach/auth/login");
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "4px" }}>내 정보</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>코치 프로필 및 설정을 관리하세요.</p>
            </header>

            {loading ? (
                <p>로딩 중...</p>
            ) : (
                <>
                    <div className="premium-card" style={{ padding: "24px", marginBottom: "24px", textAlign: "center" }}>
                        <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "var(--bg-tertiary)", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>
                            🏃
                        </div>
                        <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "4px" }}>{coach?.name}</h3>
                        <p style={{ color: "var(--brand-primary)", fontSize: "0.9rem", fontWeight: "600", marginBottom: "8px" }}>{coach?.specialty}</p>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>{coach?.email}</p>
                    </div>

                    <div className="premium-card" style={{ padding: "20px", marginBottom: "24px" }}>
                        <h4 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "12px" }}>자기소개</h4>
                        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.6" }}>
                            {coach?.bio || "등록된 자기소개가 없습니다."}
                        </p>
                    </div>

                    <button
                        className="btn-secondary"
                        onClick={handleLogout}
                        style={{ width: "100%", padding: "16px", color: "var(--status-error)", borderColor: "var(--status-error)" }}
                    >
                        로그아웃
                    </button>
                </>
            )}
        </div>
    );
}
