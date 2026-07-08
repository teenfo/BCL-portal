// 🔄 as-is /apps/badges → performance §배지 (docs/03 §2.2 #9)
import { redirect } from 'next/navigation';
export default function Page() {
  redirect('/apps/performance?tab=badges');
}
