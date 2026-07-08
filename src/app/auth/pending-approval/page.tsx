'use client';

// /auth/pending-approval — 관리자 승인 대기 랜딩 (docs/01 §2.4 + §3b 미서명 재개)
// 폴링 없음: 수동 새로고침(refreshProfile) + 재진입 시 확인. approved 진입 시 즉시 리다이렉트.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth';
import { resolvePostLoginRoute, type RouteProfile } from '@/lib/auth/resolve-route';
import { REQUIRED_AGREEMENT_DOCS } from '@/lib/auth/agreements';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { query } from '@/lib/supabase/query';
import { Button, Card } from '@/components/ui';
import styles from '../auth.module.css';

export default function PendingApprovalPage() {
  const router = useRouter();
  const { user, profile, memberId, loading, refreshProfile } = useAuth();

  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  // G-6 미서명 감지 — Step4 이탈자가 서명을 이어서 완료하는 유일한 경로 (§3b)
  const [missingDocs, setMissingDocs] = useState<string[] | null>(null);

  // 비로그인 → login, pending 외 상태 → 각자 목적지 (단일 함수 경유 — F-6)
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    const p = profile as RouteProfile | null;
    if (p && p.approval_status !== 'pending') {
      router.replace(resolvePostLoginRoute(p));
    }
  }, [loading, user, profile, router]);

  // 미서명 문서 감지 (RLS: 본인 행만 조회 가능)
  useEffect(() => {
    if (loading || !user || !memberId) return;
    let cancelled = false;
    (async () => {
      const res = await query<{ doc_type: string }[]>(getSupabaseBrowserClient(), 'member_agreements', (q) =>
        q.select('doc_type').eq('member_id', memberId),
      );
      if (cancelled) return;
      if (res.success) {
        const signed = new Set((res.data ?? []).map((r) => r.doc_type));
        setMissingDocs(REQUIRED_AGREEMENT_DOCS.filter((d) => !signed.has(d)));
      }
      // 조회 실패 시에는 서명 안내를 띄우지 않음(승인 대기 화면 본연 기능 유지) — 재진입 시 재시도
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, user, memberId]);

  async function handleRefresh() {
    if (checking) return;
    setNotice(null);
    setFormError(null);
    setChecking(true);
    try {
      // refreshProfile은 최신 프로필을 반환한다(실패·타임아웃 시 null + authError 세팅)
      const fresh = await refreshProfile();
      if (fresh && fresh.approval_status !== 'pending') {
        router.replace(resolvePostLoginRoute(fresh));
        return;
      }
      if (!fresh) {
        // §5.6 에러 표면화 — "아직 대기 중" 문구로 실패를 가리지 않는다
        setFormError('상태 확인에 실패했습니다. 네트워크 확인 후 다시 시도해주세요.');
        return;
      }
      setNotice('아직 승인 대기 중입니다. 승인이 완료되면 이용할 수 있습니다.');
    } finally {
      setChecking(false);
    }
  }

  async function handleLogout() {
    router.replace('/auth/logout');
  }

  const needsSignature = (missingDocs?.length ?? 0) > 0;

  return (
    <Card>
      <div className={styles.stack}>
        <h1 className={styles.title}>가입 승인 대기 중</h1>
        <p className={styles.subtitle}>
          가입 신청이 접수되었습니다. 관리자 승인 후 서비스를 이용할 수 있습니다. 승인은 보통 영업일
          기준 1일 이내에 처리됩니다.
        </p>
        {/* ⏳ 가입 지점/신청 일시 표시 — profiles 확장 필드 조회 연결 후 */}

        {needsSignature ? (
          <div className={styles.errorBanner} role="alert">
            <p style={{ margin: 0 }}>
              필수 문서 서명이 완료되지 않았습니다({missingDocs!.length}건). 서명을 완료해야 승인
              처리가 진행됩니다.
            </p>
            <Button
              variant="primary"
              block
              onClick={() => router.push('/auth/signup?resume=sign')}
              style={{ marginTop: 'var(--bcl-space-2)' }}
            >
              서명 이어서 완료하기
            </Button>
          </div>
        ) : null}

        {formError ? (
          <p className={styles.errorBanner} role="alert">
            {formError}
          </p>
        ) : null}
        {notice ? (
          <p className={styles.infoBanner} role="status">
            {notice}
          </p>
        ) : null}

        <Button variant="primary" block loading={checking} onClick={handleRefresh}>
          승인 상태 새로고침
        </Button>
        <Button variant="ghost" block onClick={handleLogout}>
          로그아웃
        </Button>

        <p className={`${styles.caption} ${styles.centered}`}>
          문의: 방문하신 지점 데스크 또는 안내된 연락처로 문의해주세요.
        </p>
      </div>
    </Card>
  );
}
