// /coach 인덱스 — 코치 랜딩(/coach/dashboard)으로 리다이렉트 (docs/04 §0)
import { redirect } from 'next/navigation';

export default function CoachIndexPage() {
  redirect('/coach/dashboard');
}
