'use client';

// PM5 기기 등록/편집 모달 (02-admin §3.9 devices)
// 전용 RPC 부재 → pm5_devices 직접 insert/update(admin RLS). ⏳ audit 미기록.
import { useEffect, useState } from 'react';
import { Modal, Button, Input, Select, Card } from '@/components/ui';
import { useToast } from '@/components/ui';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  type Pm5Device,
  type DeviceType,
  type DeviceStatus,
  type DeviceMode,
  writeError,
} from './types';
import styles from './race-admin.module.css';

interface Props {
  device: Pm5Device | null; // null = 신규
  onClose: () => void;
  onSaved: () => void;
}

interface FacilityRow {
  id: string;
  name: string;
}

export function Pm5DeviceEditModal({ device, onClose, onSaved }: Props) {
  const toast = useToast();
  const client = getSupabaseBrowserClient();
  const isEdit = device != null;

  const [serial, setSerial] = useState(device?.serial_number ?? '');
  const [facilityId, setFacilityId] = useState<string | null>(device?.facility_id ?? null);
  const [deviceType, setDeviceType] = useState<DeviceType>(device?.device_type ?? 'rower');
  const [status, setStatus] = useState<DeviceStatus>(device?.status ?? 'offline');
  const [mode, setMode] = useState<DeviceMode>(device?.current_mode ?? 'idle');
  const [bleName, setBleName] = useState(device?.ble_name ?? '');
  const [macAddress, setMacAddress] = useState(device?.mac_address ?? '');
  const [firmware, setFirmware] = useState(device?.firmware_version ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [facilities, setFacilities] = useState<FacilityRow[]>([]);
  useEffect(() => {
    let alive = true;
    void query<FacilityRow[]>(client, 'facilities', (q) =>
      q.select('id, name').eq('is_active', true).order('name'),
    ).then((res) => {
      if (!alive || !res.success || !res.data) return;
      setFacilities(res.data);
      if (!isEdit) setFacilityId((cur) => cur ?? res.data?.[0]?.id ?? null);
    });
    return () => {
      alive = false;
    };
  }, [client, isEdit]);

  const doSave = async () => {
    if (!serial.trim()) {
      setError('시리얼 넘버를 입력하세요.');
      return;
    }
    const payload = {
      serial_number: serial.trim(),
      facility_id: facilityId,
      device_type: deviceType,
      status,
      current_mode: mode,
      ble_name: bleName.trim() || null,
      mac_address: macAddress.trim() || null,
      firmware_version: firmware.trim() || null,
    };
    setSaving(true);
    setError(null);
    const res = isEdit
      ? await query(client, 'pm5_devices', (q) => q.update(payload).eq('id', device.id))
      : await query(client, 'pm5_devices', (q) => q.insert(payload));
    setSaving(false);
    if (!res.success) {
      setError(writeError(res.error));
      return;
    }
    toast.success(isEdit ? '기기를 수정했습니다.' : '기기를 등록했습니다.');
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'PM5 기기 편집' : 'PM5 기기 등록'}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button variant="primary" onClick={doSave} loading={saving}>
            저장
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        {error ? (
          <Card variant="accent">
            <span className={styles.errorText}>{error}</span>
          </Card>
        ) : null}

        <Input
          label="시리얼 넘버 (주 식별자)"
          value={serial}
          onChange={(e) => setSerial(e.target.value)}
          helper="iOS MAC 숨김 대응 — 시리얼이 주 식별자"
        />

        <div className={styles.formRow}>
          <Select
            label="지점 (선택)"
            value={facilityId}
            onChange={(v) => setFacilityId(v)}
            placeholder={facilities.length === 0 ? '지점 불러오는 중…' : '지점 선택'}
            options={facilities.map((f) => ({ value: f.id, label: f.name }))}
          />
          <Select
            label="종류"
            value={deviceType}
            onChange={(v) => setDeviceType(v as DeviceType)}
            options={[
              { value: 'rower', label: '로워' },
              { value: 'bike', label: '바이크' },
              { value: 'skierg', label: '스키어그' },
              { value: 'treadmill', label: '트레드밀' },
              { value: 'other', label: '기타' },
            ]}
          />
        </div>

        <div className={styles.formRow}>
          <Select
            label="상태"
            value={status}
            onChange={(v) => setStatus(v as DeviceStatus)}
            options={[
              { value: 'online', label: '온라인' },
              { value: 'offline', label: '오프라인' },
              { value: 'maintenance', label: '점검' },
            ]}
          />
          <Select
            label="모드"
            value={mode}
            onChange={(v) => setMode(v as DeviceMode)}
            options={[
              { value: 'idle', label: '대기' },
              { value: 'racing', label: '레이싱' },
              { value: 'personal_recording', label: '개인 기록' },
            ]}
          />
        </div>

        <div className={styles.formRow}>
          <Input label="BLE 이름 (선택)" value={bleName} onChange={(e) => setBleName(e.target.value)} />
          <Input
            label="MAC 주소 (선택)"
            value={macAddress}
            onChange={(e) => setMacAddress(e.target.value)}
          />
        </div>

        <Input
          label="펌웨어 버전 (선택)"
          value={firmware}
          onChange={(e) => setFirmware(e.target.value)}
        />
      </div>
    </Modal>
  );
}
