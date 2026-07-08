'use client';

// /auth/login — 이메일/비밀번호 로그인, 전 앱 단일 진입점 (docs/01 §2.1)
// 성공 분기는 resolvePostLoginRoute 단일 함수만 사용 (F-6). 실패는 폼 상단 표면화 — 무한 스피너 금지 (F-5).
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/features/auth';
import { resolvePostLoginRoute } from '@/lib/auth/resolve-route';
import { normalizeAuthResult } from '@/lib/auth/normalize';
import { Button, Card, Checkbox, Input, Skeleton } from '@/components/ui';
import styles from '../auth.module.css';

// ?error= 코드별 배너 (docs/01 §2.1·§2.3·§5.6)
const ERROR_BANNERS: Record<string, string> = {
  auth_callback_failed: '로그인 처리에 실패했습니다. 다시 시도해주세요.',
  verify_deprecated: '이메일 인증 절차가 폐지되었습니다. 이메일과 비밀번호로 바로 로그인해주세요.',
  session_expired: '세션이 만료되었습니다. 다시 로그인해주세요.',
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading, signIn } = useAuth();

  const redirectParam = searchParams.get('redirect');
  const errorCode = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false); // ⏳ UI만 — 세션 7→30일 연장은 미구현
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 이미 로그인 상태로 진입 시 즉시 이탈 (docs/01 §2.1)
  useEffect(() => {
    if (!loading && user && profile) {
      router.replace(resolvePostLoginRoute(profile, redirectParam));
    }
  }, [loading, user, profile, redirectParam, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);

    if (!email.trim() || !password) {
      setFormError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const result = normalizeAuthResult(await signIn(email.trim(), password));
      if (result.error) {
        setFormError(result.error); // 실패 5회 Rate Limit 안내 포함(서버 메시지 표면화)
        return;
      }
      // 분기 순서 고정: approval_status 확인 → resolvePostLoginRoute (§2.1) — 둘 다 단일 함수가 처리
      router.replace(resolvePostLoginRoute(result.profile, redirectParam));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '로그인에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false); // 어떤 경로든 로딩 해제 — 무한 스피너 금지 (F-5)
    }
  }

  return (
    <Card>
      <form className={styles.stack} onSubmit={handleSubmit} noValidate>
        <h1 className={styles.title}>로그인</h1>

        {errorCode && ERROR_BANNERS[errorCode] ? (
          <p className={styles.errorBanner} role="alert">
            {ERROR_BANNERS[errorCode]}
          </p>
        ) : null}

        {formError ? (
          <p className={styles.errorBanner} role="alert">
            {formError}
          </p>
        ) : null}

        <Input
          label="이메일"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="비밀번호"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div className={styles.row}>
          <Checkbox
            label="로그인 상태 유지"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
        </div>

        <Button type="submit" variant="primary" block loading={submitting}>
          로그인
        </Button>

        <div className={styles.links}>
          <Link className={styles.link} href="/auth/signup">
            회원가입
          </Link>
          <Link className={styles.link} href="/auth/reset-password">
            비밀번호 재설정
          </Link>
        </div>

        {/* ⏳ Phase2 — 소셜 로그인(Google/Kakao) 버튼 자리 예약 (docs/01 §2.1) */}
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Skeleton variant="rect" height="var(--bcl-control-h)" />}>
      <LoginForm />
    </Suspense>
  );
}
