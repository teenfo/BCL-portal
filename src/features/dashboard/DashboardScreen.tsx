'use client';

// /admin/dashboard — 운영 홈 (02-admin §3.1)
// KPI 스트립 + 매출 구성 + 긴급 위젯(딥링크) + Quick Actions.
// 위젯 개별 데이터는 각 그룹 view 보유 시에만 노출(useMyPermissions) — 미보유 위젯 자동 숨김.
// ⏳ 범위 외: 위젯 DnD 배치(widget_settings) · AI 위젯 생성기 · 주간 시계열 차트(차트 라이브러리 금지)
import { useRouter } from 'next/navigation';
import { Card, StatCard, EmptyState, Button, Badge } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useQuery } from '@/lib/data/useQuery';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from './dashboard.module.css';

interface DashboardKpis {
  total_members: number;
  active_members: number;
  pending_approvals: number;
  today_checkins: number;
  today_bookings: number;
  today_sessions: number;
  monthly_revenue: number;
  active_memberships: number;
  expiring_in_7d: number;
  active_coaches: number;
  new_members_this_month: number;
  open_tickets: number;
}

interface RevenueSlice {
  category?: string;
  source?: string;
  total: number;
  count: number;
}

interface RevenueStats {
  total_revenue: number;
  transaction_count: number;
  avg_transaction: number;
  completed: number;
  refunded: number;
  pending: number;
  by_category: RevenueSlice[];
  by_source: RevenueSlice[];
}

const krw = (n: number | null | undefined) =>
  `${Math.round(n ?? 0).toLocaleString('ko-KR')}원`;
const num = (n: number | null | undefined) => (n ?? 0).toLocaleString('ko-KR');

export function DashboardScreen() {
  const router = useRouter();
  const { can } = useMyPermissions();

  const kpis = useQuery<DashboardKpis>(
    () => rpc<DashboardKpis>(getSupabaseBrowserClient(), 'fn_get_dashboard_kpis'),
    [],
  );
  const canRevenue = can('payments', 'view');
  const revenue = useQuery<RevenueStats>(
    () =>
      canRevenue
        ? rpc<RevenueStats>(getSupabaseBrowserClient(), 'fn_get_revenue_stats', {})
        : Promise.resolve({ success: true, data: null, error: null }),
    [canRevenue],
  );

  const d = kpis.data;
  const loading = kpis.loading;
  const err = kpis.error;

  // KPI 스트립 정의 — group view 미보유 시 숨김
  const kpiCards: { group: string; label: string; value: string; hint?: string }[] = [
    { group: 'attendance', label: '오늘 체크인', value: num(d?.today_checkins), hint: `예약 ${num(d?.today_bookings)}건` },
    { group: 'members', label: '활성 회원', value: num(d?.active_members), hint: `이번 달 신규 ${num(d?.new_members_this_month)}` },
    { group: 'payments', label: '이번 달 매출', value: krw(d?.monthly_revenue) },
    { group: 'members', label: '만기 임박 (D-7)', value: num(d?.expiring_in_7d), hint: '멤버십 종료 7일 이내' },
    { group: 'schedule', label: '오늘 세션', value: num(d?.today_sessions) },
    { group: 'coaches', label: '활동 코치', value: num(d?.active_coaches) },
  ].filter((k) => can(k.group, 'view'));

  // 긴급 위젯 — 있는 데이터만(승인 대기·만기 임박·미처리 티켓). 미답변 저평점은 KPI 미제공 → ⏳ 생략
  const urgent: { group: string; label: string; value: number; href: string; alert: boolean }[] = [
    { group: 'members', label: '가입 승인 대기', value: d?.pending_approvals ?? 0, href: '/admin/members', alert: (d?.pending_approvals ?? 0) > 0 },
    { group: 'members', label: '만기 임박 회원', value: d?.expiring_in_7d ?? 0, href: '/admin/members', alert: (d?.expiring_in_7d ?? 0) > 0 },
    { group: 'crm', label: '미처리 문의 티켓', value: d?.open_tickets ?? 0, href: '/admin/crm?tab=support', alert: (d?.open_tickets ?? 0) > 0 },
  ].filter((w) => can(w.group, 'view'));

  // Quick Actions — 각 화면 딥링크(생성은 해당 화면에서 완결)
  const quick: { group: string; label: string; href: string }[] = [
    { group: 'members', label: '회원 등록', href: '/admin/members' },
    { group: 'schedule', label: '세션 생성', href: '/admin/schedule' },
    { group: 'crm', label: '공지 작성', href: '/admin/crm?tab=content' },
    { group: 'payments', label: '수동 결제', href: '/admin/payments?tab=transactions' },
  ].filter((q) => can(q.group, 'view'));

  const rev = revenue.data;
  const revMax = rev ? Math.max(1, ...rev.by_category.map((c) => c.total)) : 1;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>대시보드</h1>
          <p className={styles.subtitle}>시설 운영 현황 요약</p>
        </div>
      </header>

      {err ? (
        <Card>
          <EmptyState
            variant="error"
            title="대시보드를 불러오지 못했습니다"
            description={err}
            onRetry={kpis.refetch}
          />
        </Card>
      ) : null}

      {/* KPI 스트립 */}
      {!err ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>핵심 지표</h2>
          <div className={styles.kpiGrid}>
            {kpiCards.map((k, i) => (
              <StatCard
                key={`${k.group}-${i}`}
                label={k.label}
                value={k.value}
                hint={k.hint}
                loading={loading}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* 긴급 위젯 */}
      {!err && urgent.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>확인 필요</h2>
          <div className={styles.urgentGrid}>
            {urgent.map((w, i) => (
              <Card
                key={`${w.label}-${i}`}
                variant={w.alert ? 'accent' : 'default'}
                title={w.label}
                action={
                  <Button variant="ghost" size="sm" onClick={() => router.push(w.href)}>
                    바로가기
                  </Button>
                }
              >
                <div className={styles.urgentBody}>
                  <span
                    className={`${styles.urgentValue}${w.alert ? ` ${styles.urgentValueAlert}` : ''}`}
                  >
                    {loading ? '—' : num(w.value)}
                  </span>
                  {w.alert ? <Badge variant="warning">처리 대기</Badge> : <Badge variant="success">이상 없음</Badge>}
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/* 매출 구성 (payments view 보유 시) */}
      {canRevenue ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>이번 달 매출 구성</h2>
          <Card>
            {revenue.error ? (
              <EmptyState variant="error" title="매출 통계를 불러오지 못했습니다" description={revenue.error} onRetry={revenue.refetch} />
            ) : revenue.loading ? (
              <StatCard label="이번 달 총매출" value="—" loading />
            ) : !rev || rev.by_category.length === 0 ? (
              <EmptyState title="집계된 매출이 없습니다" description="이번 달 완료된 거래가 아직 없습니다." />
            ) : (
              <>
                <div className={styles.revStats}>
                  <StatCard label="총매출" value={krw(rev.total_revenue)} />
                  <StatCard label="거래 건수" value={num(rev.transaction_count)} hint={`완료 ${num(rev.completed)} · 환불 ${num(rev.refunded)}`} />
                  <StatCard label="평균 객단가" value={krw(rev.avg_transaction)} />
                </div>
                <div className={styles.barList}>
                  {rev.by_category.map((c, i) => (
                    <div key={`${c.category}-${i}`} className={styles.barRow}>
                      <span className={styles.barLabel}>{c.category ?? '기타'}</span>
                      <div className={styles.barTrack}>
                        <div className={styles.barFill} style={{ width: `${(c.total / revMax) * 100}%` }} />
                      </div>
                      <span className={styles.barValue}>{krw(c.total)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </section>
      ) : null}

      {/* Quick Actions */}
      {quick.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>빠른 작업</h2>
          <div className={styles.quickActions}>
            {quick.map((q) => (
              <Button key={q.href} variant="soft" onClick={() => router.push(q.href)}>
                {q.label}
              </Button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
