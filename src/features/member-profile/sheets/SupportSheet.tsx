'use client';

// profile §지원 — FAQ + 문의 안내. 문의 티켓 생성 RPC 부재(FLAG: fn_create_support_ticket) →
// 현재는 지점 연락처 안내로 대체(환불 신청도 이 경로).
import { Card } from '@/components/ui';
import { BottomSheet } from '@/features/member-shell';
import screen from '@/features/member-shell/screen.module.css';
import type { FacilityInfo } from '../types';

const FAQ: { q: string; a: string }[] = [
  { q: '예약은 언제까지 취소할 수 있나요?', a: '지점별 취소 마감 시간 규정이 적용됩니다. 마감 이후 취소는 크레딧이 복구되지 않을 수 있어요.' },
  { q: '대기 등록 후 자리가 나면 어떻게 되나요?', a: '자리가 나면 대기 상위 회원에게 알림이 발송되며, 예약을 확정하면 크레딧이 차감됩니다.' },
  { q: '환불은 어떻게 신청하나요?', a: '환불은 앱에서 직접 처리되지 않습니다. 아래 지점 연락처로 문의해주세요.' },
  { q: '체크인 QR이 인식되지 않아요.', a: 'QR은 5분마다 자동 갱신됩니다. 화면 밝기를 높이고 최신 QR을 다시 스캔해주세요.' },
];

export function SupportSheet({ facility, onClose }: { facility: FacilityInfo | null; onClose: () => void }) {
  return (
    <BottomSheet variant="full" title="지원" onClose={onClose}>
      <div className={screen.section}>
        <h3 className={screen.sectionTitle}>자주 묻는 질문</h3>
        {FAQ.map((f, i) => (
          <Card key={i}>
            <p className={screen.strong}>{f.q}</p>
            <p className={screen.bodyText}>{f.a}</p>
          </Card>
        ))}
      </div>

      <div className={screen.section}>
        <h3 className={screen.sectionTitle}>문의하기</h3>
        <Card>
          <p className={screen.bodyText}>운영 관련 문의·환불 신청은 지점으로 연락해주세요.</p>
          {facility?.phone ? <p className={screen.strong}>{facility.phone}</p> : null}
          {facility?.name ? <p className={screen.muted}>{facility.name}</p> : null}
        </Card>
      </div>
    </BottomSheet>
  );
}
