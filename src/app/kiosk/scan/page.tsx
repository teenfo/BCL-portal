'use client';

// /kiosk/scan — 스캔 화면 (docs/06 §3.2·§4·§4.6·§5)
// 카메라 프리뷰 + 조준 프레임 + 자동 디코딩 → 서버 검증(fn_kiosk_checkin) → success 전환.
// 대체 경로: 수동 입력(전화 뒷4자리, 격하) · 게스트/드롭인 코드(§4.6 G-7).
// 오류는 3초 토스트 후 스캔 재개. 60초 무동작 → idle 복귀.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, useToast } from '@/components/ui';
import { useKiosk } from '@/features/kiosk-shell';
import {
  KIOSK_ERROR_MESSAGE,
  lookupMembers,
  setSuccessResult,
  submitGuestCheckin,
  submitManualCheckin,
  submitScan,
  useScanner,
  type KioskCandidate,
  type ScanOutcome,
} from '@/features/kiosk-checkin';
import styles from '../kiosk.module.css';

const IDLE_TIMEOUT_MS = 60_000;

type ScanMode = 'scan' | 'manual' | 'guest';

export default function KioskScanPage() {
  const router = useRouter();
  const toast = useToast();
  const { device, online } = useKiosk();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<ScanMode>('scan');
  const processingRef = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // idle 에서 "게스트/드롭인" 진입 시 #guest 해시로 코드 입력 모드 시작(Suspense 불필요)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (typeof window !== 'undefined' && window.location.hash === '#guest') setMode('guest');
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => router.push('/kiosk'), IDLE_TIMEOUT_MS);
  }, [router]);

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [resetIdleTimer]);

  // 결과 → success 전환 또는 오류 토스트 (스캔·수동·게스트 공통). 성공 계열이면 true
  const applyOutcome = useCallback(
    (outcome: ScanOutcome): boolean => {
      if (outcome.kind === 'success') {
        setSuccessResult({ kind: 'success', data: outcome.data });
        router.push('/kiosk/success');
        return true;
      }
      if (outcome.kind === 'duplicate') {
        setSuccessResult({ kind: 'duplicate', data: outcome.data });
        router.push('/kiosk/success');
        return true;
      }
      if (outcome.kind === 'queued') {
        setSuccessResult({ kind: 'queued' });
        router.push('/kiosk/success');
        return true;
      }
      toast.error(KIOSK_ERROR_MESSAGE[outcome.code]);
      return false;
    },
    [router, toast],
  );

  const handleRaw = useCallback(
    async (raw: string) => {
      if (processingRef.current) return; // 재진입 차단(디바운스와 별개)
      processingRef.current = true;
      setBusy(true);
      resetIdleTimer();
      try {
        const outcome = await submitScan(raw, {
          deviceId: device?.deviceId ?? null,
          facilityId: device?.facilityId ?? null,
          offline: !online,
        });
        applyOutcome(outcome);
      } catch {
        toast.error(KIOSK_ERROR_MESSAGE.network_error);
      } finally {
        setBusy(false);
        // 짧은 쿨다운 후 재판독 허용(동일인 연속 오류 폭주 방지)
        setTimeout(() => {
          processingRef.current = false;
        }, 1500);
      }
    },
    [applyOutcome, device, online, resetIdleTimer, toast],
  );

  // 수동 대체 체크인 — 후보(member_id) 선택 → 서버 위임(submitManualCheckin)
  const handleManualCheckin = useCallback(
    async (memberId: string) => {
      resetIdleTimer();
      const outcome = await submitManualCheckin(memberId, {
        deviceId: device?.deviceId ?? null,
        facilityId: device?.facilityId ?? null,
        offline: !online,
      });
      applyOutcome(outcome);
    },
    [applyOutcome, device, online, resetIdleTimer],
  );

  // 게스트/드롭인 — 6자리 발권 코드 상환(§4.6). 서버 검증 전담(오프라인 불가).
  const handleGuestCheckin = useCallback(
    async (code: string) => {
      resetIdleTimer();
      const outcome = await submitGuestCheckin(code, {
        deviceId: device?.deviceId ?? null,
        facilityId: device?.facilityId ?? null,
        offline: !online,
      });
      applyOutcome(outcome);
    },
    [applyOutcome, device, online, resetIdleTimer],
  );

  const { videoRef, state, hasDecoder } = useScanner({
    onDecode: (raw) => void handleRaw(raw),
    active: mode === 'scan',
  });

  const cameraBlocked = state === 'denied' || state === 'unsupported' || state === 'error';
  const decoderMissing = state === 'streaming' && !hasDecoder;

  return (
    <main className={styles.scan}>
      <header className={styles.scanHeader}>
        <Button variant="ghost" size="sm" onClick={() => router.push('/kiosk')}>
          ← 취소
        </Button>
        <span className={styles.scanTitle}>
          {mode === 'guest'
            ? '게스트 · 드롭인 코드 입력'
            : mode === 'manual'
              ? '수동 입력'
              : 'QR을 카메라에 비춰주세요'}
        </span>
        <span className={online ? styles.scanNet : styles.scanNetOff}>{online ? '' : '오프라인 접수'}</span>
      </header>

      {mode === 'scan' ? (
        <div className={styles.viewport}>
          <video ref={videoRef} className={styles.video} muted playsInline />
          <div className={styles.reticle} aria-hidden="true">
            <span className={styles.corner + ' ' + styles.tl} />
            <span className={styles.corner + ' ' + styles.tr} />
            <span className={styles.corner + ' ' + styles.bl} />
            <span className={styles.corner + ' ' + styles.br} />
          </div>
          {busy ? <div className={styles.scanBusy}>확인 중…</div> : null}
          {(cameraBlocked || decoderMissing) && (
            <div className={styles.cameraNotice}>
              {cameraBlocked
                ? '카메라를 사용할 수 없습니다. 수동 입력을 이용해주세요.'
                : '이 단말은 자동 인식을 지원하지 않습니다. 수동 입력을 이용해주세요.'}
            </div>
          )}
        </div>
      ) : mode === 'manual' ? (
        <ManualEntry
          facilityId={device?.facilityId ?? null}
          onCheckin={handleManualCheckin}
          toastError={toast.error}
        />
      ) : (
        <GuestEntry online={online} onCheckin={handleGuestCheckin} toastError={toast.error} />
      )}

      <div className={styles.scanFooter}>
        {mode === 'scan' ? (
          <>
            <Button
              variant={cameraBlocked || decoderMissing ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setMode('manual')}
            >
              수동 입력
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMode('guest')}>
              게스트 · 드롭인
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setMode('scan')}>
            카메라로 스캔
          </Button>
        )}
      </div>
    </main>
  );
}

// 수동 폴백 (docs/06 §3.2⑤) — 전화번호 뒤 4자리 → 마스킹 후보(fn_kiosk_lookup_member) → 데스크 지원 체크인.
// 후보 선택 시 member_id를 서버(submitManualCheckin→fn_kiosk_checkin)에 위임한다(클라 멤버십 로직 없음).
function ManualEntry({
  facilityId,
  onCheckin,
  toastError,
}: {
  facilityId: string | null;
  onCheckin: (memberId: string) => Promise<void>;
  toastError: (m: string) => void;
}) {
  const [digits, setDigits] = useState('');
  const [candidates, setCandidates] = useState<KioskCandidate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleLookup = useCallback(async () => {
    if (digits.length !== 4) return;
    setLoading(true);
    try {
      const found = await lookupMembers(facilityId, digits);
      setCandidates(found);
      if (found.length === 0) {
        toastError('일치하는 회원이 없습니다. 데스크에 문의해주세요.');
      }
    } catch {
      toastError(KIOSK_ERROR_MESSAGE.network_error);
    } finally {
      setLoading(false);
    }
  }, [digits, facilityId, toastError]);

  const handleSelect = useCallback(
    async (memberId: string) => {
      if (submitting) return;
      setSubmitting(true);
      try {
        await onCheckin(memberId);
      } finally {
        setSubmitting(false);
      }
    },
    [onCheckin, submitting],
  );

  return (
    <div className={styles.manual}>
      <Input
        label="전화번호 뒤 4자리"
        inputMode="numeric"
        maxLength={4}
        value={digits}
        onChange={(e) => {
          setDigits(e.target.value.replace(/\D/g, '').slice(0, 4));
          setCandidates(null);
        }}
        placeholder="1234"
      />
      <Button
        variant="primary"
        block
        disabled={digits.length !== 4 || loading}
        onClick={() => void handleLookup()}
      >
        {loading ? '조회 중…' : '조회'}
      </Button>

      {candidates && candidates.length > 0 ? (
        <ul className={styles.candidateList}>
          {candidates.map((c) => (
            <li key={c.member_id}>
              <button
                type="button"
                className={styles.candidate}
                disabled={submitting}
                onClick={() => void handleSelect(c.member_id)}
              >
                <span className={styles.candidateName}>{c.masked_name}</span>
                <span className={styles.candidatePhone}>···{c.phone_tail}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// 게스트/드롭인 (docs/06 §4.6 G-7) — 데스크 발권 6자리 1회용 코드 입력 → 서버 상환.
// 폰(앱 세션) 없는 게스트용. 코드 검증·크레딧 차감은 fn_kiosk_guest_checkin 전담.
function GuestEntry({
  online,
  onCheckin,
  toastError,
}: {
  online: boolean;
  onCheckin: (code: string) => Promise<void>;
  toastError: (m: string) => void;
}) {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (code.length !== 6 || submitting) return;
    if (!online) {
      toastError('오프라인 상태에서는 게스트 코드를 사용할 수 없습니다. 데스크에 문의해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await onCheckin(code);
    } finally {
      setSubmitting(false);
    }
  }, [code, online, onCheckin, submitting, toastError]);

  return (
    <div className={styles.manual}>
      <p className={styles.guestHint}>데스크에서 받은 6자리 드롭인/체험 코드를 입력하세요.</p>
      <Input
        label="게스트 코드 (6자리)"
        inputMode="numeric"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
      />
      <Button
        variant="primary"
        block
        loading={submitting}
        disabled={code.length !== 6 || submitting}
        onClick={() => void handleSubmit()}
      >
        체크인
      </Button>
    </div>
  );
}
