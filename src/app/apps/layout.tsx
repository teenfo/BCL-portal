// /apps(회원) 셸 — light/mobile 밀도 + AuthGuard (docs/12 §6, docs/01 §5.4)
import { ThemeScope } from '@/components/ThemeScope';
import { AuthGuard } from '@/features/auth';

export default function AppsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeScope theme="light" density="mobile">
      <AuthGuard requiredPrefix="/apps">{children}</AuthGuard>
    </ThemeScope>
  );
}
