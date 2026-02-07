"use client";
import { usePathname } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";

export default function CoachLayout({ children }) {
    const pathname = usePathname();
    const isAuthPage = pathname.includes("/auth/");

    if (isAuthPage) return <>{children}</>;

    const navItems = [
        { name: "홈", path: "/coach/dashboard", icon: "🏠" },
        { name: "스케줄", path: "/coach/schedule", icon: "🕒" },
        { name: "회원관리", path: "/coach/members", icon: "👤" },
        { name: "레이스", path: "/coach/race", icon: "🏁" },
        { name: "내정보", path: "/coach/profile", icon: "⚙️" },
    ];

    return (
        <AuthGuard requiredRole="coach">
            <div className="mobile-container" style={{
                minHeight: "100vh",
                background: "var(--bg-primary)",
                display: "flex",
                flexDirection: "column"
            }}>
                <main style={{ flex: 1, padding: "20px 20px 100px 20px" }}>
                    {children}
                </main>

                <nav className="glass-effect" style={{
                    position: "fixed",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "70px",
                    display: "flex",
                    justifyContent: "space-around",
                    alignItems: "center",
                    borderTop: "1px solid var(--border-subtle)",
                    zIndex: 1000,
                    paddingBottom: "env(safe-area-inset-bottom)"
                }}>
                    {navItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <a
                                key={item.path}
                                href={item.path}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: "4px",
                                    textDecoration: "none",
                                    color: isActive ? "var(--brand-primary)" : "var(--text-secondary)",
                                    transition: "all 0.2s ease"
                                }}
                            >
                                <span style={{ fontSize: "1.4rem" }}>{item.icon}</span>
                                <span style={{ fontSize: "0.75rem", fontWeight: isActive ? "600" : "400" }}>{item.name}</span>
                            </a>
                        );
                    })}
                </nav>
            </div>
        </AuthGuard>
    );
}
