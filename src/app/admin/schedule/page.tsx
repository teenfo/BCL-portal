'use client';

// /admin/schedule — 스케줄 (02-admin §3.6). 화면 본문은 features/schedule.
// 진입 가드·권한 컨텍스트는 admin/layout(AuthGuard+PermissionsProvider)에서 처리됨.
import { ScheduleScreen } from '@/features/schedule/ScheduleScreen';
import { PermissionGate } from '@/features/permissions';

export default function AdminSchedulePage() {
  return (
    <PermissionGate group="schedule">
      <ScheduleScreen />
    </PermissionGate>
  );
}
