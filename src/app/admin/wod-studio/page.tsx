'use client';

// /admin/wod-studio — WOD 스튜디오 (02-admin §3.8). 진입 가드·권한은 admin/layout에서 처리.
import { WodStudioScreen } from '@/features/wod-studio/WodStudioScreen';
import { PermissionGate } from '@/features/permissions';

export default function AdminWodStudioPage() {
  return (
    <PermissionGate group="wod_studio">
      <WodStudioScreen />
    </PermissionGate>
  );
}
