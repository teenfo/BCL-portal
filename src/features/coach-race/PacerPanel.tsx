'use client';

// 코치 페이서 설정부 (docs/15 §4b.5, G-10) — race_events.pacer_config를 fn_set_race_pacer로 저장.
// 페이서는 렌더 전용 목표 페이스 라인 — Class TV(RaceView)가 pacer_config를 읽어 rAF로 그린다.
// 순위·팀합산·race_records 적재에는 영향 없음(§4b.5).
import { useState } from 'react';
import { Card, Button, Input, Select, Checkbox, Badge, useToast } from '@/components/ui';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { PacerConfig, PacerSource } from '@/features/class-race';
import styles from './coach-race.module.css';

const SOURCE_OPTS: { value: PacerSource; label: string }[] = [
  { value: 'coach_split', label: '코치 지정 스플릿' },
  { value: 'member_pr', label: '회원 PR' },
  { value: 'club_record', label: '클럽 기록' },
];

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
  const [split, setSplit] = useState(fmtSplit(initial?.split_500m));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const splitSec = parseSplit(split);
    if (enabled && source === 'coach_split' && (splitSec == null || splitSec <= 0)) {
      toast.error('목표 스플릿을 입력하세요 (예: 2:00).');
      return;
    }
    setBusy(true);
    const res = await rpc<{ event_id: string; pacer_config: PacerConfig | null }>(
      supabase,
      'fn_set_race_pacer',
      {
        p_event_id: eventId,
        p_pacer: {
          enabled,
          source,
          split_500m: splitSec,
        },
      },
    );
    setBusy(false);
    if (!res.success) {
      toast.error(res.error ?? '페이서 저장 실패');
      return;
    }
    toast.success(enabled ? '페이서를 설정했습니다.' : '페이서를 해제했습니다.');
    onSaved?.();
  };

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
        <Input
          label="500m 목표 스플릿 (m:ss)"
          placeholder="2:00"
          value={split}
          onChange={(e) => setSplit(e.target.value)}
          disabled={!enabled}
        />
        <div className={styles.controlActions}>
          {initial?.enabled ? <Badge variant="success" size="sm">현재 사용 중</Badge> : null}
          <Button variant="primary" size="sm" loading={busy} onClick={save}>
            저장
          </Button>
        </div>
      </div>
    </Card>
  );
}
