"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
    const router = useRouter();

    useEffect(() => {
        const handleLogout = async () => {
            await supabase.auth.signOut();
            router.push("/");
        };
        handleLogout();
    }, [router]);

    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ color: "var(--text-secondary)" }}>로그아웃 중...</p>
        </div>
    );
}
