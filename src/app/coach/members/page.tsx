'use client';

// /coach/members — 회원 케어 (docs/04 §3.3)
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui';
import { CoachMembersScreen } from '@/features/coach-members';

export default function CoachMembersPage() {
  return (
    <Suspense fallback={<Skeleton variant="rect" height={200} />}>
      <CoachMembersScreen />
    </Suspense>
  );
}
