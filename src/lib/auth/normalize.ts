// AuthContext 액션 반환값 정규화 — 병렬 구현 중인 features/auth와의 결합 완충층.
// docs/01 §5.4: "signIn은 성공 시 { approvalStatus, role } 반환" — 표기 변형까지 흡수한다.
import type { RouteProfile } from './resolve-route';

interface LooseAuthResult {
  role?: RouteProfile['role'];
  approvalStatus?: RouteProfile['approval_status'];
  approval_status?: RouteProfile['approval_status'];
  profile?: RouteProfile | null;
  error?: string | null;
  session?: unknown;
}

export interface NormalizedAuthResult {
  profile: RouteProfile | null;
  error: string | null;
  /** signUp 응답에 세션 필드가 있고 비어 있으면 false (Confirm email 오적용 감지) */
  hasSession: boolean;
}

export function normalizeAuthResult(raw: unknown): NormalizedAuthResult {
  const r = (raw ?? null) as LooseAuthResult | null;
  if (!r) return { profile: null, error: null, hasSession: true };

  const error = typeof r.error === 'string' && r.error.length > 0 ? r.error : null;

  const role = r.role ?? r.profile?.role ?? null;
  const approval = r.approvalStatus ?? r.approval_status ?? r.profile?.approval_status ?? null;
  const profile = role && approval ? { role, approval_status: approval } : (r.profile ?? null);

  const hasSession = 'session' in r ? Boolean(r.session) : true;

  return { profile, error, hasSession };
}
