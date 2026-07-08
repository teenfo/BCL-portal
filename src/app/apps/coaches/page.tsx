// 🔄 as-is /apps/coaches → schedule(세션 상세에서 코치 흡수) (docs/03 §2.2 #10)
import { redirect } from 'next/navigation';
export default function Page() {
  redirect('/apps/schedule');
}
