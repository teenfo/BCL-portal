'use client';

// Race 이벤트 생성/편집 모달 (02-admin §3.9 events)
// 전용 RPC 부재 → race_events 직접 insert/update(admin RLS). ⏳ audit 미기록.
// 세션 연동(session_id)은 fn_prepare_race_session(코치앱) 경로 소관 → 여기선 미설정.
import { useEffect, useState } from 'react';
import { Modal, Button, Input, Select, Card } from '@/components/ui';
import { useToast } from '@/components/ui';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  type RaceEvent,
  type RaceEventType,
  type RaceFormat,
  type RaceStatus,
  type CourseLayout,
  writeError,
} from './types';
import styles from './race-admin.module.css';

interface Props {
  event: RaceEvent | null; // null = 신규
  onClose: () => void;
  onSaved: () => void;
}

interface FacilityRow {
  id: string;
  name: string;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function RaceEventEditModal({ event, onClose, onSaved }: Props) {
  const toast = useToast();
  const client = getSupabaseBrowserClient();

  const [name, setName] = useState(event?.name ?? '');
  const [facilityId, setFacilityId] = useState<string | null>(event?.facility_id ?? null);
  const [eventDate, setEventDate] = useState(event?.event_date ?? today());
  const [eventType, setEventType] = useState<RaceEventType>(event?.event_type ?? 'rowing');
  const [raceFormat, setRaceFormat] = useState<RaceFormat>(event?.race_format ?? 'individual');
  const [courseLayout, setCourseLayout] = useState<CourseLayout>(event?.course_layout ?? 'vertical');
  const [status, setStatus] = useState<RaceStatus>(event?.status ?? 'scheduled');
  const [targetDistance, setTargetDistance] = useState(
    event?.target_distance_m != null ? String(event.target_distance_m) : '',
  );
  const [durationMin, setDurationMin] = useState(
    event?.duration_minutes != null ? String(event.duration_minutes) : '',
  );
  const [groupTarget, setGroupTarget] = useState(
    event?.group_target_m != null ? String(event.group_target_m) : '',
  );
  const [heatNo, setHeatNo] = useState(String(event?.heat_no ?? 1));
  const [description, setDescription] = useState(event?.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isEdit = event != null;
  const isGroup = raceFormat === 'group';

  // 지점 목록 — event.facility_id는 nullable이므로 선택 사항. 신규는 첫 지점 기본 선택.
  const [facilities, setFacilities] = useState<FacilityRow[]>([]);
  useEffect(() => {
    let alive = true;
    void query<FacilityRow[]>(client, 'facilities', (q) =>
      q.select('id, name').eq('is_active', true).order('name'),
    ).then((res) => {
      if (!alive || !res.success || !res.data) return;
      setFacilities(res.data);
      if (!isEdit) setFacilityId((cur) => cur ?? res.data?.[0]?.id ?? null);
    });
    return () => {
      alive = false;
    };
  }, [client, isEdit]);

  const validate = (): string | null => {
    if (!name.trim()) return '이벤트 이름을 입력하세요.';
    if (!eventDate) return '일자를 선택하세요.';
    const h = Number(heatNo);
    if (!Number.isFinite(h) || h < 1) return '히트 번호는 1 이상이어야 합니다.';
    return null;
  };

  const doSave = async () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    const payload = {
      name: name.trim(),
      facility_id: facilityId,
      event_date: eventDate,
      event_type: eventType,
      race_format: raceFormat,
      course_layout: courseLayout,
      status,
      target_distance_m: targetDistance.trim() ? Number(targetDistance) : null,
      duration_minutes: durationMin.trim() ? Number(durationMin) : null,
      group_target_m: isGroup && groupTarget.trim() ? Number(groupTarget) : null,
      heat_no: Number(heatNo),
      description: description.trim() || null,
    };
    setSaving(true);
    setError(null);
    const res = isEdit
      ? await query(client, 'race_events', (q) => q.update(payload).eq('id', event.id))
      : await query(client, 'race_events', (q) => q.insert(payload));
    setSaving(false);
    if (!res.success) {
      setError(writeError(res.error));
      return;
    }
    toast.success(isEdit ? '이벤트를 수정했습니다.' : '이벤트를 생성했습니다.');
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Race 이벤트 편집' : '새 Race 이벤트'}
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

        <Input label="이벤트 이름" value={name} onChange={(e) => setName(e.target.value)} />

        <div className={styles.formRow}>
          <Input
            label="일자"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
          <Select
            label="지점 (선택)"
            value={facilityId}
            onChange={(v) => setFacilityId(v)}
            placeholder={facilities.length === 0 ? '지점 불러오는 중…' : '지점 선택'}
            options={facilities.map((f) => ({ value: f.id, label: f.name }))}
          />
        </div>

        <div className={styles.formRow}>
          <Select
            label="종목"
            value={eventType}
            onChange={(v) => setEventType(v as RaceEventType)}
            options={[
              { value: 'rowing', label: '로잉' },
              { value: 'bike', label: '바이크' },
              { value: 'skierg', label: '스키어그' },
              { value: 'run', label: '런' },
              { value: 'other', label: '기타' },
            ]}
          />
          <Select
            label="포맷"
            value={raceFormat}
            onChange={(v) => setRaceFormat(v as RaceFormat)}
            options={[
              { value: 'individual', label: '개인전' },
              { value: 'team', label: '팀전' },
              { value: 'group', label: '단체전' },
              { value: 'relay', label: '릴레이' },
            ]}
          />
        </div>

        <div className={styles.formRow}>
          <Input
            label="1인(1팀) 목표 거리 (m, 선택)"
            type="number"
            value={targetDistance}
            onChange={(e) => setTargetDistance(e.target.value)}
            helper="비우면 시간제 레이스"
          />
          <Input
            label="시간제 (분, 선택)"
            type="number"
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
          />
        </div>

        {isGroup ? (
          <div className={styles.formRow}>
            <Input
              label="단체전 공동 목표 (m)"
              type="number"
              value={groupTarget}
              onChange={(e) => setGroupTarget(e.target.value)}
              helper="전원 합산 목표 (예: 10000)"
            />
            <Input
              label="히트 번호"
              type="number"
              value={heatNo}
              onChange={(e) => setHeatNo(e.target.value)}
            />
          </div>
        ) : null}

        <div className={styles.formRow}>
          <Select
            label="코스 레이아웃 (TV 표시)"
            value={courseLayout}
            onChange={(v) => setCourseLayout(v as CourseLayout)}
            options={[
              { value: 'vertical', label: '세로 코스 (측면 뷰)' },
              { value: 'horizontal', label: '가로 코스 (탑뷰)' },
            ]}
          />
          <Select
            label="상태"
            value={status}
            onChange={(v) => setStatus(v as RaceStatus)}
            options={[
              { value: 'scheduled', label: '예정' },
              { value: 'in_progress', label: '진행 중' },
              { value: 'completed', label: '완료' },
              { value: 'cancelled', label: '취소' },
            ]}
          />
        </div>

        <Input
          label="설명 (선택)"
          multiline
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <p className={styles.note}>
          세션 연동(session_id)은 코치앱 경로(fn_prepare_race_session)에서 처리됩니다. 진행 상태
          제어(lobby_status)는 Coach Control 소관입니다.
        </p>
      </div>
    </Modal>
  );
}
