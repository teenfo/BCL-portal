'use client';

// 출석 live 탭 — 체크인 로그 Table + 날짜 필터 + 수동 출석 + 새로고침 (02-admin §3.3)
// ⏳ 범위 외: Supabase Realtime 실시간 스트림 구독(현재는 폴링/새로고침 버튼 대체).
import { useMemo, useState } from 'react';
import { Table, Button, Input, Badge, useToast } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ManualAttendanceModal } from './ManualAttendanceModal';
import styles from './attendance.module.css';

interface CheckinRow {
  id: string;
  checkin_time: string;
  checkin_method: string;
  members: { name: string } | null;
  sessions: { title: string } | null;
}

const METHOD_LABEL: Record<string, string> = {
  qr: 'QR',
  kiosk: '키오스크',
  manual: '수동',
  manual_coach: '수동(코치)',
};

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const timeFmt = (iso: string) =>
  new Date(iso).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function AttendanceLive() {
  const toast = useToast();
  const { can } = useMyPermissions();
  const canEdit = can('attendance', 'edit');
  const [date, setDate] = useState<string>(todayStr());
  const [manualOpen, setManualOpen] = useState(false);

  const start = `${date}T00:00:00`;
  const endDate = useMemo(() => {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T00:00:00`;
  }, [date]);

  const checkins = useQuery<CheckinRow[]>(
    () =>
      query<CheckinRow[]>(getSupabaseBrowserClient(), 'checkins', (q) =>
        q
          .select('id, checkin_time, checkin_method, members(name), sessions(title)')
          .gte('checkin_time', start)
          .lt('checkin_time', endDate)
          .order('checkin_time', { ascending: false })
          .limit(300),
      ),
    [start, endDate],
  );

  const columns: TableColumn<CheckinRow>[] = [
    { key: 'name', header: '회원', render: (r) => r.members?.name ?? '—' },
    { key: 'time', header: '시각', render: (r) => timeFmt(r.checkin_time) },
    {
      key: 'method',
      header: '방법',
      render: (r) => <Badge variant="neutral">{METHOD_LABEL[r.checkin_method] ?? r.checkin_method}</Badge>,
    },
    { key: 'session', header: '세션', render: (r) => r.sessions?.title ?? '자유 이용' },
  ];

  return (
    <div className={styles.tabPanel}>
      <div className={styles.toolbar}>
        <div className={styles.dateField}>
          <Input label="날짜" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className={styles.spacer} />
        <Button variant="ghost" onClick={() => checkins.refetch()}>
          새로고침
        </Button>
        {canEdit ? (
          <Button variant="primary" onClick={() => setManualOpen(true)}>
            수동 출석
          </Button>
        ) : null}
      </div>

      <Table<CheckinRow>
        columns={columns}
        rows={checkins.data ?? []}
        rowKey={(r) => r.id}
        loading={checkins.loading}
        empty={
          checkins.error
            ? { variant: 'error', title: '체크인 로그를 불러오지 못했습니다', description: checkins.error, onRetry: checkins.refetch }
            : { title: '체크인 기록이 없습니다', description: '선택한 날짜에 체크인이 없습니다.' }
        }
      />

      <ManualAttendanceModal
        open={manualOpen}
        date={date}
        onClose={() => setManualOpen(false)}
        onDone={() => {
          setManualOpen(false);
          checkins.refetch();
          toast.info('체크인 로그를 갱신했습니다.');
        }}
      />
    </div>
  );
}
