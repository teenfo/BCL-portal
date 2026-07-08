'use client';

// 설정 · 시스템 탭 (02-admin §3.14 system)
// PG 연동 상태(pg_settings — 키 마스킹, payment_mode 전환) + 키오스크 기기(kiosk_devices) + 고정 QR(qr_codes).
// payment_mode live 전환 = 최고 위험: "LIVE" 타이핑 2단계 confirm + 서버 전용 RPC(fn_set_payment_mode,
//   is_admin 게이트 + 값 검증 + audit_logs). 키오스크/QR 쓰기는 admin RLS 직접(트리거로 자동 audit).
import { useState } from 'react';
import {
  Card,
  Button,
  Table,
  Badge,
  Input,
  Select,
  Modal,
  ConfirmModal,
  useToast,
} from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useQuery } from '@/lib/data/useQuery';
import { query, rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { type PgSettings, type KioskDevice, type QrCode, fmtDateTime } from './types';
import styles from './settings.module.css';

const HEARTBEAT_OFFLINE_MS = 60_000;

function kioskEffectiveStatus(d: KioskDevice): { label: string; variant: 'success' | 'warning' | 'neutral' } {
  if (d.status === 'maintenance') return { label: '점검', variant: 'neutral' };
  const hb = d.last_heartbeat ? new Date(d.last_heartbeat).getTime() : 0;
  if (!hb || Date.now() - hb > HEARTBEAT_OFFLINE_MS) return { label: '오프라인', variant: 'warning' };
  return { label: '온라인', variant: 'success' };
}

export function SystemTab() {
  const toast = useToast();
  const { can } = useMyPermissions();
  const canEdit = can('settings', 'edit');
  const client = getSupabaseBrowserClient();

  const pg = useQuery<PgSettings>(
    () =>
      query<PgSettings>(client, 'pg_settings', (q) =>
        q
          .select(
            'id,facility_id,provider,test_client_key,test_secret_key_encrypted,live_client_key,live_secret_key_encrypted,webhook_secret_encrypted,payment_mode,is_active',
          )
          .order('created_at', { ascending: true })
          .limit(1)
          .single(),
      ),
    [],
  );

  const kiosks = useQuery<KioskDevice[]>(
    () =>
      query<KioskDevice[]>(client, 'kiosk_devices', (q) =>
        q
          .select('id,facility_id,device_name,device_ip,status,display_message,last_heartbeat')
          .order('device_name', { ascending: true }),
      ),
    [],
  );

  const qrs = useQuery<QrCode[]>(
    () =>
      query<QrCode[]>(client, 'qr_codes', (q) =>
        q.select('id,facility_id,code,qr_type,expires_at,is_active,created_at').order('created_at', { ascending: false }),
      ),
    [],
  );

  // payment_mode 전환
  const [modeTarget, setModeTarget] = useState<'simulation' | 'live' | null>(null);
  const [modeBusy, setModeBusy] = useState(false);

  const doSetMode = async () => {
    if (!pg.data || !modeTarget) return;
    setModeBusy(true);
    const res = await rpc(client, 'fn_set_payment_mode', { p_mode: modeTarget });
    setModeBusy(false);
    if (!res.success) {
      toast.error(res.error ?? '결제 모드 전환에 실패했습니다.');
      return;
    }
    toast.success(modeTarget === 'live' ? 'LIVE 모드로 전환했습니다.' : '시뮬레이션 모드로 전환했습니다.');
    setModeTarget(null);
    pg.refetch();
  };

  // 키오스크
  const [kioskModal, setKioskModal] = useState<KioskDevice | 'new' | null>(null);
  const [deletingKiosk, setDeletingKiosk] = useState<KioskDevice | null>(null);
  const [kioskBusy, setKioskBusy] = useState(false);

  const deleteKiosk = async () => {
    if (!deletingKiosk) return;
    setKioskBusy(true);
    const res = await query(client, 'kiosk_devices', (q) => q.delete().eq('id', deletingKiosk.id));
    setKioskBusy(false);
    if (!res.success) {
      toast.error(res.error ?? '기기 삭제에 실패했습니다.');
      return;
    }
    toast.success('키오스크 기기를 삭제했습니다.');
    setDeletingKiosk(null);
    kiosks.refetch();
  };

  // QR 무효화
  const [deactivatingQr, setDeactivatingQr] = useState<QrCode | null>(null);
  const [qrBusy, setQrBusy] = useState(false);
  const deactivateQr = async () => {
    if (!deactivatingQr) return;
    setQrBusy(true);
    const res = await query(client, 'qr_codes', (q) =>
      q.update({ is_active: false }).eq('id', deactivatingQr.id),
    );
    setQrBusy(false);
    if (!res.success) {
      toast.error(res.error ?? 'QR 무효화에 실패했습니다.');
      return;
    }
    toast.success('QR을 무효화했습니다.');
    setDeactivatingQr(null);
    qrs.refetch();
  };

  const pgData = pg.data;
  const keyPresence = (v: string | null | undefined) => (v ? '설정됨 ••••' : '미설정');

  const kioskColumns: TableColumn<KioskDevice>[] = [
    {
      key: 'name',
      header: '기기',
      render: (d) => (
        <div className={styles.cellStack}>
          <span>{d.device_name}</span>
          <span className={styles.cellSub}>{d.device_ip ?? 'IP 미상'}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: '상태',
      render: (d) => {
        const s = kioskEffectiveStatus(d);
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    { key: 'heartbeat', header: '최근 heartbeat', render: (d) => <span className={styles.cellSub}>{fmtDateTime(d.last_heartbeat)}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (d) =>
        canEdit ? (
          <div className={styles.rowActions}>
            <Button variant="ghost" size="sm" onClick={() => setKioskModal(d)}>
              편집
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDeletingKiosk(d)}>
              삭제
            </Button>
          </div>
        ) : null,
    },
  ];

  const qrColumns: TableColumn<QrCode>[] = [
    { key: 'type', header: '유형', render: (q) => <Badge variant="neutral">{q.qr_type}</Badge> },
    { key: 'code', header: '코드', render: (q) => <span className={styles.cellSub}>{q.code}</span> },
    { key: 'active', header: '상태', render: (q) => (q.is_active ? <Badge variant="success">활성</Badge> : <Badge variant="neutral">무효</Badge>) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (q) =>
        canEdit && q.is_active ? (
          <Button variant="ghost" size="sm" onClick={() => setDeactivatingQr(q)}>
            무효화
          </Button>
        ) : null,
    },
  ];

  return (
    <div className={styles.tabPanel}>
      {/* PG 연동 */}
      <Card title="PG 연동 (Toss)">
        {pg.loading ? (
          <p className={styles.note}>불러오는 중…</p>
        ) : pg.error || !pgData ? (
          <p className={styles.note}>
            PG 설정이 없습니다. 결제 키는 서버 전용 RPC(save_pg_settings)로만 저장되며, 이 화면에서는
            상태만 표시합니다.
          </p>
        ) : (
          <div className={styles.form}>
            <div className={styles.badgeRow}>
              <span className={styles.note}>결제 모드</span>
              {pgData.payment_mode === 'live' ? (
                <Badge variant="danger">LIVE</Badge>
              ) : (
                <Badge variant="warning">시뮬레이션</Badge>
              )}
            </div>
            <p className={styles.note}>
              테스트 시크릿: {keyPresence(pgData.test_secret_key_encrypted)} · 라이브 시크릿:{' '}
              {keyPresence(pgData.live_secret_key_encrypted)} · 웹훅 시크릿:{' '}
              {keyPresence(pgData.webhook_secret_encrypted)} (키 값은 마스킹 — 편집은 서버 전용
              save_pg_settings RPC)
            </p>
            {canEdit ? (
              <div className={styles.formActions}>
                {pgData.payment_mode === 'live' ? (
                  <Button variant="soft" onClick={() => setModeTarget('simulation')}>
                    시뮬레이션으로 전환
                  </Button>
                ) : (
                  <Button variant="danger" onClick={() => setModeTarget('live')}>
                    LIVE로 전환
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        )}
      </Card>

      {/* 키오스크 기기 */}
      <Card
        title="키오스크 기기"
        action={
          canEdit ? (
            <Button variant="soft" size="sm" onClick={() => setKioskModal('new')}>
              기기 등록
            </Button>
          ) : undefined
        }
      >
        <Table<KioskDevice>
          columns={kioskColumns}
          rows={kiosks.data ?? []}
          rowKey={(d) => d.id}
          loading={kiosks.loading}
          empty={
            kiosks.error
              ? { variant: 'error', title: '기기를 불러오지 못했습니다', description: kiosks.error, onRetry: kiosks.refetch }
              : { title: '등록된 키오스크가 없습니다', description: '기기를 등록해 체크인 단말을 관리하세요.' }
          }
        />
      </Card>

      {/* 고정 QR */}
      <Card title="고정 QR">
        <Table<QrCode>
          columns={qrColumns}
          rows={qrs.data ?? []}
          rowKey={(q) => q.id}
          loading={qrs.loading}
          empty={
            qrs.error
              ? { variant: 'error', title: 'QR을 불러오지 못했습니다', description: qrs.error, onRetry: qrs.refetch }
              : { title: '발급된 고정 QR이 없습니다', description: '시설/세션 QR을 발급해 관리하세요.' }
          }
        />
      </Card>

      {/* payment_mode 전환 confirm */}
      <ConfirmModal
        open={modeTarget != null}
        title={modeTarget === 'live' ? 'LIVE 결제 전환 (최고 위험)' : '시뮬레이션 전환'}
        variant={modeTarget === 'live' ? 'danger' : 'primary'}
        confirmLabel={modeTarget === 'live' ? 'LIVE 전환' : '전환'}
        requireTyping={modeTarget === 'live' ? 'LIVE' : undefined}
        loading={modeBusy}
        message={
          modeTarget === 'live' ? (
            <>
              실제 결제가 발생하는 LIVE 모드로 전환합니다. 서버 env가 simulation이면 실제 승인은
              차단됩니다(이중장치). 계속하려면 {'"LIVE"'}를 입력하세요.
            </>
          ) : (
            <>실결제를 중단하고 시뮬레이션 모드로 전환합니다.</>
          )
        }
        onConfirm={doSetMode}
        onClose={() => setModeTarget(null)}
      />

      {kioskModal ? (
        <KioskModal
          device={kioskModal === 'new' ? null : kioskModal}
          facilityId={pgData?.facility_id ?? null}
          onClose={() => setKioskModal(null)}
          onSaved={() => {
            setKioskModal(null);
            kiosks.refetch();
          }}
        />
      ) : null}

      <ConfirmModal
        open={deletingKiosk != null}
        title="키오스크 기기 삭제"
        variant="danger"
        confirmLabel="삭제"
        loading={kioskBusy}
        message={<><strong>{deletingKiosk?.device_name}</strong> 기기를 삭제합니다.</>}
        onConfirm={deleteKiosk}
        onClose={() => setDeletingKiosk(null)}
      />

      <ConfirmModal
        open={deactivatingQr != null}
        title="QR 무효화"
        variant="danger"
        confirmLabel="무효화"
        loading={qrBusy}
        message="이 QR을 즉시 무효화합니다. 기존 QR은 더 이상 사용할 수 없습니다."
        onConfirm={deactivateQr}
        onClose={() => setDeactivatingQr(null)}
      />
    </div>
  );
}

function KioskModal({
  device,
  facilityId,
  onClose,
  onSaved,
}: {
  device: KioskDevice | null;
  facilityId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(device?.device_name ?? '');
  const [ip, setIp] = useState(device?.device_ip ?? '');
  const [status, setStatus] = useState<KioskDevice['status']>(device?.status ?? 'active');
  const [message, setMessage] = useState(device?.display_message ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim()) {
      setError('기기 이름을 입력하세요.');
      return;
    }
    setSaving(true);
    setError(null);
    const client = getSupabaseBrowserClient();
    const payload = {
      device_name: name.trim(),
      device_ip: ip.trim() || null,
      status,
      display_message: message.trim() || null,
    };
    const res = device
      ? await query(client, 'kiosk_devices', (q) => q.update(payload).eq('id', device.id))
      : await query(client, 'kiosk_devices', (q) =>
          q.insert({ ...payload, facility_id: facilityId }),
        );
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? '저장에 실패했습니다.');
      return;
    }
    toast.success(device ? '기기를 수정했습니다.' : '기기를 등록했습니다.');
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={device ? '키오스크 편집' : '키오스크 등록'}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button variant="primary" onClick={save} loading={saving}>
            저장
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        {error ? <span className={styles.errorText}>{error}</span> : null}
        <Input label="기기 이름" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="IP (선택)" value={ip} onChange={(e) => setIp(e.target.value)} />
        <Select
          label="상태"
          value={status}
          onChange={(v) => setStatus(v as KioskDevice['status'])}
          options={[
            { value: 'active', label: '활성' },
            { value: 'maintenance', label: '점검' },
            { value: 'offline', label: '오프라인' },
          ]}
        />
        <Input
          label="표시 메시지 (선택)"
          multiline
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
    </Modal>
  );
}
