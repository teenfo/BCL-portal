'use client';

// 미등록 단말 설정 오버레이 (docs/06 §1 — 기기 프로비저닝).
// Phase 3.6: UUID 2개 수동 입력 → Admin 발급 "등록 토큰" 1개 입력으로 교체.
//   토큰을 fn_kiosk_provision 으로 교환해 device_id/facility_id 를 서버에서 해석한다.
//   실패는 항상 표면화(무한 스피너 금지) — invalid=재입력, network=재시도 안내.
import { useState } from 'react';
import { Button, Card, Input } from '@/components/ui';
import type { KioskDeviceConfig } from './device';
import { provisionDevice } from './provision';
import styles from './overlay.module.css';

export function DeviceSetupOverlay({
  onProvisioned,
}: {
  onProvisioned: (token: string, cfg: KioskDeviceConfig) => void;
}) {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const t = token.trim();
    if (t.length < 16) {
      setError('Admin이 발급한 등록 토큰을 입력하세요.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await provisionDevice(t);
    setBusy(false);
    if (res.ok) {
      onProvisioned(t, res.config);
      return;
    }
    setError(
      res.code === 'invalid_token'
        ? '유효하지 않은 토큰입니다. Admin에서 발급한 토큰을 확인하세요.'
        : '서버에 연결할 수 없습니다. 네트워크를 확인하고 다시 시도하세요.',
    );
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="kiosk-setup-title">
      <Card variant="raised" className={styles.panel} title={<span id="kiosk-setup-title">단말 등록</span>}>
        <p className={styles.desc}>
          이 단말은 아직 등록되지 않았습니다. Admin 단말 관리에서 발급한 등록 토큰을 입력하세요.
        </p>
        <div className={styles.form}>
          <Input
            label="등록 토큰"
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setError(null);
            }}
            placeholder="Admin 발급 토큰 붙여넣기"
            error={error}
            autoComplete="off"
          />
        </div>
        <div className={styles.actions}>
          <Button variant="primary" block loading={busy} disabled={busy} onClick={() => void submit()}>
            등록
          </Button>
        </div>
      </Card>
    </div>
  );
}
