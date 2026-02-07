"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
    const router = useRouter();

    useEffect(() => {
        const handleAuth = async () => {
            const { data, error } = await supabase.auth.getSession();
            if (data?.session) {
                router.push("/apps/dashboard");
            } else {
                router.push("/apps/auth/login");
            }
        };
        handleAuth();
    }, [router]);

    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ color: "var(--text-secondary)" }}>인증 확인 중...</p>
        </div>
    );
}
