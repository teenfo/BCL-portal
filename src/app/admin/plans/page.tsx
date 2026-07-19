'use client';

// /admin/plans — 요금제 (02-admin §3.5). 진입 가드·권한은 admin/layout에서 처리.
import { PlansScreen } from '@/features/plans/PlansScreen';
import { PermissionGate } from '@/features/permissions';

export default function AdminPlansPage() {
  return (
    <PermissionGate group="plans">
      <PlansScreen />
    </PermissionGate>
  );
}
