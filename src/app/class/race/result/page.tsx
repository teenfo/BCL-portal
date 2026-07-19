'use client';

// /class/race/result — 종료 후 다각도 리더보드·포디움 (docs/15 §5.3). ?event={id}
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RaceResult } from '@/features/class-race';

function ResultEntry() {
  const params = useSearchParams();
  return <RaceResult eventId={params?.get('event') ?? null} />;
}

export default function RaceResultPage() {
  return (
    <Suspense fallback={null}>
      <ResultEntry />
    </Suspense>
  );
}
