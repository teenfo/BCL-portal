'use client';

// 탭1 home (/apps/home) — docs/03 §3.1
// 오늘 예약·체크인 상태 / 멤버십 D-Day·잔여 크레딧(만료 임박 배너) / 공지 / 알림 벨 /
// 지점 카드(facilities 흡수) / 최근 PR 하이라이트. 상태 게이트: 멤버십 없음 → purchase CTA.
import { useRouter } from 'next/navigation';
import { Card, Button, Badge, EmptyState, Skeleton, StatCard } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { query, rpc, type Envelope } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useMemberId, formatTime, formatDate, daysUntil } from '@/features/member-shell';
import screen from '@/features/member-shell/screen.module.css';
import styles from './home.module.css';

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

interface PlanRef {
  name: string | null;
  type: string | null;
}
interface MembershipRow {
  id: string;
  status: string;
  end_date: string | null;
  remaining_credits: number | null;
  membership_plans: PlanRef | null;
}
interface SessionRef {
  title: string | null;
  session_date: string | null;
  start_time: string | null;
  end_time: string | null;
}
interface BookingRow {
  id: string;
  session_id: string;
  status: string;
  attendance_outcome: string;
  sessions: SessionRef | null;
}
interface NoticeRow {
  id: string;
  title: string;
  category: string;
  priority: string;
  is_pinned: boolean;
}
interface FacilityRow {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  operating_hours: Record<string, { open?: string; close?: string }> | null;
}
interface MemberRow {
  id: string;
  name: string | null;
  avatar_url: string | null;
  facility_id: string | null;
}
interface PrItem {
  id: string;
  name: string;
  result_value: number;
  metric_type: string;
  unit: string | null;
  is_pr: boolean;
  recorded_at: string;
}

interface HomeData {
  member: MemberRow | null;
  membership: MembershipRow | null;
  bookings: BookingRow[];
  checkinCount: number;
  notices: NoticeRow[];
  unread: number;
  facility: FacilityRow | null;
  pr: PrItem | null;
}

async function loadHome(memberId: string): Promise<Envelope<HomeData>> {
  const sb = getSupabaseBrowserClient();
  const iso = todayIso();

  const memberRes = await query<MemberRow>(sb, 'members', (q) =>
    q.select('id, name, avatar_url, facility_id').eq('id', memberId).single(),
  );
  if (!memberRes.success || !memberRes.data) {
    return { success: false, data: null, error: memberRes.error ?? '회원 정보를 불러오지 못했습니다.' };
  }
  const member = memberRes.data;

  const [membershipRes, bookingsRes, checkinRes, noticesRes, unreadRes, facilityRes, perfRes] =
    await Promise.all([
      query<MembershipRow[]>(sb, 'memberships', (q) =>
        q
          .select('id, status, end_date, remaining_credits, membership_plans(name, type)')
          .eq('member_id', memberId)
          .eq('status', 'active')
          .order('end_date', { ascending: true, nullsFirst: false })
          .limit(1),
      ),
      query<BookingRow[]>(sb, 'bookings', (q) =>
        q
          .select('id, session_id, status, attendance_outcome, sessions!inner(title, session_date, start_time, end_time)')
          .eq('member_id', memberId)
          .neq('status', 'cancelled')
          .eq('sessions.session_date', iso)
          .order('created_at', { ascending: true }),
      ),
      query<{ id: string }[]>(sb, 'checkins', (q) =>
        q.select('id').eq('member_id', memberId).gte('checkin_time', `${iso}T00:00:00`),
      ),
      query<NoticeRow[]>(sb, 'notices', (q) =>
        q
          .select('id, title, category, priority, is_pinned')
          .eq('is_published', true)
          .order('is_pinned', { ascending: false })
          .order('published_at', { ascending: false })
          .limit(5),
      ),
      query<{ id: string }[]>(sb, 'notifications', (q) =>
        q.select('id').eq('is_read', false),
      ),
      member.facility_id
        ? query<FacilityRow>(sb, 'facilities', (q) =>
            q
              .select('id, name, address, phone, operating_hours')
              .eq('id', member.facility_id as string)
              .single(),
          )
        : Promise.resolve<Envelope<FacilityRow>>({ success: true, data: null, error: null }),
      rpc<{ recent_results: PrItem[] }>(sb, 'fn_get_member_performance_profile', {
        p_member_id: memberId,
      }),
    ]);

  const pr =
    perfRes.success && perfRes.data?.recent_results
      ? perfRes.data.recent_results.find((r) => r.is_pr) ?? null
      : null;

  return {
    success: true,
    data: {
      member,
      membership: membershipRes.data?.[0] ?? null,
      bookings: bookingsRes.data ?? [],
      checkinCount: checkinRes.data?.length ?? 0,
      notices: noticesRes.data ?? [],
      unread: unreadRes.data?.length ?? 0,
      facility: facilityRes.data ?? null,
      pr,
    },
    error: null,
  };
}

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

export function HomeScreen() {
  const router = useRouter();
  const memberId = useMemberId();
  const { data, loading, error, refetch } = useQuery<HomeData>(
    () =>
      memberId
        ? loadHome(memberId)
        : Promise.resolve<Envelope<HomeData>>({ success: false, data: null, error: '계정에 연결된 회원 정보가 없습니다.' }),
    [memberId],
  );

  const dday = daysUntil(data?.membership?.end_date);
  const expiringSoon = dday !== null && dday <= 7;
  const nextBooking = data?.bookings.find((b) => b.status === 'confirmed') ?? data?.bookings[0] ?? null;

  const todayKey = DOW[new Date().getDay()].toLowerCase();
  const hours = data?.facility?.operating_hours;
  const todayHours = hours ? hours[todayKey] ?? hours[DOW[new Date().getDay()]] : undefined;

  return (
    <div className={screen.page}>
      <header className={screen.pageHeader}>
        <div>
          <h1 className={screen.pageTitle}>
            안녕하세요{data?.member?.name ? `, ${data.member.name}님` : ''}
          </h1>
          <p className={screen.pageSubtitle}>오늘의 운동 현황</p>
        </div>
        <button
          type="button"
          className={screen.bell}
          onClick={() => router.push('/apps/notifications')}
          aria-label={`알림${data?.unread ? ` (미읽음 ${data.unread})` : ''}`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          {data && data.unread > 0 ? <span className={screen.bellDot}>{data.unread > 99 ? '99+' : data.unread}</span> : null}
        </button>
      </header>

      {error ? (
        <Card>
          <EmptyState variant="error" title="홈 정보를 불러오지 못했습니다" description={error} onRetry={refetch} />
        </Card>
      ) : null}

      {loading && !data ? (
        <>
          <Skeleton variant="rect" height={120} />
          <Skeleton variant="rect" height={88} />
          <Skeleton variant="rect" height={88} />
        </>
      ) : null}

      {data ? (
        <>
          {/* 멤버십 요약 / 만료 임박 배너 */}
          {data.membership ? (
            <Card variant={expiringSoon ? 'accent' : 'default'} title="내 멤버십">
              <div className={screen.rowBetween}>
                <div>
                  <p className={screen.strong}>{data.membership.membership_plans?.name ?? '멤버십'}</p>
                  <p className={screen.muted}>
                    {data.membership.remaining_credits != null
                      ? `잔여 ${data.membership.remaining_credits}회`
                      : data.membership.end_date
                        ? `~ ${formatDate(data.membership.end_date)}`
                        : '기간제'}
                  </p>
                </div>
                {dday !== null ? (
                  <Badge variant={expiringSoon ? 'warning' : 'success'}>
                    {dday > 0 ? `D-${dday}` : dday === 0 ? 'D-Day' : '만료됨'}
                  </Badge>
                ) : null}
              </div>
              {expiringSoon ? (
                <div className={styles.bannerAction}>
                  <Button variant="primary" size="sm" block onClick={() => router.push('/apps/purchase')}>
                    멤버십 연장하기
                  </Button>
                </div>
              ) : null}
            </Card>
          ) : (
            <Card variant="accent">
              <EmptyState
                title="활성 멤버십이 없습니다"
                description="요금제를 구매하면 예약과 체크인을 이용할 수 있어요."
                action={{ label: '요금제 보기', onClick: () => router.push('/apps/purchase') }}
              />
            </Card>
          )}

          {/* 오늘 상태 */}
          <section className={screen.section}>
            <h2 className={screen.sectionTitle}>오늘</h2>
            <div className={screen.grid2}>
              <StatCard label="오늘 체크인" value={`${data.checkinCount}회`} />
              <StatCard label="오늘 예약" value={`${data.bookings.length}건`} />
            </div>
            {nextBooking?.sessions ? (
              <Card
                variant="raised"
                title="다음 수업"
                action={
                  <Button variant="ghost" size="sm" onClick={() => router.push('/apps/schedule')}>
                    상세
                  </Button>
                }
              >
                <div className={screen.rowBetween}>
                  <div>
                    <p className={screen.strong}>{nextBooking.sessions.title}</p>
                    <p className={screen.muted}>
                      {formatTime(nextBooking.sessions.start_time)}–{formatTime(nextBooking.sessions.end_time)}
                    </p>
                  </div>
                  <Badge variant={nextBooking.status === 'confirmed' ? 'success' : 'warning'}>
                    {nextBooking.status === 'confirmed' ? '예약 확정' : '대기'}
                  </Badge>
                </div>
              </Card>
            ) : (
              <Card>
                <EmptyState
                  title="오늘 예약이 없습니다"
                  description="수업을 예약하고 오늘의 운동을 시작해보세요."
                  action={{ label: '수업 예약', onClick: () => router.push('/apps/schedule') }}
                />
              </Card>
            )}
          </section>

          {/* 최근 PR 하이라이트 */}
          {data.pr ? (
            <Card
              title="최근 신기록"
              action={
                <Button variant="ghost" size="sm" onClick={() => router.push('/apps/performance')}>
                  성과 보기
                </Button>
              }
            >
              <div className={screen.rowBetween}>
                <p className={screen.strong}>{data.pr.name}</p>
                <Badge variant="accent">PR</Badge>
              </div>
            </Card>
          ) : null}

          {/* 공지 */}
          {data.notices.length > 0 ? (
            <section className={screen.section}>
              <h2 className={screen.sectionTitle}>공지</h2>
              <div className={screen.list}>
                {data.notices.map((n) => (
                  <Card key={n.id} variant={n.priority === 'urgent' ? 'accent' : 'default'}>
                    <div className={screen.metaRow}>
                      {n.is_pinned ? <Badge variant="info" size="sm">고정</Badge> : null}
                      {n.priority === 'urgent' ? <Badge variant="danger" size="sm">긴급</Badge> : null}
                      <span className={screen.strong}>{n.title}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          {/* 지점 정보 (facilities 흡수) */}
          {data.facility ? (
            <Card title={data.facility.name}>
              {data.facility.address ? <p className={screen.bodyText}>{data.facility.address}</p> : null}
              {todayHours?.open ? (
                <p className={screen.muted}>
                  오늘 운영: {todayHours.open}–{todayHours.close ?? ''}
                </p>
              ) : null}
              {data.facility.phone ? <p className={screen.muted}>{data.facility.phone}</p> : null}
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
