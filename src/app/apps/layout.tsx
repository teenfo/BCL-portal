// /apps(회원) 셸 — light/mobile 밀도 + AuthGuard + Toast + 하단탭 셸 (docs/12 §6, docs/01 §5.4, docs/03)
import { ThemeScope } from '@/components/ThemeScope';
import { AuthGuard } from '@/features/auth';
import { ToastProvider } from '@/components/ui';
import { MemberShell } from '@/features/member-shell';

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
