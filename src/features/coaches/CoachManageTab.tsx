'use client';

// 코치 관리 탭 (02-admin §3.7 manage)
// 목록(coaches) + 상태머신 배지 + 등록/편집 + 계정 연결·해제(promote/demote RPC) + 휴직 토글.
import { useMemo, useState } from 'react';
import {
  Button,
  Table,
  Badge,
  Select,
  ConfirmModal,
  Modal,
  useToast,
} from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useQuery } from '@/lib/data/useQuery';
import { query, rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { CoachRegisterModal } from './CoachRegisterModal';
import { CoachEditModal } from './CoachEditModal';
import {
  type CoachRow,
  type LinkableProfile,
  type CoachDisplayState,
  COACH_STATE_LABEL,
  COACH_STATE_BADGE,
  coachDisplayState,
  coachRpcError,
  krw,
} from './types';
import styles from './coaches.module.css';

type ViewFilter = 'all' | 'linked' | 'unlinked' | 'on_leave';

export function CoachManageTab() {
  const toast = useToast();
  const { can } = useMyPermissions();
  const canEdit = can('coaches', 'edit');
  const canApprove = can('coaches', 'approve');

  const [view, setView] = useState<ViewFilter>('all');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [editing, setEditing] = useState<CoachRow | null>(null);
  const [linking, setLinking] = useState<CoachRow | null>(null);
  const [linkUserId, setLinkUserId] = useState<string | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);
  const [unlinking, setUnlinking] = useState<CoachRow | null>(null);
  const [unlinkBusy, setUnlinkBusy] = useState(false);
  const [leaveTarget, setLeaveTarget] = useState<CoachRow | null>(null);
  const [leaveBusy, setLeaveBusy] = useState(false);

  const client = getSupabaseBrowserClient();

  const coaches = useQuery<CoachRow[]>(
    () =>
      query<CoachRow[]>(client, 'coaches', (q) =>
        q
          .select(
            'id,user_id,facility_id,name,email,phone,specialties,bio,base_salary,session_allowance,status,linked_at,created_at',
          )
          .order('created_at', { ascending: false }),
      ),
    [],
  );

  // 계정 연결 후보: 승인된 member 계정 (이미 코치인 계정 제외는 promote가 already_coach로 처리)
  const linkable = useQuery<LinkableProfile[]>(
    () =>
      query<LinkableProfile[]>(client, 'profiles', (q) =>
        q.select('id,email,name').eq('role', 'member').eq('approval_status', 'approved'),
      ),
    [],
  );

  const linkedUserIds = useMemo(
    () => new Set((coaches.data ?? []).map((c) => c.user_id).filter(Boolean) as string[]),
    [coaches.data],
  );
  const linkCandidates = useMemo(
    () => (linkable.data ?? []).filter((p) => !linkedUserIds.has(p.id)),
    [linkable.data, linkedUserIds],
  );

  const rows = useMemo(() => {
    const list = coaches.data ?? [];
    return list.filter((c) => {
      const st = coachDisplayState(c);
      switch (view) {
        case 'linked':
          return st === 'linked_active';
        case 'unlinked':
          return st === 'unlinked';
        case 'on_leave':
          return st === 'on_leave';
        default:
          return true;
      }
    });
  }, [coaches.data, view]);

  const reload = () => {
    coaches.refetch();
    linkable.refetch();
  };

  // ── 계정 연결: coaches.user_id 세팅 → promote_to_coach ──
  const doLink = async () => {
    if (!linking || !linkUserId) return;
    setLinkBusy(true);
    const upd = await query(client, 'coaches', (q) =>
      q
        .update({ user_id: linkUserId, linked_at: new Date().toISOString(), status: 'active' })
        .eq('id', linking.id),
    );
    if (!upd.success) {
      setLinkBusy(false);
      toast.error(upd.error ?? '계정 연결에 실패했습니다.');
      return;
    }
    const promo = await rpc(client, 'promote_to_coach', { p_target_user_id: linkUserId });
    setLinkBusy(false);
    if (!promo.success) {
      toast.error(coachRpcError(promo.error));
      reload();
      return;
    }
    toast.success('계정을 연결했습니다.');
    setLinking(null);
    setLinkUserId(null);
    reload();
  };

  // ── 계정 해제: demote_from_coach → coaches.user_id 해제 ──
  const doUnlink = async () => {
    if (!unlinking || !unlinking.user_id) return;
    setUnlinkBusy(true);
    const demo = await rpc(client, 'demote_from_coach', { p_target_user_id: unlinking.user_id });
    if (!demo.success) {
      setUnlinkBusy(false);
      toast.error(coachRpcError(demo.error));
      return;
    }
    const upd = await query(client, 'coaches', (q) =>
      q.update({ user_id: null, linked_at: null, status: 'inactive' }).eq('id', unlinking.id),
    );
    setUnlinkBusy(false);
    if (!upd.success) {
      toast.error(upd.error ?? '계정 해제 후 상태 갱신에 실패했습니다.');
      reload();
      return;
    }
    toast.success('계정 연결을 해제했습니다.');
    setUnlinking(null);
    reload();
  };

  // ── 휴직/복귀 토글 ──
  const doLeaveToggle = async () => {
    if (!leaveTarget) return;
    const nextStatus = leaveTarget.status === 'on_leave' ? 'active' : 'on_leave';
    setLeaveBusy(true);
    const res = await query(client, 'coaches', (q) =>
      q.update({ status: nextStatus }).eq('id', leaveTarget.id),
    );
    setLeaveBusy(false);
    if (!res.success) {
      toast.error(res.error ?? '상태 변경에 실패했습니다.');
      return;
    }
    toast.success(nextStatus === 'on_leave' ? '휴직 처리했습니다.' : '복귀 처리했습니다.');
    setLeaveTarget(null);
    reload();
  };

  const columns: TableColumn<CoachRow>[] = [
    {
      key: 'name',
      header: '코치',
      render: (c) => (
        <div className={styles.cellStack}>
          <span>{c.name}</span>
          <span className={styles.cellSub}>{c.phone ?? c.email ?? '연락처 없음'}</span>
        </div>
      ),
    },
    {
      key: 'specialties',
      header: '전문분야',
      render: (c) =>
        c.specialties && c.specialties.length > 0 ? (
          <span className={styles.cellSub}>{c.specialties.join(', ')}</span>
        ) : (
          <span className={styles.cellSub}>-</span>
        ),
    },
    {
      key: 'state',
      header: '상태',
      render: (c) => {
        const st: CoachDisplayState = coachDisplayState(c);
        return <Badge variant={COACH_STATE_BADGE[st]}>{COACH_STATE_LABEL[st]}</Badge>;
      },
    },
    {
      key: 'salary',
      header: '급여 (기본급/수당)',
      align: 'right',
      render: (c) => (
        <span className={styles.cellSub}>
          {krw(c.base_salary)} / {krw(c.session_allowance)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (c) => {
        const st = coachDisplayState(c);
        return (
          <div className={styles.rowActions}>
            {canEdit ? (
              <Button variant="ghost" size="sm" onClick={() => setEditing(c)}>
                편집
              </Button>
            ) : null}
            {canApprove && st === 'unlinked' ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLinkUserId(null);
                  setLinking(c);
                }}
              >
                계정 연결
              </Button>
            ) : null}
            {canApprove && c.user_id ? (
              <Button variant="ghost" size="sm" onClick={() => setUnlinking(c)}>
                연결 해제
              </Button>
            ) : null}
            {canEdit && c.user_id ? (
              <Button variant="ghost" size="sm" onClick={() => setLeaveTarget(c)}>
                {c.status === 'on_leave' ? '복귀' : '휴직'}
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <div className={styles.tabPanel}>
      <div className={styles.toolbar}>
        <div className={styles.filter}>
          <Select
            label="필터"
            value={view}
            onChange={(v) => setView(v as ViewFilter)}
            options={[
              { value: 'all', label: '전체' },
              { value: 'linked', label: '활동 중' },
              { value: 'unlinked', label: '미연결' },
              { value: 'on_leave', label: '휴직' },
            ]}
          />
        </div>
        <div className={styles.spacer} />
        {canEdit ? (
          <Button variant="primary" onClick={() => setRegisterOpen(true)}>
            코치 등록
          </Button>
        ) : null}
      </div>

      <Table<CoachRow>
        columns={columns}
        rows={rows}
        rowKey={(c) => c.id}
        loading={coaches.loading}
        empty={
          coaches.error
            ? {
                variant: 'error',
                title: '코치를 불러오지 못했습니다',
                description: coaches.error,
                onRetry: coaches.refetch,
              }
            : {
                title: '등록된 코치가 없습니다',
                description: '코치를 등록해 시작하세요.',
                action: canEdit ? { label: '코치 등록', onClick: () => setRegisterOpen(true) } : undefined,
              }
        }
      />

      {registerOpen ? (
        <CoachRegisterModal
          open
          linkable={linkCandidates}
          onClose={() => setRegisterOpen(false)}
          onSaved={() => {
            setRegisterOpen(false);
            reload();
          }}
        />
      ) : null}

      {editing ? (
        <CoachEditModal
          key={editing.id}
          open
          coach={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      ) : null}

      {/* 계정 연결 모달 */}
      <Modal
        open={linking != null}
        onClose={() => setLinking(null)}
        title="계정 연결"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setLinking(null)} disabled={linkBusy}>
              취소
            </Button>
            <Button variant="primary" onClick={doLink} loading={linkBusy} disabled={!linkUserId}>
              연결
            </Button>
          </>
        }
      >
        <div className={styles.form}>
          <p className={styles.note}>
            <strong>{linking?.name}</strong> 코치에 연결할 회원 계정을 선택하세요. 연결 시 해당 계정의
            권한이 코치로 전환됩니다.
          </p>
          <Select
            label="연결할 계정"
            value={linkUserId ?? ''}
            onChange={(v) => setLinkUserId(v || null)}
            searchable
            options={linkCandidates.map((p) => ({
              value: p.id,
              label: `${p.name ?? '이름 미상'} · ${p.email ?? '이메일 없음'}`,
            }))}
          />
        </div>
      </Modal>

      {/* 계정 해제 확인 */}
      <ConfirmModal
        open={unlinking != null}
        title="계정 연결 해제"
        variant="danger"
        confirmLabel="연결 해제"
        loading={unlinkBusy}
        message={
          <>
            <strong>{unlinking?.name}</strong> 코치의 계정 연결을 해제합니다. 진행 중인 세션 배정이
            있다면 확인하세요. 해당 계정의 권한이 일반 회원으로 되돌아갑니다.
          </>
        }
        onConfirm={doUnlink}
        onClose={() => setUnlinking(null)}
      />

      {/* 휴직/복귀 확인 */}
      <ConfirmModal
        open={leaveTarget != null}
        title={leaveTarget?.status === 'on_leave' ? '복귀 처리' : '휴직 처리'}
        variant="primary"
        confirmLabel={leaveTarget?.status === 'on_leave' ? '복귀' : '휴직'}
        loading={leaveBusy}
        message={
          <>
            <strong>{leaveTarget?.name}</strong> 코치를{' '}
            {leaveTarget?.status === 'on_leave' ? '활동 상태로 복귀' : '휴직 상태로 전환'}합니다.
          </>
        }
        onConfirm={doLeaveToggle}
        onClose={() => setLeaveTarget(null)}
      />
    </div>
  );
}
