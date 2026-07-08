'use client';

// /admin/members — 회원 목록 (02-admin §3.2). 진입 가드·권한은 admin/layout에서 처리.
import { MembersListScreen } from '@/features/members/MembersListScreen';

export default function AdminMembersPage() {
  return <MembersListScreen />;
}
