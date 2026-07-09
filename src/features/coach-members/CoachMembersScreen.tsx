'use client';

// Members — /coach/members (docs/04 §3.3)
// 세션 밖 회원 케어: 담당 회원 로스터 → 상세(컨텍스트/노트/후속조치/퍼포먼스).
// fn_get_coach_members(p_search): 코치 자기 세션 참가자/시설 스코프 로스터(Display-Safe, 정산 제외).
// 플래그 딥링크(?flag=)는 로스터의 active_flags로 클라이언트 필터.
import { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, Input, Button, Badge, EmptyState, Skeleton } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { flagTypeLabel } from '@/features/coach-home/format';
import { MemberDetailPanel } from './MemberDetailPanel';
import styles from './coach-members.module.css';

interface RosterFlag {
  flag_type: string;
  severity: string;
  note: string | null;
}

interface RosterMember {
  member_id: string;
  member_name: string;
  phone: string | null;
  avatar_url: string | null;
  status: string;
  membership_end_date: string | null;
  remaining_credits: number | null;
  active_flags: RosterFlag[];
  last_checkin: string | null;
}

export function CoachMembersScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = getSupabaseBrowserClient();

  const memberId = params.get('member_id');
  const flag = params.get('flag');

  const [term, setTerm] = useState('');
  const [submitted, setSubmitted] = useState('');

  // 담당 회원 로스터 — 검색어(submitted) 변경 시 재조회. 빈 검색어 = 전체 로스터.
  const roster = useQuery<RosterMember[]>(
    () => rpc<RosterMember[]>(supabase, 'fn_get_coach_members', { p_search: submitted || null }),
    [submitted],
  );

  const runSearch = () => setSubmitted(term.trim());

  const openMember = (id: string) => router.push(`/coach/members?member_id=${id}`);
  const backToList = () => router.push('/coach/members');

  const flagNotice = useMemo(() => (flag ? flagTypeLabel(flag) : null), [flag]);

  // 플래그 딥링크 필터 — 로스터의 active_flags 기준 클라이언트 필터
  const list = useMemo(() => {
    const rows = roster.data ?? [];
    if (!flag) return rows;
    return rows.filter((m) => m.active_flags?.some((f) => f.flag_type === flag));
  }, [roster.data, flag]);

  if (memberId) {
    return <MemberDetailPanel memberId={memberId} onBack={backToList} />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>회원</h1>
        {flagNotice ? (
          <Badge variant="warning">플래그 필터: {flagNotice}</Badge>
        ) : null}
      </header>

      <div className={styles.searchRow}>
        <Input
          label="회원 검색"
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="이름 · 전화"
          onKeyDown={(e) => {
            if (e.key === 'Enter') runSearch();
          }}
        />
        <Button variant="soft" size="sm" onClick={runSearch}>검색</Button>
      </div>

      {roster.loading ? (
        <Skeleton variant="rect" height={72} />
      ) : roster.error ? (
        <Card>
          <EmptyState variant="error" title="로스터 로드 실패" description={roster.error} onRetry={roster.refetch} />
        </Card>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            variant="no-result"
            title={submitted || flag ? '결과 없음' : '담당 회원 없음'}
            description={submitted || flag ? '조건에 맞는 담당 회원이 없습니다.' : '배정된 수업 참가자가 담당 회원으로 표시됩니다.'}
          />
        </Card>
      ) : (
        <div className={styles.list}>
          {list.map((m) => (
            <button key={m.member_id} type="button" className={styles.row} onClick={() => openMember(m.member_id)}>
              <div className={styles.rowMain}>
                <span className={styles.rowName}>{m.member_name}</span>
                <span className={styles.rowMeta}>
                  {m.phone ?? ''}
                  {m.membership_end_date ? ` · 만료 ${m.membership_end_date.slice(0, 10)}` : ''}
                  {m.remaining_credits != null ? ` · 잔여 ${m.remaining_credits}회` : ''}
                </span>
              </div>
              <div className={styles.rowBadges}>
                {m.active_flags?.slice(0, 2).map((f, i) => (
                  <Badge key={i} variant={f.severity === 'critical' ? 'danger' : 'warning'} size="sm">
                    {flagTypeLabel(f.flag_type)}
                  </Badge>
                ))}
                <Badge variant={m.status === 'active' ? 'success' : 'neutral'} size="sm">
                  {m.status === 'active' ? '활성' : '비활성'}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
