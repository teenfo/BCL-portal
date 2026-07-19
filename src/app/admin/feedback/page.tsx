'use client';

// /admin/feedback — 피드백 (02-admin §3.12). 진입 가드·권한은 admin/layout에서 처리.
import { FeedbackScreen } from '@/features/feedback/FeedbackScreen';
import { PermissionGate } from '@/features/permissions';

export default function AdminFeedbackPage() {
  return (
    <PermissionGate group="feedback">
      <FeedbackScreen />
    </PermissionGate>
  );
}
