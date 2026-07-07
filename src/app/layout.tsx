import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BCL Portal',
  description: '크로스핏/로잉 체육관 통합 운영 플랫폼',
};

// 루트 기본값: dark + mobile. 각 앱 layout이 자신의 테마/밀도를 재지정한다
// (admin: dark/admin · apps/coach: light/mobile · class/kiosk: dark/tv|mobile — docs/12 §5)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-theme="dark" data-density="mobile">
      <body>{children}</body>
    </html>
  );
}
