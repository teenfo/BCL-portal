// /apps(회원) 셸 — light/mobile 밀도 + AuthGuard + Toast + 하단탭 셸 (docs/12 §6, docs/01 §5.4, docs/03)
import type { Metadata, Viewport } from 'next';
import { ThemeScope } from '@/components/ThemeScope';
import { AuthGuard } from '@/features/auth';
import { ToastProvider } from '@/components/ui';
import { MemberShell } from '@/features/member-shell';
import { BRAND_ACCENT_HEX } from '@/lib/brand';

// PWA — 회원 앱 전용 매니페스트(scope /apps) + iOS 홈화면 메타. 앱별 독립 설치.
export const metadata: Metadata = {
  applicationName: 'BCL',
  manifest: '/apps.webmanifest',
  appleWebApp: { capable: true, title: 'BCL', statusBarStyle: 'default' },
  icons: { apple: '/icons/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: BRAND_ACCENT_HEX,
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
