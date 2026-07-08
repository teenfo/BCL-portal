'use client';

// /class/leaderboard — 최근 Race/벤치마크 랭킹 + 일일 WOD 화이트보드 모드 (docs/05 §5.3).
// ?facility={id} · ?session={id} 지정 시 daily-WOD 화이트보드.
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Leaderboard } from '@/features/class-leaderboard';
import { useFacilityContext } from '@/features/class-common';

function LeaderboardEntry() {
  const facilityId = useFacilityContext();
  const params = useSearchParams();
  const sessionId = params?.get('session') ?? null;
  return <Leaderboard facilityId={facilityId} sessionId={sessionId} />;
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={null}>
      <LeaderboardEntry />
    </Suspense>
  );
}
