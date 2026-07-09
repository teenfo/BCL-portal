'use client';

// /admin/members/[id] — 회원 상세 (02-admin §3.2). 진입 가드·권한은 admin/layout에서 처리.
import { MemberDetailScreen } from '@/features/members/MemberDetailScreen';
import { PermissionGate } from '@/features/permissions';

export default function AdminMemberDetailPage() {
  return (
    <PermissionGate group="members">
      <MemberDetailScreen />
    </PermissionGate>
  );
}
