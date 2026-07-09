// 체크인 제출 파이프라인 (docs/06 §4.4) — 서버 원자 RPC 단일 경로.
// 클라이언트 멤버십 검증 금지: 판정은 fn_kiosk_checkin이 전담. 여기서는
//  ① 페이로드 파싱/버전(§4.2①) ② 만료(②) ③ 지점(④) 선검증만 하고 RPC에 위임한다.
// Phase 3.5: fn_kiosk_checkin(p_payload, p_device_id, p_scanned_at) 신 시그니처로 배선.
//  · p_device_id = 단말 로컬 설정(facility 강제/공유 판정에 사용)
//  · p_scanned_at = 실제 스캔 시각(온라인=now, 오프라인 replay=적재 시각) → 만료/중복 소급 정합
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { rpc } from '@/lib/supabase/query';
import { isExpired, isFacilityMismatch, parsePayload } from './payload';
import { enqueueCheckin } from './offline-queue';
import {
  PAYLOAD_VERSION,
  type KioskCandidate,
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

/** fn_kiosk_checkin 성공 data 원시 형태 — duplicated 분기 전 상위집합 */
type RawCheckinData = Partial<KioskCheckinData> & {
  duplicated?: boolean;
  member_name: string;
  checkin_time: string;
  remaining_credits: number | null;
  membership_dday: number | null;
};

/** RPC가 반환하는 도메인 오류 코드(그 외 문장은 network_error로 정규화) */
const KNOWN_CODES: KioskErrorCode[] = [
  'invalid_payload',
  'qr_expired',
  'member_not_found',
  'member_not_active',
  'no_active_membership',
  'facility_mismatch',
  'invalid_code',
  'code_expired',
];

/** envelope(성공 data | 오류 문자열) → ScanOutcome. QR·게스트 공통 매핑. duplicated=성공화면 경유 */
function mapEnvelope(res: { success: boolean; data: RawCheckinData | null; error: string | null }): ScanOutcome {
  if (res.success && res.data) {
    const d = res.data;
    if (d.duplicated) {
      // 같은 날 중복 = 성공 payload(친화 화면), 오류 아님
      return {
        kind: 'duplicate',
        data: {
          member_name: d.member_name,
          checkin_time: d.checkin_time,
          remaining_credits: d.remaining_credits ?? null,
          membership_dday: d.membership_dday ?? null,
        },
      };
    }
    return { kind: 'success', data: d as KioskCheckinData };
  }
  const code = (res.error ?? 'network_error') as KioskErrorCode;
  return { kind: 'error', code: KNOWN_CODES.includes(code) ? code : 'network_error' };
}

/** RPC 1회 — p_device_id/p_scanned_at 전달, envelope→ScanOutcome */
async function callRpc(
  payload: QrPayload,
  deviceId: string | null,
  scannedAtMs: number,
): Promise<ScanOutcome> {
  const client = getSupabaseBrowserClient();
  const res = await rpc<RawCheckinData>(client, 'fn_kiosk_checkin', {
    p_payload: payload,
    p_device_id: deviceId,
    p_scanned_at: new Date(scannedAtMs).toISOString(),
  });
  return mapEnvelope(res);
}

/** 파싱 완료된 페이로드 공통 제출: 선검증 → (오프라인 큐잉 | 온라인 RPC), 실패 시 큐 폴백 */
async function submitPayload(
  payload: QrPayload,
  ctx: SubmitContext,
  scannedAtMs: number,
): Promise<ScanOutcome> {
  // 지점 선검증(§4.2④) — 온/오프라인 공통
  if (isFacilityMismatch(payload, ctx.facilityId)) {
    return { kind: 'error', code: 'facility_mismatch' };
  }
  // 만료 조기거절(§4.2②) — 스캔 시각 기준(오프라인 소급 판정 대비)
  if (isExpired(payload, scannedAtMs)) return { kind: 'error', code: 'qr_expired' };

  // 오프라인 폴백(§7): 로컬은 ①②④만 검증하고 큐에 적재, 멤버십/중복은 서버 복구 시 판정
  if (ctx.offline) {
    await enqueueCheckin({ payload, scanned_at: scannedAtMs, device_id: ctx.deviceId });
    return { kind: 'queued' };
  }

  try {
    return await callRpc(payload, ctx.deviceId, scannedAtMs);
  } catch {
    // 호출 자체 실패 = 사실상 오프라인 → 큐잉으로 폴백(입장 흐름 우선)
    try {
      await enqueueCheckin({ payload, scanned_at: scannedAtMs, device_id: ctx.deviceId });
      return { kind: 'queued' };
    } catch {
      return { kind: 'error', code: 'network_error' };
    }
  }
}

/** QR 문자열 판독 → 검증 → 체크인. 오프라인이면 로컬 큐에 접수(§7) */
export async function submitScan(raw: string, ctx: SubmitContext): Promise<ScanOutcome> {
  const parsed = parsePayload(raw);
  if (!parsed.ok) return { kind: 'error', code: parsed.code };
  return submitPayload(parsed.payload, ctx, Date.now());
}

/**
 * 수기 대체 체크인(§3.2⑤) — 데스크 지원. 후보 선택 후 member_id로 페이로드를 합성해
 * fn_kiosk_checkin에 위임한다(클라 멤버십 로직 없음 — 판정은 서버). ts=now라 만료 통과.
 */
export async function submitManualCheckin(
  memberId: string,
  ctx: SubmitContext,
): Promise<ScanOutcome> {
  if (!ctx.facilityId) return { kind: 'error', code: 'facility_mismatch' };
  const payload: QrPayload = {
    mid: memberId,
    fid: ctx.facilityId,
    ts: Math.floor(Date.now() / 1000),
    v: PAYLOAD_VERSION,
  };
  return submitPayload(payload, ctx, Date.now());
}

/** 전화 뒷4자리 후보 조회(ANON fn_kiosk_lookup_member) — 실패/빈 결과는 [] 로 격하 */
export async function lookupMembers(
  facilityId: string | null,
  phoneLast4: string,
): Promise<KioskCandidate[]> {
  if (!facilityId || phoneLast4.length < 4) return [];
  try {
    const client = getSupabaseBrowserClient();
    const res = await rpc<KioskCandidate[]>(client, 'fn_kiosk_lookup_member', {
      p_facility_id: facilityId,
      p_phone_last4: phoneLast4,
    });
    return res.success && Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
}

/**
 * 게스트/드롭인 체크인(§4.6 G-7) — 데스크 발권 6자리 1회용 코드 상환.
 * 폰(앱 세션) 없는 게스트용. 코드 검증·크레딧 차감은 서버(fn_kiosk_guest_checkin) 전담.
 * 코드 상환은 서버 검증이 필수라 오프라인 큐잉하지 않는다 — 오프라인이면 network_error 안내.
 */
export async function submitGuestCheckin(code: string, ctx: SubmitContext): Promise<ScanOutcome> {
  const clean = code.replace(/\D/g, '');
  if (clean.length < 4) return { kind: 'error', code: 'invalid_code' };
  if (ctx.offline) return { kind: 'error', code: 'network_error' };
  try {
    const client = getSupabaseBrowserClient();
    const res = await rpc<RawCheckinData>(client, 'fn_kiosk_guest_checkin', {
      p_code: clean,
      p_device_id: ctx.deviceId,
      p_scanned_at: new Date().toISOString(),
    });
    return mapEnvelope(res);
  } catch {
    return { kind: 'error', code: 'network_error' };
  }
}

/** 복구 시 큐 항목 1건 재전송 — 적재 당시 scanned_at/device_id로 소급 판정(오프라인 replay 정합) */
export async function resubmitPayload(item: {
  payload: QrPayload;
  scanned_at: number;
  device_id: string | null;
}): Promise<ScanOutcome> {
  return callRpc(item.payload, item.device_id, item.scanned_at);
}
