'use client';

// 미등록 단말 설정 오버레이 (docs/06 §1) — device_id/facility_id 로컬 보관.
// 정식 등록은 Admin이 kiosk_devices 행을 만들고 발급한 id를 여기 입력하는 최소 플로우. FLAG.
import { useState } from 'react';
import { Button, Card, Input } from '@/components/ui';
import type { KioskDeviceConfig } from './device';
import styles from './overlay.module.css';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function DeviceSetupOverlay({ onRegister }: { onRegister: (cfg: KioskDeviceConfig) => void }) {
  const [deviceId, setDeviceId] = useState('');
  const [facilityId, setFacilityId] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!UUID_RE.test(deviceId.trim()) || !UUID_RE.test(facilityId.trim())) {
      setError('단말 ID와 지점 ID는 Admin이 발급한 UUID 형식이어야 합니다.');
      return;
    }
    onRegister({
      deviceId: deviceId.trim(),
      facilityId: facilityId.trim(),
      deviceName: deviceName.trim() || '키오스크',
    });
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="kiosk-setup-title">
      <Card variant="raised" className={styles.panel} title={<span id="kiosk-setup-title">단말 설정</span>}>
        <p className={styles.desc}>
          이 단말은 아직 등록되지 않았습니다. Admin이 발급한 단말 ID와 지점 ID를 입력하세요.
        </p>
        <div className={styles.form}>
          <Input
            label="단말 ID (device_id)"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            error={error}
          />
          <Input
            label="지점 ID (facility_id)"
            value={facilityId}
            onChange={(e) => setFacilityId(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
          />
          <Input
            label="단말 이름"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="입구 키오스크"
          />
        </div>
        <div className={styles.actions}>
          <Button variant="primary" block onClick={submit}>
            등록
          </Button>
        </div>
      </Card>
    </div>
  );
}
