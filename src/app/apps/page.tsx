// /apps 인덱스 → home 리다이렉트 (docs/03 §2.2 #1)
import { redirect } from 'next/navigation';

export default function AppsIndex() {
  redirect('/apps/home');
}
