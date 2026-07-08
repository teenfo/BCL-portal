'use client';

// profile §지원 — FAQ + 문의 티켓 생성(fn_create_support_ticket) + 지점 연락처.
// 티켓은 member 스코프(current_member_id) — 식별자 미전달. 답변은 admin(fn_reply_support_ticket).
import { useState } from 'react';
import { Card, Input, Select, Button, useToast } from '@/components/ui';
import { BottomSheet } from '@/features/member-shell';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import screen from '@/features/member-shell/screen.module.css';
import type { FacilityInfo } from '../types';

const FAQ: { q: string; a: string }[] = [
  { q: '예약은 언제까지 취소할 수 있나요?', a: '지점별 취소 마감 시간 규정이 적용됩니다. 마감 이후 취소는 크레딧이 복구되지 않을 수 있어요.' },
  { q: '대기 등록 후 자리가 나면 어떻게 되나요?', a: '자리가 나면 대기 상위 회원에게 알림이 발송되며, 예약을 확정하면 크레딧이 차감됩니다.' },
  { q: '환불은 어떻게 신청하나요?', a: '아래 문의하기에서 카테고리를 "환불"로 선택해 접수하거나, 지점 연락처로 문의해주세요.' },
  { q: '체크인 QR이 인식되지 않아요.', a: 'QR은 5분마다 자동 갱신됩니다. 화면 밝기를 높이고 최신 QR을 다시 스캔해주세요.' },
];

const CATEGORIES = [
  { value: 'inquiry', label: '일반 문의' },
  { value: 'complaint', label: '불편/민원' },
  { value: 'suggestion', label: '제안' },
  { value: 'refund', label: '환불 신청' },
];

const TICKET_ERROR_KO: Record<string, string> = {
  member_not_found: '계정에 연결된 회원 정보가 없습니다.',
  missing_required_fields: '제목과 내용을 모두 입력해주세요.',
  invalid_category: '문의 유형이 올바르지 않습니다.',
};

export function SupportSheet({ facility, onClose }: { facility: FacilityInfo | null; onClose: () => void }) {
  const toast = useToast();
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('inquiry');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!subject.trim() || !content.trim()) {
      toast.error('제목과 내용을 모두 입력해주세요.');
      return;
    }
    setBusy(true);
    const res = await rpc<{ ticket_id: string; status: string }>(
      getSupabaseBrowserClient(),
      'fn_create_support_ticket',
      { p_subject: subject.trim(), p_content: content, p_category: category },
    );
    setBusy(false);
    if (!res.success) {
      toast.error(TICKET_ERROR_KO[res.error ?? ''] ?? res.error ?? '문의 접수에 실패했습니다.');
      return;
    }
    toast.success('문의가 접수되었습니다. 확인 후 답변드릴게요.');
    setSubject('');
    setContent('');
    setCategory('inquiry');
    setSent(true);
  };

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
          {sent ? (
            <p className={screen.bodyText}>
              접수된 문의는 운영팀 확인 후 순차적으로 답변드립니다. 추가 문의는 아래에서 다시 남겨주세요.
            </p>
          ) : null}
          <Select label="문의 유형" native options={CATEGORIES} value={category} onChange={setCategory} />
          <Input label="제목" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="문의 제목" />
          <Input
            label="내용"
            multiline
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="문의 내용을 자세히 적어주세요."
          />
          <Button variant="primary" block loading={busy} onClick={submit}>
            문의 접수
          </Button>
        </Card>
      </div>

      <div className={screen.section}>
        <h3 className={screen.sectionTitle}>지점 연락처</h3>
        <Card>
          <p className={screen.bodyText}>급한 문의는 지점으로 바로 연락해주세요.</p>
          {facility?.phone ? <p className={screen.strong}>{facility.phone}</p> : null}
          {facility?.name ? <p className={screen.muted}>{facility.name}</p> : null}
        </Card>
      </div>
    </BottomSheet>
  );
}
