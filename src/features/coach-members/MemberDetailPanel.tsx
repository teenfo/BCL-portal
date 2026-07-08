'use client';

// 회원 상세 (docs/04 §3.3) — 컨텍스트/노트/후속조치/퍼포먼스 4탭.
// fn_get_member_context_panel + fn_get_member_performance_profile.
// 플래그 추가/해소 fn_upsert_member_alert_flag, 벤치마크 입력 fn_record_member_benchmark_result(PR 서버 판정).
//
// ⚠ FLAG(RPC 갭): member_notes 작성 RPC가 sql/09에 없음 → 노트는 read-only 타임라인만.
import { useState } from 'react';
import { Card, Tabs, Badge, Button, Input, Select, EmptyState, Skeleton, useToast } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { followupTypeLabel } from '@/features/coach-home/format';
import styles from './coach-members.module.css';

interface ContextPanel {
  member: { id: string; name: string; phone: string | null; status: string; avatar_url: string | null };
  active_flags: { id: string; flag_type: string; severity: string; note: string | null }[];
  recent_notes: { id: string; note_type: string; author_role: string; content: string; created_at: string; author_name: string | null }[];
  attendance: { total_checkins: number; last_checkin: string | null; thirty_day_count: number };
  active_membership: { plan_name: string | null; end_date: string | null; status: string; days_until_expiry: number } | null;
  open_followups: { id: string; followup_type: string; priority: string; due_date: string | null; note: string | null }[];
}

interface Performance {
  benchmark_bests: { benchmark_id: string; name: string; metric_type: string; unit: string; best_value: number; attempt_count: number }[];
  recent_results: { id: string; name: string; result_value: number; is_pr: boolean; recorded_at: string }[];
  race_records: { id: string; event_name: string; event_date: string; result_distance: number | null; finish_rank: number | null }[];
  wod_timeline: { id: string; session_title: string; wod_title: string; score: number; score_type: string; rx_status: string; session_date: string }[];
  benchmark_pr_count: number;
  race_pr_count: number;
}

interface BenchmarkDef {
  id: string;
  name: string;
  metric_type: string;
  unit: string;
}

const TABS = [
  { key: 'context', label: '컨텍스트' },
  { key: 'notes', label: '노트' },
  { key: 'followups', label: '후속조치' },
  { key: 'performance', label: '퍼포먼스' },
];

const FLAG_TYPES = [
  { value: 'injury', label: '부상' },
  { value: 'trial', label: '체험' },
  { value: 'renewal_due', label: '만기 임박' },
  { value: 'returning_after_absence', label: '복귀' },
  { value: 'vip_attention', label: 'VIP' },
];
const SEVERITIES = [
  { value: 'info', label: '정보' },
  { value: 'warning', label: '주의' },
  { value: 'critical', label: '위험' },
];
const RX_OPTS = [
  { value: 'rx_plus', label: 'Rx+' },
  { value: 'rx', label: 'Rx' },
  { value: 'scaled', label: 'Scaled' },
];

export function MemberDetailPanel({ memberId, onBack }: { memberId: string; onBack: () => void }) {
  const supabase = getSupabaseBrowserClient();
  const [tab, setTab] = useState('context');

  const ctx = useQuery<ContextPanel>(
    () => rpc<ContextPanel>(supabase, 'fn_get_member_context_panel', { p_member_id: memberId }),
    [memberId],
  );
  const perf = useQuery<Performance>(
    () => rpc<Performance>(supabase, 'fn_get_member_performance_profile', { p_member_id: memberId }),
    [memberId],
  );

  const m = ctx.data?.member;

  return (
    <div className={styles.detail}>
      <header className={styles.detailHeader}>
        <Button variant="ghost" size="sm" onClick={onBack}>← 목록</Button>
        <span className={styles.detailName}>{m?.name ?? '회원'}</span>
      </header>

      <div className={styles.detailTabs}>
        <Tabs syncUrl={false} tabs={TABS} value={tab} onChange={setTab} aria-label="회원 상세 탭" />
      </div>

      <div className={styles.detailBody}>
        {tab === 'context' ? <ContextTab ctx={ctx} memberId={memberId} /> : null}
        {tab === 'notes' ? <NotesTab ctx={ctx} /> : null}
        {tab === 'followups' ? <FollowupsTab memberId={memberId} /> : null}
        {tab === 'performance' ? <PerformanceTab perf={perf} memberId={memberId} /> : null}
      </div>
    </div>
  );
}

function ContextTab({ ctx, memberId }: { ctx: ReturnType<typeof useQuery<ContextPanel>>; memberId: string }) {
  const toast = useToast();
  const supabase = getSupabaseBrowserClient();
  const [flagType, setFlagType] = useState('injury');
  const [severity, setSeverity] = useState('warning');
  const [flagNote, setFlagNote] = useState('');
  const [busy, setBusy] = useState(false);

  if (ctx.loading) return <Skeleton variant="rect" height={200} />;
  if (ctx.error || !ctx.data) {
    return <EmptyState variant="error" title="컨텍스트 로드 실패" description={ctx.error ?? ''} onRetry={ctx.refetch} />;
  }
  const d = ctx.data;
  const mem = d.active_membership;
  const dday = mem?.days_until_expiry;

  const addFlag = async () => {
    setBusy(true);
    const res = await rpc(supabase, 'fn_upsert_member_alert_flag', {
      p_member_id: memberId,
      p_payload: { flag_type: flagType, severity, note: flagNote || null },
    });
    setBusy(false);
    if (!res.success) { toast.error(res.error ?? '플래그 추가 실패'); return; }
    toast.success('플래그를 추가했습니다.');
    setFlagNote('');
    ctx.refetch();
  };

  const resolveFlag = async (id: string) => {
    const res = await rpc(supabase, 'fn_upsert_member_alert_flag', {
      p_member_id: memberId,
      p_payload: { id, resolved: true },
    });
    if (!res.success) { toast.error(res.error ?? '해소 실패'); return; }
    toast.success('플래그를 해소했습니다.');
    ctx.refetch();
  };

  return (
    <div className={styles.tabCol}>
      {mem ? (
        <Card title="멤버십">
          <div className={styles.ctxRow}>
            <span>{mem.plan_name ?? '플랜'}</span>
            {dday != null ? (
              <Badge variant={dday < 7 ? 'danger' : dday < 30 ? 'warning' : 'success'}>
                D-{dday}
              </Badge>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card title="출석">
        <div className={styles.ctxStats}>
          <div><b>{d.attendance.total_checkins}</b><span>총 체크인</span></div>
          <div><b>{d.attendance.thirty_day_count}</b><span>최근 30일</span></div>
          <div><b>{d.attendance.last_checkin ? d.attendance.last_checkin.slice(0, 10) : '—'}</b><span>마지막</span></div>
        </div>
      </Card>

      <Card title="활성 플래그">
        {d.active_flags.length === 0 ? (
          <p className={styles.muted}>활성 플래그 없음</p>
        ) : (
          <div className={styles.flagList}>
            {d.active_flags.map((f) => (
              <div key={f.id} className={styles.flagItem}>
                <Badge variant={f.severity === 'critical' ? 'danger' : 'warning'} size="sm">{f.flag_type}</Badge>
                {f.note ? <span className={styles.muted}>{f.note}</span> : null}
                <Button variant="ghost" size="sm" onClick={() => resolveFlag(f.id)}>해소</Button>
              </div>
            ))}
          </div>
        )}
        <div className={styles.formCol}>
          <Select label="플래그 유형" native value={flagType} onChange={setFlagType} options={FLAG_TYPES} />
          <Select label="심각도" native value={severity} onChange={setSeverity} options={SEVERITIES} />
          <Input label="메모" value={flagNote} onChange={(e) => setFlagNote(e.target.value)} />
          <Button variant="soft" size="sm" loading={busy} onClick={addFlag}>플래그 추가</Button>
        </div>
      </Card>
    </div>
  );
}

function NotesTab({ ctx }: { ctx: ReturnType<typeof useQuery<ContextPanel>> }) {
  if (ctx.loading) return <Skeleton variant="rect" height={160} />;
  if (ctx.error || !ctx.data) {
    return <EmptyState variant="error" title="노트 로드 실패" description={ctx.error ?? ''} onRetry={ctx.refetch} />;
  }
  const notes = ctx.data.recent_notes;
  return (
    <div className={styles.tabCol}>
      <p className={styles.muted}>노트 작성 RPC 미구현(read-only). Admin 상담로그와 통합 타임라인.</p>
      {notes.length === 0 ? (
        <EmptyState title="노트 없음" description="작성된 노트가 없습니다." />
      ) : (
        notes.map((n) => (
          <Card key={n.id}>
            <div className={styles.noteTop}>
              <Badge variant="neutral" size="sm">{n.note_type}</Badge>
              <span className={styles.muted}>{n.author_name ?? n.author_role} · {n.created_at.slice(0, 10)}</span>
            </div>
            <p className={styles.noteContent}>{n.content}</p>
          </Card>
        ))
      )}
    </div>
  );
}

function FollowupsTab({ memberId }: { memberId: string }) {
  const toast = useToast();
  const supabase = getSupabaseBrowserClient();
  const fu = useQuery<{ id: string; followup_type: string; priority: string; status: string; due_date: string | null; note: string | null; is_overdue: boolean }[]>(
    () => rpc(supabase, 'fn_get_my_followups', { p_status: 'all', p_member_id: memberId }),
    [memberId],
  );

  const resolve = async (id: string, status: 'completed' | 'dismissed' | 'open') => {
    const res = await rpc(supabase, 'fn_complete_followup', { p_followup_id: id, p_status: status });
    if (!res.success) { toast.error(res.error ?? '처리 실패'); return; }
    toast.success('처리했습니다.');
    fu.refetch();
  };

  if (fu.loading) return <Skeleton variant="rect" height={120} />;
  if (fu.error) return <EmptyState variant="error" title="후속조치 로드 실패" description={fu.error} onRetry={fu.refetch} />;
  const list = fu.data ?? [];

  return (
    <div className={styles.tabCol}>
      {list.length === 0 ? (
        <EmptyState title="후속조치 없음" description="이 회원에 대한 후속조치가 없습니다." />
      ) : (
        list.map((f) => (
          <Card key={f.id} variant={f.is_overdue ? 'accent' : 'default'}>
            <div className={styles.noteTop}>
              <Badge variant={f.priority === 'high' ? 'danger' : 'warning'} size="sm">{followupTypeLabel(f.followup_type)}</Badge>
              <Badge variant={f.status === 'open' ? 'info' : 'neutral'} size="sm">{f.status}</Badge>
              {f.due_date ? <span className={styles.muted}>기한 {f.due_date}</span> : null}
            </div>
            {f.note ? <p className={styles.noteContent}>{f.note}</p> : null}
            {f.status === 'open' ? (
              <div className={styles.rowActions}>
                <Button variant="soft" size="sm" onClick={() => resolve(f.id, 'completed')}>완료</Button>
                <Button variant="ghost" size="sm" onClick={() => resolve(f.id, 'dismissed')}>해제</Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => resolve(f.id, 'open')}>재오픈</Button>
            )}
          </Card>
        ))
      )}
    </div>
  );
}

function PerformanceTab({ perf, memberId }: { perf: ReturnType<typeof useQuery<Performance>>; memberId: string }) {
  const toast = useToast();
  const supabase = getSupabaseBrowserClient();
  const defs = useQuery<BenchmarkDef[]>(
    () => rpc<BenchmarkDef[]>(supabase, 'fn_list_benchmark_definitions'),
    [],
  );
  const [benchId, setBenchId] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [rx, setRx] = useState('rx');
  const [busy, setBusy] = useState(false);

  const record = async () => {
    if (!benchId || !value) { toast.error('벤치마크와 기록값을 입력하세요.'); return; }
    setBusy(true);
    const res = await rpc<{ is_pr: boolean }>(supabase, 'fn_record_member_benchmark_result', {
      p_member_id: memberId,
      p_benchmark_id: benchId,
      p_result_value: Number(value),
      p_rx_status: rx,
    });
    setBusy(false);
    if (!res.success) { toast.error(res.error ?? '기록 실패'); return; }
    if (res.data?.is_pr) toast.success('🎉 PR 달성!');
    else toast.success('기록을 저장했습니다.');
    setValue('');
    perf.refetch();
  };

  if (perf.loading) return <Skeleton variant="rect" height={200} />;
  if (perf.error || !perf.data) {
    return <EmptyState variant="error" title="퍼포먼스 로드 실패" description={perf.error ?? ''} onRetry={perf.refetch} />;
  }
  const p = perf.data;

  return (
    <div className={styles.tabCol}>
      <Card title="벤치마크 입력">
        <div className={styles.formCol}>
          <Select
            label="벤치마크"
            native
            placeholder="종목 선택"
            value={benchId}
            onChange={setBenchId}
            options={(defs.data ?? []).map((b) => ({ value: b.id, label: `${b.name} (${b.unit})` }))}
          />
          <Input label="기록값" type="number" value={value} onChange={(e) => setValue(e.target.value)} helper="time형은 초 단위" />
          <Select label="Rx 구분" native value={rx} onChange={setRx} options={RX_OPTS} />
          <Button variant="primary" size="sm" loading={busy} onClick={record}>기록 저장 (PR 서버 판정)</Button>
        </div>
      </Card>

      <Card title={`벤치마크 베스트 · PR ${p.benchmark_pr_count}`}>
        {p.benchmark_bests.length === 0 ? (
          <p className={styles.muted}>기록 없음</p>
        ) : (
          p.benchmark_bests.map((b) => (
            <div key={b.benchmark_id} className={styles.perfRow}>
              <span>{b.name}</span>
              <b>{b.best_value} {b.unit}</b>
            </div>
          ))
        )}
      </Card>

      <Card title={`Race 이력 · PR ${p.race_pr_count}`}>
        {p.race_records.length === 0 ? (
          <p className={styles.muted}>기록 없음</p>
        ) : (
          p.race_records.map((r) => (
            <div key={r.id} className={styles.perfRow}>
              <span>{r.event_name} · {r.event_date}</span>
              <b>{r.result_distance ? `${r.result_distance}m` : ''}{r.finish_rank ? ` · ${r.finish_rank}위` : ''}</b>
            </div>
          ))
        )}
      </Card>

      <Card title="최근 WOD 기록">
        {p.wod_timeline.length === 0 ? (
          <p className={styles.muted}>기록 없음</p>
        ) : (
          p.wod_timeline.map((w) => (
            <div key={w.id} className={styles.perfRow}>
              <span>{w.session_date} · {w.wod_title}</span>
              <b>{w.score} ({w.rx_status})</b>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
