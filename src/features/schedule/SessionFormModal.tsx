'use client';

// 세션 생성/편집 모달 (02-admin §3.6 캘린더)
// sessions / session_coaches 직접 쓰기 — admin RLS FOR ALL(단일 도메인), query() 경유.
// ⏳ audit_logs 클라 INSERT 생략: audit_logs는 RLS로 서버(SECURITY DEFINER)만 INSERT 가능 →
//    감사 동반 세션 CRUD는 fn 신설 후 이관(범위 외).
// ⏳ DnD 생성/이동은 과설계 위험 → 본 Modal 폼으로 대체(주 단위 반복 옵션 제공).
// 시간 이동(예약자 존재) 파괴적 확인은 부모(SessionPanel)에서 gate.
import { useEffect, useMemo, useState } from 'react';
import { Modal, Button, Input, Select, Checkbox, Card } from '@/components/ui';
import { useToast } from '@/components/ui';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { AssignmentRole, CoachOption, ScheduleSession } from './types';
import styles from './schedule.module.css';

interface FacilityRow {
  id: string;
  name: string;
}
interface CoachAssign {
  coach_id: string;
  role: AssignmentRole;
}
interface Props {
  open: boolean;
  session: ScheduleSession | null; // null = 신규
  defaultDate: string; // yyyy-mm-dd (신규 기본 일자)
  coaches: CoachOption[];
  onClose: () => void;
  onSaved: () => void;
}

const ROLE_OPTIONS = [
  { value: 'lead', label: '리드' },
  { value: 'assistant', label: '어시스턴트' },
];

export function SessionFormModal({ open, session, defaultDate, coaches, onClose, onSaved }: Props) {
  const toast = useToast();
  const isEdit = session != null;

  const [title, setTitle] = useState(session?.title ?? '');
  const [facilityId, setFacilityId] = useState<string | null>(session?.facility_id ?? null);
  const [date, setDate] = useState(session?.session_date ?? defaultDate);
  const [startTime, setStartTime] = useState(session?.start_time?.slice(0, 5) ?? '10:00');
  const [endTime, setEndTime] = useState(session?.end_time?.slice(0, 5) ?? '11:00');
  const [capacity, setCapacity] = useState(String(session?.capacity ?? 15));
  const [assigns, setAssigns] = useState<CoachAssign[]>(
    session
      ? [...session.session_coaches]
          .sort((a, b) => a.display_order - b.display_order)
          .map((c) => ({ coach_id: c.coach_id, role: c.assignment_role }))
      : [],
  );
  const [recurring, setRecurring] = useState(false);
  const [weeks, setWeeks] = useState('4');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 시설 목록 — 신규 세션의 facility_id 필수(NOT NULL). 편집은 기존 값 유지.
  const [facilities, setFacilities] = useState<FacilityRow[]>([]);
  useEffect(() => {
    if (!open || isEdit) return;
    let alive = true;
    void query<FacilityRow[]>(getSupabaseBrowserClient(), 'facilities', (q) =>
      q.select('id, name').eq('is_active', true).order('name'),
    ).then((res) => {
      if (!alive || !res.success || !res.data) return;
      setFacilities(res.data);
      setFacilityId((cur) => cur ?? res.data?.[0]?.id ?? null);
    });
    return () => {
      alive = false;
    };
  }, [open, isEdit]);

  const coachOptions = useMemo(
    () => coaches.map((c) => ({ value: c.id, label: c.name })),
    [coaches],
  );

  const addCoach = () => setAssigns((a) => [...a, { coach_id: '', role: a.length === 0 ? 'lead' : 'assistant' }]);
  const updateCoach = (i: number, patch: Partial<CoachAssign>) =>
    setAssigns((a) => a.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const removeCoach = (i: number) => setAssigns((a) => a.filter((_, idx) => idx !== i));

  const validate = (): string | null => {
    if (!title.trim()) return '세션 제목을 입력하세요.';
    if (!isEdit && !facilityId) return '지점을 선택하세요.';
    if (!date) return '일자를 선택하세요.';
    if (!startTime || !endTime) return '시작·종료 시간을 입력하세요.';
    if (endTime <= startTime) return '종료 시간은 시작 시간보다 늦어야 합니다.';
    const cap = Number(capacity);
    if (!Number.isFinite(cap) || cap <= 0) return '정원은 1 이상이어야 합니다.';
    const chosen = assigns.filter((a) => a.coach_id);
    const ids = new Set(chosen.map((a) => a.coach_id));
    if (ids.size !== chosen.length) return '동일 코치를 중복 배정할 수 없습니다.';
    if (!isEdit && recurring) {
      const w = Number(weeks);
      if (!Number.isFinite(w) || w < 1 || w > 26) return '반복 주 수는 1~26 범위여야 합니다.';
    }
    return null;
  };

  const buildDates = (): string[] => {
    if (isEdit || !recurring) return [date];
    const w = Number(weeks);
    const out: string[] = [];
    const base = new Date(`${date}T00:00:00`);
    for (let i = 0; i < w; i += 1) {
      const d = new Date(base);
      d.setDate(base.getDate() + i * 7);
      out.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      );
    }
    return out;
  };

  const writeCoaches = async (sessionId: string) => {
    const client = getSupabaseBrowserClient();
    // 편집: 기존 배정 초기화 후 재삽입 (admin RLS FOR ALL)
    if (isEdit) {
      await query(client, 'session_coaches', (q) => q.delete().eq('session_id', sessionId));
    }
    const rows = assigns
      .filter((a) => a.coach_id)
      .map((a, idx) => ({
        session_id: sessionId,
        coach_id: a.coach_id,
        assignment_role: a.role,
        display_order: idx,
      }));
    if (rows.length > 0) {
      await query(client, 'session_coaches', (q) => q.insert(rows));
    }
  };

  const doSave = async () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSaving(true);
    setError(null);
    const client = getSupabaseBrowserClient();

    if (isEdit && session) {
      const res = await query<ScheduleSession>(client, 'sessions', (q) =>
        q
          .update({
            title: title.trim(),
            session_date: date,
            start_time: `${startTime}:00`,
            end_time: `${endTime}:00`,
            capacity: Number(capacity),
          })
          .eq('id', session.id)
          .select()
          .single(),
      );
      if (!res.success) {
        setSaving(false);
        setError(res.error ?? '저장에 실패했습니다.');
        return;
      }
      await writeCoaches(session.id);
      setSaving(false);
      toast.success('세션을 수정했습니다.');
      onSaved();
      return;
    }

    // 신규 — 반복이면 다건 생성
    const dates = buildDates();
    const payload = dates.map((d) => ({
      facility_id: facilityId,
      title: title.trim(),
      session_date: d,
      start_time: `${startTime}:00`,
      end_time: `${endTime}:00`,
      capacity: Number(capacity),
      status: 'scheduled',
    }));
    const res = await query<{ id: string }[]>(client, 'sessions', (q) =>
      q.insert(payload).select('id'),
    );
    if (!res.success || !res.data) {
      setSaving(false);
      setError(res.error ?? '세션 생성에 실패했습니다.');
      return;
    }
    // 각 세션에 동일 코치 배정
    for (const row of res.data) {
      await writeCoaches(row.id);
    }
    setSaving(false);
    toast.success(dates.length > 1 ? `${dates.length}개 세션을 생성했습니다.` : '세션을 생성했습니다.');
    onSaved();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? '세션 편집' : '세션 생성'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button variant="primary" onClick={doSave} loading={saving}>
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

        <Input label="세션 제목" value={title} onChange={(e) => setTitle(e.target.value)} />

        {!isEdit ? (
          <Select
            label="지점"
            value={facilityId}
            onChange={setFacilityId}
            placeholder={facilities.length === 0 ? '지점 불러오는 중…' : '지점 선택'}
            options={facilities.map((f) => ({ value: f.id, label: f.name }))}
          />
        ) : null}

        <div className={styles.formRow}>
          <Input label="일자" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input
            label="정원"
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </div>

        <div className={styles.formRow}>
          <Input
            label="시작 시간"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <Input
            label="종료 시간"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        {/* 다중 코치 배정 (lead/assistant, display_order = 행 순서) */}
        <div className={styles.coachAssign}>
          <div className={styles.coachAssignHead}>
            <span>코치 배정 (session_coaches)</span>
            <Button variant="ghost" size="sm" onClick={addCoach}>
              + 코치 추가
            </Button>
          </div>
          {assigns.length === 0 ? (
            <span className={styles.hint}>배정된 코치가 없습니다.</span>
          ) : (
            assigns.map((a, i) => (
              <div key={i} className={styles.coachAssignRow}>
                <Select
                  label="코치"
                  value={a.coach_id || null}
                  onChange={(v) => updateCoach(i, { coach_id: v })}
                  searchable
                  placeholder="코치 선택"
                  options={coachOptions}
                />
                <Select
                  label="역할"
                  value={a.role}
                  onChange={(v) => updateCoach(i, { role: v as AssignmentRole })}
                  options={ROLE_OPTIONS}
                />
                <Button variant="ghost" size="sm" onClick={() => removeCoach(i)}>
                  삭제
                </Button>
              </div>
            ))
          )}
        </div>

        {!isEdit ? (
          <div className={styles.coachAssign}>
            <Checkbox
              label="매주 반복 생성 (같은 요일·시간)"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
            />
            {recurring ? (
              <Input
                label="반복 주 수 (1~26)"
                type="number"
                value={weeks}
                onChange={(e) => setWeeks(e.target.value)}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
