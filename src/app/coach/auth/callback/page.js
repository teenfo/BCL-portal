"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function CoachAuthCallback() {
    const router = useRouter();

    useEffect(() => {
        const handleAuthCallback = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (session) {
                router.push("/coach/dashboard");
            } else {
                router.push("/coach/auth/login");
            }
        };

        handleAuthCallback();
    }, [router]);

    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "black" }}>
            <p style={{ color: "white" }}>로그인 처리 중...</p>
        </div>
    );
}
