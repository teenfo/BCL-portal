// 🔄 as-is /apps/leaderboard → performance §랭킹 (docs/03 §2.2 #8)
import { redirect } from 'next/navigation';
export default function Page() {
  redirect('/apps/performance?tab=leaderboard');
}
