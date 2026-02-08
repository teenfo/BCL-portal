"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClassPortalIndex() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/class/live");
    }, [router]);

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#000000",
            color: "var(--brand-primary)"
        }}>
            <div className="animate-pulse" style={{ fontSize: "1.5rem", fontWeight: "700" }}>
                CLASS PORTAL INITIALIZING...
            </div>
        </div>
    );
}
