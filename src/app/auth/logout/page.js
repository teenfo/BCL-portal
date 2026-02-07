"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

export default function LogoutPage() {
    const searchParams = useSearchParams();
    const from = searchParams.get("from");

    useEffect(() => {
        const handleLogout = async () => {
            await supabase.auth.signOut();

            // Determine redirect path
            let redirectPath = "/apps/auth/login";
            if (from === "admin") {
                redirectPath = "/admin/auth/login";
            } else if (from === "apps") {
                redirectPath = "/apps/auth/login";
            }

            // Force a full reload to clear all states and redirect
            window.location.href = redirectPath;
        };
        handleLogout();
    }, [from]);

    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ color: "var(--text-secondary)" }}>로그아웃 중...</p>
        </div>
    );
}
