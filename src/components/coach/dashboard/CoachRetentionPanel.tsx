'use client';

import { useEffect, useState } from 'react';
import { rpc } from '@/lib/supabase/query';

interface RenewalRiskMember {
  member_id: string;
  name: string;
  end_date: string;
  days_until_expiry: number;
}

interface LongAbsenceMember {
  member_id: string;
  name: string;
  last_checkin: string | null;
}

interface RetentionData {
  year_month: string;
  renewal_risk: RenewalRiskMember[];
  long_absence: LongAbsenceMember[];
}

interface CoachRetentionPanelProps {
  yearMonth?: string;
}

export default function CoachRetentionPanel({ yearMonth }: CoachRetentionPanelProps) {
  const [data, setData] = useState<RetentionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadRetention();
  }, [yearMonth]);

  async function loadRetention() {
    setLoading(true);
    try {
      const { data: result, error } = await rpc('fn_get_coach_retention_panel', {
        p_year_month: yearMonth ?? null,
      });
      if (!error && result?.success) {
        setData(result.data as RetentionData);
      }
    } catch {
      // 에러 시 패널 숨김
    }
    setLoading(false);
  }

  if (loading) {
    return <div className="app-skeleton" style={{ height: 60, borderRadius: 16, marginBottom: '1rem' }} />;
  }

  if (!data) return null;

  const hasRisk = data.renewal_risk.length > 0 || data.long_absence.length > 0;
  if (!hasRisk) return null;

  const formatLastCheckin = (dateStr: string | null) => {
    if (!dateStr) return '체크인 기록 없음';
    const date = new Date(dateStr);
    const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    return `${diffDays}일 전 체크인`;
  };

  return (
    <div className="app-glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        }}
      >
        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--app-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          🔔 리텐션 위험 패널
          {!expanded && (
            <span style={{ fontSize: '0.6875rem', padding: '1px 8px', borderRadius: 999, background: 'rgba(239,68,68,0.15)', color: '#EF4444', fontWeight: 700 }}>
              {data.renewal_risk.length + data.long_absence.length}명
            </span>
          )}
        </h4>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--app-text-muted)" strokeWidth="2"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div style={{ marginTop: '1rem' }}>
          {/* 만기 예정 */}
          {data.renewal_risk.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#F59E0B', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                📅 만기 예정 ({data.renewal_risk.length}명)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {data.renewal_risk.map((m) => (
                  <div key={m.member_id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.625rem 0.75rem', borderRadius: 10,
                    background: 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.2)',
                  }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--app-text-primary)' }}>{m.name}</span>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: m.days_until_expiry <= 7 ? '#EF4444' : '#F59E0B' }}>
                      D-{m.days_until_expiry}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 장기 미출석 */}
          {data.long_absence.length > 0 && (
            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#A78BFA', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🚶 장기 미출석 ({data.long_absence.length}명)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {data.long_absence.map((m) => (
                  <div key={m.member_id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.625rem 0.75rem', borderRadius: 10,
                    background: 'rgba(167,139,250,0.08)',
                    border: '1px solid rgba(167,139,250,0.2)',
                  }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--app-text-primary)' }}>{m.name}</span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--app-text-muted)' }}>
                      {formatLastCheckin(m.last_checkin)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
