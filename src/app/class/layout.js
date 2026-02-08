"use client";
import { usePathname } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { useEffect, useState } from "react";

export default function ClassPortalLayout({ children }) {
    const pathname = usePathname();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const isAuthPage = pathname.includes("/auth/");
    if (isAuthPage) return <>{children}</>;

    const navItems = [
        { name: "LIVE HUB", path: "/class/live", icon: "📺" },
        { name: "WOD BOARD", path: "/class/wod", icon: "📋" },
        { name: "TIMER", path: "/class/timer", icon: "⏱️" },
        { name: "LEADERBOARD", path: "/class/leaderboard", icon: "🏆" },
    ];

    return (
        <AuthGuard>
            <div style={{
                minHeight: "100vh",
                background: "#000000",
                color: "#ffffff",
                display: "flex",
                flexDirection: "column",
                fontFamily: "var(--font-inter)",
                overflow: "hidden"
            }}>
                {/* Global Top Bar */}
                <header style={{
                    height: "80px",
                    padding: "0 40px",
                    background: "rgba(255,255,255,0.03)",
                    borderBottom: "2px solid rgba(255,255,255,0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    zIndex: 100
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                        <h1 style={{ fontSize: "1.8rem", fontWeight: "900", letterSpacing: "-1px" }}>
                            BCL <span style={{ color: "var(--brand-primary)" }}>CLASS</span>
                        </h1>
                        <nav style={{ display: "flex", gap: "10px", marginLeft: "40px" }}>
                            {navItems.map((item) => (
                                <a
                                    key={item.path}
                                    href={item.path}
                                    style={{
                                        padding: "10px 24px",
                                        borderRadius: "12px",
                                        fontSize: "1rem",
                                        fontWeight: "700",
                                        color: pathname === item.path ? "white" : "rgba(255,255,255,0.4)",
                                        background: pathname === item.path ? "var(--brand-primary)" : "transparent",
                                        transition: "all 0.2s ease"
                                    }}
                                >
                                    {item.name}
                                </a>
                            ))}
                        </nav>
                    </div>

                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "1.8rem", fontWeight: "800", fontFamily: "monospace" }}>
                            {currentTime.toLocaleTimeString('ko-KR', { hour12: false })}
                        </div>
                        <div style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.4)", fontWeight: "600" }}>
                            {currentTime.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <main style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                    {children}
                </main>

                {/* Footer / Status */}
                <footer style={{
                    height: "40px",
                    background: "rgba(0,0,0,0.5)",
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 40px",
                    fontSize: "0.85rem",
                    color: "rgba(255,255,255,0.3)",
                    justifyContent: "space-between"
                }}>
                    <div>SYSTEM STATUS: <span style={{ color: "var(--status-success)" }}>ONLINE</span></div>
                    <div style={{ display: "flex", gap: "20px" }}>
                        <a href="/admin" style={{ color: "inherit" }}>ADMIN</a>
                        <a href="/coach" style={{ color: "inherit" }}>COACH</a>
                        <a href="/apps" style={{ color: "inherit" }}>APPS</a>
                    </div>
                </footer>
            </div>
        </AuthGuard>
    );
}
