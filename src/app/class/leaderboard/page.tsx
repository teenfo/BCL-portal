'use client';

// /class/leaderboard — 최근 Race/벤치마크 랭킹 (+ ⏳ 일일 WOD 화이트보드 모드) (docs/05 §5.3).
// ?facility={id}
import { Suspense } from 'react';
import { Leaderboard } from '@/features/class-leaderboard';
import { useFacilityContext } from '@/features/class-common';

function LeaderboardEntry() {
  const facilityId = useFacilityContext();
  return <Leaderboard facilityId={facilityId} />;
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={null}>
      <LeaderboardEntry />
    </Suspense>
  );
}
