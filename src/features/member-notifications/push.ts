// 웹푸시(PWA) 구독 헬퍼 — 서비스워커 등록 + PushManager 구독 + 서버 저장(docs/08 §2.4)
//   VAPID 공개키는 fn_get_public_integration(publishable)에서 로드. 구독은 fn_save_push_subscription 저장.
//   비밀키(개인키)는 서버 Vault 전용 — 클라이언트는 공개키만 다룬다.
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const SW_URL = '/sw.js';

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** VAPID base64url 공개키 → Uint8Array(applicationServerKey) */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

async function getOrRegister(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(SW_URL);
  if (existing) return existing;
  return navigator.serviceWorker.register(SW_URL);
}

/** 이 브라우저가 현재 푸시 구독 중인지 */
export async function currentPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration(SW_URL);
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  return Boolean(sub);
}

export interface PushResult {
  ok: boolean;
  error?: 'unsupported' | 'vapid_missing' | 'permission_denied' | 'subscription_invalid' | 'save_failed';
}

/** 이 기기에서 푸시 구독 시작(권한 요청 → 구독 → 서버 저장) */
export async function enablePush(): Promise<PushResult> {
  if (!isPushSupported()) return { ok: false, error: 'unsupported' };
  const client = getSupabaseBrowserClient();

  const pub = await rpc<{ vapid_public_key: string | null }>(client, 'fn_get_public_integration');
  const key = pub.data?.vapid_public_key;
  if (!key) return { ok: false, error: 'vapid_missing' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, error: 'permission_denied' };

  const reg = await getOrRegister();
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
    });
  }
  const jsonSub = sub.toJSON();
  const endpoint = jsonSub.endpoint ?? sub.endpoint;
  const p256dh = jsonSub.keys?.p256dh;
  const auth = jsonSub.keys?.auth;
  if (!endpoint || !p256dh || !auth) return { ok: false, error: 'subscription_invalid' };

  const saved = await rpc(client, 'fn_save_push_subscription', {
    p_endpoint: endpoint,
    p_p256dh: p256dh,
    p_auth: auth,
    p_device_type: 'web',
    p_user_agent: navigator.userAgent.slice(0, 300),
  });
  if (!saved.success) return { ok: false, error: 'save_failed' };
  return { ok: true };
}

/** 이 기기 푸시 구독 해지(브라우저 unsubscribe + 서버 비활성화) */
export async function disablePush(): Promise<void> {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration(SW_URL);
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe().catch(() => undefined);
  await rpc(getSupabaseBrowserClient(), 'fn_delete_push_subscription', { p_endpoint: endpoint });
}
