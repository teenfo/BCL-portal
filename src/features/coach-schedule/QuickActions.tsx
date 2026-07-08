'use client';

// 세션 보드 — 빠른 액션 (docs/04 §3.2(d))
// Race 수업 시작(format 선택 → fn_prepare_race_session → Control 딥링크),
// 후속조치 생성(fn_create_followup), 서킷 콘솔 열기(/coach/schedule/rotation).
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Modal, Select, Input, useToast } from '@/components/ui';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { BoardAttendee } from './types';
import styles from './session-board.module.css';

const RACE_FORMATS = [
  { value: 'individual', label: '개인전' },
  { value: 'team', label: '팀전' },
  { value: 'group', label: '단체(공동목표)' },
  { value: 'relay', label: '릴레이' },
];

const FOLLOWUP_TYPES = [
  { value: 'injury', label: '부상' },
  { value: 'trial_conversion', label: '체험 전환' },
  { value: 'renewal', label: '재등록' },
  { value: 'absence', label: '장기 결석' },
  { value: 'motivation', label: '동기부여' },
];

const PRIORITIES = [
  { value: 'low', label: '낮음' },
  { value: 'normal', label: '보통' },
  { value: 'high', label: '높음' },
];

export function QuickActions({
  sessionId,
  attendees,
}: {
  sessionId: string;
  attendees: BoardAttendee[];
}) {
  const router = useRouter();
  const toast = useToast();
  const supabase = getSupabaseBrowserClient();

  const [raceOpen, setRaceOpen] = useState(false);
  const [raceFormat, setRaceFormat] = useState('individual');
  const [raceBusy, setRaceBusy] = useState(false);

  const [fuOpen, setFuOpen] = useState(false);
  const [fuMember, setFuMember] = useState<string | null>(null);
  const [fuType, setFuType] = useState('motivation');
  const [fuPriority, setFuPriority] = useState('normal');
  const [fuDue, setFuDue] = useState('');
  const [fuNote, setFuNote] = useState('');
  const [fuBusy, setFuBusy] = useState(false);

  const startRace = async () => {
    setRaceBusy(true);
    const res = await rpc<{ event_id: string; created: boolean }>(supabase, 'fn_prepare_race_session', {
      p_session_id: sessionId,
      p_race_format: raceFormat,
    });
    setRaceBusy(false);
    if (!res.success || !res.data?.event_id) {
      toast.error(res.error ?? 'Race 세션 시작에 실패했습니다.');
      return;
    }
    setRaceOpen(false);
    toast.success(res.data.created ? 'Race 이벤트를 생성했습니다.' : '기존 Race 이벤트를 재개합니다.');
    router.push(`/coach/race/control?event_id=${res.data.event_id}`);
  };

  const createFollowup = async () => {
    if (!fuMember) {
      toast.error('회원을 선택하세요.');
      return;
    }
    setFuBusy(true);
    const res = await rpc(supabase, 'fn_create_followup', {
      p_payload: {
        member_id: fuMember,
        session_id: sessionId,
        followup_type: fuType,
        priority: fuPriority,
        due_date: fuDue || null,
        note: fuNote || null,
      },
    });
    setFuBusy(false);
    if (!res.success) {
      toast.error(res.error ?? '후속조치 생성에 실패했습니다.');
      return;
    }
    toast.success('후속조치를 생성했습니다.');
    setFuOpen(false);
    setFuNote('');
    setFuMember(null);
  };

  const memberOptions = attendees.map((a) => ({ value: a.member_id, label: a.member_name }));

  return (
    <div className={styles.quickActions}>
      <Button variant="primary" onClick={() => setRaceOpen(true)}>Race 수업 시작</Button>
      <Button variant="soft" onClick={() => setFuOpen(true)}>후속조치 생성</Button>
      <Button
        variant="ghost"
        onClick={() => router.push(`/coach/schedule/rotation?session_id=${sessionId}`)}
      >
        서킷 콘솔 열기
      </Button>

      <Modal
        open={raceOpen}
        onClose={() => setRaceOpen(false)}
        title="Race 수업 시작"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRaceOpen(false)}>취소</Button>
            <Button variant="primary" loading={raceBusy} onClick={startRace}>시작</Button>
          </>
        }
      >
        <Select
          label="레이스 포맷"
          native
          value={raceFormat}
          onChange={setRaceFormat}
          options={RACE_FORMATS}
          helper="생성 시점에 포맷이 확정됩니다."
        />
      </Modal>

      <Modal
        open={fuOpen}
        onClose={() => setFuOpen(false)}
        title="후속조치 생성"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFuOpen(false)}>취소</Button>
            <Button variant="primary" loading={fuBusy} onClick={createFollowup}>생성</Button>
          </>
        }
      >
        <div className={styles.formCol}>
          <Select label="대상 회원" native placeholder="회원 선택" value={fuMember} onChange={setFuMember} options={memberOptions} />
          <Select label="유형" native value={fuType} onChange={setFuType} options={FOLLOWUP_TYPES} />
          <Select label="우선순위" native value={fuPriority} onChange={setFuPriority} options={PRIORITIES} />
          <Input label="기한" type="date" value={fuDue} onChange={(e) => setFuDue(e.target.value)} />
          <Input label="메모" multiline rows={2} value={fuNote} onChange={(e) => setFuNote(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
