'use client';

// 코치 페이서 설정부 (docs/15 §4b.5, G-10) — race_events.pacer_config를 fn_set_race_pacer로 저장.
// 페이서는 렌더 전용 목표 페이스 라인 — Class TV(RaceView)가 pacer_config를 읽어 rAF로 그린다.
// 순위·팀합산·race_records 적재에는 영향 없음(§4b.5).
// source=member_pr/club_record는 서버(fn_set_race_pacer)가 500m 스플릿을 해석 —
// 코치는 스플릿을 직접 입력하지 않고(선택적 수동 오버라이드만) 회원만 지정한다.
import { useState } from 'react';
import { Card, Button, Input, Select, Checkbox, Badge, useToast } from '@/components/ui';
import { rpc } from '@/lib/supabase/query';
import { useQuery } from '@/lib/data/useQuery';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { PacerConfig, PacerSource } from '@/features/class-race';
import styles from './coach-race.module.css';

const SOURCE_OPTS: { value: PacerSource; label: string }[] = [
  { value: 'coach_split', label: '코치 지정 스플릿' },
  { value: 'member_pr', label: '회원 PR' },
  { value: 'club_record', label: '클럽 기록' },
];

/** 서버가 스플릿을 해석하는 소스(수동 입력 불필요) */
function isAutoSource(s: PacerSource): boolean {
  return s === 'member_pr' || s === 'club_record';
}

/** 초 → "m:ss" 표시 */
function fmtSplit(sec: number | null | undefined): string {
  if (!sec || sec <= 0) return '';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s < 10 ? '0' + s : s}`;
}

/** "m:ss" 또는 순수 초 문자열 → 초. 파싱 불가 시 null */
function parseSplit(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  if (t.includes(':')) {
    const [mm, ss] = t.split(':');
    const m = Number(mm);
    const s = Number(ss);
    if (!Number.isFinite(m) || !Number.isFinite(s) || s < 0 || s >= 60) return null;
    return m * 60 + s;
  }
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface PickerMember {
  member_id: string;
  member_name: string;
}

/** fn_set_race_pacer data 페이로드 — 서버 해석 결과 표면화용 */
interface PacerSaveResult {
  event_id: string;
  pacer_config: PacerConfig | null;
  resolved?: boolean;
}

export function PacerPanel({
  eventId,
  initial,
  onSaved,
}: {
  eventId: string;
  initial: PacerConfig | null;
  onSaved?: () => void;
}) {
  const toast = useToast();
  const supabase = getSupabaseBrowserClient();
  const [enabled, setEnabled] = useState(initial?.enabled ?? false);
  const [source, setSource] = useState<PacerSource>(initial?.source ?? 'coach_split');
  const [memberId, setMemberId] = useState(initial?.member_id ?? '');
  // 수동 스플릿: coach_split만 초기값 프리필. 자동 소스는 비워 두고(비우면 서버 해석) 선택적 오버라이드로만 사용.
  const [split, setSplit] = useState(
    initial?.source === 'coach_split' ? fmtSplit(initial?.split_500m) : '',
  );
  const [busy, setBusy] = useState(false);

  // 회원 PR 대상 선택 — 담당 로스터. member_pr 선택 시에만 조회(불필요 로드 회피).
  const roster = useQuery<PickerMember[]>(
    () =>
      source === 'member_pr'
        ? rpc<PickerMember[]>(supabase, 'fn_get_coach_members', { p_search: null })
        : Promise.resolve({ success: true, data: [], error: null }),
    [source],
  );

  const memberOpts = (roster.data ?? []).map((m) => ({
    value: m.member_id,
    label: m.member_name,
  }));

  // 현재 저장된 설정과 소스가 같을 때만 서버 해석 스플릿을 배지로 노출(스냅샷).
  const resolvedBadge =
    initial?.enabled && initial.source === source && isAutoSource(source) && initial.split_500m
      ? fmtSplit(initial.split_500m)
      : null;

  const save = async () => {
    const splitSec = parseSplit(split);
    if (enabled && source === 'coach_split' && (splitSec == null || splitSec <= 0)) {
      toast.error('목표 스플릿을 입력하세요 (예: 2:00).');
      return;
    }
    if (enabled && source === 'member_pr' && !memberId) {
      toast.error('PR 기준이 될 회원을 선택하세요.');
      return;
    }
    setBusy(true);
    const res = await rpc<PacerSaveResult>(supabase, 'fn_set_race_pacer', {
      p_event_id: eventId,
      p_pacer: {
        enabled,
        source,
        // 자동 소스에서 비워 두면 null → 서버가 해석. 값이 있으면 명시 오버라이드(explicit > resolved).
        split_500m: splitSec,
        member_id: source === 'member_pr' ? memberId || null : null,
      },
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.error ?? '페이서 저장 실패');
      return;
    }
    if (!enabled) {
      toast.success('페이서를 해제했습니다.');
    } else if (isAutoSource(source)) {
      const resolvedSplit = res.data?.pacer_config?.split_500m ?? null;
      if (res.data?.resolved && resolvedSplit) {
        toast.success(`페이서 설정 완료 — 해석된 500m 스플릿 ${fmtSplit(resolvedSplit)}.`);
      } else {
        toast.info('페이서를 설정했으나 기준 기록이 없어 페이스 라인은 표시되지 않습니다 (기록 없음).');
      }
    } else {
      toast.success('페이서를 설정했습니다.');
    }
    onSaved?.();
  };

  const autoSource = isAutoSource(source);

  return (
    <Card title="버추얼 페이서">
      <p className={styles.muted}>
        트랙에 목표 페이스 라인을 표시해 참가자가 목표 대비 앞/뒤를 즉시 인지하게 합니다. 렌더 전용 —
        순위·기록에는 영향 없습니다.
      </p>
      <div className={styles.pacerForm}>
        <Checkbox
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          label="페이서 사용"
        />
        <Select
          label="페이스 기준"
          native
          value={source}
          onChange={(v) => setSource(v as PacerSource)}
          options={SOURCE_OPTS}
          disabled={!enabled}
        />
        {source === 'member_pr' ? (
          <Select
            label="PR 기준 회원"
            native
            value={memberId}
            onChange={(v) => setMemberId(v)}
            options={memberOpts}
            placeholder={roster.loading ? '회원 불러오는 중…' : '회원 선택'}
            disabled={!enabled || roster.loading}
          />
        ) : null}
        <Input
          label={autoSource ? '500m 스플릿 (선택 · 비우면 자동 해석)' : '500m 목표 스플릿 (m:ss)'}
          placeholder={autoSource ? '자동 해석' : '2:00'}
          value={split}
          onChange={(e) => setSplit(e.target.value)}
          disabled={!enabled}
          helper={
            autoSource
              ? '서버가 기록에서 500m 스플릿을 해석합니다. 값을 입력하면 수동 오버라이드됩니다.'
              : undefined
          }
        />
        <div className={styles.controlActions}>
          {initial?.enabled ? <Badge variant="success" size="sm">현재 사용 중</Badge> : null}
          {resolvedBadge ? (
            <Badge variant="neutral" size="sm">해석된 스플릿 {resolvedBadge}</Badge>
          ) : null}
          <Button variant="primary" size="sm" loading={busy} onClick={save}>
            저장
          </Button>
        </div>
      </div>
    </Card>
  );
}
