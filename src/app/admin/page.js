"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminIndex() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/admin/dashboard");
    }, [router]);

    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#050505" }}>
            <div className="animate-pulse" style={{ color: "var(--brand-primary)" }}>초기화 중...</div>
        </div>
    );
}
