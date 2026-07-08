'use client';

// /kiosk/scan — 스캔 화면 (docs/06 §3.2·§4·§5)
// 카메라 프리뷰 + 조준 프레임 + 자동 디코딩 → 서버 검증(fn_kiosk_checkin) → success 전환.
// 오류는 3초 토스트 후 스캔 재개. 60초 무동작 → idle 복귀. 폴백: 수동 입력(격하).
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, useToast } from '@/components/ui';
import { useKiosk } from '@/features/kiosk-shell';
import {
  KIOSK_ERROR_MESSAGE,
  lookupMembers,
  setSuccessResult,
  submitManualCheckin,
  submitScan,
  useScanner,
  type KioskCandidate,
  type ScanOutcome,
} from '@/features/kiosk-checkin';
import styles from '../kiosk.module.css';

const IDLE_TIMEOUT_MS = 60_000;

export default function KioskScanPage() {
  const router = useRouter();
  const toast = useToast();
  const { device, online } = useKiosk();
  const [busy, setBusy] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const processingRef = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // 결과 → success 전환 또는 오류 토스트 (스캔·수동 공통). 성공 계열이면 true
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

  const { videoRef, state, hasDecoder } = useScanner({
    onDecode: (raw) => void handleRaw(raw),
    active: !showManual,
  });

  const cameraBlocked = state === 'denied' || state === 'unsupported' || state === 'error';
  const decoderMissing = state === 'streaming' && !hasDecoder;

  return (
    <main className={styles.scan}>
      <header className={styles.scanHeader}>
        <Button variant="ghost" size="sm" onClick={() => router.push('/kiosk')}>
          ← 취소
        </Button>
        <span className={styles.scanTitle}>QR을 카메라에 비춰주세요</span>
        <span className={online ? styles.scanNet : styles.scanNetOff}>{online ? '' : '오프라인 접수'}</span>
      </header>

      {!showManual ? (
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
      ) : (
        <ManualEntry
          facilityId={device?.facilityId ?? null}
          onBack={() => setShowManual(false)}
          onCheckin={handleManualCheckin}
          toastError={toast.error}
        />
      )}

      <div className={styles.scanFooter}>
        <Button
          variant={cameraBlocked || decoderMissing ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setShowManual((v) => !v)}
        >
          {showManual ? '카메라로 스캔' : '수동 입력'}
        </Button>
      </div>
    </main>
  );
}

// 수동 폴백 (docs/06 §3.2⑤) — 전화번호 뒤 4자리 → 마스킹 후보(fn_kiosk_lookup_member) → 데스크 지원 체크인.
// 후보 선택 시 member_id를 서버(submitManualCheckin→fn_kiosk_checkin)에 위임한다(클라 멤버십 로직 없음).
function ManualEntry({
  facilityId,
  onBack,
  onCheckin,
  toastError,
}: {
  facilityId: string | null;
  onBack: () => void;
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

      <Button variant="ghost" size="sm" onClick={onBack}>
        뒤로
      </Button>
    </div>
  );
}
