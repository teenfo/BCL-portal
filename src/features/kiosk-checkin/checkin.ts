// 체크인 제출 파이프라인 (docs/06 §4.4) — 서버 원자 RPC 단일 경로.
// 클라이언트 멤버십 검증 금지: 판정은 fn_kiosk_checkin이 전담. 여기서는
//  ① 페이로드 파싱/버전(§4.2①) ② 만료(②) ③ 지점(④) 선검증만 하고 RPC에 위임한다.
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { rpc } from '@/lib/supabase/query';
import { isExpired, isFacilityMismatch, parsePayload } from './payload';
import { enqueueCheckin } from './offline-queue';
import {
  type KioskCheckinData,
  type KioskErrorCode,
  type QrPayload,
  type ScanOutcome,
} from './types';

interface SubmitContext {
  deviceId: string | null;
  facilityId: string | null;
  /** 오프라인 모드 — true면 로컬 검증 후 큐잉(§7) */
  offline: boolean;
}

/** RPC 호출 1회 — envelope를 ScanOutcome으로 변환. 통신 실패는 network_error로 표면화 */
async function callRpc(payload: QrPayload): Promise<ScanOutcome> {
  const client = getSupabaseBrowserClient();
  const res = await rpc<KioskCheckinData>(client, 'fn_kiosk_checkin', { p_payload: payload });
  if (res.success && res.data) {
    return { kind: 'success', data: res.data };
  }
  const code = (res.error ?? 'network_error') as KioskErrorCode;
  if (code === 'duplicate_checkin') return { kind: 'duplicate' };
  // RPC가 반환하는 도메인 오류 코드는 그대로, 통신 오류 메시지(문장)는 network_error로 정규화
  const known: KioskErrorCode[] = [
    'invalid_payload',
    'qr_expired',
    'member_not_found',
    'member_not_active',
    'no_active_membership',
  ];
  return { kind: 'error', code: known.includes(code) ? code : 'network_error' };
}

/** QR 문자열 판독 → 검증 → 체크인. 오프라인이면 로컬 큐에 접수(§7) */
export async function submitScan(raw: string, ctx: SubmitContext): Promise<ScanOutcome> {
  const parsed = parsePayload(raw);
  if (!parsed.ok) return { kind: 'error', code: parsed.code };
  const payload = parsed.payload;
  const scannedAt = Date.now();

  // 지점 선검증(§4.2④) — 온/오프라인 공통
  if (isFacilityMismatch(payload, ctx.facilityId)) {
    return { kind: 'error', code: 'facility_mismatch' };
  }

  // 오프라인 폴백(§7): 로컬은 ①②만 검증하고 큐에 적재, 멤버십/중복은 서버 복구 시 판정
  if (ctx.offline) {
    if (isExpired(payload, scannedAt)) return { kind: 'error', code: 'qr_expired' };
    await enqueueCheckin({ payload, scanned_at: scannedAt, device_id: ctx.deviceId });
    return { kind: 'queued' };
  }

  // 온라인: 만료 조기거절(UX) 후 서버 위임
  if (isExpired(payload, scannedAt)) return { kind: 'error', code: 'qr_expired' };
  try {
    return await callRpc(payload);
  } catch {
    // 호출 자체 실패 = 사실상 오프라인 → 큐잉으로 폴백(입장 흐름 우선)
    try {
      await enqueueCheckin({ payload, scanned_at: scannedAt, device_id: ctx.deviceId });
      return { kind: 'queued' };
    } catch {
      return { kind: 'error', code: 'network_error' };
    }
  }
}

/** 복구 시 큐 항목 1건 재전송 — payload만 전송(p_scanned_at 미지원, FLAG) */
export async function resubmitPayload(payload: QrPayload): Promise<ScanOutcome> {
  return callRpc(payload);
}
