'use client';

// /class/race/view — 2.5D 카트레이싱 관전 (docs/15 ⑤-b). ?event={id}
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RaceView } from '@/features/class-race';

function ViewEntry() {
  const params = useSearchParams();
  return <RaceView eventId={params?.get('event') ?? null} />;
}

export default function RaceViewPage() {
  return (
    <Suspense fallback={null}>
      <ViewEntry />
    </Suspense>
  );
}
