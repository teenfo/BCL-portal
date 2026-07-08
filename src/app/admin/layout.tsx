// /admin 셸 — dark/admin 밀도 + AuthGuard (docs/12 §6, docs/01 §5.4)
import { ThemeScope } from '@/components/ThemeScope';
import { AuthGuard } from '@/features/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeScope theme="dark" density="admin">
      <AuthGuard requiredPrefix="/admin">{children}</AuthGuard>
    </ThemeScope>
  );
}
