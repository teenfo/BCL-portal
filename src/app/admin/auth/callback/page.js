"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AdminAuthCallback() {
    const router = useRouter();

    useEffect(() => {
        const handleAuth = async () => {
            const { data, error } = await supabase.auth.getSession();
            if (data?.session) {
                // 관리자 세션 확인 후 대시보드로 이동
                router.push("/admin/dashboard");
            } else {
                console.error("Auth callback error or no session:", error);
                router.push("/admin/auth/login");
            }
        };
        handleAuth();
    }, [router]);

    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
            <div style={{ textAlign: "center" }}>
                <p style={{ color: "var(--text-secondary)", marginBottom: "16px" }}>관리자 권한 확인 중...</p>
                <div className="loading-spinner"></div>
            </div>
        </div>
    );
}
