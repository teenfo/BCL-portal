'use client';

// 알림 수신 설정 (notification_preferences 본인 행 — docs/08 §2.5)
// 카테고리 on/off + 채널(push/kakao/sms) opt-in + 방해금지 시간대.
// RLS "notification_preferences own manage"(user_id = auth.uid()) 하에 query() upsert 로 저장.
// 유료 채널(kakao/sms)은 명시 동의 opt-in — 기본 false(§2.5). email 은 v1 예약(비활성 노출).
import { useEffect, useState } from 'react';
import { Card, Button, Checkbox, Input, Skeleton, EmptyState, useToast } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/features/auth';
import { isPushSupported, currentPushSubscribed, enablePush, disablePush } from './push';
import styles from './notifications.module.css';

const PUSH_ERROR_LABEL: Record<string, string> = {
  unsupported: '이 브라우저는 웹푸시를 지원하지 않습니다.',
  vapid_missing: '서버 푸시 설정이 아직 완료되지 않았습니다.',
  permission_denied: '알림 권한이 거부되었습니다. 브라우저 설정에서 허용해 주세요.',
  subscription_invalid: '구독 정보를 만들지 못했습니다. 다시 시도해 주세요.',
  save_failed: '구독 저장에 실패했습니다.',
};

interface Prefs {
  class_reminder: boolean;
  waitlist_vacancy: boolean;
  membership_expiry: boolean;
  promotion: boolean;
  checkin: boolean;
  system_notification: boolean;
  push_enabled: boolean;
  kakao_enabled: boolean;
  sms_enabled: boolean;
  email_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

const DEFAULTS: Prefs = {
  class_reminder: true,
  waitlist_vacancy: true,
  membership_expiry: true,
  promotion: true,
  checkin: true,
  system_notification: true,
  push_enabled: true,
  kakao_enabled: false,
  sms_enabled: false,
  email_enabled: false,
  quiet_hours_start: null,
  quiet_hours_end: null,
};

const CATEGORY_FIELDS: { key: keyof Prefs; label: string }[] = [
  { key: 'class_reminder', label: '수업 리마인더' },
  { key: 'waitlist_vacancy', label: '대기 자리 알림' },
  { key: 'membership_expiry', label: '멤버십 만료 알림' },
  { key: 'checkin', label: '체크인 알림' },
  { key: 'promotion', label: '프로모션·이벤트' },
  { key: 'system_notification', label: '시스템 공지' },
];

const SELECT_COLS =
  'class_reminder, waitlist_vacancy, membership_expiry, promotion, checkin, ' +
  'system_notification, push_enabled, kakao_enabled, sms_enabled, email_enabled, ' +
  'quiet_hours_start, quiet_hours_end';

// Postgres TIME("HH:MM:SS") → input[type=time]("HH:MM"), 빈값 → null
const toTimeInput = (v: string | null): string => (v ? v.slice(0, 5) : '');
const fromTimeInput = (v: string): string | null => (v.trim() ? v : null);

export function NotificationPreferences({ onSaved }: { onSaved?: () => void } = {}) {
  const toast = useToast();
  const { user } = useAuth();
  const [local, setLocal] = useState<Prefs | null>(null);
  const [busy, setBusy] = useState(false);

  // 이 기기 웹푸시 구독 상태 — 브라우저 구독이 소스. 켜기=구독+push_enabled true 즉시 반영.
  const [pushSupported] = useState(() => isPushSupported());
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  // 마운트 시 현재 구독 상태 감지(비동기 콜백에서만 setState — effect 본문 setState 금지 규약 준수)
  useEffect(() => {
    let alive = true;
    void currentPushSubscribed().then((s) => {
      if (alive) setPushSubscribed(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  const persistPushEnabled = async (value: boolean) => {
    if (!user) return;
    await query(getSupabaseBrowserClient(), 'notification_preferences', (q) =>
      q.upsert({ user_id: user.id, push_enabled: value }, { onConflict: 'user_id' }),
    );
  };

  const togglePush = async (checked: boolean) => {
    setPushBusy(true);
    if (checked) {
      const res = await enablePush();
      if (!res.ok) {
        toast.error(PUSH_ERROR_LABEL[res.error ?? ''] ?? '푸시 구독에 실패했습니다.');
        setPushBusy(false);
        return;
      }
      setPushSubscribed(true);
      setLocal((prev) => (prev ? { ...prev, push_enabled: true } : prev));
      await persistPushEnabled(true);
      toast.success('이 기기에서 푸시 알림을 받습니다.');
    } else {
      await disablePush();
      setPushSubscribed(false);
      setLocal((prev) => (prev ? { ...prev, push_enabled: false } : prev));
      await persistPushEnabled(false);
      toast.success('이 기기의 푸시 구독을 해지했습니다.');
    }
    setPushBusy(false);
  };

  const data = useQuery<Prefs>(
    () =>
      query<Prefs>(getSupabaseBrowserClient(), 'notification_preferences', (q) =>
        q.select(SELECT_COLS).maybeSingle(),
      ),
    [],
  );

  const prefs: Prefs = local ?? data.data ?? DEFAULTS;
  const set = <K extends keyof Prefs>(key: K, val: Prefs[K]) => setLocal({ ...prefs, [key]: val });

  const save = async () => {
    if (!user) return;
    setBusy(true);
    // push_enabled 는 위 "이 기기" 토글이 즉시 반영하므로 배치 저장에서 제외(브라우저 구독 상태가 소스)
    const batch: Partial<Prefs> = { ...prefs };
    delete batch.push_enabled;
    const res = await query(getSupabaseBrowserClient(), 'notification_preferences', (q) =>
      q.upsert(
        {
          user_id: user.id,
          ...batch,
          quiet_hours_start: prefs.quiet_hours_start,
          quiet_hours_end: prefs.quiet_hours_end,
        },
        { onConflict: 'user_id' },
      ),
    );
    setBusy(false);
    if (!res.success) {
      toast.error(res.error ?? '저장에 실패했습니다.');
      return;
    }
    toast.success('알림 설정이 저장되었습니다.');
    onSaved?.();
  };

  if (data.error) {
    return (
      <Card>
        <EmptyState variant="error" title="설정을 불러오지 못했습니다" description={data.error} onRetry={data.refetch} />
      </Card>
    );
  }
  if (data.loading && !data.data) {
    return <Skeleton variant="rect" height={320} />;
  }

  return (
    <>
      <Card>
        <div className={styles.prefGroup}>
          <span className={styles.prefGroupTitle}>알림 종류</span>
          {CATEGORY_FIELDS.map((f) => (
            <div key={f.key} className={styles.prefRow}>
              <Checkbox
                label={f.label}
                checked={prefs[f.key] as boolean}
                onChange={(e) => set(f.key, e.target.checked as never)}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className={styles.prefGroup}>
          <span className={styles.prefGroupTitle}>수신 채널</span>
          <span className={styles.prefGroupHint}>
            인앱 알림은 항상 수신됩니다. 카카오·SMS는 멤버십 만료 등 중요 알림에 한해 발송되는 유료 채널로, 동의 시에만 사용됩니다.
          </span>
          <div className={styles.prefRow}>
            <Checkbox
              label="푸시 알림 (이 기기)"
              checked={pushSubscribed}
              disabled={!pushSupported || pushBusy}
              onChange={(e) => togglePush(e.target.checked)}
            />
          </div>
          {!pushSupported ? (
            <span className={styles.prefGroupHint}>이 브라우저는 웹푸시를 지원하지 않습니다.</span>
          ) : pushSubscribed ? (
            <span className={styles.prefGroupHint}>이 기기에서 푸시 알림을 받는 중입니다.</span>
          ) : (
            <span className={styles.prefGroupHint}>켜면 알림 권한을 요청하고 이 기기를 구독합니다.</span>
          )}
          <div className={styles.prefRow}>
            <Checkbox
              label="카카오 알림톡 (동의)"
              checked={prefs.kakao_enabled}
              onChange={(e) => set('kakao_enabled', e.target.checked)}
            />
          </div>
          <div className={styles.prefRow}>
            <Checkbox
              label="SMS 문자 (동의)"
              checked={prefs.sms_enabled}
              onChange={(e) => set('sms_enabled', e.target.checked)}
            />
          </div>
          <div className={styles.prefRow}>
            <Checkbox label="이메일 (준비 중)" checked={false} disabled />
          </div>
        </div>
      </Card>

      <Card>
        <div className={styles.prefGroup}>
          <span className={styles.prefGroupTitle}>방해 금지 시간대</span>
          <span className={styles.prefGroupHint}>
            설정한 시간대에는 푸시·외부 채널 발송을 보류합니다(인앱 기록은 유지, 긴급 알림은 예외).
          </span>
          <div className={styles.prefTimes}>
            <Input
              label="시작"
              type="time"
              value={toTimeInput(prefs.quiet_hours_start)}
              onChange={(e) => set('quiet_hours_start', fromTimeInput(e.target.value))}
            />
            <Input
              label="종료"
              type="time"
              value={toTimeInput(prefs.quiet_hours_end)}
              onChange={(e) => set('quiet_hours_end', fromTimeInput(e.target.value))}
            />
          </div>
        </div>
      </Card>

      <Button variant="primary" block loading={busy} onClick={save}>
        저장
      </Button>
    </>
  );
}
