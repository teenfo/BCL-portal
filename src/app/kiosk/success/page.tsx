'use client';

// /kiosk/success — 완료 화면 (docs/06 §3.3)
// 회원명·인사 + 분기 결과(수업 vs 시설) + plan_kind 라벨. 5초 후 idle 자동 복귀.
// RPC 응답 data만 사용(추가 조회 없음). result-store에서 1회성 소비.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { takeSuccessResult, type SuccessResult } from '@/features/kiosk-checkin';
import type { KioskCheckinData } from '@/features/kiosk-checkin';
import styles from '../kiosk.module.css';

const AUTO_RETURN_MS = 5000;

const PLAN_LABEL: Record<string, string> = {
  standard: '정기권',
  drop_in: '드롭인',
  trial: '체험',
};

export default function KioskSuccessPage() {
  const router = useRouter();
  const [result, setResult] = useState<SuccessResult | null | undefined>(undefined);

  useEffect(() => {
    // 마운트 시 result-store 1회성 소비 — localStorage 유사 외부 소스 읽기(하이드레이션 일치 위해 effect)
    const r = takeSuccessResult();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResult(r);
    if (!r) {
      router.replace('/kiosk'); // 직접 진입/새로고침 — 표시할 결과 없음
      return;
    }
    const t = setTimeout(() => router.replace('/kiosk'), AUTO_RETURN_MS);
    return () => clearTimeout(t);
  }, [router]);

  if (result === undefined || result === null) return null;

  if (result.kind === 'queued') {
    return (
      <ResultShell tone="info" title="체크인 접수됨" subtitle="동기화 대기 중">
        <p className={styles.successNote}>네트워크 복구 시 자동으로 처리됩니다. 회원 정보는 지금 표시할 수 없습니다.</p>
      </ResultShell>
    );
  }

  if (result.kind === 'duplicate') {
    return (
      <ResultShell tone="info" title="이미 체크인되었습니다" subtitle="">
        <p className={styles.successNote}>조금 전 체크인이 완료되어 있습니다.</p>
      </ResultShell>
    );
  }

  const data: KioskCheckinData = result.data;
  const isSession = data.linked_booking && !!data.session_title;
  const planLabel = PLAN_LABEL[data.membership_plan_kind] ?? data.membership_plan_name ?? '';

  return (
    <ResultShell tone="success" title={`${data.member_name}님`} subtitle="체크인 완료">
      {isSession ? (
        <div className={styles.successDetail}>
          <span className={styles.successBadge}>수업 체크인</span>
          <span className={styles.successSession}>{data.session_title}</span>
        </div>
      ) : (
        <div className={styles.successDetail}>
          <span className={styles.successBadgeFacility}>시설 체크인</span>
          <span className={styles.successSession}>자유 이용</span>
        </div>
      )}
      {planLabel ? <p className={styles.successNote}>{planLabel}</p> : null}
    </ResultShell>
  );
}

function ResultShell({
  tone,
  title,
  subtitle,
  children,
}: {
  tone: 'success' | 'info';
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <main className={styles.success} role="status" aria-live="polite">
      <div className={[styles.successMark, tone === 'success' ? styles.markSuccess : styles.markInfo].join(' ')} aria-hidden="true">
        {tone === 'success' ? (
          <svg viewBox="0 0 64 64" width="96" height="96">
            <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="3" />
            <path d="M20 33l8 8 16-18" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 64 64" width="96" height="96">
            <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="3" />
            <path d="M32 20v16" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            <circle cx="32" cy="44" r="2.4" fill="currentColor" />
          </svg>
        )}
      </div>
      <h1 className={styles.successTitle}>{title}</h1>
      {subtitle ? <p className={styles.successSubtitle}>{subtitle}</p> : null}
      {children}
    </main>
  );
}
