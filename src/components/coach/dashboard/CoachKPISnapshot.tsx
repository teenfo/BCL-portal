'use client';

import { useEffect, useState } from 'react';
import { rpc } from '@/lib/supabase/query';

interface KPIData {
  year_month: string;
  total_sessions: number;
  payable_session_count: number;
  total_bookings: number;
  checkin_count: number;
  no_show_count: number;
  no_show_rate: number;
  attendance_rate: number;
  waitlist_converted: number;
  renewal_risk_count: number;
  long_absence_count: number;
  settlement_basis: {
    base_salary: number;
    session_allowance: number;
    expected_total_amount: number;
    settlement_snapshot_exists: boolean;
    settlement_snapshot_status: string | null;
  } | null;
}

interface CoachKPISnapshotProps {
  /** 'compact': Dashboard용 요약, 'full': Profile용 전체 */
  mode?: 'compact' | 'full';
  yearMonth?: string;
}

const formatWon = (n: number) => n.toLocaleString('ko-KR') + '원';

export default function CoachKPISnapshot({ mode = 'compact', yearMonth }: CoachKPISnapshotProps) {
  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadKPI();
  }, [yearMonth]);

  async function loadKPI() {
    setLoading(true);
    setError(false);
    try {
      const { data, error: rpcError } = await rpc('fn_get_coach_monthly_kpis', {
        p_year_month: yearMonth ?? null,
      });

      if (rpcError || !data?.success) {
        setError(true);
      } else {
        setKpi(data.data as KPIData);
      }
    } catch {
      setError(true);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ marginBottom: '1rem' }}>
        <div className="app-skeleton" style={{ height: 80, borderRadius: 16, marginBottom: 8 }} />
        {mode === 'full' && (
          <div className="app-skeleton" style={{ height: 120, borderRadius: 16 }} />
        )}
      </div>
    );
  }

  if (error || !kpi) return null;

  const settlement = kpi.settlement_basis;
  const snapshotStatus = settlement?.settlement_snapshot_status;
  const statusLabel: Record<string, { text: string; color: string }> = {
    pending: { text: '대기', color: '#F59E0B' },
    confirmed: { text: '확정', color: '#3B82F6' },
    paid: { text: '지급완료', color: '#22C55E' },
  };

  /* ── Compact 모드 (Dashboard용) ── */
  if (mode === 'compact') {
    return (
      <div
        className="app-glass-card"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          background: 'linear-gradient(135deg, rgba(255,106,0,0.06) 0%, rgba(255,106,0,0.02) 100%)',
          border: '1px solid rgba(255,106,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--app-accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            📊 이번 달 KPI
          </span>
          <span style={{ fontSize: '0.6875rem', color: 'var(--app-text-muted)' }}>{kpi.year_month}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
          <KPIMini value={kpi.payable_session_count} label="수업 수" accent="var(--app-accent)" />
          <KPIMini value={`${kpi.attendance_rate}%`} label="출석률" accent="#22C55E" />
          <KPIMini value={kpi.renewal_risk_count} label="만기 예정" accent="#F59E0B" />
          <KPIMini
            value={settlement ? formatWon(settlement.expected_total_amount) : '-'}
            label="예상 정산"
            accent="#A78BFA"
            small
          />
        </div>
      </div>
    );
  }

  /* ── Full 모드 (Profile용) ── */
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {/* KPI 카드 그리드 */}
      <div className="app-glass-card" style={{ padding: '1.25rem', marginBottom: '0.75rem' }}>
        <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--app-text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          📊 {kpi.year_month} KPI
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <KPICard value={kpi.payable_session_count} label="수업 수" sub={`총 ${kpi.total_sessions}회 배정`} accent="var(--app-accent)" />
          <KPICard value={`${kpi.attendance_rate}%`} label="출석률" sub={`${kpi.checkin_count}명 출석`} accent="#22C55E" />
          <KPICard value={`${kpi.no_show_rate}%`} label="No-show 비율" sub={`${kpi.no_show_count}명`} accent="#EF4444" />
          <KPICard value={kpi.waitlist_converted} label="대기→확정 전환" sub="명" accent="#3B82F6" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          <KPICard value={kpi.renewal_risk_count} label="만기 예정 담당 회원" sub="30일 이내" accent="#F59E0B" />
          <KPICard value={kpi.long_absence_count} label="장기 미출석" sub="21일 이상" accent="#A78BFA" />
        </div>
      </div>

      {/* 예상 정산 카드 */}
      {settlement && (
        <div
          className="app-glass-card"
          style={{
            padding: '1.25rem',
            background: 'linear-gradient(135deg, rgba(167,139,250,0.08) 0%, rgba(167,139,250,0.02) 100%)',
            border: '1px solid rgba(167,139,250,0.2)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              💰 예상 정산 ({kpi.year_month})
            </h4>
            {settlement.settlement_snapshot_exists && snapshotStatus && statusLabel[snapshotStatus] && (
              <span style={{
                fontSize: '0.625rem', fontWeight: 700, padding: '2px 8px',
                borderRadius: 999,
                background: statusLabel[snapshotStatus].color + '20',
                color: statusLabel[snapshotStatus].color,
              }}>
                확정: {statusLabel[snapshotStatus].text}
              </span>
            )}
          </div>

          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#A78BFA', marginBottom: '0.5rem' }}>
            {formatWon(settlement.expected_total_amount)}
          </div>

          <div style={{ fontSize: '0.8125rem', color: 'var(--app-text-secondary)', lineHeight: 1.6 }}>
            기본급 {formatWon(settlement.base_salary)}<br />
            + 수업 {kpi.payable_session_count}회 × {formatWon(settlement.session_allowance)}/회<br />
            <span style={{ fontSize: '0.6875rem', color: 'var(--app-text-muted)', marginTop: 4, display: 'block' }}>
              ※ 예상 정산은 참고용입니다. 확정 정산은 관리자가 처리합니다.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 서브 컴포넌트 ── */

function KPIMini({ value, label, accent, small }: {
  value: string | number;
  label: string;
  accent: string;
  small?: boolean;
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: small ? '0.6875rem' : '1.125rem',
        fontWeight: 800,
        color: accent,
        lineHeight: 1.2,
        wordBreak: 'break-all',
      }}>
        {value}
      </div>
      <div style={{ fontSize: '0.5625rem', fontWeight: 600, color: 'var(--app-text-muted)', marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

function KPICard({ value, label, sub, accent }: {
  value: string | number;
  label: string;
  sub: string;
  accent: string;
}) {
  return (
    <div style={{
      padding: '0.875rem',
      borderRadius: 12,
      background: 'var(--app-surface)',
      border: '1px solid var(--app-border)',
    }}>
      <div style={{ fontSize: '1.375rem', fontWeight: 800, color: accent, marginBottom: 2 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--app-text-primary)' }}>{label}</div>
      <div style={{ fontSize: '0.625rem', color: 'var(--app-text-muted)', marginTop: 1 }}>{sub}</div>
    </div>
  );
}
