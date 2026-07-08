'use client';

// 비탭 feedback (/apps/feedback) — docs/03 §3.7
// 미평가 세션(체크인 완료분) 별점+리뷰 / 제출 내역·Admin 답변 열람.
// 제출은 RLS "session_feedback own insert"(세션당 1회 UNIQUE)로 query 헬퍼 경유.
import { useMemo, useState } from 'react';
import { Card, Button, Input, EmptyState, Skeleton, useToast } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { query, type Envelope } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useMemberId, formatDate } from '@/features/member-shell';
import { StackHeader, BottomSheet } from '@/features/member-shell';
import screen from '@/features/member-shell/screen.module.css';
import styles from './feedback.module.css';

interface AttendedSession {
  session_id: string;
  title: string | null;
  session_date: string | null;
}
interface FeedbackRow {
  id: string;
  session_id: string;
  rating: number;
  comment: string | null;
  admin_response: string | null;
  sessions: { title: string | null; session_date: string | null } | null;
}
interface FeedbackData {
  unrated: AttendedSession[];
  rated: FeedbackRow[];
}

async function loadFeedback(memberId: string): Promise<Envelope<FeedbackData>> {
  const sb = getSupabaseBrowserClient();
  const [checkinsRes, feedbackRes] = await Promise.all([
    query<{ session_id: string; sessions: { title: string | null; session_date: string | null } | null }[]>(
      sb,
      'checkins',
      (q) =>
        q
          .select('session_id, sessions!inner(title, session_date)')
          .eq('member_id', memberId)
          .not('session_id', 'is', null)
          .order('checkin_time', { ascending: false })
          .limit(50),
    ),
    query<FeedbackRow[]>(sb, 'session_feedback', (q) =>
      q
        .select('id, session_id, rating, comment, admin_response, sessions(title, session_date)')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false }),
    ),
  ]);
  if (!checkinsRes.success) return { success: false, data: null, error: checkinsRes.error };

  const ratedIds = new Set((feedbackRes.data ?? []).map((f) => f.session_id));
  const seen = new Set<string>();
  const unrated: AttendedSession[] = [];
  for (const c of checkinsRes.data ?? []) {
    if (!c.session_id || ratedIds.has(c.session_id) || seen.has(c.session_id)) continue;
    seen.add(c.session_id);
    unrated.push({ session_id: c.session_id, title: c.sessions?.title ?? null, session_date: c.sessions?.session_date ?? null });
  }
  return { success: true, data: { unrated, rated: feedbackRes.data ?? [] }, error: null };
}

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className={styles.stars} role={onChange ? 'radiogroup' : undefined} aria-label="별점">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`${styles.star} ${n <= value ? styles.starOn : ''}`}
          onClick={onChange ? () => onChange(n) : undefined}
          aria-label={`${n}점`}
          aria-pressed={onChange ? n === value : undefined}
          disabled={!onChange}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill={n <= value ? 'currentColor' : 'none'}>
            <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19l1-5.8-4.3-4.1 5.9-.9L12 3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export function FeedbackScreen() {
  const memberId = useMemberId();
  const toast = useToast();
  const [target, setTarget] = useState<AttendedSession | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const data = useQuery<FeedbackData>(
    () =>
      memberId
        ? loadFeedback(memberId)
        : Promise.resolve<Envelope<FeedbackData>>({ success: false, data: null, error: '회원 정보가 없습니다.' }),
    [memberId],
  );

  const openSheet = (s: AttendedSession) => {
    setTarget(s);
    setRating(0);
    setComment('');
  };

  const submit = async () => {
    if (!target || !memberId || rating < 1) {
      toast.error('별점을 선택해주세요.');
      return;
    }
    setBusy(true);
    const res = await query(getSupabaseBrowserClient(), 'session_feedback', (q) =>
      q.insert({ session_id: target.session_id, member_id: memberId, rating, comment: comment || null }),
    );
    setBusy(false);
    if (!res.success) {
      toast.error(res.error ?? '평가 제출에 실패했습니다.');
      return;
    }
    toast.success('평가가 제출되었습니다. 감사합니다!');
    setTarget(null);
    data.refetch();
  };

  const unrated = data.data?.unrated ?? [];
  const rated = useMemo(() => data.data?.rated ?? [], [data.data]);
  const avg = useMemo(
    () => (rated.length ? (rated.reduce((s, r) => s + r.rating, 0) / rated.length).toFixed(1) : null),
    [rated],
  );

  return (
    <>
      <StackHeader title="수업 평가" />
      <div className={screen.page}>
        {data.error ? (
          <Card>
            <EmptyState variant="error" title="평가 정보를 불러오지 못했습니다" description={data.error} onRetry={data.refetch} />
          </Card>
        ) : data.loading && !data.data ? (
          <>
            <Skeleton variant="rect" height={80} />
            <Skeleton variant="rect" height={80} />
          </>
        ) : (
          <>
            <section className={screen.section}>
              <h2 className={screen.sectionTitle}>평가할 수업</h2>
              {unrated.length === 0 ? (
                <Card>
                  <EmptyState title="평가할 수업이 없습니다" description="수업에 체크인하면 이곳에서 평가할 수 있어요." />
                </Card>
              ) : (
                unrated.map((s) => (
                  <Card
                    key={s.session_id}
                    action={
                      <Button variant="soft" size="sm" onClick={() => openSheet(s)}>
                        평가하기
                      </Button>
                    }
                  >
                    <p className={screen.strong}>{s.title ?? '수업'}</p>
                    <p className={screen.muted}>{formatDate(s.session_date)}</p>
                  </Card>
                ))
              )}
            </section>

            {rated.length > 0 ? (
              <section className={screen.section}>
                <div className={screen.rowBetween}>
                  <h2 className={screen.sectionTitle}>내 평가 내역</h2>
                  {avg ? <span className={styles.starSm}>평균 ★ {avg}</span> : null}
                </div>
                {rated.map((r) => (
                  <Card key={r.id}>
                    <div className={screen.rowBetween}>
                      <p className={screen.strong}>{r.sessions?.title ?? '수업'}</p>
                      <span className={styles.starSm}>{'★'.repeat(r.rating)}</span>
                    </div>
                    <p className={screen.muted}>{formatDate(r.sessions?.session_date)}</p>
                    {r.comment ? <p className={screen.bodyText}>{r.comment}</p> : null}
                    {r.admin_response ? (
                      <div className={styles.response}>
                        <p className={styles.responseLabel}>운영진 답변</p>
                        <p className={screen.bodyText}>{r.admin_response}</p>
                      </div>
                    ) : null}
                  </Card>
                ))}
              </section>
            ) : null}
          </>
        )}
      </div>

      {target ? (
        <BottomSheet
          variant="auto"
          title={target.title ?? '수업 평가'}
          onClose={() => setTarget(null)}
          footer={
            <Button variant="primary" block loading={busy} onClick={submit}>
              평가 제출
            </Button>
          }
        >
          <div className={screen.centerCol}>
            <Stars value={rating} onChange={setRating} />
          </div>
          <Input
            label="리뷰 (선택)"
            multiline
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="수업은 어떠셨나요?"
          />
        </BottomSheet>
      ) : null}
    </>
  );
}
