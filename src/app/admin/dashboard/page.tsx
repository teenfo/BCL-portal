'use client';

// /admin/dashboard — 운영 홈 (02-admin §3.1). 화면 본문은 features/dashboard.
// 진입 가드·권한 컨텍스트는 admin/layout(AuthGuard+PermissionsProvider)에서 처리됨.
import { DashboardScreen } from '@/features/dashboard/DashboardScreen';

export default function AdminDashboardPage() {
  return <DashboardScreen />;
}
