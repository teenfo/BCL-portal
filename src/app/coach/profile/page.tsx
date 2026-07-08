'use client';

// /coach/profile — 프로필 + 월간 리포트(read-only) (docs/04 §3.5)
// 모든 코치 상태에서 접근 가능한 유일한 운영 화면(CoachStateGate 예외).
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui';
import { CoachProfileScreen } from '@/features/coach-profile';

export default function CoachProfilePage() {
  return (
    <Suspense fallback={<Skeleton variant="rect" height={200} />}>
      <CoachProfileScreen />
    </Suspense>
  );
}
