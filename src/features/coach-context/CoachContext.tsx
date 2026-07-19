'use client';

// 코치 상태머신 컨텍스트 (docs/04 §4.1) — 판정 소스는 fn_get_my_coach_context() 단일.
// 레이아웃 레벨 1회 조회 후 메모리 캐시(탭 전환 시 재조회 안 함 — 레이아웃 persist).
// 401/권한 오류 수신 시 invalidate()로 무효화 → 재판정 (docs/04 §4.2).
import { createContext, useMemo, type ReactNode } from 'react';
import { useQuery } from '@/lib/data/useQuery';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export type CoachContextStatus =
  | 'unlinked'
  | 'linked_unassigned'
  | 'linked_active'
  | 'on_leave';

export interface CoachContextData {
  context_status: CoachContextStatus;
  linked: boolean;
  coach_id?: string;
  coach_name?: string;
  has_assignments?: boolean;
  assignment_count?: number;
}

export interface CoachContextValue {
  loading: boolean;
  error: string | null;
  status: CoachContextStatus | null;
  coachId: string | null;
  coachName: string | null;
  assignmentCount: number;
  /** 운영 화면 접근 허용 여부 = linked_active */
  canOperate: boolean;
  refetch: () => void;
  /** RPC 권한 오류 수신 시 컨텍스트 무효화 후 재판정 */
  invalidate: () => void;
}

export const CoachContext = createContext<CoachContextValue | null>(null);

export function CoachContextProvider({ children }: { children: ReactNode }) {
  // useQuery: 마운트 1회 조회(레이아웃 persist로 탭 전환 시 재조회 안 함) + 유한 로딩/에러 표면화
  const q = useQuery<CoachContextData>(
    () => rpc<CoachContextData>(getSupabaseBrowserClient(), 'fn_get_my_coach_context'),
    [],
  );

  const value = useMemo<CoachContextValue>(() => {
    const status = q.data?.context_status ?? null;
    return {
      loading: q.loading,
      error: q.error,
      status,
      coachId: q.data?.coach_id ?? null,
      coachName: q.data?.coach_name ?? null,
      assignmentCount: q.data?.assignment_count ?? 0,
      canOperate: status === 'linked_active',
      refetch: q.refetch,
      invalidate: q.refetch,
    };
  }, [q.data, q.loading, q.error, q.refetch]);

  return <CoachContext.Provider value={value}>{children}</CoachContext.Provider>;
}
