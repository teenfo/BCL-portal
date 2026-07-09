'use client';

// 레인 배정 패널 — /coach/race/control (docs/04 §3.4, docs/15 Race)
// fn_get_assignable_roster 로 회원/기기/현재 배정을 불러와 레인 그리드를 구성하고,
// fn_set_race_lanes 로 전체 교체 저장한다(pre-race 전용 — setup/lobby 에서만).
// 서버가 device→facility 검증·소유권·상태 가드를 소유(클라이언트는 식별자 전달만).
import { useMemo, useState } from 'react';
import { Card, Button, Input, Select, Badge, Checkbox, EmptyState, Skeleton, useToast } from '@/components/ui';
import type { SelectOption } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from './coach-race.module.css';

interface RosterMember {
  member_id: string;
  name: string;
  source: 'roster' | 'facility';
}
interface RosterDevice {
  device_id: string;
  serial_number: string;
  device_type: string;
  status: string;
}
interface CurrentLane {
  device_id: string;
  lane_number: number;
  member_id: string | null;
}
interface RosterData {
  event_id: string;
  lobby_status: string;
  members: RosterMember[];
  devices: RosterDevice[];
  current: CurrentLane[];
}

const NONE = '__none__'; // "미배정" 옵션 값(member_id = null 매핑)
const EDITABLE = new Set(['setup', 'lobby']); // 배정 편집 허용 상태

interface LaneRow {
  device_id: string;
  serial_number: string;
  device_type: string;
  enabled: boolean;
  lane_number: string;
  member_id: string | null;
}

function buildRows(data: RosterData): LaneRow[] {
  const hasCurrent = data.current.length > 0;
  return data.devices.map((d, i) => {
    const cur = data.current.find((c) => c.device_id === d.device_id);
    if (cur) {
      return {
        device_id: d.device_id,
        serial_number: d.serial_number,
        device_type: d.device_type,
        enabled: true,
        lane_number: String(cur.lane_number),
        member_id: cur.member_id,
      };
    }
    return {
      device_id: d.device_id,
      serial_number: d.serial_number,
      device_type: d.device_type,
      enabled: !hasCurrent, // 기존 배정이 없으면 전 기기 기본 활성(순번 자동)
      lane_number: hasCurrent ? '' : String(i + 1),
      member_id: null,
    };
  });
}

export function LaneAssignPanel({ eventId }: { eventId: string }) {
  const supabase = getSupabaseBrowserClient();
  const toast = useToast();
  const [rows, setRows] = useState<LaneRow[] | null>(null);
  const [saving, setSaving] = useState(false);

  const roster = useQuery<RosterData>(
    () => rpc<RosterData>(supabase, 'fn_get_assignable_roster', { p_event_id: eventId }),
    [eventId],
  );

  // 로컬 편집 상태는 로드 데이터에서 파생(최초/재조회 시 리셋) — 저장 후 refetch로 재동기화
  const data = roster.data;
  const rowsKey = data ? `${data.event_id}:${data.devices.length}:${data.current.length}` : '';
  const [seededKey, setSeededKey] = useState('');
  if (data && rowsKey !== seededKey) {
    setSeededKey(rowsKey);
    setRows(buildRows(data));
  }

  const editable = !!data && EDITABLE.has(data.lobby_status);

  const memberOptions = useMemo<SelectOption[]>(() => {
    const opts: SelectOption[] = [{ value: NONE, label: '— 미배정' }];
    for (const m of data?.members ?? []) {
      opts.push({
        value: m.member_id,
        label: m.source === 'roster' ? `${m.name} · 세션` : m.name,
      });
    }
    return opts;
  }, [data?.members]);

  const update = (deviceId: string, patch: Partial<LaneRow>) => {
    setRows((cur) => (cur ? cur.map((r) => (r.device_id === deviceId ? { ...r, ...patch } : r)) : cur));
  };

  const save = async () => {
    if (!rows) return;
    const active = rows.filter((r) => r.enabled);
    const invalid = active.find((r) => !r.lane_number.trim() || Number(r.lane_number) <= 0);
    if (invalid) {
      toast.error(`${invalid.serial_number}: 레인 번호를 입력하세요.`);
      return;
    }
    // 레인 번호 중복 방지(서버는 강제하지 않음 — UX 가드)
    const nums = active.map((r) => Number(r.lane_number));
    if (new Set(nums).size !== nums.length) {
      toast.error('레인 번호가 중복되었습니다.');
      return;
    }
    const payload = active.map((r) => ({
      device_id: r.device_id,
      lane_number: Number(r.lane_number),
      member_id: r.member_id,
    }));

    setSaving(true);
    const res = await rpc<{ lane_count: number }>(supabase, 'fn_set_race_lanes', {
      p_event_id: eventId,
      p_lanes: payload,
    });
    setSaving(false);
    if (!res.success) {
      toast.error(
        res.error === 'race_in_progress'
          ? '이미 진행 중인 레이스는 배정을 변경할 수 없습니다.'
          : (res.error ?? '레인 배정 저장 실패'),
      );
      return;
    }
    toast.success(`레인 ${res.data?.lane_count ?? active.length}개를 배정했습니다.`);
    roster.refetch();
  };

  if (roster.loading) {
    return (
      <Card title="레인 배정">
        <Skeleton variant="rect" height={140} />
      </Card>
    );
  }
  if (roster.error || !data) {
    return (
      <Card title="레인 배정">
        <EmptyState
          variant="error"
          title="배정 정보를 불러오지 못했습니다"
          description={roster.error ?? '이벤트를 찾을 수 없습니다.'}
          onRetry={roster.refetch}
        />
      </Card>
    );
  }
  if (data.devices.length === 0) {
    return (
      <Card title="레인 배정">
        <EmptyState
          title="등록된 장비 없음"
          description="이 지점에 등록된 PM5 장비가 없습니다. 기기 등록은 Admin 전용입니다."
        />
      </Card>
    );
  }

  const activeCount = (rows ?? []).filter((r) => r.enabled).length;

  return (
    <Card
      title="레인 배정"
      action={<Badge variant="info" size="sm">{activeCount}개 레인</Badge>}
    >
      {!editable ? (
        <p className={styles.muted}>
          진행 중/종료된 레이스입니다. 레인 배정은 준비(setup/lobby) 상태에서만 변경할 수 있습니다.
        </p>
      ) : (
        <p className={styles.muted}>
          레인에 배정할 회원을 선택하세요. 저장 시 선택한 레인으로 전체 교체됩니다(체크 해제한 기기는 제외).
        </p>
      )}

      <div className={styles.laneGrid}>
        {(rows ?? []).map((r) => (
          <div key={r.device_id} className={styles.laneRow}>
            <Checkbox
              label={r.serial_number}
              checked={r.enabled}
              disabled={!editable}
              onChange={(e) => update(r.device_id, { enabled: e.target.checked })}
            />
            <Badge variant="neutral" size="sm">{r.device_type}</Badge>
            <div className={styles.laneNum}>
              <Input
                label="레인"
                type="number"
                min={1}
                value={r.lane_number}
                disabled={!editable || !r.enabled}
                onChange={(e) => update(r.device_id, { lane_number: e.target.value })}
              />
            </div>
            <div className={styles.laneMember}>
              <Select
                label="회원"
                searchable
                placeholder="회원 선택"
                options={memberOptions}
                value={r.member_id ?? NONE}
                disabled={!editable || !r.enabled}
                onChange={(v) => update(r.device_id, { member_id: v === NONE ? null : v })}
              />
            </div>
          </div>
        ))}
      </div>

      <div className={styles.controlActions}>
        <Button variant="primary" size="sm" loading={saving} disabled={!editable} onClick={save}>
          배정 저장
        </Button>
      </div>
    </Card>
  );
}
