// 🔄 as-is /apps/records → performance §내 기록 (docs/03 §2.2 #7)
import { redirect } from 'next/navigation';
export default function Page() {
  redirect('/apps/performance?tab=records');
}
