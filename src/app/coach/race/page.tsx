'use client';

// /coach/race — Race 허브 (docs/04 §3.4)
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui';
import { CoachRaceHub } from '@/features/coach-race';

export default function CoachRacePage() {
  return (
    <Suspense fallback={<Skeleton variant="rect" height={200} />}>
      <CoachRaceHub />
    </Suspense>
  );
}
