'use client';

// /auth/reset-password — 3-Step 비밀번호 재설정 (docs/01 §2.6)
// Step1 이메일 발송 → (Step2 메일 링크 랜딩=토큰 검증은 Supabase가 URL에서 처리) → ?step=3 새 비밀번호 설정
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/features/auth';
import { validatePassword } from '@/lib/auth/password';
import { normalizeAuthResult } from '@/lib/auth/normalize';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button, Card, Input, Skeleton } from '@/components/ui';
import styles from '../auth.module.css';

function RequestStep() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('올바른 이메일 주소를 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      // AuthContext.resetPassword가 redirectTo=/auth/reset-password?step=3 을 설정한다 (docs/01 §2.6)
      const result = normalizeAuthResult(await resetPassword(email.trim()));
      if (result.error) {
        setFormError(result.error);
        return;
      }
      setSent(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '메일 발송에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <form className={styles.stack} onSubmit={handleSubmit} noValidate>
        <h1 className={styles.title}>비밀번호 재설정</h1>
        <p className={styles.subtitle}>
          가입한 이메일 주소로 재설정 링크를 보내드립니다. 링크는 1시간 동안 유효합니다.
        </p>

        {formError ? (
          <p className={styles.errorBanner} role="alert">
            {formError}
          </p>
        ) : null}
        {sent ? (
          <p className={styles.infoBanner} role="status">
            재설정 메일을 발송했습니다. 메일함을 확인해주세요. 메일이 오지 않으면 다시 발송할 수
            있습니다.
          </p>
        ) : null}

        <Input
          label="이메일"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" variant="primary" block loading={submitting}>
          {sent ? '재발송' : '재설정 링크 발송'}
        </Button>

        <div className={styles.links}>
          <Link className={styles.link} href="/auth/login">
            로그인으로 돌아가기
          </Link>
        </div>
      </form>
    </Card>
  );
}

function NewPasswordStep() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);

    const pwError = validatePassword(password);
    setFieldError(pwError);
    const matchError = password === passwordConfirm ? null : '비밀번호가 일치하지 않습니다.';
    setConfirmError(matchError);
    if (pwError || matchError) return;

    setSubmitting(true);
    try {
      // 재설정 링크 랜딩 세션(recovery) 위에서 새 비밀번호 적용
      const client = getSupabaseBrowserClient();
      const { error } = await client.auth.updateUser({ password });
      if (error) {
        setFormError(
          error.message.includes('expired') || error.message.includes('invalid')
            ? '링크가 만료되었거나 유효하지 않습니다. 재설정 메일을 다시 요청해주세요.'
            : error.message,
        );
        return;
      }
      // 완료 시 재로그인 요구 (docs/01 §2.6) — 로컬 세션 정리 후 login 이동
      try {
        await signOut();
      } catch {
        /* best-effort — 실패해도 login 이동 (F-10) */
      }
      router.replace('/auth/login');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '비밀번호 변경에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <form className={styles.stack} onSubmit={handleSubmit} noValidate>
        <h1 className={styles.title}>새 비밀번호 설정</h1>

        {formError ? (
          <p className={styles.errorBanner} role="alert">
            {formError}
          </p>
        ) : null}

        <Input
          label="새 비밀번호"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setFieldError(validatePassword(e.target.value));
          }}
          error={fieldError}
          helper="8자 이상, 영문 대/소문자·숫자·특수문자 중 3종 조합"
          required
        />
        <Input
          label="새 비밀번호 확인"
          type="password"
          autoComplete="new-password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          error={confirmError}
          required
        />
        <Button type="submit" variant="primary" block loading={submitting}>
          비밀번호 변경
        </Button>
      </form>
    </Card>
  );
}

function ResetPasswordFlow() {
  const searchParams = useSearchParams();
  const step = searchParams.get('step');
  return step === '3' ? <NewPasswordStep /> : <RequestStep />;
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Skeleton variant="rect" height="var(--bcl-control-h)" />}>
      <ResetPasswordFlow />
    </Suspense>
  );
}
