// /kiosk 셸 — dark/mobile 밀도 (docs/12 §6). AuthGuard 없음: 무인 공개 표면(docs/06 §access).
// 세션/검증은 서버 RPC(fn_kiosk_checkin, anon 허용) + 단말 로컬 설정으로 처리 — KioskProvider 참조.
import { ThemeScope } from '@/components/ThemeScope';
import { ToastProvider } from '@/components/ui';
import { KioskProvider } from '@/features/kiosk-shell';

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeScope theme="dark" density="mobile">
      <ToastProvider>
        <KioskProvider>{children}</KioskProvider>
      </ToastProvider>
    </ThemeScope>
  );
}
