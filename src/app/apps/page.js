"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AppsIndex() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/apps/dashboard");
    }, [router]);

    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
            <div className="animate-pulse" style={{ color: "var(--brand-primary)" }}>초기화 중...</div>
        </div>
    );
}
