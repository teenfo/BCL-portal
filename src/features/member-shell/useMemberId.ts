'use client';

// 회원 앱 공용 훅 — auth 컨텍스트에서 memberId/profile 소비 (비즈니스 참조는 member_id만, F-8)
import { useAuth } from '@/features/auth';

export function useMemberId(): string | null {
  return useAuth().memberId;
}
