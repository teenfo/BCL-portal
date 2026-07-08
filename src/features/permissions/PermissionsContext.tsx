'use client';

// Admin 권한 게이트 단일 소스 — fn_my_permissions 1회 조회 후 컨텍스트로 공유 (계약 §3, 07 §7.1)
// UI 게이트의 유일한 소스: 사이드바 메뉴 노출·화면 내 행동 활성화 모두 여기 can()만 참조.
import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { rpc } from '@/lib/supabase/query';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'all';

interface MyPermissions {
  user_id: string;
  role: 'admin' | 'coach' | 'member';
  approval_status: 'pending' | 'approved' | 'rejected';
  is_super_admin: boolean;
  permissions: Record<string, string[]>;
}

export interface PermissionsContextValue {
  loading: boolean;
  error: string | null;
  role: MyPermissions['role'] | null;
  isSuperAdmin: boolean;
  /** 그룹×액션 보유 여부. super_admin은 항상 true. view 미보유 그룹은 사이드바 미노출 */
  can: (group: string, action?: PermissionAction) => boolean;
  refetch: () => void;
}

export const PermissionsContext = createContext<PermissionsContextValue | null>(null);

const SAFETY_TIMEOUT_MS = 4_000; // 12 §4.11 / 01-auth F-5 — 무한 스켈레톤 금지

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<MyPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reqRef = useRef(0);

  const load = useCallback(async () => {
    const reqId = ++reqRef.current;
    // 마이크로태스크 이후 상태 전이 — 이펙트 동기 setState(cascading render) 회피
    await Promise.resolve();
    if (reqId !== reqRef.current) return;
    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      if (reqId === reqRef.current) {
        setLoading(false);
        setError('권한 정보를 불러오지 못했습니다. 다시 시도해주세요.');
      }
    }, SAFETY_TIMEOUT_MS);
    const res = await rpc<MyPermissions>(getSupabaseBrowserClient(), 'fn_my_permissions');
    clearTimeout(timer);
    if (reqId !== reqRef.current) return;
    if (!res.success || !res.data) {
      setData(null);
      setError(res.error ?? '권한 정보를 불러오지 못했습니다.');
    } else {
      setData(res.data);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // 마운트 시 권한 1회 조회 — load 내부에서 마이크로태스크 이후 로딩 전이(cascading render 회피)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const value = useMemo<PermissionsContextValue>(() => {
    const isSuperAdmin = data?.is_super_admin ?? false;
    return {
      loading,
      error,
      role: data?.role ?? null,
      isSuperAdmin,
      can: (group, action = 'view') => {
        if (isSuperAdmin) return true;
        const actions = data?.permissions?.[group];
        if (!actions) return false;
        return actions.includes(action) || actions.includes('all');
      },
      refetch: load,
    };
  }, [data, loading, error, load]);

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}
