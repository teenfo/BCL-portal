'use client';

// /apps/wod — 회원 공개 WOD 목록 (03 회원 앱). 게시 + 회원공개 토글 ON 템플릿만.
//   소스 fn_list_member_wods (authenticated, Display-Safe: 공개노트만 · 코치노트/정산 미노출).
import { Card, Badge, EmptyState, Skeleton } from '@/components/ui';
import { StackHeader } from '@/features/member-shell';
import { useQuery } from '@/lib/data/useQuery';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import screen from '@/features/member-shell/screen.module.css';
import styles from './member-wod.module.css';

interface WodMovement {
  name: string | null;
  target: string | null;
  reps: number | string | null;
  rx_male: string | null;
  rx_female: string | null;
  superset_group?: string | null;
}
interface MemberWod {
  id: string;
  title: string;
  format: string | null;
  rounds: number | null;
  time_cap_minutes: number | null;
  notes: string | null;
  movements: WodMovement[];
}

const FORMAT_LABEL: Record<string, string> = {
  for_time: 'For Time',
  amrap: 'AMRAP',
  emom: 'EMOM',
  tabata: 'TABATA',
  chipper: 'Chipper',
  strength: 'Strength',
  custom: 'Custom',
  station_circuit: 'Station Circuit',
};

function movementLine(m: WodMovement): string {
  const parts: string[] = [];
  if (m.reps != null && m.reps !== '') parts.push(String(m.reps));
  if (m.name) parts.push(m.name);
  const head = parts.join(' × ') || (m.name ?? '');
  const extra = [m.target, m.rx_male ? `♂ ${m.rx_male}` : null, m.rx_female ? `♀ ${m.rx_female}` : null]
    .filter(Boolean)
    .join(' · ');
  return extra ? `${head} — ${extra}` : head;
}

/** 연속 동일 superset_group 을 한 컴파운드 세트로 묶는다(TV 그룹핑 미러). */
interface WodSegment {
  group: string | null;
  items: WodMovement[];
}
function segmentMovements(movements: WodMovement[]): WodSegment[] {
  const segs: WodSegment[] = [];
  for (const m of movements) {
    const raw = typeof m.superset_group === 'string' ? m.superset_group.trim() : '';
    const group = raw || null;
    const last = segs[segs.length - 1];
    if (group && last && last.group === group) {
      last.items.push(m);
    } else {
      segs.push({ group, items: [m] });
    }
  }
  return segs;
}

export function WodListScreen() {
  const wods = useQuery<{ wods: MemberWod[] }>(
    () => rpc<{ wods: MemberWod[] }>(getSupabaseBrowserClient(), 'fn_list_member_wods'),
    [],
  );

  const list = wods.data?.wods ?? [];

  return (
    <>
      <StackHeader title="WOD" />
      <div className={screen.page}>
        {wods.loading ? (
          <>
            <Skeleton variant="rect" height={140} />
            <Skeleton variant="rect" height={140} />
          </>
        ) : wods.error ? (
          <Card>
            <EmptyState
              variant="error"
              title="WOD을 불러오지 못했습니다"
              description={wods.error}
              onRetry={wods.refetch}
            />
          </Card>
        ) : list.length === 0 ? (
          <Card>
            <EmptyState title="공개된 WOD가 없습니다" description="공개된 오늘의 운동이 게시되면 여기에 표시됩니다." />
          </Card>
        ) : (
          list.map((w) => (
            <Card key={w.id} title={w.title}>
              <div className={styles.metaRow}>
                {w.format ? <Badge variant="accent">{FORMAT_LABEL[w.format] ?? w.format}</Badge> : null}
                {w.rounds ? <Badge variant="neutral">{w.rounds} 라운드</Badge> : null}
                {w.time_cap_minutes ? <Badge variant="neutral">CAP {w.time_cap_minutes}분</Badge> : null}
              </div>
              {w.movements.length > 0 ? (
                <ol className={styles.moveList}>
                  {segmentMovements(w.movements).map((seg, si) =>
                    seg.group == null ? (
                      <li key={si} className={styles.moveItem}>
                        {movementLine(seg.items[0])}
                      </li>
                    ) : (
                      <li key={si} className={styles.moveGroup}>
                        <span className={styles.moveGroupTag}>세트 {seg.group}</span>
                        <ul className={styles.moveGroupItems}>
                          {seg.items.map((m, mi) => (
                            <li key={mi} className={styles.moveItem}>
                              {movementLine(m)}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ),
                  )}
                </ol>
              ) : null}
              {w.notes ? <p className={styles.notes}>{w.notes}</p> : null}
            </Card>
          ))
        )}
      </div>
    </>
  );
}
