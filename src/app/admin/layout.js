"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";

export default function AdminLayout({ children }) {
    const pathname = usePathname();
    const isAuthPage = pathname.includes("/auth/");

    if (isAuthPage) return <>{children}</>;

    const navGroups = [
        {
            group: "운영 현황 및 리포트",
            items: [
                { name: "대시보드", path: "/admin/dashboard", icon: "📊" },
                { name: "출석 리포트", path: "/admin/reports/attendance", icon: "📈" },
                { name: "수업 운영 리포트", path: "/admin/reports/sessions", icon: "📊" },
                { name: "매출 리포트", path: "/admin/reports/revenue", icon: "💰" },
                { name: "코치 성과", path: "/admin/reports/coaches", icon: "🏆" },
            ]
        },
        {
            group: "회원 및 매출 관리",
            items: [
                { name: "회원 목록", path: "/admin/members", icon: "👥" },
                { name: "출석·체크인 로그", path: "/admin/attendance", icon: "📋" },
                { name: "요금제(플랜) 관리", path: "/admin/billing/plans", icon: "💎" },
                { name: "결제 및 환불 내역", path: "/admin/billing/payments", icon: "💳" },
                { name: "정산 관리", path: "/admin/billing/settlements", icon: "💰" },
            ]
        },
        {
            group: "클래스 및 현장 운영",
            items: [
                { name: "수업 스케줄", path: "/admin/sessions/schedule", icon: "📅" },
                { name: "예약 및 대기 관리", path: "/admin/reservations", icon: "📝" },
                { name: "코치 관리", path: "/admin/coaches", icon: "🏃" },
                { name: "현장 체크인 제어", path: "/admin/checkin/live", icon: "🔔" },
                { name: "권한 제어(Access)", path: "/admin/access-control", icon: "🛡️" },
            ]
        },
        {
            group: "콘텐츠 및 고객 소통",
            items: [
                { name: "공지 및 배너", path: "/admin/content/notices", icon: "📣" },
                { name: "커뮤니티 관리", path: "/admin/content/posts", icon: "💬" },
                { name: "알림 센터", path: "/admin/notifications/templates", icon: "📩" },
                { name: "고객 지원", path: "/admin/support", icon: "🎧" },
            ]
        },
        {
            group: "시스템 설정 및 보안",
            items: [
                { name: "지점 및 정책 설정", path: "/admin/settings/facility", icon: "🏢" },
                { name: "시스템 연동", path: "/admin/integrations/payments", icon: "🔌" },
                { name: "보안 감사 로그", path: "/admin/audit/actions", icon: "🔍" },
                { name: "데이터 관리", path: "/admin/integrations/import-export", icon: "📂" },
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
