// /coach 셸 — light/mobile 밀도 + AuthGuard + 코치 상태머신 게이트 + 하단탭 셸
// (docs/12 §6, docs/01 §5.4, docs/04 §2·§4)
import type { Metadata, Viewport } from 'next';
import { ThemeScope } from '@/components/ThemeScope';
import { AuthGuard } from '@/features/auth';
import { ToastProvider } from '@/components/ui';
import { CoachContextProvider, CoachStateGate } from '@/features/coach-context';
import { CoachShell } from '@/features/coach-shell';
import { BRAND_ACCENT_HEX } from '@/lib/brand';

// PWA — 코치 앱 전용 매니페스트(scope /coach) + iOS 홈화면 메타. 회원/관리자와 독립 설치.
export const metadata: Metadata = {
  applicationName: 'BCL 코치',
  manifest: '/coach.webmanifest',
  appleWebApp: { capable: true, title: 'BCL 코치', statusBarStyle: 'default' },
  icons: { apple: '/icons/coach-apple.png' },
};

export const viewport: Viewport = {
  themeColor: BRAND_ACCENT_HEX,
};

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeScope theme="light" density="mobile">
      <AuthGuard requiredPrefix="/coach">
        <ToastProvider>
          <CoachContextProvider>
            <CoachShell>
              <CoachStateGate>{children}</CoachStateGate>
            </CoachShell>
          </CoachContextProvider>
        </ToastProvider>
      </AuthGuard>
    </ThemeScope>
  );
}
