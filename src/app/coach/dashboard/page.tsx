'use client';

// /coach/dashboard — Home (docs/04 §3.1). 본문은 features/coach-home.
// 진입 가드·상태 게이트는 coach/layout(AuthGuard + CoachContextProvider + CoachStateGate)에서 처리됨.
import { CoachHomeScreen } from '@/features/coach-home';

export default function CoachDashboardPage() {
  return <CoachHomeScreen />;
}
