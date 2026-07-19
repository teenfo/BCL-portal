'use client';

// WOD 템플릿 생성/편집 모달 (02-admin §3.8)
// 저장은 반드시 fn_upsert_wod_template(p_payload) RPC 경유 — 직접 쓰기 금지.
// movement line 전체 교체(멱등) + sort_order는 서버가 배열 순서로 부여.
import { useState } from 'react';
import { Modal, Button, Input, Select, Card, Checkbox } from '@/components/ui';
import { useToast } from '@/components/ui';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { MovementPicker } from './MovementPicker';
import {
  type WodTemplate,
  type TemplateKind,
  TEMPLATE_KIND_OPTIONS,
  FORMAT_TYPE_OPTIONS,
} from './types';
import styles from './wod-studio.module.css';

const SAVE_ERROR: Record<string, string> = {
  forbidden: '권한이 없습니다.',
  template_not_found: '템플릿을 찾을 수 없습니다.',
};

interface Props {
  open: boolean;
  template: WodTemplate | null; // null = 신규
  onClose: () => void;
  onSaved: () => void;
}

interface LineState {
  movement_id: string | null;
  movement_name: string | null;
  custom_label: string;
  target_value: string;
  target_unit: string;
  distance_meters: string;
  duration_seconds: string;
  load_male_rx: string;
  load_female_rx: string;
  rx_notes: string;
  scaling_notes: string;
  superset_group: string;
}

interface FormState {
  title: string;
  template_kind: TemplateKind;
  format_type: string; // '' = null
  time_cap_minutes: string;
  rounds: string;
  is_shared: boolean;
  is_benchmark: boolean;
  is_member_visible: boolean;
  description: string;
  public_notes: string;
  coach_notes: string;
  lines: LineState[];
}

const emptyLine = (): LineState => ({
  movement_id: null,
  movement_name: null,
  custom_label: '',
  target_value: '',
  target_unit: '',
  distance_meters: '',
  duration_seconds: '',
  load_male_rx: '',
  load_female_rx: '',
  rx_notes: '',
  scaling_notes: '',
  superset_group: '',
});

const s = (v: number | null | undefined) => (v != null ? String(v) : '');

function fromTemplate(t: WodTemplate): FormState {
  return {
    title: t.title,
    template_kind: t.template_kind,
    format_type: t.format_type ?? '',
    time_cap_minutes: s(t.time_cap_minutes),
    rounds: s(t.rounds),
    is_shared: t.is_shared,
    is_benchmark: t.is_benchmark,
    is_member_visible: t.is_member_visible ?? false,
    description: t.description ?? '',
    public_notes: t.public_notes ?? '',
    coach_notes: t.coach_notes ?? '',
    lines: (t.movements ?? []).map((m) => ({
      movement_id: m.movement_id,
      movement_name: m.movement_name_ko ?? null,
      custom_label: m.custom_label ?? '',
      target_value: s(m.target_value),
      target_unit: m.target_unit ?? '',
      distance_meters: s(m.distance_meters),
      duration_seconds: s(m.duration_seconds),
      load_male_rx: m.load_male_rx ?? '',
      load_female_rx: m.load_female_rx ?? '',
      rx_notes: m.rx_notes ?? '',
      scaling_notes: m.scaling_notes ?? '',
      superset_group: m.superset_group ?? '',
    })),
  };
}

const emptyForm: FormState = {
  title: '',
  template_kind: 'daily',
  format_type: '',
  time_cap_minutes: '',
  rounds: '',
  is_shared: false,
  is_benchmark: false,
  is_member_visible: false,
  description: '',
  public_notes: '',
  coach_notes: '',
  lines: [],
};

const numOrNull = (v: string): number | null => {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export function TemplateEditModal({ open, template, onClose, onSaved }: Props) {
  const toast = useToast();
  // key로 리마운트되므로 initializer에서 초기 상태 계산 (effect 동기화 불필요).
  const [form, setForm] = useState<FormState>(() =>
    template ? fromTemplate(template) : emptyForm,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const updateLine = (i: number, patch: Partial<LineState>) =>
    set('lines', form.lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => set('lines', [...form.lines, emptyLine()]);
  const removeLine = (i: number) => set('lines', form.lines.filter((_, idx) => idx !== i));
  const moveLine = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= form.lines.length) return;
    const next = [...form.lines];
    [next[i], next[j]] = [next[j], next[i]];
    set('lines', next);
  };

  const validate = (): string | null => {
    if (!form.title.trim()) return '템플릿 제목을 입력하세요.';
    if (form.lines.length === 0) return '동작 라인을 1개 이상 추가하세요.';
    for (let i = 0; i < form.lines.length; i++) {
      const l = form.lines[i];
      if (!l.movement_id && !l.custom_label.trim()) {
        return `${i + 1}번 라인: 라이브러리 동작을 선택하거나 직접 입력(custom)하세요.`;
      }
    }
    return null;
  };

  const doSave = async () => {
    const payload = {
      ...(template ? { id: template.id } : {}),
      facility_id: template?.facility_id ?? null,
      template_kind: form.template_kind,
      title: form.title.trim(),
      format_type: form.format_type || null,
      time_cap_minutes: numOrNull(form.time_cap_minutes),
      rounds: numOrNull(form.rounds),
      description: form.description.trim() || null,
      public_notes: form.public_notes.trim() || null,
      coach_notes: form.coach_notes.trim() || null,
      is_shared: form.is_shared,
      is_benchmark: form.is_benchmark,
      is_member_visible: form.is_member_visible,
      movements: form.lines.map((l) => ({
        movement_id: l.movement_id,
        custom_label: l.custom_label.trim() || null,
        target_value: numOrNull(l.target_value),
        target_unit: l.target_unit.trim() || null,
        distance_meters: numOrNull(l.distance_meters),
        duration_seconds: numOrNull(l.duration_seconds),
        load_male_rx: l.load_male_rx.trim() || null,
        load_female_rx: l.load_female_rx.trim() || null,
        rx_notes: l.rx_notes.trim() || null,
        scaling_notes: l.scaling_notes.trim() || null,
        superset_group: l.superset_group.trim() || null,
      })),
    };
    setSaving(true);
    setError(null);
    const res = await rpc<{ id: string }>(
      getSupabaseBrowserClient(),
      'fn_upsert_wod_template',
      { p_payload: payload },
    );
    setSaving(false);
    if (!res.success) {
      setError(SAVE_ERROR[res.error ?? ''] ?? res.error ?? '저장에 실패했습니다.');
      return;
    }
    toast.success(template ? '템플릿을 수정했습니다.' : '템플릿을 생성했습니다.');
    onSaved();
  };

  const onPrimary = () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    void doSave();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={template ? 'WOD 템플릿 편집' : '새 WOD 템플릿'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button variant="primary" onClick={onPrimary} loading={saving}>
            저장
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        {error ? (
          <Card variant="accent">
            <span className={styles.errorText}>{error}</span>
          </Card>
        ) : null}

        <Input label="제목" value={form.title} onChange={(e) => set('title', e.target.value)} />

        <div className={styles.formRow}>
          <Select
            label="종류 (kind)"
            value={form.template_kind}
            onChange={(v) => set('template_kind', v as TemplateKind)}
            options={TEMPLATE_KIND_OPTIONS}
          />
          <Select
            label="포맷 (format)"
            value={form.format_type}
            placeholder="선택 안 함"
            onChange={(v) => set('format_type', v)}
            options={[{ value: '', label: '선택 안 함' }, ...FORMAT_TYPE_OPTIONS]}
          />
        </div>

        <div className={styles.formRow}>
          <Input
            label="타임캡 (분)"
            type="number"
            value={form.time_cap_minutes}
            onChange={(e) => set('time_cap_minutes', e.target.value)}
          />
          <Input
            label="라운드 수"
            type="number"
            value={form.rounds}
            onChange={(e) => set('rounds', e.target.value)}
          />
        </div>

        <div className={styles.checks}>
          <Checkbox
            label="공유 템플릿 (is_shared)"
            checked={form.is_shared}
            onChange={(e) => set('is_shared', e.target.checked)}
          />
          <Checkbox
            label="벤치마크 (is_benchmark)"
            checked={form.is_benchmark}
            onChange={(e) => set('is_benchmark', e.target.checked)}
          />
          <Checkbox
            label="회원 앱에 공개"
            checked={form.is_member_visible}
            onChange={(e) => set('is_member_visible', e.target.checked)}
          />
        </div>

        <Input
          label="설명 (선택)"
          multiline
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
        <Input
          label="공개 노트 (회원/Class 노출, 선택)"
          multiline
          value={form.public_notes}
          onChange={(e) => set('public_notes', e.target.value)}
        />
        <Input
          label="코치 노트 (코치 전용, 선택)"
          multiline
          value={form.coach_notes}
          onChange={(e) => set('coach_notes', e.target.value)}
        />

        {/* 동작 라인 */}
        <div className={styles.lines}>
          <div className={styles.linesHead}>
            <span>동작 구성 (wod_template_movements)</span>
            <Button variant="ghost" size="sm" onClick={addLine}>
              + 라인 추가
            </Button>
          </div>

          {form.lines.map((l, i) => {
            const g = l.superset_group.trim();
            const prevG = form.lines[i - 1]?.superset_group.trim() ?? '';
            const nextG = form.lines[i + 1]?.superset_group.trim() ?? '';
            const grouped = !!g && (g === prevG || g === nextG);
            return (
            <div
              key={i}
              className={grouped ? `${styles.line} ${styles.lineGrouped}` : styles.line}
            >
              <div className={styles.lineHead}>
                <span className={styles.lineIndex}>
                  #{i + 1}
                  {grouped ? <span className={styles.groupTag}>세트 {g}</span> : null}
                </span>
                <div className={styles.lineControls}>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={i === 0}
                    onClick={() => moveLine(i, -1)}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={i === form.lines.length - 1}
                    onClick={() => moveLine(i, 1)}
                  >
                    ↓
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => removeLine(i)}>
                    삭제
                  </Button>
                </div>
              </div>

              <MovementPicker
                currentName={l.movement_name}
                onPick={(m) =>
                  updateLine(i, { movement_id: m.id, movement_name: m.name_ko, custom_label: '' })
                }
                onClear={() => updateLine(i, { movement_id: null, movement_name: null })}
              />

              <Input
                label="직접 입력 (custom_label — 라이브러리 미선택 시)"
                value={l.custom_label}
                onChange={(e) => updateLine(i, { custom_label: e.target.value })}
              />

              <Input
                label="세트 그룹 (선택 · 같은 값끼리 컴파운드)"
                value={l.superset_group}
                placeholder="예: A"
                onChange={(e) => updateLine(i, { superset_group: e.target.value })}
              />

              <div className={styles.lineGrid3}>
                <Input
                  label="목표값"
                  type="number"
                  value={l.target_value}
                  onChange={(e) => updateLine(i, { target_value: e.target.value })}
                />
                <Input
                  label="단위"
                  value={l.target_unit}
                  placeholder="reps/cal 등"
                  onChange={(e) => updateLine(i, { target_unit: e.target.value })}
                />
                <Input
                  label="거리 (m)"
                  type="number"
                  value={l.distance_meters}
                  onChange={(e) => updateLine(i, { distance_meters: e.target.value })}
                />
              </div>

              <div className={styles.lineGrid3}>
                <Input
                  label="시간 (초)"
                  type="number"
                  value={l.duration_seconds}
                  onChange={(e) => updateLine(i, { duration_seconds: e.target.value })}
                />
                <Input
                  label="RX 중량 (남)"
                  value={l.load_male_rx}
                  onChange={(e) => updateLine(i, { load_male_rx: e.target.value })}
                />
                <Input
                  label="RX 중량 (여)"
                  value={l.load_female_rx}
                  onChange={(e) => updateLine(i, { load_female_rx: e.target.value })}
                />
              </div>

              <div className={styles.lineGrid2}>
                <Input
                  label="RX 노트"
                  value={l.rx_notes}
                  onChange={(e) => updateLine(i, { rx_notes: e.target.value })}
                />
                <Input
                  label="스케일링 노트"
                  value={l.scaling_notes}
                  onChange={(e) => updateLine(i, { scaling_notes: e.target.value })}
                />
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
