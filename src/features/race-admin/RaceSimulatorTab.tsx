'use client';

// Race 시뮬레이션 (02-admin §3.9) — PM5 없이 Class 관전 화면을 구동한다.
//   가상 레인 N개를 편성해 race:{event} 채널에 브릿지와 동일한 프레임을 발행 → 다른 탭/TV의
//   /class/race/view 가 애니메이션. 화면 전용(비파괴): race_records/race_live_state 미저장.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Select, Input, Card, Table, Badge, useToast } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  createRaceSimulator,
  type RaceSimulator,
  type SimLane,
  type SimLaneState,
  type SimStatus,
} from './race-simulator';
import type { RaceEvent } from './types';
import styles from './race-admin.module.css';

const STATUS_LABEL: Record<SimStatus, string> = {
  idle: '대기',
  running: '진행 중',
  paused: '일시정지',
  finished: '종료',
};
const STATUS_BADGE: Record<SimStatus, 'neutral' | 'warning' | 'info' | 'success'> = {
  idle: 'neutral',
  running: 'warning',
  paused: 'info',
  finished: 'success',
};

const LANE_OPTIONS = [2, 3, 4, 5, 6, 7, 8].map((n) => ({ value: String(n), label: `${n} 레인` }));

/** 초 → m:ss */
function mmss(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '-';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function RaceSimulatorTab() {
  const toast = useToast();
  const { can } = useMyPermissions();
  const canRun = can('race', 'edit');

  const events = useQuery<RaceEvent[]>(
    () =>
      query<RaceEvent[]>(getSupabaseBrowserClient(), 'race_events', (q) =>
        q.select('*').order('event_date', { ascending: false }).limit(200),
      ),
    [],
  );

  const [eventId, setEventId] = useState('');
  const [laneCount, setLaneCount] = useState('4');
  const [distance, setDistance] = useState('500');
  const [baseSplit, setBaseSplit] = useState('120');
  const [status, setStatus] = useState<SimStatus>('idle');
  const [laneStates, setLaneStates] = useState<SimLaneState[]>([]);
  const simRef = useRef<RaceSimulator | null>(null);

  const eventList = useMemo(() => events.data ?? [], [events.data]);

  const eventOptions = useMemo(
    () => [
      { value: '', label: '이벤트 선택…' },
      ...eventList.map((e) => ({ value: e.id, label: `${e.name} (${e.event_date})` })),
    ],
    [eventList],
  );

  // 이벤트 변경 = 사용자 액션으로 처리(effect 아님) — 기존 시뮬레이터 정리 + 목표 거리 프리필
  const onEventChange = (id: string) => {
    simRef.current?.close();
    simRef.current = null;
    setStatus('idle');
    setLaneStates([]);
    const ev = eventList.find((e) => e.id === id);
    if (ev?.target_distance_m) setDistance(String(ev.target_distance_m));
    setEventId(id);
  };

  // 언마운트 시 채널 정리
  useEffect(() => {
    return () => {
      simRef.current?.close();
      simRef.current = null;
    };
  }, []);

  const targetDistance = Number(distance);

  const onStart = () => {
    if (!eventId) {
      toast.error('시뮬레이션할 이벤트를 선택하세요.');
      return;
    }
    const n = Number(laneCount);
    const base = Number(baseSplit);
    if (!Number.isFinite(targetDistance) || targetDistance <= 0) {
      toast.error('목표 거리를 확인하세요.');
      return;
    }
    if (!Number.isFinite(base) || base <= 0) {
      toast.error('기준 스플릿(초)을 확인하세요.');
      return;
    }
    simRef.current?.close();
    const sim = createRaceSimulator(eventId, {
      onStatus: setStatus,
      onTick: (lanes) => setLaneStates(lanes),
    });
    simRef.current = sim;
    // 레인별 스플릿을 base 중심으로 소폭 분산 → 선두 경쟁 연출(최소 60초 클램프)
    const lanes: SimLane[] = Array.from({ length: n }, (_, i) => ({
      lane: i + 1,
      name: `레인 ${i + 1}`,
      split500: Math.max(60, base + (i - (n - 1) / 2) * 2),
    }));
    sim.start({ targetDistance, lanes });
    toast.success('시뮬레이션을 시작했습니다. 관전 화면을 열어 확인하세요.');
  };

  const onPause = () => simRef.current?.pause();
  const onResume = () => simRef.current?.resume();
  const onReset = () => simRef.current?.reset();
  const onStop = () => {
    simRef.current?.close();
    simRef.current = null;
    setStatus('idle');
    setLaneStates([]);
  };

  const openView = () => {
    if (!eventId) {
      toast.error('이벤트를 먼저 선택하세요.');
      return;
    }
    window.open(`/class/race/view?event=${eventId}`, '_blank', 'noopener');
  };

  const columns: TableColumn<SimLaneState>[] = [
    { key: 'lane', header: '레인', render: (l) => l.lane },
    { key: 'name', header: '이름', render: (l) => l.name },
    {
      key: 'dist',
      header: '거리',
      align: 'right',
      render: (l) =>
        `${Math.round(l.distance).toLocaleString('ko-KR')} / ${targetDistance.toLocaleString('ko-KR')}m`,
    },
    {
      key: 'pct',
      header: '진행',
      align: 'right',
      render: (l) =>
        targetDistance > 0 ? `${Math.round((l.distance / targetDistance) * 100)}%` : '-',
    },
    { key: 'spm', header: 'SPM', align: 'right', render: (l) => l.spm || '-' },
    { key: 'power', header: 'W', align: 'right', render: (l) => l.power || '-' },
    {
      key: 'state',
      header: '',
      align: 'right',
      render: (l) => (l.finished ? <Badge variant="success">완주</Badge> : null),
    },
  ];

  if (!canRun) {
    return (
      <div className={styles.tabBody}>
        <Card>
          <p className={styles.note}>시뮬레이션 실행 권한이 없습니다 (race.edit 필요).</p>
        </Card>
      </div>
    );
  }

  const active = status === 'running' || status === 'paused';

  return (
    <div className={styles.tabBody}>
      <Card>
        <p className={styles.note}>
          PM5·브릿지 없이 관전 화면을 구동합니다. 가상 레인을 편성해 <code>race:{'{event}'}</code>{' '}
          채널에 실시간 프레임을 발행하며, <strong>화면 전용</strong>이라 기록(race_records)에는
          저장되지 않습니다. 관전 화면을 새 탭/TV에서 열어 확인하세요.
        </p>
      </Card>

      <div className={styles.simConfig}>
        <div className={styles.filterWide}>
          <Select label="이벤트" value={eventId} onChange={onEventChange} options={eventOptions} />
        </div>
        <div className={styles.filter}>
          <Select label="레인 수" value={laneCount} onChange={setLaneCount} options={LANE_OPTIONS} />
        </div>
        <div className={styles.filter}>
          <Input
            label="목표 거리(m)"
            type="number"
            inputMode="numeric"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
          />
        </div>
        <div className={styles.filter}>
          <Input
            label="기준 스플릿(초/500m)"
            type="number"
            inputMode="numeric"
            value={baseSplit}
            onChange={(e) => setBaseSplit(e.target.value)}
            helper={`≈ ${mmss(Number(baseSplit))}/500m`}
          />
        </div>
      </div>

      <div className={styles.simActions}>
        <Badge variant={STATUS_BADGE[status]}>{STATUS_LABEL[status]}</Badge>
        {status === 'running' ? (
          <Button variant="soft" onClick={onPause}>
            일시정지
          </Button>
        ) : null}
        {status === 'paused' ? (
          <Button variant="soft" onClick={onResume}>
            재개
          </Button>
        ) : null}
        {status === 'idle' || status === 'finished' ? (
          <Button variant="primary" onClick={onStart}>
            시뮬레이션 시작
          </Button>
        ) : null}
        {active ? (
          <Button variant="ghost" onClick={onReset}>
            리셋
          </Button>
        ) : null}
        {active ? (
          <Button variant="ghost" onClick={onStop}>
            정지
          </Button>
        ) : null}
        <Button variant="ghost" onClick={openView}>
          관전 화면 열기 ↗
        </Button>
      </div>

      {laneStates.length > 0 ? (
        <Table<SimLaneState>
          columns={columns}
          rows={laneStates}
          rowKey={(l) => l.serial}
          empty={{ title: '레인 없음', description: '시뮬레이션을 시작하세요.' }}
        />
      ) : (
        <Card>
          <p className={styles.note}>
            {events.loading
              ? '이벤트를 불러오는 중…'
              : eventList.length === 0
                ? '먼저 이벤트 탭에서 Race 이벤트를 만드세요.'
                : '이벤트를 선택하고 시뮬레이션을 시작하세요.'}
          </p>
        </Card>
      )}
    </div>
  );
}
