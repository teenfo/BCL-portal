import { redirect } from 'next/navigation';

// 루트 진입 → 로그인으로 (로그인 상태면 login 페이지가 resolvePostLoginRoute로 재이탈 — docs/01-auth §1)
export default function Home() {
  redirect('/auth/login');
}
