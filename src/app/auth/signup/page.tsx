'use client';

// /auth/signup — 4-Step 회원가입 (docs/01 §2.2 + §3b G-6)
// Step1 계정 → Step2 기본정보 → Step3 약관 → Step4 전자 동의·웨이버 서명(fn_sign_agreement)
// Confirm email OFF 전제: signUp 즉시 세션 발급 — 미발급 시 에러 표면화(무한 대기 금지).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth';
import { validatePassword } from '@/lib/auth/password';
import { normalizeAuthResult } from '@/lib/auth/normalize';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { rpc } from '@/lib/supabase/query';
import { Button, Card, Checkbox, Input } from '@/components/ui';
import styles from '../auth.module.css';

const TOTAL_STEPS = 4;
const DRAFT_KEY = 'bcl-signup-draft'; // Step 이탈 시 입력값 세션 보존 (§2.2) — 비밀번호 제외

// G-6 필수 문서 3건 (지시 명세: terms / privacy / health_waiver)
const REQUIRED_DOCS = ['terms', 'privacy', 'health_waiver'] as const;
const DOC_VERSION = '2026-07-08';

type Gender = 'male' | 'female' | 'other';

interface Draft {
  step: number;
  email: string;
  name: string;
  phone: string;
  birthday: string;
  gender: Gender | '';
  agreeTerms: boolean;
  agreePrivacy: boolean;
  agreeMarketing: boolean;
}

const EMPTY_DRAFT: Draft = {
  step: 1,
  email: '',
  name: '',
  phone: '',
  birthday: '',
  gender: '',
  agreeTerms: false,
  agreePrivacy: false,
  agreeMarketing: false,
};

function loadDraft(): Draft {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY_DRAFT;
    return { ...EMPTY_DRAFT, ...(JSON.parse(raw) as Partial<Draft>) };
  } catch {
    return EMPTY_DRAFT;
  }
}

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [signatureName, setSignatureName] = useState('');
  const [signatureConsent, setSignatureConsent] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 드래프트 복원 (비밀번호 제외) — 하이드레이션 이후 비동기 복원(서버 프리렌더와의 불일치 방지)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const restored = loadDraft();
      setDraft(restored);
      // 계정 생성 전(비밀번호 미보존)이므로 Step3까지만 복원 — Step4 이탈 재개는 AuthGuard 서명 게이트 담당(§3b)
      const resumed = Math.min(restored.step, 3);
      setStep(resumed >= 1 ? resumed : 1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, step }));
    } catch {
      /* 저장 실패는 치명적이지 않음 */
    }
  }, [draft, step]);

  function patch(partial: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  // ---- Step1: 계정 (이메일/비밀번호 — 강도 실시간 검증. 중복 검증은 signUp 시점 에러 표면화 ⏳) ----
  function validateStep1(): boolean {
    const errors: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
      errors.email = '올바른 이메일 주소를 입력해주세요.';
    }
    const pwError = validatePassword(password);
    if (pwError) errors.password = pwError;
    if (password !== passwordConfirm) errors.passwordConfirm = '비밀번호가 일치하지 않습니다.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ---- Step2: 기본정보 ----
  function validateStep2(): boolean {
    const errors: Record<string, string> = {};
    if (!draft.name.trim()) errors.name = '이름을 입력해주세요.';
    if (!/^[0-9\-+ ]{9,}$/.test(draft.phone.trim())) errors.phone = '올바른 연락처를 입력해주세요.';
    if (!draft.birthday) errors.birthday = '생년월일을 선택해주세요.';
    if (!draft.gender) errors.gender = '성별을 선택해주세요.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function goNext() {
    setFormError(null);
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setFieldErrors({});
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function goBack() {
    setFormError(null);
    setFieldErrors({});
    setStep((s) => Math.max(s - 1, 1));
  }

  // ---- Step3 완료 → signUp (즉시 세션 발급 전제) → Step4 ----
  async function handleSignUp() {
    if (!draft.agreeTerms || !draft.agreePrivacy) {
      setFormError('필수 약관에 모두 동의해주세요.');
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      // options.data metadata — DB 트리거가 profiles(pending)+members 생성 (docs/01 §2.2)
      const result = normalizeAuthResult(
        await signUp(draft.email.trim(), password, {
          name: draft.name.trim(),
          phone: draft.phone.trim(),
          birthday: draft.birthday,
          gender: draft.gender,
          marketing_opt_in: draft.agreeMarketing,
        }),
      );
      if (result.error) {
        setFormError(result.error); // 이메일 중복 등 — 서버 메시지 표면화
        return;
      }
      if (!result.hasSession) {
        // Confirm email 설정 오적용 감지 — 무한 대기 금지 (docs/01 §2.2)
        setFormError(
          '가입은 접수되었으나 세션이 발급되지 않았습니다. 관리자에게 문의해주세요. (이메일 확인 설정 오류)',
        );
        return;
      }
      setStep(4);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '가입 처리에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Step4: 전자 동의·웨이버 서명 (G-6) — fn_sign_agreement 3건 ----
  async function handleSign() {
    if (!signatureName.trim()) {
      setFieldErrors({ signature: '서명할 성명을 입력해주세요.' });
      return;
    }
    if (signatureName.trim() !== draft.name.trim()) {
      setFieldErrors({ signature: '가입 시 입력한 이름과 동일하게 입력해주세요.' });
      return;
    }
    if (!signatureConsent) {
      setFormError('전자 서명 동의 확인에 체크해주세요.');
      return;
    }
    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);
    try {
      const client = getSupabaseBrowserClient();
      for (const docType of REQUIRED_DOCS) {
        const res = await rpc(client, 'fn_sign_agreement', {
          p_doc_type: docType,
          p_doc_version: DOC_VERSION,
          p_signature: signatureName.trim(),
        });
        if (!res.success) {
          // 서명 게이트도 에러 표면화 3원칙 적용 (docs/01 §3b.3)
          setFormError(res.error ?? `문서 서명에 실패했습니다. (${docType}) 다시 시도해주세요.`);
          return;
        }
      }
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* noop */
      }
      router.replace('/auth/pending-approval');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '서명 처리에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  const stepTitles = ['계정 만들기', '기본 정보', '약관 동의', '전자 동의·웨이버 서명'];

  return (
    <Card>
      <div className={styles.stack}>
        <div className={styles.stackSm}>
          <h1 className={styles.title}>회원가입</h1>
          <p className={styles.subtitle}>
            {step}/{TOTAL_STEPS} — {stepTitles[step - 1]}
          </p>
          <div className={styles.steps} aria-hidden="true">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <span
                key={i}
                className={`${styles.stepDot}${i < step ? ` ${styles.stepDotActive}` : ''}`}
              />
            ))}
          </div>
        </div>

        {formError ? (
          <p className={styles.errorBanner} role="alert">
            {formError}
          </p>
        ) : null}

        {step === 1 ? (
          <div className={styles.stack}>
            <Input
              label="이메일"
              type="email"
              autoComplete="email"
              value={draft.email}
              onChange={(e) => patch({ email: e.target.value })}
              error={fieldErrors.email}
              required
            />
            <Input
              label="비밀번호"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                // 강도 실시간 검증
                const err = validatePassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, password: err ?? '' }));
              }}
              error={fieldErrors.password || null}
              helper="8자 이상, 영문 대/소문자·숫자·특수문자 중 3종 조합"
              required
            />
            <Input
              label="비밀번호 확인"
              type="password"
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              error={fieldErrors.passwordConfirm}
              required
            />
            <Button variant="primary" block onClick={goNext}>
              다음
            </Button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className={styles.stack}>
            <Input
              label="이름"
              type="text"
              autoComplete="name"
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              error={fieldErrors.name}
              required
            />
            <Input
              label="연락처"
              type="tel"
              autoComplete="tel"
              placeholder="010-0000-0000"
              value={draft.phone}
              onChange={(e) => patch({ phone: e.target.value })}
              error={fieldErrors.phone}
              required
            />
            <Input
              label="생년월일"
              type="date"
              autoComplete="bday"
              value={draft.birthday}
              onChange={(e) => patch({ birthday: e.target.value })}
              error={fieldErrors.birthday}
              required
            />
            <div className={styles.stackSm}>
              <p className={styles.caption}>성별</p>
              <div className={styles.segmentRow} role="group" aria-label="성별">
                {(
                  [
                    ['male', '남성'],
                    ['female', '여성'],
                    ['other', '기타'],
                  ] as const
                ).map(([value, label]) => (
                  <Button
                    key={value}
                    variant={draft.gender === value ? 'soft' : 'ghost'}
                    aria-pressed={draft.gender === value}
                    onClick={() => patch({ gender: value })}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              {fieldErrors.gender ? (
                <p className={styles.errorBanner} role="alert">
                  {fieldErrors.gender}
                </p>
              ) : null}
            </div>
            <div className={styles.actions}>
              <Button variant="ghost" onClick={goBack}>
                이전
              </Button>
              <Button variant="primary" block onClick={goNext}>
                다음
              </Button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className={styles.stack}>
            <Checkbox
              label="[필수] 이용약관에 동의합니다"
              checked={draft.agreeTerms}
              onChange={(e) => patch({ agreeTerms: e.target.checked })}
            />
            <Checkbox
              label="[필수] 개인정보 수집·이용에 동의합니다"
              checked={draft.agreePrivacy}
              onChange={(e) => patch({ agreePrivacy: e.target.checked })}
            />
            <Checkbox
              label="[선택] 마케팅 정보 수신에 동의합니다"
              checked={draft.agreeMarketing}
              onChange={(e) => patch({ agreeMarketing: e.target.checked })}
            />
            <div className={styles.actions}>
              <Button variant="ghost" onClick={goBack} disabled={submitting}>
                이전
              </Button>
              <Button
                variant="primary"
                block
                loading={submitting}
                disabled={!draft.agreeTerms || !draft.agreePrivacy}
                onClick={handleSignUp}
              >
                동의하고 가입하기
              </Button>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className={styles.stack}>
            <p className={styles.subtitle}>
              아래 필수 문서에 대한 전자 서명이 필요합니다. 성명을 입력하면 서명으로 처리됩니다.
            </p>
            <div className={styles.termsBox}>
              필수 서명 문서 (버전 {DOC_VERSION})
              <br />· 이용약관(terms) · 개인정보 처리방침(privacy) · 건강 및 부상 위험 고지·면책
              동의서(health_waiver)
              {/* ⏳ 문서 스냅샷 전문 열람 UI — 문서 관리(system_config) 구현 후 연결 */}
            </div>
            <Input
              label="서명 (성명 입력)"
              type="text"
              autoComplete="off"
              placeholder={draft.name || '성명'}
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              error={fieldErrors.signature}
              required
            />
            <div className={styles.signaturePreview} aria-hidden="true">
              {signatureName.trim() ? (
                signatureName.trim()
              ) : (
                <span className={styles.signatureEmpty}>서명 미리보기</span>
              )}
            </div>
            <Checkbox
              label="본인은 위 문서를 확인했으며, 성명 입력이 전자 서명으로 효력을 가짐에 동의합니다"
              checked={signatureConsent}
              onChange={(e) => setSignatureConsent(e.target.checked)}
            />
            <Button variant="primary" block loading={submitting} onClick={handleSign}>
              서명 완료
            </Button>
            <p className={styles.caption}>
              서명을 완료해야 승인 대기 단계로 진행됩니다. 이탈 후 재로그인하면 서명 단계부터
              이어집니다.
            </p>
          </div>
        ) : null}

        {step < 4 ? (
          <div className={styles.links}>
            <Link className={styles.link} href="/auth/login">
              이미 계정이 있으신가요? 로그인
            </Link>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
