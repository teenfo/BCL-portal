'use client';

// 라우트 단위 권한 게이트 — 사이드바 미노출(nav)에 더해 직접 URL 진입까지 차단한다.
// (메뉴 숨김만으로는 restricted admin이 hidden route로 직행 가능 → 실제 경계는 여기 + 서버 RPC 게이트)
// 진입=해당 그룹 view. super_admin/bootstrap admin은 can()이 항상 true → 통과.
// 로딩=스켈레톤, 거부=표준 EmptyState(error) + 대시보드 복귀 링크. (무한 스피너 금지 — 12 §4.11)
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { EmptyState, Skeleton } from '@/components/ui';
import { useMyPermissions } from './useMyPermissions';
import type { PermissionAction } from './PermissionsContext';
import styles from './PermissionGate.module.css';

export interface PermissionGateProps {
  /** 권한 그룹 키(admin-shell/nav.ts group). 배열이면 any-of — 하나라도 보유 시 통과(예: settings=['settings','audit']) */
  group: string | string[];
  /** 요구 액션 — 라우트 진입은 기본 'view' */
  action?: PermissionAction;
  children: ReactNode;
}

export function PermissionGate({ group, action = 'view', children }: PermissionGateProps) {
  const { loading, error, can } = useMyPermissions();
  const router = useRouter();

  if (loading) {
    return (
      <div className={styles.loading} aria-busy="true">
        <Skeleton variant="text" width="40%" height={28} />
        <Skeleton variant="rect" height={160} srLabel="" />
        <Skeleton variant="rect" height={240} srLabel="" />
      </div>
    );
  }

  const groups = Array.isArray(group) ? group : [group];
  // 권한 조회 실패(error) 시에도 차단 — 표면화는 상위 PermissionsProvider 소비처가 담당, 게이트는 열지 않는다.
  const allowed = !error && groups.some((g) => can(g, action));

  if (!allowed) {
    return (
      <EmptyState
        variant="error"
        title="접근 권한이 없습니다"
        description="이 화면을 볼 수 있는 권한이 없습니다. 필요하면 관리자에게 요청하세요."
        action={{ label: '대시보드로 이동', onClick: () => router.push('/admin/dashboard') }}
      />
    );
  }

  return <>{children}</>;
}
