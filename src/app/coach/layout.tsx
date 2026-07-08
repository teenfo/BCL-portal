// /coach 셸 — light/mobile 밀도 + AuthGuard + 코치 상태머신 게이트 + 하단탭 셸
// (docs/12 §6, docs/01 §5.4, docs/04 §2·§4)
import { ThemeScope } from '@/components/ThemeScope';
import { AuthGuard } from '@/features/auth';
import { ToastProvider } from '@/components/ui';
import { CoachContextProvider, CoachStateGate } from '@/features/coach-context';
import { CoachShell } from '@/features/coach-shell';

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
