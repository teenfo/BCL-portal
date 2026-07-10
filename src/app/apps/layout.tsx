// /apps(회원) 셸 — light/mobile 밀도 + AuthGuard + Toast + 하단탭 셸 (docs/12 §6, docs/01 §5.4, docs/03)
import type { Metadata, Viewport } from 'next';
import { ThemeScope } from '@/components/ThemeScope';
import { AuthGuard } from '@/features/auth';
import { ToastProvider } from '@/components/ui';
import { MemberShell } from '@/features/member-shell';

// PWA — iOS 홈화면 설치 메타(매니페스트는 app/manifest.ts). 회원 앱 스코프에만 적용.
export const metadata: Metadata = {
  applicationName: 'BCL',
  appleWebApp: { capable: true, title: 'BCL', statusBarStyle: 'default' },
  icons: { apple: '/icons/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: '#ff6a00',
};

export default function AppsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeScope theme="light" density="mobile">
      <AuthGuard requiredPrefix="/apps">
        <ToastProvider>
          <MemberShell>{children}</MemberShell>
        </ToastProvider>
      </AuthGuard>
    </ThemeScope>
  );
}
