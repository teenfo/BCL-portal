'use client';

// 탭3 checkin (/apps/checkin) — docs/03 §3.3
// 동적 QR 페이로드 {mid,fid,ts,v} 5분 만료 · 만료 30초 전 자동 재발급 · 카운트다운 링 ·
// 월간 출석 캘린더 + 통계. 검증/INSERT는 키오스크(06-kiosk SSOT) — 이 화면은 발급/조회만.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, EmptyState, Skeleton, StatCard, useToast } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { query, type Envelope } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useMemberId } from '@/features/member-shell';
import { useAuth } from '@/features/auth';
import screen from '@/features/member-shell/screen.module.css';
import styles from './checkin.module.css';
import { encodeQR } from './qr';

const QR_TTL = 300; // 5분
const REISSUE_AT = 30; // 만료 30초 전 재발급

interface MemberInfo {
  facility_id: string | null;
}
interface CheckinRow {
  id: string;
  session_id: string | null;
  checkin_time: string;
}

function monthRange(): { from: string; to: string; year: number; month: number } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 1);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: `${iso(from)}T00:00:00`, to: `${iso(to)}T00:00:00`, year, month };
}

function QrCanvas({ text, size = 240 }: { text: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const modules = encodeQR(text);
    const n = modules.length;
    const scale = Math.floor(size / n) || 1;
    const px = n * scale;
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, px, px);
    ctx.fillStyle = 'black';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (modules[y][x]) ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }, [text, size]);
  return <canvas ref={ref} className={styles.qrCanvas} width={size} height={size} aria-label="체크인 QR 코드" />;
}

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

export function CheckinScreen() {
  const memberId = useMemberId();
  const { user } = useAuth();
  const toast = useToast();
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  });

  const member = useQuery<MemberInfo>(
    () =>
      memberId
        ? query<MemberInfo>(getSupabaseBrowserClient(), 'members', (q) =>
            q.select('facility_id').eq('id', memberId).single(),
          )
        : Promise.resolve<Envelope<MemberInfo>>({ success: false, data: null, error: '회원 정보가 없습니다.' }),
    [memberId],
  );

  const { from, to, year, month } = useMemo(() => monthRange(), []);
  const checkins = useQuery<CheckinRow[]>(
    () =>
      memberId
        ? query<CheckinRow[]>(getSupabaseBrowserClient(), 'checkins', (q) =>
            q
              .select('id, session_id, checkin_time')
              .eq('member_id', memberId)
              .gte('checkin_time', from)
              .lt('checkin_time', to)
              .order('checkin_time', { ascending: false }),
          )
        : Promise.resolve<Envelope<CheckinRow[]>>({ success: false, data: null, error: '회원 정보가 없습니다.' }),
    [memberId, from, to],
  );

  // 동적 QR 발급 상태 — 1s 틱마다 만료 30초 전이면 재발급(setState는 인터벌 콜백 내부)
  const [issuedAt, setIssuedAt] = useState(() => Math.floor(Date.now() / 1000));
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const reissue = useCallback(() => setIssuedAt(Math.floor(Date.now() / 1000)), []);

  useEffect(() => {
    const t = setInterval(() => {
      const nowSec = Math.floor(Date.now() / 1000);
      setNow(nowSec);
      setIssuedAt((prev) => (prev + QR_TTL - nowSec <= REISSUE_AT ? nowSec : prev));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = Math.max(0, issuedAt + QR_TTL - now);

  const facilityId = member.data?.facility_id ?? null;
  const payload = useMemo(() => {
    if (!memberId || !facilityId) return null;
    return JSON.stringify({ mid: memberId, fid: facilityId, ts: issuedAt, v: 1 });
  }, [memberId, facilityId, issuedAt]);

  // 체크인 성공 Realtime → 성공 토스트(수업/시설 구분)
  useEffect(() => {
    if (!user) return;
    const sb = getSupabaseBrowserClient();
    const channel = sb
      .channel(`member-checkins:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'checkins', filter: `member_id=eq.${memberId ?? ''}` },
        (payloadEvt) => {
          const c = payloadEvt.new as { session_id: string | null };
          toastRef.current.success(c.session_id ? '수업 체크인 완료!' : '시설 체크인 완료!');
          checkins.refetch();
          reissue();
        },
      )
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, memberId]);

  // 통계
  const stats = useMemo(() => {
    const rows = checkins.data ?? [];
    const days = new Set(rows.map((r) => r.checkin_time.slice(0, 10)));
    // 이번 주(월~오늘) 횟수
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const weekCount = rows.filter((r) => new Date(r.checkin_time) >= monday).length;
    // 연속 출석(일 단위, 오늘/어제부터 역산)
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!days.has(iso(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (days.has(iso(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return { days, weekCount, streak, total: rows.length };
  }, [checkins.data]);

  // 달력 셀
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayIso = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const ringPct = remaining / QR_TTL;
  const R = 130;
  const C = 2 * Math.PI * R;

  return (
    <div className={screen.page}>
      <header className={screen.pageHeader}>
        <h1 className={screen.pageTitle}>체크인</h1>
      </header>

      <Card>
        {member.error ? (
          <EmptyState variant="error" title="QR을 발급하지 못했습니다" description={member.error} onRetry={member.refetch} />
        ) : member.loading || !payload ? (
          <div className={styles.qrWrap}>
            <Skeleton variant="rect" width={240} height={240} />
          </div>
        ) : (
          <div className={styles.qrWrap}>
            <div className={styles.qrStage}>
              <svg className={styles.ring} width="288" height="288" viewBox="0 0 288 288" aria-hidden="true">
                <circle cx="144" cy="144" r={R} fill="none" stroke="var(--bcl-border)" strokeWidth="4" />
                <circle
                  cx="144"
                  cy="144"
                  r={R}
                  fill="none"
                  stroke="var(--bcl-accent)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={C * (1 - ringPct)}
                />
              </svg>
              <QrCanvas text={payload} />
            </div>
            <div className={styles.qrMeta}>
              <p className={styles.qrCountdown}>
                {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
              </p>
              <p className={screen.muted}>후 자동 갱신 · 입구 키오스크에 스캔하세요</p>
            </div>
          </div>
        )}
      </Card>

      {/* 통계 */}
      <div className={screen.grid2}>
        <StatCard label="이번 주 출석" value={`${stats.weekCount}회`} loading={checkins.loading && !checkins.data} />
        <StatCard label="연속 출석" value={`${stats.streak}일`} loading={checkins.loading && !checkins.data} />
      </div>

      {/* 월간 출석 캘린더 */}
      <section className={screen.section}>
        <h2 className={screen.sectionTitle}>{month + 1}월 출석</h2>
        <Card>
          {checkins.error ? (
            <EmptyState variant="error" title="출석 이력을 불러오지 못했습니다" description={checkins.error} onRetry={checkins.refetch} />
          ) : (
            <>
              <div className={styles.calGrid}>
                {DOW.map((d) => (
                  <div key={d} className={styles.calHead}>{d}</div>
                ))}
                {Array.from({ length: firstDow }).map((_, i) => (
                  <div key={`e${i}`} className={`${styles.calCell} ${styles.calEmpty}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const done = stats.days.has(iso);
                  const isToday = iso === todayIso;
                  return (
                    <div
                      key={iso}
                      className={`${styles.calCell} ${done ? styles.calDone : ''} ${isToday ? styles.calToday : ''}`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
              <p className={`${screen.muted} ${styles.calNote}`}>이번 달 {stats.total}회 출석</p>
            </>
          )}
        </Card>
      </section>
    </div>
  );
}
