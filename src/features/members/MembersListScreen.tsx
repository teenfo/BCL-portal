'use client';

// /admin/members — 회원 목록 (02-admin §3.2 A)
// 통합검색(이름/전화/이메일, 300ms 디바운스) + 필터 뷰(전체/활성/만기임박/홀딩중/블랙리스트)
// 회원 등록(계정 미연결 허용) · 행 클릭→상세 · 가입 승인 대기(profiles.approval_status) 처리
// ⏳ 웨이버 서명 배지·미서명 필터: member_agreements(health_waiver) 조회 — 미서명 승인 시 경고 confirm
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  Button,
  Table,
  Badge,
  Select,
  Input,
  ConfirmModal,
  Modal,
  useToast,
} from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useQuery } from '@/lib/data/useQuery';
import { query, rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { MemberRegisterModal } from './MemberRegisterModal';
import {
  type MemberRow,
  type PendingProfile,
  MEMBER_STATUS_LABEL,
  MEMBERSHIP_STATUS_LABEL,
  daysUntil,
  primaryMembership,
  rpcError,
} from './types';
import styles from './members.module.css';

type ViewFilter = 'all' | 'active' | 'expiring' | 'paused' | 'blacklist';

const VIEW_OPTIONS: { value: ViewFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'active', label: '활성' },
  { value: 'expiring', label: '만기 임박' },
  { value: 'paused', label: '홀딩중' },
  { value: 'blacklist', label: '블랙리스트' },
];

const PAGE_SIZE = 20;

export function MembersListScreen() {
  const router = useRouter();
  const toast = useToast();
  const { can } = useMyPermissions();
  const canCreate = can('members', 'create');
  const canApprove = can('members', 'edit');

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [view, setView] = useState<ViewFilter>('all');
  const [page, setPage] = useState(1);
  const [registerOpen, setRegisterOpen] = useState(false);

  // 승인/거부/웨이버 확인 상태
  const [approving, setApproving] = useState<PendingProfile | null>(null);
  const [approveBusy, setApproveBusy] = useState(false);
  const [rejecting, setRejecting] = useState<PendingProfile | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectBusy, setRejectBusy] = useState(false);

  // 검색 디바운스 300ms
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const client = getSupabaseBrowserClient();

  const members = useQuery<MemberRow[]>(
    () =>
      query<MemberRow[]>(client, 'members', (q) => {
        const base = q
          .select(
            'id,user_id,name,email,phone,status,is_blacklisted,created_at,' +
              'memberships(id,status,start_date,end_date,remaining_credits,plan_id)',
          )
          .order('created_at', { ascending: false })
          .limit(300);
        if (debounced) {
          const esc = debounced.replace(/[%,()]/g, ' ');
          return base.or(`name.ilike.%${esc}%,phone.ilike.%${esc}%,email.ilike.%${esc}%`);
        }
        return base;
      }),
    [debounced],
  );

  // 가입 승인 대기 (profiles.approval_status='pending')
  const pending = useQuery<PendingProfile[]>(
    () =>
      query<PendingProfile[]>(client, 'profiles', (q) =>
        q.select('id,email,name').eq('approval_status', 'pending'),
      ),
    [],
  );

  // 웨이버 서명 현황 (health_waiver 서명자 member_id 집합)
  const waivers = useQuery<{ member_id: string }[]>(
    () =>
      query<{ member_id: string }[]>(client, 'member_agreements', (q) =>
        q.select('member_id').eq('doc_type', 'health_waiver'),
      ),
    [],
  );

  const pendingUserIds = useMemo(
    () => new Set((pending.data ?? []).map((p) => p.id)),
    [pending.data],
  );
  const waiverSignedMemberIds = useMemo(
    () => new Set((waivers.data ?? []).map((w) => w.member_id)),
    [waivers.data],
  );

  // 필터 뷰 적용
  const filtered = useMemo(() => {
    const list = members.data ?? [];
    return list.filter((m) => {
      const pm = primaryMembership(m.memberships);
      switch (view) {
        case 'active':
          return pm?.status === 'active';
        case 'expiring': {
          if (pm?.status !== 'active') return false;
          const d = daysUntil(pm.end_date);
          return d != null && d >= 0 && d <= 7;
        }
        case 'paused':
          return m.memberships.some((x) => x.status === 'paused');
        case 'blacklist':
          return m.is_blacklisted;
        default:
          return true;
      }
    });
  }, [members.data, view]);

  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  const reload = () => {
    members.refetch();
    pending.refetch();
    waivers.refetch();
  };

  // ── 승인 처리 ──
  const doApprove = async (p: PendingProfile) => {
    setApproveBusy(true);
    const res = await rpc(client, 'fn_admin_review_signup', {
      p_user_id: p.id,
      p_decision: 'approved',
    });
    setApproveBusy(false);
    if (!res.success) {
      toast.error(rpcError(res.error));
      return;
    }
    toast.success(`${p.name ?? p.email ?? '회원'} 가입을 승인했습니다.`);
    setApproving(null);
    reload();
  };

  const onApproveClick = (p: PendingProfile) => {
    // 미서명 회원(연결된 members 기준) 승인 시 경고 confirm
    const memberForUser = (members.data ?? []).find((m) => m.user_id === p.id);
    const signed = memberForUser ? waiverSignedMemberIds.has(memberForUser.id) : false;
    if (!signed) {
      setApproving(p); // 경고 confirm 노출
      return;
    }
    void doApprove(p);
  };

  const doReject = async () => {
    if (!rejecting) return;
    if (!rejectReason.trim()) return;
    setRejectBusy(true);
    const res = await rpc(client, 'fn_admin_review_signup', {
      p_user_id: rejecting.id,
      p_decision: 'rejected',
      p_reason: rejectReason.trim(),
    });
    setRejectBusy(false);
    if (!res.success) {
      toast.error(rpcError(res.error));
      return;
    }
    toast.success('가입을 거부했습니다.');
    setRejecting(null);
    setRejectReason('');
    reload();
  };

  const columns: TableColumn<MemberRow>[] = [
    {
      key: 'name',
      header: '회원',
      render: (m) => (
        <div className={styles.cellStack}>
          <span>{m.name}</span>
          <span className={styles.cellSub}>{m.phone ?? m.email ?? '연락처 없음'}</span>
        </div>
      ),
    },
    {
      key: 'membership',
      header: '멤버십',
      render: (m) => {
        const pm = primaryMembership(m.memberships);
        if (!pm) return <span className={styles.cellSub}>없음</span>;
        const d = daysUntil(pm.end_date);
        const variant =
          pm.status === 'active'
            ? d != null && d <= 7
              ? 'warning'
              : 'success'
            : pm.status === 'paused'
              ? 'info'
              : 'neutral';
        return (
          <div className={styles.cellStack}>
            <Badge variant={variant}>{MEMBERSHIP_STATUS_LABEL[pm.status]}</Badge>
            <span className={styles.cellSub}>
              {pm.remaining_credits != null
                ? `잔여 ${pm.remaining_credits}회`
                : d != null
                  ? d >= 0
                    ? `D-${d}`
                    : `만료 ${-d}일 경과`
                  : '무기한'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: '상태',
      render: (m) => (
        <div className={styles.badgeRow}>
          <Badge variant={m.status === 'active' ? 'success' : 'neutral'}>
            {MEMBER_STATUS_LABEL[m.status]}
          </Badge>
          {m.is_blacklisted ? <Badge variant="danger">블랙리스트</Badge> : null}
          {m.user_id && pendingUserIds.has(m.user_id) ? (
            <Badge variant="warning">승인대기</Badge>
          ) : null}
          {m.user_id == null ? <Badge variant="neutral">미연결</Badge> : null}
        </div>
      ),
    },
  ];

  if (!can('members', 'view')) {
    return (
      <div className={styles.page}>
        <Card>
          <p>이 화면에 접근할 권한이 없습니다.</p>
        </Card>
      </div>
    );
  }

  const pendingList = pending.data ?? [];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>회원</h1>
          <p className={styles.subtitle}>회원 탐색·등록 및 멤버십 관리</p>
        </div>
        {canCreate ? (
          <Button variant="primary" onClick={() => setRegisterOpen(true)}>
            회원 등록
          </Button>
        ) : null}
      </header>

      {/* 가입 승인 대기 */}
      {canApprove && pendingList.length > 0 ? (
        <Card variant="accent" title={`가입 승인 대기 (${pendingList.length})`}>
          <div className={styles.pendingList}>
            {pendingList.map((p) => {
              const memberForUser = (members.data ?? []).find((m) => m.user_id === p.id);
              const signed = memberForUser
                ? waiverSignedMemberIds.has(memberForUser.id)
                : false;
              return (
                <div key={p.id} className={styles.pendingItem}>
                  <div className={styles.pendingInfo}>
                    <span className={styles.pendingName}>{p.name ?? '이름 미상'}</span>
                    <span className={styles.pendingMeta}>{p.email ?? '이메일 없음'}</span>
                  </div>
                  <div className={styles.pendingBadges}>
                    {signed ? (
                      <Badge variant="success">웨이버 서명</Badge>
                    ) : (
                      <Badge variant="warning">웨이버 미서명</Badge>
                    )}
                  </div>
                  <div className={styles.pendingActions}>
                    <Button variant="primary" size="sm" onClick={() => onApproveClick(p)}>
                      승인
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRejectReason('');
                        setRejecting(p);
                      }}
                    >
                      거부
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      <div className={styles.toolbar}>
        <div className={styles.search}>
          <Input
            label="검색"
            placeholder="이름 · 전화 · 이메일"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.filter}>
          <Select
            label="필터"
            value={view}
            onChange={(v) => {
              setView(v as ViewFilter);
              setPage(1);
            }}
            options={VIEW_OPTIONS}
          />
        </div>
      </div>

      <Table<MemberRow>
        columns={columns}
        rows={paged}
        rowKey={(m) => m.id}
        loading={members.loading}
        onRowClick={(m) => router.push(`/admin/members/${m.id}`)}
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total: filtered.length,
          onPageChange: setPage,
        }}
        empty={
          members.error
            ? {
                variant: 'error',
                title: '회원을 불러오지 못했습니다',
                description: members.error,
                onRetry: members.refetch,
              }
            : debounced || view !== 'all'
              ? {
                  variant: 'no-result',
                  title: '조건에 맞는 회원이 없습니다',
                  description: '검색어 또는 필터를 조정하세요.',
                  action: {
                    label: '필터 초기화',
                    onClick: () => {
                      setSearch('');
                      setView('all');
                    },
                  },
                }
              : {
                  title: '등록된 회원이 없습니다',
                  description: '새 회원을 등록해 시작하세요.',
                  action: canCreate
                    ? { label: '회원 등록', onClick: () => setRegisterOpen(true) }
                    : undefined,
                }
        }
      />

      {registerOpen ? (
        <MemberRegisterModal
          open
          onClose={() => setRegisterOpen(false)}
          onSaved={() => {
            setRegisterOpen(false);
            reload();
          }}
        />
      ) : null}

      {/* 미서명 승인 경고 */}
      <ConfirmModal
        open={approving != null}
        title="웨이버 미서명 승인"
        variant="primary"
        confirmLabel="승인 진행"
        loading={approveBusy}
        message={
          <>
            <strong>{approving?.name ?? approving?.email}</strong> 회원은 건강·부상 면책(웨이버)에
            서명하지 않았습니다. 그래도 가입을 승인하시겠습니까?
          </>
        }
        onConfirm={() => approving && doApprove(approving)}
        onClose={() => setApproving(null)}
      />

      {/* 거부 사유 */}
      <Modal
        open={rejecting != null}
        onClose={() => setRejecting(null)}
        title="가입 거부"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejecting(null)} disabled={rejectBusy}>
              취소
            </Button>
            <Button
              variant="danger"
              onClick={doReject}
              loading={rejectBusy}
              disabled={!rejectReason.trim()}
            >
              거부
            </Button>
          </>
        }
      >
        <div className={styles.form}>
          <p className={styles.cellSub}>
            {rejecting?.name ?? rejecting?.email} 회원의 가입을 거부합니다.
          </p>
          <Input
            label="거부 사유"
            multiline
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
