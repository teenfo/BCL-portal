"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";

export default function AuthGuard({ children, requiredRole }) {
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (!session) {
                    const loginPath = pathname.startsWith("/admin")
                        ? "/admin/auth/login"
                        : "/apps/auth/login";

                    // Prevent infinite redirect if already on login page
                    if (!pathname.includes("/auth/login")) {
                        router.replace(loginPath);
                    }
                    return;
                }

                // Session exists, check if any specific user data is needed
                // If profiles were populated, we'd check roles here.
                // For now, session presence is enough for general access.

                setAuthorized(true);
            } catch (error) {
                console.error("Auth check failed:", error);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, [pathname, router]);

    if (loading) {
        return (
            <div style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--bg-primary)",
                color: "var(--text-secondary)",
                fontFamily: "var(--font-inter)"
            }}>
                <div style={{ textAlign: "center" }}>
                    <div className="animate-pulse" style={{ marginBottom: "16px", fontSize: "1.5rem" }}>🔒</div>
                    <p>인증 확인 중...</p>
                </div>
            </div>
        );
    }

    return authorized ? <>{children}</> : null;
}
