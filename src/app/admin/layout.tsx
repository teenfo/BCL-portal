// /admin 셸 — dark/admin 밀도 + AuthGuard + 권한 컨텍스트 + 사이드바 (docs/12 §6, 01 §5.4, 02 §2)
import type { Metadata, Viewport } from 'next';
import { ThemeScope } from '@/components/ThemeScope';
import { AuthGuard } from '@/features/auth';
import { PermissionsProvider } from '@/features/permissions';
import { AdminShell } from '@/features/admin-shell';
import { ToastProvider } from '@/components/ui';

// PWA — 관리자 앱 전용 매니페스트(scope /admin) + iOS 홈화면 메타. 회원/코치와 독립 설치.
export const metadata: Metadata = {
  applicationName: 'BCL 관리자',
  manifest: '/admin.webmanifest',
  appleWebApp: { capable: true, title: 'BCL 관리자', statusBarStyle: 'black-translucent' },
  icons: { apple: '/icons/admin-apple.png' },
};

export const viewport: Viewport = {
  themeColor: '#161616',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeScope theme="dark" density="admin">
      <AuthGuard requiredPrefix="/admin">
        <PermissionsProvider>
          <ToastProvider>
            <AdminShell>{children}</AdminShell>
          </ToastProvider>
        </PermissionsProvider>
      </AuthGuard>
    </ThemeScope>
  );
}
