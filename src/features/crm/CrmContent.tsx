'use client';

// CRM content 탭 — 공지(notices) + 배너(banners) CRUD (02-admin §3.13)
// 직접 쓰기(admin RLS). ⏳ audit_logs 기록은 서버 RPC 경로 필요.
import { useState } from 'react';
import { Button, Table, Badge, ConfirmModal, useToast } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { NoticeEditModal } from './NoticeEditModal';
import { BannerEditModal } from './BannerEditModal';
import { type Notice, type Banner, NOTICE_CATEGORY_LABEL } from './types';
import styles from './crm.module.css';

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('ko-KR') : '—');

export function CrmContent() {
  const toast = useToast();
  const { can } = useMyPermissions();
  const canEdit = can('crm', 'edit');
  const canDelete = can('crm', 'delete');

  const [noticeEdit, setNoticeEdit] = useState<{ open: boolean; row: Notice | null }>({ open: false, row: null });
  const [bannerEdit, setBannerEdit] = useState<{ open: boolean; row: Banner | null }>({ open: false, row: null });
  const [delNotice, setDelNotice] = useState<Notice | null>(null);
  const [delBanner, setDelBanner] = useState<Banner | null>(null);
  const [busy, setBusy] = useState(false);

  const notices = useQuery<Notice[]>(
    () => query<Notice[]>(getSupabaseBrowserClient(), 'notices', (q) => q.select('*').order('created_at', { ascending: false }).limit(200)),
    [],
  );
  const banners = useQuery<Banner[]>(
    () => query<Banner[]>(getSupabaseBrowserClient(), 'banners', (q) => q.select('*').order('priority_order', { ascending: true }).limit(200)),
    [],
  );

  const removeNotice = async () => {
    if (!delNotice) return;
    setBusy(true);
    const res = await query(getSupabaseBrowserClient(), 'notices', (q) => q.delete().eq('id', delNotice.id));
    setBusy(false);
    if (!res.success) {
      toast.error(res.error ?? '삭제에 실패했습니다.');
      return;
    }
    toast.success('공지를 삭제했습니다.');
    setDelNotice(null);
    notices.refetch();
  };

  const removeBanner = async () => {
    if (!delBanner) return;
    setBusy(true);
    const res = await query(getSupabaseBrowserClient(), 'banners', (q) => q.delete().eq('id', delBanner.id));
    setBusy(false);
    if (!res.success) {
      toast.error(res.error ?? '삭제에 실패했습니다.');
      return;
    }
    toast.success('배너를 삭제했습니다.');
    setDelBanner(null);
    banners.refetch();
  };

  const noticeColumns: TableColumn<Notice>[] = [
    {
      key: 'title',
      header: '제목',
      render: (n) => (
        <span>
          {n.is_pinned ? '📌 ' : ''}
          {n.title}
        </span>
      ),
    },
    { key: 'category', header: '분류', render: (n) => <Badge variant="neutral">{NOTICE_CATEGORY_LABEL[n.category]}</Badge> },
    {
      key: 'published',
      header: '게시',
      render: (n) => (n.is_published ? <Badge variant="success">게시중</Badge> : <Badge variant="neutral">비공개</Badge>),
    },
    { key: 'window', header: '노출기간', render: (n) => `${fmtDate(n.published_at)} ~ ${fmtDate(n.expires_at)}` },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (n) => (
        <div className={styles.rowActions}>
          {canEdit ? (
            <Button variant="ghost" size="sm" onClick={() => setNoticeEdit({ open: true, row: n })}>
              편집
            </Button>
          ) : null}
          {canDelete ? (
            <Button variant="ghost" size="sm" onClick={() => setDelNotice(n)}>
              삭제
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  const bannerColumns: TableColumn<Banner>[] = [
    { key: 'order', header: '순서', align: 'right', render: (b) => b.priority_order },
    { key: 'title', header: '제목', render: (b) => b.title },
    { key: 'position', header: '위치', render: (b) => <Badge variant="neutral">{b.position}</Badge> },
    {
      key: 'active',
      header: '노출',
      render: (b) => (b.is_active ? <Badge variant="success">활성</Badge> : <Badge variant="neutral">비활성</Badge>),
    },
    { key: 'window', header: '노출기간', render: (b) => `${fmtDate(b.start_date)} ~ ${fmtDate(b.end_date)}` },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (b) => (
        <div className={styles.rowActions}>
          {canEdit ? (
            <Button variant="ghost" size="sm" onClick={() => setBannerEdit({ open: true, row: b })}>
              편집
            </Button>
          ) : null}
          {canDelete ? (
            <Button variant="ghost" size="sm" onClick={() => setDelBanner(b)}>
              삭제
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className={styles.tabPanel}>
      {/* 공지 */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>공지</h2>
          {canEdit ? (
            <Button variant="primary" size="sm" onClick={() => setNoticeEdit({ open: true, row: null })}>
              새 공지
            </Button>
          ) : null}
        </div>
        <Table<Notice>
          columns={noticeColumns}
          rows={notices.data ?? []}
          rowKey={(n) => n.id}
          loading={notices.loading}
          empty={
            notices.error
              ? { variant: 'error', title: '공지를 불러오지 못했습니다', description: notices.error, onRetry: notices.refetch }
              : { title: '공지가 없습니다', description: '새 공지를 작성하세요.' }
          }
        />
      </section>

      {/* 배너 */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>배너</h2>
          {canEdit ? (
            <Button variant="primary" size="sm" onClick={() => setBannerEdit({ open: true, row: null })}>
              새 배너
            </Button>
          ) : null}
        </div>
        <Table<Banner>
          columns={bannerColumns}
          rows={banners.data ?? []}
          rowKey={(b) => b.id}
          loading={banners.loading}
          empty={
            banners.error
              ? { variant: 'error', title: '배너를 불러오지 못했습니다', description: banners.error, onRetry: banners.refetch }
              : { title: '배너가 없습니다', description: '새 배너를 등록하세요.' }
          }
        />
      </section>

      {noticeEdit.open ? (
        <NoticeEditModal
          key={noticeEdit.row?.id ?? 'new'}
          notice={noticeEdit.row}
          onClose={() => setNoticeEdit({ open: false, row: null })}
          onSaved={() => {
            setNoticeEdit({ open: false, row: null });
            notices.refetch();
          }}
        />
      ) : null}

      {bannerEdit.open ? (
        <BannerEditModal
          key={bannerEdit.row?.id ?? 'new'}
          banner={bannerEdit.row}
          onClose={() => setBannerEdit({ open: false, row: null })}
          onSaved={() => {
            setBannerEdit({ open: false, row: null });
            banners.refetch();
          }}
        />
      ) : null}

      <ConfirmModal
        open={delNotice != null}
        title="공지 삭제"
        message={
          <>
            <strong>{delNotice?.title}</strong> 공지를 삭제합니다. 되돌릴 수 없습니다.
          </>
        }
        confirmLabel="삭제"
        variant="danger"
        loading={busy}
        onConfirm={removeNotice}
        onClose={() => setDelNotice(null)}
      />
      <ConfirmModal
        open={delBanner != null}
        title="배너 삭제"
        message={
          <>
            <strong>{delBanner?.title}</strong> 배너를 삭제합니다. 되돌릴 수 없습니다.
          </>
        }
        confirmLabel="삭제"
        variant="danger"
        loading={busy}
        onConfirm={removeBanner}
        onClose={() => setDelBanner(null)}
      />
    </div>
  );
}
