"use client";
import { usePathname } from "next/navigation";

export default function AppsLayout({ children }) {
    const pathname = usePathname();

    const navItems = [
        { name: "홈", path: "/apps/dashboard", icon: "🏠" },
        { name: "일정", path: "/apps/schedule", icon: "📅" },
        { name: "체크인", path: "/apps/checkin", icon: "QR" },
        { name: "시설", path: "/apps/facilities", icon: "🏢" },
        { name: "프로필", path: "/apps/profile", icon: "👤" },
    ];

    // Auth pages should not show the bottom nav
    const isAuthPage = pathname.includes("/auth/");

    if (isAuthPage) return <>{children}</>;

    return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-primary)" }}>
            {/* Header */}
            <header className="glass-effect" style={{
                height: "var(--header-height)",
                display: "flex",
                alignItems: "center",
                padding: "0 20px",
                position: "sticky",
                top: 0,
                zIndex: 100,
                borderBottom: "1px solid var(--border-subtle)"
            }}>
                <h1 style={{ fontSize: "1.1rem", fontWeight: "700", background: "linear-gradient(135deg, #fff, #888)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    BCL PORTAL
                </h1>
            </header>

            {/* Content */}
            <main style={{ flex: 1, padding: "20px", paddingBottom: "calc(var(--bottom-nav-height) + 20px)" }}>
                <div style={{ maxWidth: "600px", margin: "0 auto" }}>
                    {children}
                </div>
            </main>

            {/* Bottom Nav */}
            <nav className="glass-effect" style={{
                height: "var(--bottom-nav-height)",
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "space-around",
                alignItems: "center",
                borderTop: "1px solid var(--border-subtle)",
                zIndex: 100,
                paddingBottom: "env(safe-area-inset-bottom)"
            }}>
                {navItems.map((item) => (
                    <a
                        key={item.path}
                        href={item.path}
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "4px",
                            color: pathname === item.path ? "var(--brand-primary)" : "var(--text-secondary)",
                            fontSize: "0.7rem",
                            fontWeight: pathname === item.path ? "600" : "400",
                            transition: "all 0.2s ease"
                        }}
                    >
                        <span style={{ fontSize: "1.2rem" }}>{item.icon}</span>
                        {item.name}
                    </a>
                ))}
            </nav>
        </div>
    );
}
