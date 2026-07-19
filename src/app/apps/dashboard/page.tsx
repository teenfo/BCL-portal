// 🔄 as-is /apps/dashboard → 표준화된 /apps/home 리다이렉트 (docs/03 §2.2)
import { redirect } from 'next/navigation';

export default function AppsDashboardRedirect() {
  redirect('/apps/home');
}
