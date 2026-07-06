'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * T3-9: 역할 기반 메뉴 접근 통제를 위한 퍼미션 훅
 *
 * admin_user_roles → admin_roles.permissions 기반으로
 * 현재 사용자의 접근 가능한 메뉴 그룹과 세부 퍼미션을 반환합니다.
 *
 * permission 구조:
 * {
 *   members: ['view', 'edit', 'delete'],
 *   finance: ['view', 'refund', 'export'],
 *   operations: ['view', 'edit'],
 *   crm: ['view', 'edit', 'send'],
 *   system: ['settings', 'roles', 'audit'],
 * }
 */

// 메뉴 그룹 → 필요 퍼미션 매핑
const MENU_PERMISSION_MAP: Record<string, { group: string; action: string }> = {
    // INSIGHTS
    '/admin/dashboard': { group: '*', action: 'view' },
    '/admin/insights/attendance': { group: 'operations', action: 'view' },
    '/admin/insights/finance': { group: 'finance', action: 'view' },
    '/admin/insights/feedback': { group: 'crm', action: 'view' },
    // USER & FINANCE
    '/admin/members': { group: 'members', action: 'view' },
    '/admin/memberships': { group: 'members', action: 'view' },
    '/admin/checkins': { group: 'members', action: 'view' },
    '/admin/plans': { group: 'finance', action: 'view' },
    '/admin/transactions': { group: 'finance', action: 'view' },
    // OPERATIONS
    '/admin/operations/schedule': { group: 'operations', action: 'view' },
    '/admin/operations/wod-templates': { group: 'operations', action: 'view' },
    '/admin/operations/movement-library': { group: 'operations', action: 'view' },
    '/admin/operations/coaches': { group: 'operations', action: 'view' },
    '/admin/operations/reservations': { group: 'operations', action: 'view' },
    '/admin/operations/race': { group: 'operations', action: 'view' },
    '/admin/operations/lockers': { group: 'operations', action: 'view' },
    '/admin/operations/infrastructure': { group: 'operations', action: 'view' },
    '/admin/operations/roles': { group: 'system', action: 'roles' },
    // CRM
    '/admin/crm/content': { group: 'crm', action: 'view' },
    '/admin/crm/notifications': { group: 'crm', action: 'view' },
    '/admin/crm/support': { group: 'crm', action: 'view' },
    '/admin/crm/feedback': { group: 'crm', action: 'view' },
    // INFRASTRUCTURE
    '/admin/setup/branch': { group: 'system', action: 'settings' },
    '/admin/setup/system': { group: 'system', action: 'settings' },
    '/admin/setup/settings': { group: 'system', action: 'settings' },
    '/admin/setup/audit': { group: 'system', action: 'audit' },
};

export interface AdminPermissions {
    /** 전체 퍼미션 맵 */
    permissions: Record<string, string[]>;
    /** 사용자의 역할들 */
    roleNames: string[];
    /** 특정 퍼미션 보유 여부 확인 */
    hasPermission: (group: string, action: string) => boolean;
    /** 특정 메뉴 경로 접근 가능 여부 */
    canAccessMenu: (href: string) => boolean;
    /** admin 역할인지 (모든 권한 보유) */
    isFullAdmin: boolean;
    /** 로딩 중 */
    loading: boolean;
}

export function useAdminPermissions(): AdminPermissions {
    const { user, profile, loading: authLoading } = useAuth();
    const [permissions, setPermissions] = useState<Record<string, string[]>>({});
    const [roleNames, setRoleNames] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const loadedRef = useRef(false);

    // profile.role === 'admin' 이면 가장 기본 admin → 모든 권한 부여
    const isFullAdmin = profile?.role === 'admin';

    const loadPermissions = useCallback(async () => {
        if (!user?.id || authLoading) return;
        if (loadedRef.current) return;
        loadedRef.current = true;

        const supabase = createClient();

        try {
            // admin_user_roles 에서 이 유저의 역할 가져오기
            const { data: userRoles, error: urError } = await supabase
                .from('admin_user_roles')
                .select('role_id, admin_roles(name, permissions)')
                .eq('user_id', user.id);

            if (urError || !userRoles || userRoles.length === 0) {
                // 역할 미배정 → admin이면 전체 권한, 아니면 빈 퍼미션
                if (isFullAdmin) {
                    // admin 역할은 기본적으로 모든 퍼미션
                    setPermissions({
                        members: ['view', 'edit', 'delete'],
                        finance: ['view', 'refund', 'export'],
                        operations: ['view', 'edit', 'delete'],
                        crm: ['view', 'edit', 'send'],
                        system: ['settings', 'roles', 'audit'],
                    });
                    setRoleNames(['admin']);
                }
                setLoading(false);
                return;
            }

            // 여러 역할의 퍼미션을 병합 (Union)
            // permissions는 배열형({g:['view']})과 RBAC 시드 불리언 맵형
            // ({'*':{...}} / {g:{read:true}}) 두 형태가 공존하므로 양쪽 모두 처리.
            const LEGACY_REVERSE: Record<string, string> = { read: 'view', write: 'edit', delete: 'delete' };
            const FULL_PERMS: Record<string, string[]> = {
                members: ['view', 'edit', 'delete'],
                finance: ['view', 'refund', 'export'],
                operations: ['view', 'edit', 'delete'],
                crm: ['view', 'edit', 'send'],
                system: ['settings', 'roles', 'audit'],
            };
            const merged: Record<string, Set<string>> = {};
            const names: string[] = [];
            const addPerm = (group: string, action: string) => {
                if (!merged[group]) merged[group] = new Set();
                merged[group].add(action);
            };

            userRoles.forEach((ur: any) => {
                const role = ur.admin_roles;
                if (!role) return;
                names.push(role.name);
                const perms = role.permissions as Record<string, unknown> | null;
                if (!perms) return;
                // 와일드카드(super_admin 시드) → 전체 권한
                if (perms['*'] && typeof perms['*'] === 'object') {
                    Object.entries(FULL_PERMS).forEach(([g, actions]) => actions.forEach(a => addPerm(g, a)));
                    return;
                }
                Object.entries(perms).forEach(([group, actions]) => {
                    if (Array.isArray(actions)) {
                        actions.forEach(a => addPerm(group, a));
                    } else if (actions && typeof actions === 'object') {
                        Object.entries(actions as Record<string, boolean>).forEach(([k, v]) => {
                            if (v) addPerm(group, LEGACY_REVERSE[k] || k);
                        });
                    }
                });
            });

            const finalPerms: Record<string, string[]> = {};
            Object.entries(merged).forEach(([group, actions]) => {
                finalPerms[group] = Array.from(actions);
            });

            setPermissions(finalPerms);
            setRoleNames(names);
        } catch (err) {
            console.error('[useAdminPermissions] Error loading permissions:', err);
        }
        setLoading(false);
    }, [user?.id, authLoading, isFullAdmin]);

    useEffect(() => {
        if (!authLoading) {
            loadPermissions();
        }
    }, [authLoading, loadPermissions]);

    // 특정 퍼미션 보유 확인
    const hasPermission = useCallback((group: string, action: string): boolean => {
        if (isFullAdmin) return true;
        const actions = permissions[group];
        if (!actions) return false;
        return actions.includes(action);
    }, [permissions, isFullAdmin]);

    // 메뉴 접근 가능 여부
    const canAccessMenu = useCallback((href: string): boolean => {
        if (isFullAdmin) return true;
        const mapping = MENU_PERMISSION_MAP[href];
        if (!mapping) return true; // 매핑 없으면 기본 허용
        if (mapping.group === '*') return true; // 대시보드는 모두 접근
        return hasPermission(mapping.group, mapping.action);
    }, [isFullAdmin, hasPermission]);

    return {
        permissions,
        roleNames,
        hasPermission,
        canAccessMenu,
        isFullAdmin,
        loading: loading || authLoading,
    };
}
