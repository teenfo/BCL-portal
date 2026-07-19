'use client';

// /class/race/run — ERG 데이터 그리드(서브 스크린) (docs/15 §5.2). ?event={id}
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RaceRun } from '@/features/class-race';

function RunEntry() {
  const params = useSearchParams();
  return <RaceRun eventId={params?.get('event') ?? null} />;
}

export default function RaceRunPage() {
  return (
    <Suspense fallback={null}>
      <RunEntry />
    </Suspense>
  );
}
