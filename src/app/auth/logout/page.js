"use client";
import { useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

function LogoutContent() {
    const searchParams = useSearchParams();
    const from = searchParams.get("from");

    useEffect(() => {
        const handleLogout = async () => {
            await supabase.auth.signOut();

            // Determine redirect path
            let redirectPath = "/apps/auth/login";
            if (from === "admin") {
                redirectPath = "/admin/auth/login";
            } else if (from === "coach") {
                redirectPath = "/coach/auth/login";
            } else if (from === "class") {
                redirectPath = "/class/auth/login";
            } else {
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

export default function LogoutPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><p>준비 중...</p></div>}>
            <LogoutContent />
        </Suspense>
    );
}
