// /class 셸 — TV 대형 스크린. dark/tv 밀도 (docs/12 §5). anon 공개 표면(docs/05 §6):
// AuthGuard 없음 — TV는 세션 유지 불가, 미인증 구동이 정식 경로. Display-Safe는 데이터 계층(RPC)이 강제.
import { ThemeScope } from '@/components/ThemeScope';

export default function ClassLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeScope theme="dark" density="tv">
      {children}
    </ThemeScope>
  );
}
