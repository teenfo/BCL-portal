'use client';

// 세션 보드 — WOD 패널 (docs/04 §3.2(b))
// 템플릿 선택(fn_list_wod_templates) 또는 직접 편집 → Save Draft(fn_upsert_session_wod)
// → Publish(fn_publish_session_wod, movements_snapshot 동결). 전광판 미리보기=fn_get_class_display_wod(TV 동일 소스).
// 공개 메모는 class_display_notes 필드에만(Display-Safe §1.3).
import { useState } from 'react';
import { Card, Button, Input, Select, Badge, EmptyState, Skeleton, useToast } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

import styles from './session-board.module.css';

interface MovementLine {
  name: string;
  target_value?: string;
  target_unit?: string;
  load_male_rx?: string;
  load_female_rx?: string;
  notes?: string;
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
    setMovements((prev) => [...prev, { name, target_value: '', target_unit: '', load_male_rx: '', load_female_rx: '' }]);
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
    movements_snapshot: movements,
    coach_notes: coachNotes || null,
    class_display_notes: displayNotes || null,
  });

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
