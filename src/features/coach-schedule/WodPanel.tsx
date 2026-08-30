'use client';

// 세션 보드 — WOD 패널 (docs/04 §3.2(b))
// 템플릿 선택(fn_list_wod_templates) 또는 직접 편집 → Save Draft(fn_upsert_session_wod)
// → Publish(fn_publish_session_wod, movements_snapshot 동결). 전광판 미리보기=fn_get_class_display_wod(TV 동일 소스).
// 공개 메모는 class_display_notes 필드에만(Display-Safe §1.3).
import { useState } from 'react';
import { Card, Button, Input, Select, Badge, Checkbox, EmptyState, Skeleton, useToast } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { FlowSegment, TimerCommand, TimerMode } from '@/features/class-broadcast';
import { FLOW_PRE_SECONDS, deriveFlowSegments } from '@/features/coach-race';

import styles from './session-board.module.css';

interface MovementLine {
  name: string;
  target_value?: string;
  target_unit?: string;
  load_male_rx?: string;
  load_female_rx?: string;
  notes?: string;
  superset_group?: string | null;
}

// ── 수업 세그먼트 플랜 편집 (docs/05 §3.2 flow) ─────────────────────────────
// 저장 형태 = 계약 FlowSegment[] (session_wods.segments). 편집 드래프트는 문자열 필드로
// 다루고 저장 시 TimerCommand로 변환한다. 타이머 없음(브리핑 등)은 mode='' 유지.
type SegTimerMode = '' | TimerMode;

interface SegmentDraft {
  name: string;
  mode: SegTimerMode;
  /** countdown·countup: 분 */
  minutes: string;
  /** tabata·interval: work 초 / emom: 인터벌 초 */
  work: string;
  /** tabata·interval: rest 초 */
  rest: string;
  /** emom·interval: 라운드 / tabata: 세트 */
  rounds: string;
  showBoard: boolean;
}

const SEG_MODE_OPTS = [
  { value: 'none', label: '타이머 없음' },
  { value: 'countdown', label: '카운트다운(분)' },
  { value: 'countup', label: '카운트업(캡 분)' },
  { value: 'emom', label: 'EMOM' },
  { value: 'tabata', label: '타바타' },
  { value: 'interval', label: '인터벌' },
];

function segmentToDraft(seg: FlowSegment): SegmentDraft {
  const t = seg.timer ?? null;
  const mode: SegTimerMode = t?.mode ?? '';
  return {
    name: seg.name,
    mode,
    minutes:
      mode === 'countdown' && t?.seconds != null
        ? String(Math.round(t.seconds / 60))
        : mode === 'countup' && t?.capSeconds
          ? String(Math.round(t.capSeconds / 60))
          : '',
    work:
      mode === 'emom'
        ? String(t?.intervalSeconds ?? 60)
        : mode === 'tabata' || mode === 'interval'
          ? String(t?.workSeconds ?? 20)
          : '',
    rest: mode === 'tabata' || mode === 'interval' ? String(t?.restSeconds ?? 10) : '',
    rounds:
      mode === 'emom' || mode === 'interval'
        ? String(t?.totalRounds ?? 10)
        : mode === 'tabata'
          ? String(t?.totalSets ?? 8)
          : '',
    showBoard: Boolean(seg.showBoard),
  };
}

function draftToSegment(d: SegmentDraft): FlowSegment {
  const num = (v: string, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  let timer: TimerCommand | null = null;
  if (d.mode === 'countdown') {
    timer = { action: 'configure', mode: 'countdown', seconds: num(d.minutes, 10) * 60, preSeconds: FLOW_PRE_SECONDS };
  } else if (d.mode === 'countup') {
    const cap = Number(d.minutes);
    timer = {
      action: 'configure',
      mode: 'countup',
      capSeconds: Number.isFinite(cap) && cap > 0 ? cap * 60 : 0,
      preSeconds: FLOW_PRE_SECONDS,
    };
  } else if (d.mode === 'emom') {
    timer = {
      action: 'configure',
      mode: 'emom',
      intervalSeconds: num(d.work, 60),
      totalRounds: num(d.rounds, 10),
      preSeconds: FLOW_PRE_SECONDS,
    };
  } else if (d.mode === 'tabata') {
    timer = {
      action: 'configure',
      mode: 'tabata',
      workSeconds: num(d.work, 20),
      restSeconds: num(d.rest, 10),
      totalSets: num(d.rounds, 8),
      preSeconds: FLOW_PRE_SECONDS,
    };
  } else if (d.mode === 'interval') {
    timer = {
      action: 'configure',
      mode: 'interval',
      workSeconds: num(d.work, 60),
      restSeconds: num(d.rest, 30),
      totalRounds: num(d.rounds, 5),
      preSeconds: FLOW_PRE_SECONDS,
    };
  }
  return { name: d.name.trim() || '세그먼트', timer, showBoard: d.showBoard || undefined };
}

interface SessionWod {
  id?: string;
  session_id: string;
  template_id?: string | null;
  publish_state: 'none' | 'draft' | 'published';
  title_override?: string | null;
  format_override?: string | null;
  time_cap_override?: number | null;
  description_override?: string | null;
  movements_snapshot?: MovementLine[];
  segments?: FlowSegment[] | null;
  coach_notes?: string | null;
  class_display_notes?: string | null;
  updated_at?: string | null;
}

interface WodTemplate {
  id: string;
  title: string;
  format_type?: string | null;
  time_cap_minutes?: number | null;
  description?: string | null;
  movements?: {
    movement_name_ko?: string | null;
    custom_label?: string | null;
    target_value?: number | null;
    target_unit?: string | null;
    load_male_rx?: string | null;
    load_female_rx?: string | null;
    superset_group?: string | null;
  }[];
}

interface DisplayWod {
  title?: string;
  format?: string;
  time_cap_minutes?: number;
  description?: string;
  movements_snapshot?: MovementLine[];
  class_display_notes?: string;
}

interface MovementHit {
  id: string;
  name_ko: string;
}

const FORMAT_OPTS = [
  { value: 'amrap', label: 'AMRAP' },
  { value: 'for_time', label: 'For Time' },
  { value: 'emom', label: 'EMOM' },
  { value: 'strength', label: 'Strength' },
  { value: 'custom', label: '커스텀' },
];

// 외부 컨테이너 — 조회만 담당. 편집기는 버전 key로 리마운트해 편집 상태를 서버값으로 시드.
export function WodPanel({ sessionId }: { sessionId: string }) {
  const supabase = getSupabaseBrowserClient();
  const wodQ = useQuery<SessionWod>(
    () => rpc<SessionWod>(supabase, 'fn_get_session_wod', { p_session_id: sessionId }),
    [sessionId],
  );
  const tplQ = useQuery<WodTemplate[]>(
    () => rpc<WodTemplate[]>(supabase, 'fn_list_wod_templates', { p_scope: 'shared' }),
    [],
  );

  if (wodQ.loading) return <Skeleton variant="rect" height={200} />;
  if (wodQ.error || !wodQ.data) {
    return <EmptyState variant="error" title="WOD 로드 실패" description={wodQ.error ?? 'WOD를 불러오지 못했습니다.'} onRetry={wodQ.refetch} />;
  }

  const s = wodQ.data;
  const seedKey = `${s.id ?? 'none'}:${s.updated_at ?? ''}:${s.publish_state}`;
  return (
    <WodEditor
      key={seedKey}
      sessionId={sessionId}
      initial={s}
      templates={tplQ.data ?? []}
      onSaved={wodQ.refetch}
    />
  );
}

function WodEditor({
  sessionId,
  initial,
  templates,
  onSaved,
}: {
  sessionId: string;
  initial: SessionWod;
  templates: WodTemplate[];
  onSaved: () => void;
}) {
  const toast = useToast();
  const supabase = getSupabaseBrowserClient();

  const [title, setTitle] = useState(initial.title_override ?? '');
  const [format, setFormat] = useState(initial.format_override ?? '');
  const [timeCap, setTimeCap] = useState(initial.time_cap_override != null ? String(initial.time_cap_override) : '');
  const [description, setDescription] = useState(initial.description_override ?? '');
  const [coachNotes, setCoachNotes] = useState(initial.coach_notes ?? '');
  const [displayNotes, setDisplayNotes] = useState(initial.class_display_notes ?? '');
  const [templateId, setTemplateId] = useState<string | null>(initial.template_id ?? null);
  const [movements, setMovements] = useState<MovementLine[]>(
    Array.isArray(initial.movements_snapshot) ? initial.movements_snapshot : [],
  );
  const [segments, setSegments] = useState<SegmentDraft[]>(
    Array.isArray(initial.segments) ? initial.segments.map(segmentToDraft) : [],
  );

  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [search, setSearch] = useState('');
  const [hits, setHits] = useState<MovementHit[]>([]);
  const [preview, setPreview] = useState<DisplayWod | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const state = initial;

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    setTitle(tpl.title ?? '');
    setFormat(tpl.format_type ?? '');
    setTimeCap(tpl.time_cap_minutes != null ? String(tpl.time_cap_minutes) : '');
    setDescription(tpl.description ?? '');
    setMovements(
      (tpl.movements ?? []).map((m) => ({
        name: m.custom_label ?? m.movement_name_ko ?? '동작',
        target_value: m.target_value != null ? String(m.target_value) : '',
        target_unit: m.target_unit ?? '',
        load_male_rx: m.load_male_rx ?? '',
        load_female_rx: m.load_female_rx ?? '',
        superset_group: m.superset_group ?? '',
      })),
    );
    toast.info('템플릿을 불러왔습니다. 저장 전까지 반영되지 않습니다.');
  };

  const runSearch = async () => {
    const res = await rpc<MovementHit[]>(supabase, 'fn_search_wod_movements', {
      p_query: search,
      p_limit: 20,
    });
    setHits(res.success && Array.isArray(res.data) ? res.data : []);
  };

  const addMovement = (name: string) => {
    setMovements((prev) => [...prev, { name, target_value: '', target_unit: '', load_male_rx: '', load_female_rx: '', superset_group: '' }]);
  };

  const updateMovement = (i: number, patch: Partial<MovementLine>) => {
    setMovements((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  };

  const removeMovement = (i: number) => {
    setMovements((prev) => prev.filter((_, idx) => idx !== i));
  };

  const buildPayload = () => ({
    template_id: templateId,
    title_override: title || null,
    format_override: format || null,
    time_cap_override: timeCap ? Number(timeCap) : null,
    description_override: description || null,
    movements_snapshot: movements.map((m) => ({
      ...m,
      superset_group: m.superset_group?.trim() || null,
    })),
    segments: segments.map(draftToSegment),
    coach_notes: coachNotes || null,
    class_display_notes: displayNotes || null,
  });

  // 세그먼트 플랜 편집 헬퍼 — 자동 제안은 현재 편집 중인 포맷/타임캡 기준
  const seedSegments = () => {
    const meta = {
      title: title || null,
      format: format || null,
      time_cap_minutes: timeCap ? Number(timeCap) : null,
      rounds: null,
    };
    setSegments(deriveFlowSegments(meta).map(segmentToDraft));
  };
  const updateSegment = (i: number, patch: Partial<SegmentDraft>) => {
    setSegments((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };
  const removeSegment = (i: number) => {
    setSegments((prev) => prev.filter((_, idx) => idx !== i));
  };
  const moveSegment = (i: number, delta: number) => {
    setSegments((prev) => {
      const j = i + delta;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const addSegment = () => {
    setSegments((prev) => [
      ...prev,
      { name: '', mode: '', minutes: '', work: '', rest: '', rounds: '', showBoard: false },
    ]);
  };

  const saveDraft = async () => {
    setSavingDraft(true);
    const res = await rpc(supabase, 'fn_upsert_session_wod', {
      p_session_id: sessionId,
      p_payload: buildPayload(),
    });
    setSavingDraft(false);
    if (!res.success) {
      toast.error(res.error ?? '저장에 실패했습니다.');
      return;
    }
    toast.success('Draft 저장 완료');
    onSaved();
  };

  const publish = async () => {
    // 먼저 현재 편집분을 저장한 뒤 publish (스냅샷 동결)
    setPublishing(true);
    const up = await rpc(supabase, 'fn_upsert_session_wod', {
      p_session_id: sessionId,
      p_payload: buildPayload(),
    });
    if (!up.success) {
      setPublishing(false);
      toast.error(up.error ?? '저장에 실패했습니다.');
      return;
    }
    const res = await rpc(supabase, 'fn_publish_session_wod', { p_session_id: sessionId });
    setPublishing(false);
    if (!res.success) {
      toast.error(res.error ?? '게시에 실패했습니다.');
      return;
    }
    toast.success('전광판에 게시했습니다.');
    onSaved();
  };

  const loadPreview = async () => {
    const res = await rpc<DisplayWod>(supabase, 'fn_get_class_display_wod', {
      p_session_id: sessionId,
    });
    setPreview(res.success ? res.data : null);
    setShowPreview(true);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.wodStateRow}>
        <Badge variant={state.publish_state === 'published' ? 'success' : state.publish_state === 'draft' ? 'warning' : 'neutral'}>
          {state.publish_state === 'published' ? '게시됨' : state.publish_state === 'draft' ? '작성 중' : '없음'}
        </Badge>
      </div>

      <Select
        label="템플릿 선택"
        native
        placeholder="템플릿에서 시작 (선택)"
        value={templateId}
        onChange={applyTemplate}
        options={templates.map((t) => ({ value: t.id, label: t.title }))}
      />

      <Input label="제목" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="WOD 제목" />
      <div className={styles.twoCol}>
        <Select
          label="포맷"
          native
          placeholder="포맷"
          value={format || null}
          onChange={setFormat}
          options={FORMAT_OPTS}
        />
        <Input label="타임캡(분)" type="number" value={timeCap} onChange={(e) => setTimeCap(e.target.value)} />
      </div>
      <Input label="설명" multiline rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />

      {/* 동작 라인 */}
      <div className={styles.movementBlock}>
        <h3 className={styles.groupTitle}>동작</h3>
        {movements.length === 0 ? (
          <p className={styles.hint}>템플릿을 선택하거나 아래에서 동작을 검색해 추가하세요.</p>
        ) : (
          <div className={styles.movementList}>
            {movements.map((m, i) => (
              <Card key={`${m.name}-${i}`}>
                <div className={styles.movementRow}>
                  <span className={styles.movementName}>{m.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeMovement(i)} aria-label="삭제">✕</Button>
                </div>
                <div className={styles.movementInputs}>
                  <Input label="목표" value={m.target_value ?? ''} onChange={(e) => updateMovement(i, { target_value: e.target.value })} />
                  <Input label="단위" value={m.target_unit ?? ''} onChange={(e) => updateMovement(i, { target_unit: e.target.value })} />
                  <Input label="♂ RX" value={m.load_male_rx ?? ''} onChange={(e) => updateMovement(i, { load_male_rx: e.target.value })} />
                  <Input label="♀ RX" value={m.load_female_rx ?? ''} onChange={(e) => updateMovement(i, { load_female_rx: e.target.value })} />
                  <Input label="세트 그룹" placeholder="예: A" value={m.superset_group ?? ''} onChange={(e) => updateMovement(i, { superset_group: e.target.value })} />
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className={styles.searchRow}>
          <Input
            label="동작 검색"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="동작명 검색"
          />
          <Button variant="soft" size="sm" onClick={runSearch}>검색</Button>
        </div>
        {hits.length > 0 ? (
          <div className={styles.hitList}>
            {hits.map((h) => (
              <Button key={h.id} variant="ghost" size="sm" onClick={() => addMovement(h.name_ko)}>+ {h.name_ko}</Button>
            ))}
          </div>
        ) : null}
      </div>

      {/* 수업 세그먼트 플랜 — TV flow 모드의 타임라인(저장 시 session_wods.segments). */}
      <div className={styles.movementBlock}>
        <h3 className={styles.groupTitle}>수업 플로우(세그먼트)</h3>
        {segments.length === 0 ? (
          <p className={styles.hint}>
            미설정 시 TV 제어에서 포맷 기반 기본 플랜(브리핑→웜업→본운동→쿨다운)이 자동 제안됩니다.
          </p>
        ) : (
          <div className={styles.movementList}>
            {segments.map((s, i) => (
              <Card key={i}>
                <div className={styles.movementRow}>
                  <span className={styles.movementName}>{i + 1}.</span>
                  <Button variant="ghost" size="sm" onClick={() => moveSegment(i, -1)} aria-label="위로">↑</Button>
                  <Button variant="ghost" size="sm" onClick={() => moveSegment(i, 1)} aria-label="아래로">↓</Button>
                  <Button variant="ghost" size="sm" onClick={() => removeSegment(i)} aria-label="삭제">✕</Button>
                </div>
                <div className={styles.movementInputs}>
                  <Input label="이름" value={s.name} onChange={(e) => updateSegment(i, { name: e.target.value })} placeholder="예: 웜업" />
                  <Select
                    label="타이머"
                    native
                    value={s.mode || 'none'}
                    onChange={(v) => updateSegment(i, { mode: v === 'none' ? '' : (v as SegmentDraft['mode']) })}
                    options={SEG_MODE_OPTS}
                  />
                  {s.mode === 'countdown' || s.mode === 'countup' ? (
                    <Input
                      label={s.mode === 'countdown' ? '분' : '캡(분, 공백=무제한)'}
                      type="number"
                      value={s.minutes}
                      onChange={(e) => updateSegment(i, { minutes: e.target.value })}
                    />
                  ) : null}
                  {s.mode === 'emom' ? (
                    <>
                      <Input label="인터벌(초)" type="number" value={s.work} onChange={(e) => updateSegment(i, { work: e.target.value })} />
                      <Input label="라운드" type="number" value={s.rounds} onChange={(e) => updateSegment(i, { rounds: e.target.value })} />
                    </>
                  ) : null}
                  {s.mode === 'tabata' || s.mode === 'interval' ? (
                    <>
                      <Input label="WORK(초)" type="number" value={s.work} onChange={(e) => updateSegment(i, { work: e.target.value })} />
                      <Input label="REST(초)" type="number" value={s.rest} onChange={(e) => updateSegment(i, { rest: e.target.value })} />
                      <Input label={s.mode === 'tabata' ? '세트' : '라운드'} type="number" value={s.rounds} onChange={(e) => updateSegment(i, { rounds: e.target.value })} />
                    </>
                  ) : null}
                </div>
                <Checkbox
                  label="라이브 화이트보드 표시(기록 세그먼트)"
                  checked={s.showBoard}
                  onChange={(e) => updateSegment(i, { showBoard: e.target.checked })}
                />
              </Card>
            ))}
          </div>
        )}
        <div className={styles.wodActions}>
          <Button variant="soft" size="sm" onClick={seedSegments}>포맷에서 자동 생성</Button>
          <Button variant="ghost" size="sm" onClick={addSegment}>+ 세그먼트 추가</Button>
        </div>
      </div>

      <Input label="코치 메모(비공개)" multiline rows={2} value={coachNotes} onChange={(e) => setCoachNotes(e.target.value)} helper="전광판 비노출" />
      <Input label="전광판 공개 메모" multiline rows={2} value={displayNotes} onChange={(e) => setDisplayNotes(e.target.value)} helper="Display-Safe: 공개 표면에 노출되는 유일한 메모" />

      <div className={styles.wodActions}>
        <Button variant="soft" loading={savingDraft} onClick={saveDraft}>Draft 저장</Button>
        <Button variant="primary" loading={publishing} onClick={publish}>게시(Publish)</Button>
        <Button variant="ghost" onClick={loadPreview}>전광판 미리보기</Button>
      </div>

      {showPreview ? (
        <Card variant="raised" title="전광판 미리보기 (TV 동일 소스)">
          {!preview ? (
            <EmptyState title="게시된 WOD 없음" description="Publish 후 전광판에 노출됩니다." />
          ) : (
            <div className={styles.previewBody}>
              <div className={styles.previewTitle}>{preview.title ?? '제목 없음'}</div>
              <div className={styles.previewMeta}>
                {preview.format ?? ''} {preview.time_cap_minutes ? `· ${preview.time_cap_minutes}분` : ''}
              </div>
              {(preview.movements_snapshot ?? []).map((m, i) => (
                <div key={i} className={styles.previewLine}>
                  {m.target_value ? `${m.target_value}${m.target_unit ?? ''} ` : ''}{m.name}
                </div>
              ))}
              {preview.class_display_notes ? <div className={styles.previewNotes}>{preview.class_display_notes}</div> : null}
            </div>
          )}
        </Card>
      ) : null}
    </div>
  );
}
