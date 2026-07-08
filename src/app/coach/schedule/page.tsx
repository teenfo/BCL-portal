'use client';

// /coach/schedule — 일정 + 세션 운영 보드 (docs/04 §3.2, 중앙 강조 탭)
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui';
import { CoachScheduleScreen } from '@/features/coach-schedule';

export default function CoachSchedulePage() {
  return (
    <Suspense fallback={<Skeleton variant="rect" height={200} />}>
      <CoachScheduleScreen />
    </Suspense>
  );
}
