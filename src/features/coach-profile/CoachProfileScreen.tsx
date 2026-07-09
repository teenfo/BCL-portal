'use client';

// Profile — /coach/profile (docs/04 §3.5)
// 모든 코치 상태에서 접근 가능한 유일한 운영 화면. 상태 배지 + 코치 정보(read-only) +
// 월간 리포트(basis/kpis/retention 3섹션 lazy) + 로그아웃. 급여 쓰기 UI 없음(§1.2).
//
// 자기정보 수정: fn_update_my_coach_profile(p_patch) — name/phone/bio/specialties/profile_image_url만
// 화이트리스트(급여·status 서버측 제외). 알림 수신 설정 RPC는 부재 → 미노출.
import { useState } from 'react';
import { Card, Tabs, Badge, Button, Input, StatCard, EmptyState, Skeleton, useToast } from '@/components/ui';
import { useAuth } from '@/features/auth';
import { useCoachContext } from '@/features/coach-context';
import { useQuery } from '@/lib/data/useQuery';
import { rpc, query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from './coach-profile.module.css';

interface CoachRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  specialties: string[] | null;
  bio: string | null;
  profile_image_url: string | null;
  base_salary: number;
  session_allowance: number;
  status: string;
}

interface ReportBasis {
  base_salary: number;
  session_allowance: number;
  payable_session_count: number;
  cancelled_session_count: number;
  completed_session_count: number;
  expected_total_amount: number;
  settlement_snapshot_status: string | null;
}
interface ReportKpis {
  total_sessions: number;
  attendance_rate: number;
  no_show_rate: number;
  checkin_count: number;
  waitlist_converted: number;
}
interface ReportRetention {
  renewal_risk: { member_id: string; name: string; days_until_expiry: number }[];
  long_absence: { member_id: string; name: string; last_checkin: string | null }[];
}

const STATUS_COPY: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'neutral' }> = {
  linked_active: { label: '활동 중', variant: 'success' },
  linked_unassigned: { label: '배정 대기', variant: 'info' },
  on_leave: { label: '휴직', variant: 'warning' },
  unlinked: { label: '미연결', variant: 'neutral' },
};

const krw = (n: number | null | undefined) => `${Math.round(n ?? 0).toLocaleString('ko-KR')}원`;

const REPORT_TABS = [
  { key: 'basis', label: '정산 근거' },
  { key: 'kpis', label: 'KPI' },
  { key: 'retention', label: '리텐션' },
];

function ymNow(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function CoachProfileScreen() {
  const { user, signOut } = useAuth();
  const coachCtx = useCoachContext();
  const supabase = getSupabaseBrowserClient();
  const toast = useToast();

  const [section, setSection] = useState('basis');
  const [ym] = useState(ymNow());
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', bio: '', specialties: '', profile_image_url: '' });

  const coach = useQuery<CoachRow>(
    () =>
      user
        ? query<CoachRow>(supabase, 'coaches', (q) =>
            q
              .select('id,name,email,phone,specialties,bio,profile_image_url,base_salary,session_allowance,status')
              .eq('user_id', user.id)
              .maybeSingle(),
          )
        : Promise.resolve({ success: true, data: null, error: null }),
    [user?.id],
  );

  // 섹션 lazy load — 선택된 섹션만 파라미터 요청
  const report = useQuery<Record<string, unknown> & { basis?: ReportBasis; kpis?: ReportKpis; retention?: ReportRetention }>(
    () =>
      rpc(supabase, 'fn_get_coach_monthly_report', {
        p_year_month: ym,
        p_sections: [section],
      }),
    [section, ym],
  );

  const status = coachCtx.status ?? 'unlinked';
  const copy = STATUS_COPY[status];
  const c = coach.data;

  const startEdit = () => {
    if (!c) return;
    setForm({
      name: c.name ?? '',
      phone: c.phone ?? '',
      bio: c.bio ?? '',
      specialties: (c.specialties ?? []).join(', '),
      profile_image_url: c.profile_image_url ?? '',
    });
    setEditing(true);
  };

  const saveProfile = async () => {
    if (!form.name.trim()) { toast.error('이름을 입력하세요.'); return; }
    const patch: Record<string, unknown> = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      bio: form.bio.trim() || null,
      specialties: form.specialties.split(',').map((s) => s.trim()).filter(Boolean),
      profile_image_url: form.profile_image_url.trim() || null,
    };
    setBusy(true);
    const res = await rpc(supabase, 'fn_update_my_coach_profile', { p_patch: patch });
    setBusy(false);
    if (!res.success) { toast.error(res.error ?? '프로필 저장 실패'); return; }
    toast.success('프로필을 저장했습니다.');
    setEditing(false);
    coach.refetch();
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>내 프로필</h1>
        <Badge variant={copy.variant}>{copy.label}</Badge>
      </header>

      {/* 코치 정보 — 자기정보 편집(급여·status 제외) */}
      <Card title="코치 정보">
        {coach.loading ? (
          <Skeleton variant="rect" height={100} />
        ) : coach.error ? (
          <EmptyState variant="error" title="정보 로드 실패" description={coach.error} onRetry={coach.refetch} />
        ) : !c ? (
          <EmptyState title="연결된 코치 정보 없음" description="관리자에게 계정 연결을 요청하세요." />
        ) : editing ? (
          <div className={styles.infoCol}>
            <Input label="이름" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input label="연락처" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            <Input label="전문분야(쉼표로 구분)" value={form.specialties} onChange={(e) => setForm((f) => ({ ...f, specialties: e.target.value }))} />
            <Input label="프로필 이미지 URL" value={form.profile_image_url} onChange={(e) => setForm((f) => ({ ...f, profile_image_url: e.target.value }))} />
            <Input label="소개" multiline rows={3} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
            <div className={styles.editActions}>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>취소</Button>
              <Button variant="primary" size="sm" loading={busy} onClick={saveProfile}>저장</Button>
            </div>
            <p className={styles.muted}>급여·계약 정보는 관리자 전용입니다(편집 불가).</p>
          </div>
        ) : (
          <div className={styles.infoCol}>
            <div className={styles.infoRow}><span>이름</span><b>{c.name}</b></div>
            {c.email ? <div className={styles.infoRow}><span>이메일</span><b>{c.email}</b></div> : null}
            {c.phone ? <div className={styles.infoRow}><span>연락처</span><b>{c.phone}</b></div> : null}
            {c.specialties && c.specialties.length > 0 ? (
              <div className={styles.infoRow}>
                <span>전문분야</span>
                <div className={styles.chips}>
                  {c.specialties.map((s, i) => <Badge key={i} variant="neutral" size="sm">{s}</Badge>)}
                </div>
              </div>
            ) : null}
            {c.bio ? <p className={styles.bio}>{c.bio}</p> : null}
            <Button variant="soft" size="sm" onClick={startEdit}>정보 수정</Button>
          </div>
        )}
      </Card>

      {/* 월간 리포트 (read-only) */}
      <section className={styles.reportSection}>
        <h2 className={styles.sectionTitle}>월간 리포트 · {ym}</h2>
        <Tabs syncUrl={false} tabs={REPORT_TABS} value={section} onChange={setSection} variant="segmented" aria-label="리포트 섹션" />

        {report.loading ? (
          <Skeleton variant="rect" height={160} />
        ) : report.error ? (
          <Card>
            <EmptyState variant="error" title="리포트 로드 실패" description={report.error} onRetry={report.refetch} />
          </Card>
        ) : (
          <>
            {section === 'basis' && report.data?.basis ? (
              <div className={styles.statRow}>
                <StatCard label="예상 정산액" value={krw(report.data.basis.expected_total_amount)} hint={`기본급 ${krw(report.data.basis.base_salary)}`} />
                <StatCard label="정산 대상 수업" value={String(report.data.basis.payable_session_count)} hint={`완료 ${report.data.basis.completed_session_count} · 취소 ${report.data.basis.cancelled_session_count}`} />
                <StatCard label="세션 수당" value={krw(report.data.basis.session_allowance)} hint={report.data.basis.settlement_snapshot_status ? `상태 ${report.data.basis.settlement_snapshot_status}` : '미확정'} />
              </div>
            ) : null}

            {section === 'kpis' && report.data?.kpis ? (
              <div className={styles.statRow}>
                <StatCard label="진행 수업" value={String(report.data.kpis.total_sessions)} />
                <StatCard label="출석률" value={`${report.data.kpis.attendance_rate}%`} />
                <StatCard label="노쇼율" value={`${report.data.kpis.no_show_rate}%`} invert />
              </div>
            ) : null}

            {section === 'retention' && report.data?.retention ? (
              <div className={styles.retCol}>
                <Card title={`만기 임박 (${report.data.retention.renewal_risk.length})`}>
                  {report.data.retention.renewal_risk.length === 0 ? (
                    <p className={styles.muted}>없음</p>
                  ) : (
                    report.data.retention.renewal_risk.map((r) => (
                      <div key={r.member_id} className={styles.retRow}>
                        <span>{r.name}</span>
                        <Badge variant={r.days_until_expiry < 7 ? 'danger' : 'warning'} size="sm">D-{r.days_until_expiry}</Badge>
                      </div>
                    ))
                  )}
                </Card>
                <Card title={`장기 미출석 (${report.data.retention.long_absence.length})`}>
                  {report.data.retention.long_absence.length === 0 ? (
                    <p className={styles.muted}>없음</p>
                  ) : (
                    report.data.retention.long_absence.map((r) => (
                      <div key={r.member_id} className={styles.retRow}>
                        <span>{r.name}</span>
                        <span className={styles.muted}>{r.last_checkin ? r.last_checkin.slice(0, 10) : '기록 없음'}</span>
                      </div>
                    ))
                  )}
                </Card>
              </div>
            ) : null}
          </>
        )}
      </section>

      {/* 설정 */}
      <section className={styles.reportSection}>
        <h2 className={styles.sectionTitle}>설정</h2>
        <Card>
          <div className={styles.settingsCol}>
            <Button variant="ghost" block onClick={() => { void signOut(); }}>로그아웃</Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
