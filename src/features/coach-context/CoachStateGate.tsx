'use client';

// CoachStateGate (docs/04 §4.2) — 레이아웃 레벨 1회 적용. 화면별 개별 상태 분기 재구현 금지.
// profile은 모든 상태에서 접근 가능한 유일한 운영 화면. 그 외는 linked_active에서만.
// 게이트는 UI 편의 장치 — 실제 보안 경계는 각 RPC 서버 검증(원칙 ②).
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Card, EmptyState, Skeleton } from '@/components/ui';
import { useCoachContext } from './useCoachContext';
import { CoachStateScreen } from './CoachStateScreen';
import styles from './coach-context.module.css';

/** 모든 코치 상태에서 접근 허용되는 라우트 프리픽스 */
const ALWAYS_ALLOWED = ['/coach/profile'];

export function CoachStateGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { loading, error, status, canOperate, refetch } = useCoachContext();

  const isAlwaysAllowed = ALWAYS_ALLOWED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  // profile은 어떤 상태에서도 통과 (로딩 중에도 프로필 진입 허용 — 유일한 상시 화면)
  if (isAlwaysAllowed) return <>{children}</>;

  if (loading) {
    return (
      <div className={styles.gateWrap}>
        <Card>
          <div className={styles.gateInner} aria-busy="true">
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="rect" height={120} />
            <Skeleton variant="text" width="70%" />
          </div>
        </Card>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className={styles.gateWrap}>
        <Card>
          <EmptyState
            variant="error"
            title="코치 상태를 확인하지 못했습니다"
            description={error ?? '상태 판정에 실패했습니다. 다시 시도해주세요.'}
            onRetry={refetch}
          />
        </Card>
      </div>
    );
  }

  if (canOperate) return <>{children}</>;

  return <CoachStateScreen status={status} onRefresh={refetch} />;
}
