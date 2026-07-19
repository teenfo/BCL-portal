'use client';

// /admin/badges — 배지 (02-admin §3.11). 진입 가드·권한은 admin/layout에서 처리.
import { BadgesScreen } from '@/features/badges/BadgesScreen';
import { PermissionGate } from '@/features/permissions';

export default function AdminBadgesPage() {
  return (
    <PermissionGate group="badges">
      <BadgesScreen />
    </PermissionGate>
  );
}
