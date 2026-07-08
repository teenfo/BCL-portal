'use client';

// Circuit Console — /coach/schedule/rotation (docs/04 §3.2-1)
// 체크인 회원 기반 팀 편성(4인×최대6팀) + TV Rotation HUD 리모컨(START/PAUSE/RESET/ROTATE).
//
// ⚠ FLAG(RPC 갭): session_rotation_states UPSERT/조회 RPC가 sql/09에 없음. DB 쓰기는 query()/rpc()
// 경유만 허용(supabase-js 직접 호출 금지)인데 rotation 상태용 RPC가 부재 → 리모컨 지속/Realtime
// 반영 구현 불가. 팀 편성 UI는 in-memory로 제공하고, 상태 영속은 RPC 추가 후 연결 필요.
import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Button, Badge, EmptyState, Skeleton, useToast } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { SessionBoardData } from './types';
import styles from './circuit.module.css';

const TEAM_COUNT = 6;
const PER_TEAM = 4;

export function CircuitConsole() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const supabase = getSupabaseBrowserClient();
  const sessionId = params.get('session_id');

  const board = useQuery<SessionBoardData>(
    () =>
      sessionId
        ? rpc<SessionBoardData>(supabase, 'fn_get_coach_session_board', { p_session_id: sessionId })
        : Promise.resolve({ success: false, data: null, error: 'session_id 누락' }),
    [sessionId],
  );

  // 팀 배정: teamIndex[member_id] = 팀번호(0..5)
  const [assign, setAssign] = useState<Record<string, number>>({});
  const [running, setRunning] = useState(false);

  const checkedIn = useMemo(
    () =>
      (board.data?.attendees ?? []).filter(
        (a) => a.checked_in || a.attendance_outcome === 'walk_in',
      ),
    [board.data],
  );

  const autoForm = () => {
    const next: Record<string, number> = {};
    checkedIn.forEach((a, i) => {
      next[a.member_id] = Math.floor(i / PER_TEAM) % TEAM_COUNT;
    });
    setAssign(next);
    toast.info('자동 편성했습니다.');
  };

  const move = (memberId: string, team: number) => {
    setAssign((prev) => ({ ...prev, [memberId]: team }));
  };

  const remote = (cmd: 'start' | 'pause' | 'reset' | 'rotate') => {
    // FLAG: session_rotation_states RPC 부재 — 상태 영속/HUD 반영 미구현
    if (cmd === 'start') setRunning(true);
    if (cmd === 'pause') setRunning(false);
    if (cmd === 'reset') setRunning(false);
    toast.warning('리모컨 상태 영속 RPC 미구현 — HUD 동기화는 추후 연결(FLAG).');
  };

  if (!sessionId) {
    return (
      <div className={styles.page}>
        <EmptyState title="세션이 지정되지 않았습니다" description="세션 보드에서 서킷 콘솔을 열어주세요." action={{ label: '일정으로', onClick: () => router.push('/coach/schedule') }} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Button variant="ghost" size="sm" onClick={() => router.push(`/coach/schedule?session_id=${sessionId}`)}>← 세션 보드</Button>
        <h1 className={styles.title}>서킷 콘솔</h1>
      </header>

      {board.loading ? (
        <Skeleton variant="rect" height={200} />
      ) : board.error || !board.data ? (
        <Card>
          <EmptyState variant="error" title="세션을 불러오지 못했습니다" description={board.error ?? '접근 권한이 없습니다.'} onRetry={board.refetch} />
        </Card>
      ) : (
        <>
          <div className={styles.remoteBar}>
            <Badge variant={running ? 'success' : 'neutral'}>{running ? '진행 중' : '정지'}</Badge>
            <Button variant="primary" size="sm" onClick={() => remote('start')}>START</Button>
            <Button variant="soft" size="sm" onClick={() => remote('pause')}>PAUSE</Button>
            <Button variant="ghost" size="sm" onClick={() => remote('reset')}>RESET</Button>
            <Button variant="soft" size="sm" onClick={() => remote('rotate')}>ROTATE</Button>
          </div>

          <div className={styles.formRow}>
            <span className={styles.hint}>체크인 {checkedIn.length}명</span>
            <Button variant="soft" size="sm" onClick={autoForm}>자동 편성</Button>
          </div>

          {checkedIn.length === 0 ? (
            <Card><EmptyState title="체크인 인원 없음" description="체크인 후 팀을 편성할 수 있습니다." /></Card>
          ) : (
            <div className={styles.teamGrid}>
              {Array.from({ length: TEAM_COUNT }).map((_, team) => (
                <Card key={team} title={`스테이션 ${team + 1}`}>
                  <div className={styles.teamMembers}>
                    {checkedIn
                      .filter((a) => assign[a.member_id] === team)
                      .map((a) => (
                        <div key={a.member_id} className={styles.memberChip}>
                          <span>{a.member_name}</span>
                          <div className={styles.moveBtns}>
                            {Array.from({ length: TEAM_COUNT }).map((__, t) => (
                              <button
                                key={t}
                                type="button"
                                className={styles.moveBtn}
                                aria-label={`스테이션 ${t + 1}로 이동`}
                                onClick={() => move(a.member_id, t)}
                              >
                                {t + 1}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </Card>
              ))}
              {/* 미배정 */}
              <Card title="미배정">
                <div className={styles.teamMembers}>
                  {checkedIn
                    .filter((a) => assign[a.member_id] === undefined)
                    .map((a) => (
                      <div key={a.member_id} className={styles.memberChip}>
                        <span>{a.member_name}</span>
                        <div className={styles.moveBtns}>
                          {Array.from({ length: TEAM_COUNT }).map((__, t) => (
                            <button key={t} type="button" className={styles.moveBtn} onClick={() => move(a.member_id, t)}>{t + 1}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
