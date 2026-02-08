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
        let mounted = true;

        const checkAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (!mounted) return;

                if (!session) {
                    handleUnauthorized();
                    return;
                }

                // If specialized role check is needed in the future:
                // if (requiredRole && session.user.user_metadata?.role !== requiredRole) { ... }

                setAuthorized(true);
                setLoading(false);
            } catch (error) {
                console.error("Auth check failed:", error);
                if (mounted) handleUnauthorized();
            }
        };

        const handleUnauthorized = () => {
            let loginPath = "/apps/auth/login";
            if (pathname.startsWith("/admin")) loginPath = "/admin/auth/login";
            if (pathname.startsWith("/coach")) loginPath = "/coach/auth/login";

            if (!pathname.includes("/auth/login")) {
                router.replace(loginPath);
            }
            setAuthorized(false);
            setLoading(false);
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!mounted) return;
            if (event === 'SIGNED_OUT') {
                handleUnauthorized();
            } else if (event === 'SIGNED_IN' && session) {
                setAuthorized(true);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [pathname, router]);

    if (loading) {
        return (
            <div style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--bg-primary)",
                color: "var(--text-secondary)"
            }}>
                <div style={{ textAlign: "center" }}>
                    <div className="animate-pulse" style={{ marginBottom: "16px", fontSize: "1.5rem" }}>🔒</div>
                    <p>보안 연결 확인 중...</p>
                </div>
            </div>
        );
    }

    return authorized ? <>{children}</> : null;
}
