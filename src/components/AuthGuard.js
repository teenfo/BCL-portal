"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";

export default function AuthGuard({ children, requiredRole }) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        let mounted = true;

        const checkAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!mounted) return;

                if (!session) {
                    handleUnauthenticated();
                    return;
                }

                setUser(session.user);

                // Role Verification
                const userRole = session.user.user_metadata?.role;
                if (requiredRole && userRole !== requiredRole) {
                    console.warn(`Unauthorized: Required ${requiredRole}, found ${userRole}`);
                    setIsAuthorized(false);
                    setLoading(false);
                    return;
                }

                setIsAuthorized(true);
                setLoading(false);
            } catch (error) {
                console.error("Auth check failed:", error);
                if (mounted) handleUnauthenticated();
            }
        };

        const handleUnauthenticated = () => {
            let loginPath = "/apps/auth/login";
            if (pathname.startsWith("/admin")) loginPath = "/admin/auth/login";
            if (pathname.startsWith("/coach")) loginPath = "/coach/auth/login";

            if (!pathname.includes("/auth/login")) {
                router.replace(loginPath);
            }
            setIsAuthorized(false);
            setLoading(false);
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            if (event === 'SIGNED_OUT' || !session) {
                handleUnauthenticated();
            } else if (session) {
                // Re-verify role on sign in or session update
                const userRole = session.user.user_metadata?.role;
                if (requiredRole && userRole !== requiredRole) {
                    setIsAuthorized(false);
                } else {
                    setIsAuthorized(true);
                }
                setUser(session.user);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [pathname, router, requiredRole]);

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", color: "var(--text-secondary)" }}>
                <div style={{ textAlign: "center" }}>
                    <div className="animate-pulse" style={{ marginBottom: "16px", fontSize: "1.5rem" }}>🔒</div>
                    <p>보안 연결 확인 중...</p>
                </div>
            </div>
        );
    }

    if (!isAuthorized && user) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", color: "white", padding: "20px" }}>
                <div className="premium-card" style={{ maxWidth: "400px", textAlign: "center" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "20px" }}>🚫</div>
                    <h2 style={{ marginBottom: "12px" }}>접근 권한이 없습니다</h2>
                    <p style={{ color: "var(--text-secondary)", marginBottom: "24px", fontSize: "0.9rem" }}>
                        관리자 전용 페이지입니다. '{requiredRole}' 권한이 필요합니다.<br />
                        현재 권한: <strong>{user.user_metadata?.role || "없음"}</strong>
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <button onClick={() => router.push("/apps/dashboard")} className="btn-primary">사용자 홈으로 이동</button>
                        <button onClick={async () => {
                            await supabase.auth.signOut();
                            router.push("/admin/auth/login");
                        }} className="btn-secondary">다른 계정으로 로그인</button>
                    </div>
                </div>
            </div>
        );
    }

    return isAuthorized ? <>{children}</> : null;
}
