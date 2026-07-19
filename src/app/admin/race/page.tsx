'use client';

// /admin/race — Race 운영 (02-admin §3.9). 진입 가드·권한은 admin/layout에서 처리.
import { RaceScreen } from '@/features/race-admin/RaceScreen';
import { PermissionGate } from '@/features/permissions';

export default function AdminRacePage() {
  return (
    <PermissionGate group="race">
      <RaceScreen />
    </PermissionGate>
  );
}
