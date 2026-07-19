'use client';

// 키오스크 앱 셸 (docs/06 §1·§6·§7) — AuthGuard 없는 무인 표면.
//  · 기기 프로비저닝(등록 토큰 → device_id/facility_id 서버 해석, §1)
//  · Heartbeat 30s + 네트워크 상태 판정(온/오프라인)
//  · 원격 명령 수신(reload/to_idle/maintenance/resume)
//  · 오프라인 복구 시 로컬 큐 재전송(§7)
//  · 점검 오버레이 / 미등록·연결대기 오버레이(무한 스피너 금지 — 항상 안내 표면화)
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
import { Button, Card } from '@/components/ui';
import { readQueue, removeFromQueue, purgeExpired } from '@/features/kiosk-checkin/offline-queue';
import { resubmitPayload } from '@/features/kiosk-checkin/checkin';
import {
  readDeviceConfig,
  readDeviceToken,
  writeDeviceConfig,
  writeDeviceToken,
  clearDeviceConfig,
  type KioskDeviceConfig,
} from './device';
import { provisionDevice } from './provision';
import { useHeartbeat } from './useHeartbeat';
import { useRemoteCommands } from './useRemoteCommands';
import { DeviceSetupOverlay } from './DeviceSetupOverlay';
import { MaintenanceOverlay } from './MaintenanceOverlay';
import overlay from './overlay.module.css';

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
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [netOnline, setNetOnline] = useState(true);
  const [beatOk, setBeatOk] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [queued, setQueued] = useState(0);
  const drainingRef = useRef(false);

  // 프로비저닝 로드 — 토큰(영구) + config 캐시(오프라인 즉시 구동). 마운트 후 읽어 하이드레이션 일치.
  useEffect(() => {
    const cached = readDeviceConfig();
    const t = readDeviceToken();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cached) setDevice(cached);
    setToken(t);
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

  // 토큰 → 단말 해석(§1). 온라인 진입/토큰 변경 시 재검증(토큰 회수·facility 변경 반영).
  //   invalid_token = 토큰 폐기 후 재등록 유도. network_error = 캐시 유지(오프라인 구동).
  useEffect(() => {
    if (!token || !netOnline) return;
    let cancelled = false;
    void (async () => {
      const res = await provisionDevice(token);
      if (cancelled) return;
      if (res.ok) {
        writeDeviceConfig(res.config);
        setDevice(res.config);
        setMaintenance(res.status === 'maintenance');
      } else if (res.code === 'invalid_token') {
        clearDeviceConfig();
        setDevice(null);
        setToken(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, netOnline]);

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

  // 복구 시 큐 재전송(§7) — 순서대로 fn_kiosk_checkin 재호출(scanned_at 소급). 만료분은 먼저 폐기.
  useEffect(() => {
    if (!online || drainingRef.current) return;
    drainingRef.current = true;
    void (async () => {
      try {
        await purgeExpired(); // 24h 초과분 폐기(docs §7)
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

  // 오버레이 상태: 토큰 없음 → 등록 폼 / 토큰 있으나 미해석(오프라인) → 연결 대기(무한 스피너 금지)
  const showSetup = ready && !device && !token;
  const showConnecting = ready && !device && !!token;

  const handleProvisioned = useCallback((t: string, cfg: KioskDeviceConfig) => {
    writeDeviceToken(t);
    writeDeviceConfig(cfg);
    setToken(t);
    setDevice(cfg);
  }, []);

  const handleReenter = useCallback(() => {
    clearDeviceConfig();
    setToken(null);
    setDevice(null);
  }, []);

  return (
    <KioskContext.Provider value={value}>
      {children}
      {showSetup ? <DeviceSetupOverlay onProvisioned={handleProvisioned} /> : null}
      {showConnecting ? <ConnectingOverlay onReenter={handleReenter} /> : null}
      {maintenance ? <MaintenanceOverlay /> : null}
    </KioskContext.Provider>
  );
}

// 토큰은 있으나 오프라인 등으로 단말 해석 대기 — 상태 표면화 + 재등록 탈출구(무한 스피너 금지).
function ConnectingOverlay({ onReenter }: { onReenter: () => void }) {
  return (
    <div className={overlay.overlay} role="dialog" aria-modal="true" aria-labelledby="kiosk-connecting-title">
      <Card variant="raised" className={overlay.panel} title={<span id="kiosk-connecting-title">단말 확인 중</span>}>
        <p className={overlay.desc}>
          등록 토큰으로 단말 정보를 확인하고 있습니다. 네트워크가 복구되면 자동으로 시작됩니다.
        </p>
        <div className={overlay.actions}>
          <Button variant="ghost" block onClick={onReenter}>
            토큰 다시 입력
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function useKiosk(): KioskContextValue {
  const ctx = useContext(KioskContext);
  if (!ctx) throw new Error('useKiosk는 <KioskProvider> 하위에서만 사용할 수 있습니다.');
  return ctx;
}
