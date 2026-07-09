'use client';

// 설정 · 연동 탭 (02-admin §3.14 integrations) — 결제(Toss)·메시징(SMS/카카오) provider 키 입력.
// 보안: 비밀키(secret)는 서버 Vault 전용 — 이 화면은 "쓰기 전용" 입력만, 값은 되읽지 않는다(상태=설정됨/미설정).
//   저장은 fn_admin_set_integration(is_admin 게이트 + Vault upsert). publishable(client key·발신번호 등)만 표시.
//   결제 모드(live/simulation) 전환은 시스템 탭(fn_set_payment_mode) — 여기서는 상태만 안내.
import { useState } from 'react';
import { Card, Button, Input, Badge, Skeleton, EmptyState, useToast } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useAuth } from '@/features/auth';
import { useQuery } from '@/lib/data/useQuery';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { enablePush, isPushSupported } from '@/features/member-notifications/push';
import styles from './settings.module.css';

interface StatusData {
  config: Record<string, string | null>;
  secrets: Record<string, boolean>;
  payment_mode: string | null;
}

const SECRET_KEYS = [
  'toss_test_secret_key',
  'toss_live_secret_key',
  'toss_webhook_secret',
  'msg_api_key',
  'msg_api_secret',
] as const;

export function IntegrationsTab() {
  const toast = useToast();
  const { can } = useMyPermissions();
  const { user } = useAuth();
  const canEdit = can('settings', 'edit');
  const client = getSupabaseBrowserClient();

  const status = useQuery<StatusData>(() => rpc<StatusData>(client, 'fn_admin_get_integration_status'), []);

  const [cfg, setCfg] = useState<Record<string, string>>({});
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const statusConfig = status.data?.config ?? {};
  const statusSecrets = status.data?.secrets ?? {};

  const cval = (key: string): string => cfg[key] ?? (statusConfig[key] ?? '');
  const setC = (key: string, v: string) => setCfg((p) => ({ ...p, [key]: v }));
  const setS = (key: string, v: string) => setSecrets((p) => ({ ...p, [key]: v }));

  const secretPlaceholder = (key: string): string =>
    statusSecrets[key] ? '설정됨 •••• (변경 시에만 입력)' : '미설정 — 키 입력';

  const save = async () => {
    if (!canEdit) return;
    setSaving(true);
    const p_config: Record<string, string> = {
      payment_provider: 'toss',
      toss_test_client_key: cval('toss_test_client_key'),
      toss_live_client_key: cval('toss_live_client_key'),
      msg_provider: cval('msg_provider') || 'solapi',
      sms_sender: cval('sms_sender'),
      kakao_pf_id: cval('kakao_pf_id'),
      kakao_template_default: cval('kakao_template_default'),
    };
    const p_secrets: Record<string, string> = {};
    for (const k of SECRET_KEYS) {
      const v = secrets[k]?.trim();
      if (v) p_secrets[k] = v;
    }
    const res = await rpc(client, 'fn_admin_set_integration', { p_config, p_secrets });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error ?? '저장에 실패했습니다.');
      return;
    }
    toast.success('연동 설정을 저장했습니다.');
    setSecrets({});
    status.refetch();
  };

  const testPush = async () => {
    if (!user) return;
    setTesting(true);
    const sub = await enablePush();
    if (!sub.ok) {
      setTesting(false);
      toast.error('이 브라우저 푸시 구독에 실패했습니다. 알림 권한을 확인하세요.');
      return;
    }
    const { data, error } = await client.functions.invoke('send-notification', {
      body: {
        userId: user.id,
        title: 'BCL 테스트 알림',
        content: '웹푸시 연동이 정상 동작합니다.',
        category: 'system',
        type: 'info',
        channels: ['in_app', 'push'],
      },
    });
    setTesting(false);
    const ok = (data as { success?: boolean } | null)?.success;
    if (error || !ok) {
      toast.error('테스트 발송에 실패했습니다.');
      return;
    }
    toast.success('테스트 알림을 보냈습니다. 잠시 후 알림을 확인하세요.');
  };

  if (status.loading && !status.data) {
    return <Skeleton variant="rect" height={420} />;
  }
  if (status.error) {
    return (
      <Card>
        <EmptyState variant="error" title="연동 상태를 불러오지 못했습니다" description={status.error} onRetry={status.refetch} />
      </Card>
    );
  }

  const mode = status.data?.payment_mode ?? 'simulation';

  return (
    <div className={styles.tabPanel}>
      {/* 결제 (Toss) */}
      <Card title="결제 연동 (Toss Payments)">
        <div className={styles.form}>
          <div className={styles.badgeRow}>
            <span className={styles.note}>현재 결제 모드</span>
            {mode === 'live' ? <Badge variant="danger">LIVE</Badge> : <Badge variant="warning">시뮬레이션</Badge>}
          </div>
          <p className={styles.note}>
            LIVE 전환은 시스템 탭에서, 서버 env(PAYMENT_ENV=prod)와 라이브 키가 모두 갖춰졌을 때만 실제 결제가
            발생합니다(이중장치). 비밀키는 저장 후 표시되지 않습니다.
          </p>

          <Input
            label="테스트 클라이언트 키 (publishable)"
            value={cval('toss_test_client_key')}
            placeholder="test_ck_..."
            disabled={!canEdit}
            onChange={(e) => setC('toss_test_client_key', e.target.value)}
          />
          <Input
            label={`테스트 시크릿 키 ${statusSecrets['toss_test_secret_key'] ? '(설정됨)' : ''}`}
            value={secrets['toss_test_secret_key'] ?? ''}
            placeholder={secretPlaceholder('toss_test_secret_key')}
            disabled={!canEdit}
            onChange={(e) => setS('toss_test_secret_key', e.target.value)}
          />
          <Input
            label="라이브 클라이언트 키 (publishable)"
            value={cval('toss_live_client_key')}
            placeholder="live_ck_..."
            disabled={!canEdit}
            onChange={(e) => setC('toss_live_client_key', e.target.value)}
          />
          <Input
            label={`라이브 시크릿 키 ${statusSecrets['toss_live_secret_key'] ? '(설정됨)' : ''}`}
            value={secrets['toss_live_secret_key'] ?? ''}
            placeholder={secretPlaceholder('toss_live_secret_key')}
            disabled={!canEdit}
            onChange={(e) => setS('toss_live_secret_key', e.target.value)}
          />
          <Input
            label={`웹훅 시크릿 ${statusSecrets['toss_webhook_secret'] ? '(설정됨)' : ''}`}
            value={secrets['toss_webhook_secret'] ?? ''}
            placeholder={secretPlaceholder('toss_webhook_secret')}
            disabled={!canEdit}
            onChange={(e) => setS('toss_webhook_secret', e.target.value)}
          />
        </div>
      </Card>

      {/* 메시징 (SMS·카카오 알림톡) */}
      <Card title="알림 메시징 (SMS · 카카오 알림톡)">
        <div className={styles.form}>
          <p className={styles.note}>
            제공자: <strong>Solapi</strong> (솔라피 — SMS/LMS + 카카오 알림톡 통합). API Key/Secret은 서버 전용으로
            저장됩니다. 알림톡은 발신프로필(pfId)과 승인 템플릿이 있을 때 사용되고, 없으면 SMS로 발송됩니다.
          </p>
          <Input
            label={`Solapi API Key ${statusSecrets['msg_api_key'] ? '(설정됨)' : ''}`}
            value={secrets['msg_api_key'] ?? ''}
            placeholder={secretPlaceholder('msg_api_key')}
            disabled={!canEdit}
            onChange={(e) => setS('msg_api_key', e.target.value)}
          />
          <Input
            label={`Solapi API Secret ${statusSecrets['msg_api_secret'] ? '(설정됨)' : ''}`}
            value={secrets['msg_api_secret'] ?? ''}
            placeholder={secretPlaceholder('msg_api_secret')}
            disabled={!canEdit}
            onChange={(e) => setS('msg_api_secret', e.target.value)}
          />
          <Input
            label="SMS 발신번호 (사전 등록된 번호)"
            value={cval('sms_sender')}
            placeholder="01012345678"
            disabled={!canEdit}
            onChange={(e) => setC('sms_sender', e.target.value)}
          />
          <Input
            label="카카오 발신프로필 pfId (선택)"
            value={cval('kakao_pf_id')}
            placeholder="KA01PF..."
            disabled={!canEdit}
            onChange={(e) => setC('kakao_pf_id', e.target.value)}
          />
          <Input
            label="기본 알림톡 템플릿 ID (선택)"
            value={cval('kakao_template_default')}
            placeholder="템플릿 코드"
            disabled={!canEdit}
            onChange={(e) => setC('kakao_template_default', e.target.value)}
          />
        </div>
      </Card>

      {canEdit ? (
        <div className={styles.formActions}>
          <Button variant="primary" onClick={save} loading={saving}>
            연동 설정 저장
          </Button>
        </div>
      ) : (
        <p className={styles.note}>편집 권한이 없어 상태만 표시됩니다.</p>
      )}

      {/* 웹푸시 자체 테스트 */}
      <Card title="웹푸시 테스트">
        <div className={styles.form}>
          <p className={styles.note}>
            이 브라우저를 구독하고 본인에게 테스트 알림(인앱 + 푸시)을 보냅니다. VAPID 키는 서버에 이미 구성되어
            있습니다.
          </p>
          <div className={styles.formActions}>
            <Button variant="soft" onClick={testPush} loading={testing} disabled={!isPushSupported()}>
              이 브라우저로 테스트 알림 보내기
            </Button>
          </div>
          {!isPushSupported() ? (
            <span className={styles.note}>이 브라우저는 웹푸시를 지원하지 않습니다.</span>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
