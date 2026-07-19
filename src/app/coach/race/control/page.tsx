'use client';

// /coach/race/control — Race 컨트롤 룸 (docs/04 §3.4)
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui';
import { RaceControl } from '@/features/coach-race';

export default function CoachRaceControlPage() {
  return (
    <Suspense fallback={<Skeleton variant="rect" height={200} />}>
      <RaceControl />
    </Suspense>
  );
}
