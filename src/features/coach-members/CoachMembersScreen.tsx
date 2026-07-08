'use client';

// Members — /coach/members (docs/04 §3.3)
// 세션 밖 회원 케어: 검색 → 상세(컨텍스트/노트/후속조치/퍼포먼스).
//
// ⚠ FLAG(RPC 갭): 코치 '담당 회원 목록' 스코프 RPC가 sql/09에 없음(fn_get_member_context_panel은
// 상세 전용). 목록은 members 테이블 query() 검색으로 대체(RLS 전제). flag 딥링크 서버 필터도
// 전용 RPC 부재로 클라이언트 안내만 표시.
import { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, Input, Button, Badge, EmptyState, Skeleton } from '@/components/ui';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { flagTypeLabel } from '@/features/coach-home/format';
import { MemberDetailPanel } from './MemberDetailPanel';
import styles from './coach-members.module.css';

interface MemberRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: string;
}

const sanitize = (s: string) => s.replace(/[,()]/g, ' ').trim();

export function CoachMembersScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = getSupabaseBrowserClient();

  const memberId = params.get('member_id');
  const flag = params.get('flag');

  const [term, setTerm] = useState('');
  const [results, setResults] = useState<MemberRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async () => {
    const t = sanitize(term);
    if (t.length < 1) return;
    setLoading(true);
    setError(null);
    const res = await query<MemberRow[]>(supabase, 'members', (q) =>
      q
        .select('id,name,email,phone,avatar_url,status')
        .or(`name.ilike.%${t}%,email.ilike.%${t}%,phone.ilike.%${t}%`)
        .order('name')
        .limit(30),
    );
    setLoading(false);
    if (!res.success) {
      setError(res.error ?? '회원 검색에 실패했습니다.');
      setResults(null);
      return;
    }
    setResults(res.data ?? []);
  };

  const openMember = (id: string) => router.push(`/coach/members?member_id=${id}`);
  const backToList = () => router.push('/coach/members');

  const flagNotice = useMemo(() => (flag ? flagTypeLabel(flag) : null), [flag]);

  if (memberId) {
    return <MemberDetailPanel memberId={memberId} onBack={backToList} />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>회원</h1>
        {flagNotice ? (
          <Badge variant="warning">플래그 필터: {flagNotice} (검색으로 조회)</Badge>
        ) : null}
      </header>

      <div className={styles.searchRow}>
        <Input
          label="회원 검색"
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="이름 · 이메일 · 전화"
          onKeyDown={(e) => {
            if (e.key === 'Enter') void runSearch();
          }}
        />
        <Button variant="soft" size="sm" onClick={runSearch}>검색</Button>
      </div>

      {loading ? (
        <Skeleton variant="rect" height={72} />
      ) : error ? (
        <Card>
          <EmptyState variant="error" title="검색 실패" description={error} onRetry={runSearch} />
        </Card>
      ) : results === null ? (
        <Card>
          <EmptyState title="회원을 검색하세요" description="이름·이메일·전화번호로 담당 회원을 찾을 수 있습니다." />
        </Card>
      ) : results.length === 0 ? (
        <Card>
          <EmptyState variant="no-result" title="결과 없음" description="검색 조건에 맞는 회원이 없습니다." />
        </Card>
      ) : (
        <div className={styles.list}>
          {results.map((m) => (
            <button key={m.id} type="button" className={styles.row} onClick={() => openMember(m.id)}>
              <div className={styles.rowMain}>
                <span className={styles.rowName}>{m.name}</span>
                <span className={styles.rowMeta}>{m.email ?? m.phone ?? ''}</span>
              </div>
              <Badge variant={m.status === 'active' ? 'success' : 'neutral'} size="sm">
                {m.status === 'active' ? '활성' : '비활성'}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
