'use client';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui';
import { ScheduleScreen } from '@/features/member-schedule';

export default function Page() {
  return (
    <Suspense fallback={<Skeleton variant="rect" height={200} />}>
      <ScheduleScreen />
    </Suspense>
  );
}
