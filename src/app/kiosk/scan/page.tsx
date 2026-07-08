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
  setSuccessResult,
  submitScan,
  useScanner,
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
        if (outcome.kind === 'success') {
          setSuccessResult({ kind: 'success', data: outcome.data });
          router.push('/kiosk/success');
          return;
        }
        if (outcome.kind === 'duplicate') {
          setSuccessResult({ kind: 'duplicate' });
          router.push('/kiosk/success');
          return;
        }
        if (outcome.kind === 'queued') {
          setSuccessResult({ kind: 'queued' });
          router.push('/kiosk/success');
          return;
        }
        // error → 토스트 후 스캔 재개
        toast.error(KIOSK_ERROR_MESSAGE[outcome.code]);
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
    [device, online, resetIdleTimer, router, toast],
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
        <ManualEntry onBack={() => setShowManual(false)} toastError={toast.error} />
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

// 수동 폴백 (docs/06 §3.2⑤) — 전화번호 뒤 4자리 후보 조회.
// ※ 후보 조회 RPC(fn_kiosk_lookup_by_phone류) 미존재 — UI 셸만 제공하고 안내로 격하. FLAG.
function ManualEntry({ onBack, toastError }: { onBack: () => void; toastError: (m: string) => void }) {
  const [digits, setDigits] = useState('');
  return (
    <div className={styles.manual}>
      <Input
        label="전화번호 뒤 4자리"
        inputMode="numeric"
        maxLength={4}
        value={digits}
        onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').slice(0, 4))}
        placeholder="1234"
      />
      <Button
        variant="primary"
        block
        disabled={digits.length !== 4}
        onClick={() => toastError('수동 체크인은 데스크에 문의해주세요.')}
      >
        조회
      </Button>
      <Button variant="ghost" size="sm" onClick={onBack}>
        뒤로
      </Button>
    </div>
  );
}
