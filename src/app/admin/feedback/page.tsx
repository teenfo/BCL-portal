'use client';

// /admin/feedback — 피드백 (02-admin §3.12). 진입 가드·권한은 admin/layout에서 처리.
import { FeedbackScreen } from '@/features/feedback/FeedbackScreen';

export default function AdminFeedbackPage() {
  return <FeedbackScreen />;
}
