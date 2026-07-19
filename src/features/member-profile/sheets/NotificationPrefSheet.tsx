'use client';

// profile §알림 설정 — 리치 편집기(NotificationPreferences) 단일 소스를 BottomSheet 로 노출.
// 카테고리 6종 + 채널(push/kakao/sms) opt-in + 방해금지 시간대. 로딩/에러/저장은 리치 컴포넌트가 자체 처리.
import { BottomSheet } from '@/features/member-shell';
import { NotificationPreferences } from '@/features/member-notifications';

export function NotificationPrefSheet({ onClose }: { onClose: () => void }) {
  return (
    <BottomSheet variant="auto" title="알림 설정" onClose={onClose}>
      <NotificationPreferences onSaved={onClose} />
    </BottomSheet>
  );
}
