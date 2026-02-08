"use client";
import Link from "next/navigation";
import { usePathname } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";

export default function AdminLayout({ children }) {
    const pathname = usePathname();
    const isAuthPage = pathname.includes("/auth/");

    if (isAuthPage) return <>{children}</>;

    const navGroups = [
        {
            group: "운영 대시보드",
            items: [
                { name: "대시보드", path: "/admin/dashboard", icon: "📊" },
                { name: "통계 리포트", path: "/admin/reports", icon: "📈" },
            ]
        },
        {
            group: "회원 및 결제",
            items: [
                { name: "회원 목록", path: "/admin/members", icon: "👥" },
                { name: "출석 로그", path: "/admin/attendance", icon: "📋" },
                { name: "멤버십/결제", path: "/admin/billing", icon: "💳" },
            ]
        },
        {
            group: "시설 및 수업",
            items: [
                { name: "수업 일정", path: "/admin/sessions/schedule", icon: "📅" },
                { name: "예약 관리", path: "/admin/reservations", icon: "📝" },
                { name: "라이브 체크인", path: "/admin/checkin/live", icon: "🔔" },
                { name: "코치 관리", path: "/admin/coaches", icon: "🏃" },
            ]
        },
        {
            group: "콘텐츠 및 알림",
            items: [
                { name: "공지사항", path: "/admin/content/notices", icon: "📣" },
                { name: "배너 관리", path: "/admin/content/banners", icon: "🖼️" },
                { name: "커뮤니티", path: "/admin/content/posts", icon: "💬" },
                { name: "알림 템플릿", path: "/admin/notifications/templates", icon: "📩" },
                { name: "발송 로그", path: "/admin/notifications/logs", icon: "📜" },
            ]
        },
        {
            group: "시스템 설정",
            items: [
                { name: "지점 정보", path: "/admin/settings/facility", icon: "🏢" },
                { name: "기타 로그", path: "/admin/logs/audit", icon: "🔍" },
            ]
        }
    ];

    return (
        <AuthGuard requiredRole="admin">
            <div style={{ display: "flex", minHeight: "100vh" }}>
                {/* Sidebar */}
                <aside className="custom-scrollbar" style={{
                    width: "280px",
                    background: "var(--bg-secondary)",
                    borderRight: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    position: "fixed",
                    height: "100vh",
                    zIndex: 100,
                    overflowY: "auto"
                }}>
                    <div style={{ padding: "32px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <h2 style={{ fontSize: "1.4rem", fontWeight: "900", letterSpacing: "-1px" }}>
                            BCL <span style={{ color: "var(--brand-primary)" }}>ADMIN</span>
                        </h2>
                    </div>

                    <nav style={{ flex: 1, padding: "24px 12px" }}>
                        {navGroups.map((group, gIdx) => (
                            <div key={gIdx} style={{ marginBottom: "24px" }}>
                                <h3 style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", padding: "0 12px", marginBottom: "8px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>
                                    {group.group}
                                </h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                    {group.items.map((item) => (
                                        <a
                                            key={item.path}
                                            href={item.path}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "12px",
                                                padding: "10px 12px",
                                                borderRadius: "8px",
                                                color: pathname.startsWith(item.path) ? "white" : "rgba(255,255,255,0.5)",
                                                background: pathname.startsWith(item.path) ? "rgba(255, 107, 0, 0.15)" : "transparent",
                                                fontSize: "0.9rem",
                                                fontWeight: pathname.startsWith(item.path) ? "600" : "400",
                                                transition: "all 0.2s ease"
                                            }}
                                        >
                                            <span style={{ fontSize: "1.1rem" }}>{item.icon}</span>
                                            {item.name}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>

                    <div style={{ mt: "auto", padding: "24px", background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                        <a href="/apps/dashboard" style={{ color: "var(--brand-primary)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px", mb: "16px", textDecoration: "none" }}>
                            📱 사용자 앱 전환
                        </a>
                        <a href="/auth/logout?from=admin" style={{ color: "var(--status-error)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
                            🚪 로그아웃
                        </a>
                    </div>
                </aside>

                {/* Main Content */}
                <main style={{
                    marginLeft: "280px",
                    flex: 1,
                    padding: "40px",
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
