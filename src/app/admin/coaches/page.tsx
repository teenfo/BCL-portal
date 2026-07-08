'use client';

// /admin/coaches — 코치 (02-admin §3.7). 진입 가드·권한은 admin/layout에서 처리.
import { CoachesScreen } from '@/features/coaches/CoachesScreen';

export default function AdminCoachesPage() {
  return <CoachesScreen />;
}
