'use client';

// profile §알림 설정 — notification_preferences 본인 행 (RLS "own manage"). 없으면 기본값 upsert.
import { useState } from 'react';
import { Button, Checkbox, EmptyState, Skeleton, useToast } from '@/components/ui';
import { BottomSheet } from '@/features/member-shell';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/features/auth';
import styles from '../profile.module.css';

interface Prefs {
  class_reminder: boolean;
  waitlist_vacancy: boolean;
  membership_expiry: boolean;
  promotion: boolean;
  checkin: boolean;
  system_notification: boolean;
  push_enabled: boolean;
}

const FIELDS: { key: keyof Prefs; label: string }[] = [
  { key: 'class_reminder', label: '수업 리마인더' },
  { key: 'waitlist_vacancy', label: '대기 자리 알림' },
  { key: 'membership_expiry', label: '멤버십 만료 알림' },
  { key: 'checkin', label: '체크인 알림' },
  { key: 'promotion', label: '프로모션·이벤트' },
  { key: 'system_notification', label: '시스템 공지' },
  { key: 'push_enabled', label: '푸시 알림 (PWA)' },
];

const DEFAULTS: Prefs = {
  class_reminder: true,
  waitlist_vacancy: true,
  membership_expiry: true,
  promotion: true,
  checkin: true,
  system_notification: true,
  push_enabled: true,
};

export function NotificationPrefSheet({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const { user } = useAuth();
  const [local, setLocal] = useState<Prefs | null>(null);
  const [busy, setBusy] = useState(false);

  const data = useQuery<Prefs>(
    () =>
      query<Prefs>(getSupabaseBrowserClient(), 'notification_preferences', (q) =>
        q
          .select('class_reminder, waitlist_vacancy, membership_expiry, promotion, checkin, system_notification, push_enabled')
          .maybeSingle(),
      ),
    [],
  );

  const prefs = local ?? data.data ?? DEFAULTS;
  const set = (key: keyof Prefs, val: boolean) => setLocal({ ...prefs, [key]: val });

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const res = await query(getSupabaseBrowserClient(), 'notification_preferences', (q) =>
      q.upsert({ user_id: user.id, ...prefs }, { onConflict: 'user_id' }),
    );
    setBusy(false);
    if (!res.success) {
      toast.error(res.error ?? '저장에 실패했습니다.');
      return;
    }
    toast.success('알림 설정이 저장되었습니다.');
    onClose();
  };

  return (
    <BottomSheet
      variant="auto"
      title="알림 설정"
      onClose={onClose}
      footer={
        <Button variant="primary" block loading={busy} onClick={save}>
          저장
        </Button>
      }
    >
      {data.error ? (
        <EmptyState variant="error" title="설정을 불러오지 못했습니다" description={data.error} onRetry={data.refetch} />
      ) : data.loading && !data.data ? (
        <Skeleton variant="rect" height={200} />
      ) : (
        FIELDS.map((f) => (
          <div key={f.key} className={styles.toggleRow}>
            <Checkbox label={f.label} checked={prefs[f.key]} onChange={(e) => set(f.key, e.target.checked)} />
          </div>
        ))
      )}
    </BottomSheet>
  );
}
