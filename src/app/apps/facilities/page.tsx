// 🔄 as-is /apps/facilities → home(지점 카드) (docs/03 §2.2 #6)
import { redirect } from 'next/navigation';
export default function Page() {
  redirect('/apps/home');
}
