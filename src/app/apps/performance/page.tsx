'use client';
import { Suspense } from 'react';
import { PerformanceScreen } from '@/features/member-performance';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PerformanceScreen />
    </Suspense>
  );
}
