'use client';

// /admin/attendance — 출석 (02-admin §3.3). 진입 가드·권한은 admin/layout에서 처리.
import { AttendanceScreen } from '@/features/attendance/AttendanceScreen';

export default function AdminAttendancePage() {
  return <AttendanceScreen />;
}
