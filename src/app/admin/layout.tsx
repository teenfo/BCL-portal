// /admin 셸 — dark/admin 밀도 + AuthGuard + 권한 컨텍스트 + 사이드바 (docs/12 §6, 01 §5.4, 02 §2)
import { ThemeScope } from '@/components/ThemeScope';
import { AuthGuard } from '@/features/auth';
import { PermissionsProvider } from '@/features/permissions';
import { AdminShell } from '@/features/admin-shell';
import { ToastProvider } from '@/components/ui';

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
