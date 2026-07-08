'use client';

// /coach/schedule/rotation — 서킷 콘솔 (docs/04 §3.2-1)
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui';
import { CircuitConsole } from '@/features/coach-schedule';

export default function CoachRotationPage() {
  return (
    <Suspense fallback={<Skeleton variant="rect" height={200} />}>
      <CircuitConsole />
    </Suspense>
  );
}
