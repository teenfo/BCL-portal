// 오프라인 체크인 로컬 큐 (docs/06 §7) — IndexedDB.
// 네트워크 단절 시 {payload, scanned_at, device_id}를 보존(24h)하고, 복구 시 순서대로 재전송.
// Phase 3.5: 재전송 시 적재 당시 scanned_at/device_id를 fn_kiosk_checkin(p_scanned_at,p_device_id)로
//   그대로 넘겨 만료/중복을 스캔 시각 기준으로 소급 판정한다(resubmitPayload).
import type { QrPayload } from './types';

const DB_NAME = 'bcl-kiosk';
const STORE = 'checkin-queue';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h 보존, 초과분 폐기

export interface QueuedCheckin {
  id?: number;
  payload: QrPayload;
  scanned_at: number; // epoch ms
  device_id: string | null;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

export async function enqueueCheckin(item: QueuedCheckin): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function readQueue(): Promise<QueuedCheckin[]> {
  const db = await openDb();
  const all = await new Promise<QueuedCheckin[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedCheckin[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  const now = Date.now();
  return all
    .filter((q) => now - q.scanned_at <= MAX_AGE_MS) // 만료분 제외(폐기는 removeFromQueue로)
    .sort((a, b) => a.scanned_at - b.scanned_at); // 접수 순서 보장
}

export async function removeFromQueue(id: number): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function queueSize(): Promise<number> {
  try {
    return (await readQueue()).length;
  } catch {
    return 0;
  }
}

export { MAX_AGE_MS };
