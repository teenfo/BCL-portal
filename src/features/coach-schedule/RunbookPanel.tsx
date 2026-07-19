'use client';

// 세션 보드 — 런시트 패널 (docs/04 §3.2(c))
// 6탭: warmup/movement_prep/scaling/cue/safety/finish_note. 시설 템플릿 상속(NULL) +
// "오버라이드로 복사" 편집. 탭별 dirty 추적, 저장 fn_upsert_session_runbook.
// safety 탭은 참가자 활성 injury 플래그를 코치에게만 인라인 표시(런시트에 저장 안 함 — Display-Safe).
import { useMemo, useState } from 'react';
import { Button, Badge, EmptyState, Skeleton, useToast } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { BoardAttendee, BoardHeader } from './types';
import styles from './session-board.module.css';

type TabKey = 'warmup' | 'movement_prep' | 'scaling' | 'cue' | 'safety' | 'finish_note';

interface TabDef {
  key: TabKey;
  label: string;
  overrideField: string;
  templateField: string;
}

const TABS: TabDef[] = [
  { key: 'warmup', label: '웜업', overrideField: 'warmup_override', templateField: 'warmup' },
  { key: 'movement_prep', label: '동작준비', overrideField: 'movement_prep_override', templateField: 'movement_prep' },
  { key: 'scaling', label: '스케일링', overrideField: 'scaling_override', templateField: 'scaling_options' },
  { key: 'cue', label: '큐', overrideField: 'cue_override', templateField: 'coach_cues' },
  { key: 'safety', label: '안전', overrideField: 'safety_override', templateField: 'safety_notes' },
  { key: 'finish_note', label: '마무리', overrideField: 'finish_note_override', templateField: 'finish_notes' },
];

type Overrides = Record<string, string | null>;

interface RunbookBundle {
  template: Record<string, string | null> | null;
  templateId: string | null;
  overrides: Overrides;
}

// 외부 컨테이너 — 조회만. 편집기는 overrides 버전 key로 리마운트해 draft를 시드.
export function RunbookPanel({
  sessionId,
  header,
  attendees,
}: {
  sessionId: string;
  header: BoardHeader;
  attendees: BoardAttendee[];
}) {
  const supabase = getSupabaseBrowserClient();

  const rbQ = useQuery<RunbookBundle>(async () => {
    const res = await rpc<{ runbook: Record<string, unknown> | null; template: Record<string, string | null> | null }>(
      supabase,
      'fn_get_session_runbook',
      { p_session_id: sessionId },
    );
    if (!res.success || !res.data) {
      return { success: false, data: null, error: res.error ?? '런시트를 불러오지 못했습니다.' };
    }
    let tpl = res.data.template;
    const rb = res.data.runbook;
    let tplId = (rb?.template_id as string | undefined) ?? null;
    if (!tpl) {
      const tplRes = await rpc<Record<string, string | null>[]>(supabase, 'fn_list_runbook_templates', {
        p_facility_id: header.facility_id,
        p_class_type: header.class_type,
      });
      const list = tplRes.success && Array.isArray(tplRes.data) ? tplRes.data : [];
      tpl = list[0] ?? null;
      tplId = (tpl?.id as string | undefined) ?? tplId;
    }
    const ov: Overrides = {};
    for (const t of TABS) ov[t.overrideField] = (rb?.[t.overrideField] as string | null | undefined) ?? null;
    return { success: true, data: { template: tpl, templateId: tplId, overrides: ov }, error: null };
  }, [sessionId]);

  if (rbQ.loading) return <Skeleton variant="rect" height={200} />;
  if (rbQ.error || !rbQ.data) {
    return <EmptyState variant="error" title="런시트 로드 실패" description={rbQ.error ?? '런시트를 불러오지 못했습니다.'} onRetry={rbQ.refetch} />;
  }

  return (
    <RunbookEditor
      key={JSON.stringify(rbQ.data.overrides)}
      sessionId={sessionId}
      bundle={rbQ.data}
      attendees={attendees}
      onSaved={rbQ.refetch}
    />
  );
}

function RunbookEditor({
  sessionId,
  bundle,
  attendees,
  onSaved,
}: {
  sessionId: string;
  bundle: RunbookBundle;
  attendees: BoardAttendee[];
  onSaved: () => void;
}) {
  const toast = useToast();
  const supabase = getSupabaseBrowserClient();

  const template = bundle.template;
  const templateId = bundle.templateId;
  const loaded = bundle.overrides;

  const [draft, setDraft] = useState<Overrides>(loaded);
  const [active, setActive] = useState<TabKey>('warmup');
  const [saving, setSaving] = useState(false);

  const dirtyTabs = useMemo(() => {
    const set = new Set<TabKey>();
    for (const t of TABS) {
      if ((draft[t.overrideField] ?? null) !== (loaded[t.overrideField] ?? null)) set.add(t.key);
    }
    return set;
  }, [draft, loaded]);

  const injuryFlags = useMemo(
    () =>
      attendees
        .filter((a) => a.active_flags.some((f) => f.flag_type === 'injury'))
        .map((a) => ({
          name: a.member_name,
          critical: a.active_flags.some((f) => f.flag_type === 'injury' && f.severity === 'critical'),
        })),
    [attendees],
  );

  const save = async () => {
    setSaving(true);
    const payload: Record<string, unknown> = { template_id: templateId };
    for (const t of TABS) payload[t.overrideField] = draft[t.overrideField];
    const res = await rpc(supabase, 'fn_upsert_session_runbook', {
      p_session_id: sessionId,
      p_payload: payload,
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error ?? '저장에 실패했습니다.');
      return;
    }
    toast.success('런시트를 저장했습니다.');
    onSaved();
  };

  const def = TABS.find((t) => t.key === active)!;
  const overrideVal = draft[def.overrideField];
  const inherited = template?.[def.templateField] ?? null;
  const isOverriding = overrideVal !== null;

  return (
    <div className={styles.panel}>
      <div className={styles.runbookTabs} role="tablist" aria-label="런시트 탭">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active === t.key}
            className={`${styles.runbookTab}${active === t.key ? ` ${styles.runbookTabActive}` : ''}`}
            onClick={() => setActive(t.key)}
          >
            {t.label}
            {dirtyTabs.has(t.key) ? <span className={styles.dirtyDot} aria-label="변경됨" /> : null}
          </button>
        ))}
      </div>

      {active === 'safety' && injuryFlags.length > 0 ? (
        <div className={styles.safetyBox}>
          <span className={styles.safetyLabel}>부상 주의 (코치 전용)</span>
          <div className={styles.flagLine}>
            {injuryFlags.map((f, i) => (
              <Badge key={i} variant={f.critical ? 'danger' : 'warning'} size="sm">{f.name}</Badge>
            ))}
          </div>
        </div>
      ) : null}

      {isOverriding ? (
        <div className={styles.overrideEditor}>
          <div className={styles.overrideHead}>
            <Badge variant="accent" size="sm">오버라이드</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDraft((p) => ({ ...p, [def.overrideField]: null }))}
            >
              템플릿으로 되돌리기
            </Button>
          </div>
          <textarea
            className={styles.overrideTextarea}
            value={overrideVal ?? ''}
            rows={6}
            onChange={(e) => setDraft((p) => ({ ...p, [def.overrideField]: e.target.value }))}
            aria-label={`${def.label} 오버라이드`}
          />
        </div>
      ) : (
        <div className={styles.inheritBox}>
          <Badge variant="neutral" size="sm">템플릿 상속</Badge>
          <p className={styles.inheritText}>{inherited || '(템플릿 값 없음)'}</p>
          <Button
            variant="soft"
            size="sm"
            onClick={() => setDraft((p) => ({ ...p, [def.overrideField]: inherited ?? '' }))}
          >
            오버라이드로 복사
          </Button>
        </div>
      )}

      <Button variant="primary" loading={saving} disabled={dirtyTabs.size === 0} onClick={save}>
        런시트 저장{dirtyTabs.size > 0 ? ` (${dirtyTabs.size}탭 변경)` : ''}
      </Button>
    </div>
  );
}
