'use client';

import { usePathname } from 'next/navigation';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';

/**
 * T3-9: 역할 기반 페이지 접근 가드
 *
 * Admin 레이아웃 내에서 현재 페이지에 대한 접근 권한이 없으면
 * "접근 권한 없음" 메시지를 표시합니다.
 */
export default function AdminPermissionGuard({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { canAccessMenu, loading, isFullAdmin } = useAdminPermissions();

    // 로딩 중이거나 admin이면 바로 통과
    if (loading || isFullAdmin) return <>{children}</>;

    // 현재 경로를 가장 가까운 메뉴 경로로 정규화
    // (예: /admin/members/abc123 → /admin/members)
    const menuPath = getMenuPath(pathname);

    if (menuPath && !canAccessMenu(menuPath)) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-md">
                    <div className="text-6xl mb-6">🔒</div>
                    <h2 className="text-xl font-black text-white mb-3 uppercase tracking-tight">
                        Access Denied
                    </h2>
                    <p className="text-sm text-white/40 leading-relaxed mb-6">
                        이 페이지에 접근할 권한이 없습니다.<br />
                        관리자에게 역할 배정을 요청해 주세요.
                    </p>
                    <div
                        className="inline-block px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest"
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: 'rgba(255,255,255,0.3)',
                        }}
                    >
                        Required: {menuPath?.split('/').pop() || 'unknown'} permissions
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

/**
 * 현재 경로에서 가장 가까운 메뉴 경로를 추출
 * /admin/members/abc → /admin/members
 * /admin/operations/schedule → /admin/operations/schedule
 */
function getMenuPath(pathname: string | null): string | null {
    if (!pathname) return null;

    // 정확한 메뉴 경로 목록
    const menuPaths = [
        '/admin/dashboard',
        '/admin/insights/attendance',
        '/admin/insights/finance',
        '/admin/insights/feedback',
        '/admin/members',
        '/admin/memberships',
        '/admin/checkins',
        '/admin/plans',
        '/admin/transactions',
        '/admin/operations/schedule',
        '/admin/operations/wod-templates',
        '/admin/operations/movement-library',
        '/admin/operations/coaches',
        '/admin/operations/reservations',
        '/admin/operations/race',
        '/admin/operations/lockers',
        '/admin/operations/infrastructure',
        '/admin/operations/roles',
        '/admin/crm/content',
        '/admin/crm/notifications',
        '/admin/crm/support',
        '/admin/crm/feedback',
        '/admin/setup/branch',
        '/admin/setup/system',
        '/admin/setup/settings',
        '/admin/setup/audit',
    ];

    // 가장 긴 매칭부터 확인 (세부 경로 우선)
    const sorted = menuPaths.sort((a, b) => b.length - a.length);
    return sorted.find(p => pathname === p || pathname.startsWith(p + '/')) || null;
}
