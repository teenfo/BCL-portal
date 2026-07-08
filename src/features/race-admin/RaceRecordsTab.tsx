'use client';

// Race 기록 통계 (02-admin §3.9 records) — 조회 위주.
// 이벤트 선택 → race_records(members join) 리더보드 + 통계(참가/PR). race_records 수정은
// 사유+audit 필수 원칙이라 전용 RPC 도입 전까지 조회 전용(⏳ 수정 UI 미제공).
import { useMemo, useState } from 'react';
import { Table, Badge, Select, StatCard } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { type RaceEvent, type RaceRecordRow, RACE_FORMAT_LABEL, fmtDate } from './types';
import styles from './race-admin.module.css';

const num = (v: number | null, suffix = '') =>
  v == null ? '-' : `${Math.round(v).toLocaleString('ko-KR')}${suffix}`;

export function RaceRecordsTab() {
  const client = getSupabaseBrowserClient();
  const [eventId, setEventId] = useState<string | null>(null);

  const events = useQuery<RaceEvent[]>(
    () =>
      query<RaceEvent[]>(client, 'race_events', (q) =>
        q.select('*').order('event_date', { ascending: false }).limit(200),
      ),
    [],
  );

  const records = useQuery<RaceRecordRow[]>(
    () => {
      if (!eventId) return Promise.resolve({ success: true, data: [], error: null });
      return query<RaceRecordRow[]>(client, 'race_records', (q) =>
        q
          .select(
            'id,event_id,member_id,device_serial,lane_number,result_distance,calories_burned,avg_watts,max_watts,avg_spm,avg_hr_bpm,finish_rank,is_pr,created_at,members(name)',
          )
          .eq('event_id', eventId)
          .order('finish_rank', { ascending: true, nullsFirst: false }),
      );
    },
    [eventId],
  );

  const list = useMemo(() => records.data ?? [], [records.data]);
  const stats = useMemo(() => {
    const participants = list.length;
    const prCount = list.filter((r) => r.is_pr).length;
    return { participants, prCount };
  }, [list]);

  const eventOptions = useMemo(
    () =>
      (events.data ?? []).map((e) => ({
        value: e.id,
        label: `${fmtDate(e.event_date)} · ${e.name} (${RACE_FORMAT_LABEL[e.race_format]})`,
      })),
    [events.data],
  );

  const columns: TableColumn<RaceRecordRow>[] = [
    {
      key: 'rank',
      header: '순위',
      align: 'right',
      render: (r) => (r.finish_rank != null ? `${r.finish_rank}위` : '-'),
    },
    { key: 'member', header: '회원', render: (r) => r.members?.name ?? '(미연결)' },
    { key: 'lane', header: '레인', align: 'right', render: (r) => r.lane_number ?? '-' },
    { key: 'distance', header: '거리', align: 'right', render: (r) => num(r.result_distance, 'm') },
    { key: 'avgW', header: '평균 W', align: 'right', render: (r) => num(r.avg_watts) },
    { key: 'maxW', header: '최대 W', align: 'right', render: (r) => num(r.max_watts) },
    { key: 'spm', header: 'SPM', align: 'right', render: (r) => num(r.avg_spm) },
    { key: 'hr', header: '평균 HR', align: 'right', render: (r) => num(r.avg_hr_bpm) },
    { key: 'cal', header: 'kcal', align: 'right', render: (r) => num(r.calories_burned) },
    {
      key: 'pr',
      header: 'PR',
      render: (r) => (r.is_pr ? <Badge variant="accent">PR</Badge> : null),
    },
  ];

  return (
    <div className={styles.tabBody}>
      <div className={styles.filters}>
        <div className={styles.filterWide}>
          <Select
            label="이벤트 선택"
            value={eventId}
            onChange={(v) => setEventId(v)}
            searchable
            placeholder={events.loading ? '이벤트 불러오는 중…' : '이벤트를 선택하세요'}
            options={eventOptions}
          />
        </div>
      </div>

      {eventId ? (
        <div className={styles.kpis}>
          <StatCard label="참가 기록" value={stats.participants.toLocaleString('ko-KR')} loading={records.loading} />
          <StatCard label="PR 발생" value={stats.prCount.toLocaleString('ko-KR')} loading={records.loading} />
        </div>
      ) : null}

      <Table<RaceRecordRow>
        columns={columns}
        rows={list}
        rowKey={(r) => r.id}
        loading={eventId ? records.loading : false}
        empty={
          records.error
            ? { variant: 'error', title: '기록을 불러오지 못했습니다', description: records.error, onRetry: records.refetch }
            : !eventId
              ? { title: '이벤트를 선택하세요', description: '이벤트별 기록·통계를 조회합니다.' }
              : { title: '기록이 없습니다', description: '이 이벤트에 적재된 기록이 아직 없습니다.' }
        }
      />
    </div>
  );
}
