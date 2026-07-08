'use client';

// 키오스크 앱 셸 (docs/06 §1·§6·§7) — AuthGuard 없는 무인 표면.
//  · 단말 설정(device_id/facility_id) 컨텍스트 제공
//  · Heartbeat 30s + 네트워크 상태 판정(온/오프라인)
//  · 원격 명령 수신(reload/to_idle/maintenance/resume)
//  · 오프라인 복구 시 로컬 큐 재전송(§7)
//  · 점검 오버레이 / 미등록 단말 설정 오버레이(무한 스피너 금지 — 항상 안내 표면화)
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { readQueue, removeFromQueue } from '@/features/kiosk-checkin/offline-queue';
import { resubmitPayload } from '@/features/kiosk-checkin/checkin';
import { readDeviceConfig, writeDeviceConfig, type KioskDeviceConfig } from './device';
import { useHeartbeat } from './useHeartbeat';
import { useRemoteCommands } from './useRemoteCommands';
import { DeviceSetupOverlay } from './DeviceSetupOverlay';
import { MaintenanceOverlay } from './MaintenanceOverlay';

interface KioskContextValue {
  device: KioskDeviceConfig | null;
  online: boolean;
  maintenance: boolean;
  /** 오프라인 미동기화 큐 건수(배지 표시용) */
  queued: number;
  refreshQueued: () => void;
}

const KioskContext = createContext<KioskContextValue | null>(null);

export function KioskProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [device, setDevice] = useState<KioskDeviceConfig | null>(null);
  const [ready, setReady] = useState(false);
  const [netOnline, setNetOnline] = useState(true);
  const [beatOk, setBeatOk] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [queued, setQueued] = useState(0);
  const drainingRef = useRef(false);

  // 단말 설정 로드 (localStorage) — 하이드레이션 일치 위해 마운트 후 읽는다
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDevice(readDeviceConfig());
    setReady(true);
  }, []);

  // navigator.onLine 이벤트 + 초기값
  useEffect(() => {
    const on = () => setNetOnline(true);
    const off = () => setNetOnline(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNetOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useHeartbeat({ deviceId: device?.deviceId ?? null, onResult: setBeatOk });

  const online = netOnline && beatOk;

  const refreshQueued = useCallback(() => {
    void readQueue()
      .then((q) => setQueued(q.length))
      .catch(() => setQueued(0));
  }, []);

  useEffect(() => {
    refreshQueued();
  }, [refreshQueued]);

  // 복구 시 큐 재전송(§7) — 순서대로 fn_kiosk_checkin 재호출
  useEffect(() => {
    if (!online || drainingRef.current) return;
    drainingRef.current = true;
    void (async () => {
      try {
        const items = await readQueue();
        for (const item of items) {
          if (item.id === undefined) continue;
          const outcome = await resubmitPayload(item);
          // 성공·중복·도메인 거절 = 처리 완료로 간주하고 큐에서 제거(네트워크 오류만 보존)
          if (outcome.kind !== 'error' || outcome.code !== 'network_error') {
            await removeFromQueue(item.id);
          }
        }
      } catch {
        /* 다음 online 전환에서 재시도 */
      } finally {
        drainingRef.current = false;
        refreshQueued();
      }
    })();
  }, [online, refreshQueued]);

  const handleCommand = useCallback(
    (cmd: 'reload' | 'to_idle' | 'maintenance' | 'resume') => {
      if (cmd === 'reload') window.location.reload();
      else if (cmd === 'to_idle') router.push('/kiosk');
      else if (cmd === 'maintenance') setMaintenance(true);
      else if (cmd === 'resume') setMaintenance(false);
    },
    [router],
  );
  useRemoteCommands(device?.deviceId ?? null, handleCommand);

  const value = useMemo<KioskContextValue>(
    () => ({ device, online, maintenance, queued, refreshQueued }),
    [device, online, maintenance, queued, refreshQueued],
  );

  const handleRegister = useCallback((cfg: KioskDeviceConfig) => {
    writeDeviceConfig(cfg);
    setDevice(cfg);
  }, []);

  return (
    <KioskContext.Provider value={value}>
      {children}
      {ready && !device ? <DeviceSetupOverlay onRegister={handleRegister} /> : null}
      {maintenance ? <MaintenanceOverlay /> : null}
    </KioskContext.Provider>
  );
}

export function useKiosk(): KioskContextValue {
  const ctx = useContext(KioskContext);
  if (!ctx) throw new Error('useKiosk는 <KioskProvider> 하위에서만 사용할 수 있습니다.');
  return ctx;
}
