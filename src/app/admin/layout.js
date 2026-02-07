"use client";
import Link from "next/navigation";
import { usePathname } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";

export default function AdminLayout({ children }) {
    const pathname = usePathname();
    const isAuthPage = pathname.includes("/auth/");

    if (isAuthPage) return <>{children}</>;

    const navItems = [
        { name: "대시보드", path: "/admin/dashboard", icon: "📊" },
        { name: "회원 관리", path: "/admin/members", icon: "👥" },
        { name: "수업 일정", path: "/admin/sessions/schedule", icon: "📅" },
        { name: "코치 관리", path: "/admin/coaches", icon: "🏃" },
        { name: "시설 설정", path: "/admin/settings/facility", icon: "🏢" },
        { name: "공지 관리", path: "/admin/content/notices", icon: "📣" },
        { name: "결제 내역", path: "/admin/billing", icon: "💳" },
        { name: "고객 지원", path: "/admin/support", icon: "🎧" },
    ];

    return (
        <AuthGuard requiredRole="admin">
            <div style={{ display: "flex", minHeight: "100vh" }}>
                {/* Sidebar */}
                <aside className="glass-effect" style={{
                    width: "var(--sidebar-width)",
                    borderRight: "1px solid var(--border-subtle)",
                    padding: "24px 16px",
                    display: "flex",
                    flexDirection: "column",
                    position: "fixed",
                    height: "100vh",
                    zIndex: 100
                }}>
                    <div style={{ marginBottom: "32px", padding: "0 8px" }}>
                        <h2 style={{ fontSize: "1.25rem", color: "var(--brand-primary)" }}>BCL ADMIN</h2>
                    </div>

                    <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                        {navItems.map((item) => (
                            <a
                                key={item.path}
                                href={item.path}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    padding: "12px",
                                    borderRadius: "10px",
                                    color: pathname === item.path ? "white" : "var(--text-secondary)",
                                    background: pathname === item.path ? "rgba(255, 107, 0, 0.1)" : "transparent",
                                    fontSize: "0.95rem",
                                    fontWeight: pathname === item.path ? "600" : "400",
                                    transition: "all 0.2s ease"
                                }}
                            >
                                <span>{item.icon}</span>
                                {item.name}
                            </a>
                        ))}
                    </nav>

                    <div style={{ marginTop: "auto", padding: "16px 8px", borderTop: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "12px" }}>
                        <a href="/apps/dashboard" style={{ color: "var(--brand-primary)", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
                            📱 사용자 앱으로 전환
                        </a>
                        <a href="/auth/logout?from=admin" style={{ color: "var(--status-error)", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
                            🚪 로그아웃
                        </a>
                    </div>
                </aside>

                {/* Main Content */}
                <main style={{
                    marginLeft: "var(--sidebar-width)",
                    flex: 1,
                    padding: "32px",
                    background: "var(--bg-primary)"
                }}>
                    <div style={{ maxWidth: "var(--content-max-width)", margin: "0 auto" }}>
                        {children}
                    </div>
                </main>
            </div>
        </AuthGuard>
    );
}
