'use client';

// WOD 스튜디오 — 동작 라이브러리 탭 (02-admin §3.8)
// 목록 fn_list_movement_library(카테고리 필터/검색/페이지네이션) + 마스터-디테일 상세.
// CRUD는 RPC 부재로 admin RLS 직접 쓰기(⏳, MovementEditModal). movement_categories는 필터·선택용 간략 관리.
import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Table, Badge, Select, Input, ConfirmModal, useToast } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useQuery } from '@/lib/data/useQuery';
import { query, rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { MovementEditModal } from './MovementEditModal';
import type { MovementLibraryItem, MovementCategory } from './types';
import styles from './wod-studio.module.css';

const PAGE_SIZE = 20;

export function LibraryTab() {
  const toast = useToast();
  const { can } = useMyPermissions();
  const canEdit = can('wod_studio', 'edit');
  const canDelete = can('wod_studio', 'delete');

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<MovementLibraryItem | null>(null);
  const [deleting, setDeleting] = useState<MovementLibraryItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // 검색 300ms 디바운스 (페이지 리셋은 필터 변경 핸들러에서 직접 — effect 동기 setState 회피)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 300);
    return () => clearTimeout(t);
  }, [term]);

  const categories = useQuery<MovementCategory[]>(
    () =>
      query<MovementCategory[]>(getSupabaseBrowserClient(), 'movement_categories', (q) =>
        q.select('*').eq('is_active', true).order('sort_order', { ascending: true }),
      ),
    [],
  );

  const library = useQuery<{ items: MovementLibraryItem[]; total: number }>(async () => {
    const res = await rpc<MovementLibraryItem[]>(
      getSupabaseBrowserClient(),
      'fn_list_movement_library',
      {
        p_query: debounced || null,
        p_category: categoryFilter === 'all' ? null : categoryFilter,
        p_limit: PAGE_SIZE,
        p_offset: (page - 1) * PAGE_SIZE,
      },
    );
    // fn_list_movement_library는 envelope에 total을 함께 반환(rpc 헬퍼 타입에는 미노출)
    const total = (res as unknown as { total?: number }).total ?? res.data?.length ?? 0;
    return {
      success: res.success,
      data: res.success ? { items: res.data ?? [], total } : null,
      error: res.error,
    };
  }, [debounced, categoryFilter, page]);

  const items = useMemo(() => library.data?.items ?? [], [library.data]);
  const total = library.data?.total ?? 0;
  const selected = useMemo(
    () => items.find((m) => m.id === selectedId) ?? null,
    [items, selectedId],
  );

  const categoryOptions = useMemo(
    () => [
      { value: 'all', label: '전체 카테고리' },
      ...(categories.data ?? []).map((c) => ({ value: c.slug, label: c.name_ko })),
    ],
    [categories.data],
  );

  const openNew = () => {
    setEditing(null);
    setEditOpen(true);
  };
  const openEdit = (m: MovementLibraryItem) => {
    setEditing(m);
    setEditOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    // ⏳ 직접 삭제(RPC 부재) — RLS: admin delete. 참조(wod_usage_count>0) 시 UI에서 사전 차단.
    const res = await query(getSupabaseBrowserClient(), 'movement_library', (q) =>
      q.delete().eq('id', deleting.id).select('id').single(),
    );
    setDeleteBusy(false);
    if (!res.success) {
      toast.error(res.error ?? '삭제에 실패했습니다.');
      return;
    }
    toast.success('동작을 삭제했습니다.');
    if (selectedId === deleting.id) setSelectedId(null);
    setDeleting(null);
    library.refetch();
  };

  const columns: TableColumn<MovementLibraryItem>[] = [
    { key: 'name_ko', header: '이름', render: (m) => m.name_ko },
    {
      key: 'category',
      header: '카테고리',
      render: (m) => <Badge variant="neutral">{m.category_name_ko ?? m.category}</Badge>,
    },
    { key: 'difficulty', header: '난이도', align: 'right', render: (m) => `Lv.${m.difficulty_level}` },
    { key: 'usage', header: '템플릿 참조', align: 'right', render: (m) => `${m.wod_usage_count}회` },
    {
      key: 'active',
      header: '상태',
      render: (m) =>
        m.is_active ? <Badge variant="success">활성</Badge> : <Badge variant="neutral">숨김</Badge>,
    },
  ];

  return (
    <div className={styles.tabPanel}>
      <div className={styles.toolbar}>
        <div className={styles.filter}>
          <Select
            label="카테고리"
            value={categoryFilter}
            onChange={(v) => {
              setCategoryFilter(v);
              setPage(1);
            }}
            options={categoryOptions}
          />
        </div>
        <div className={styles.searchField}>
          <Input
            label="검색"
            value={term}
            placeholder="이름·slug 검색"
            onChange={(e) => {
              setTerm(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className={styles.spacer} />
        {canEdit ? (
          <Button variant="primary" onClick={openNew}>
            새 동작
          </Button>
        ) : null}
      </div>

      <div className={styles.libLayout}>
        <Table<MovementLibraryItem>
          columns={columns}
          rows={items}
          rowKey={(m) => m.id}
          loading={library.loading}
          onRowClick={(m) => setSelectedId(m.id)}
          pagination={{
            page,
            pageSize: PAGE_SIZE,
            total,
            onPageChange: setPage,
          }}
          empty={
            library.error
              ? {
                  variant: 'error',
                  title: '동작을 불러오지 못했습니다',
                  description: library.error,
                  onRetry: library.refetch,
                }
              : debounced || categoryFilter !== 'all'
                ? { variant: 'no-result', title: '검색 결과가 없습니다', description: '다른 조건으로 검색하세요.' }
                : {
                    title: '동작이 없습니다',
                    description: '새 동작을 추가해 라이브러리를 구성하세요.',
                    action: canEdit ? { label: '새 동작', onClick: openNew } : undefined,
                  }
          }
        />

        <Card>
          {selected ? (
            <div className={styles.detailCard}>
              <h3 className={styles.detailTitle}>{selected.name_ko}</h3>
              {selected.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={styles.thumb} src={selected.thumbnail_url} alt={selected.name_ko} />
              ) : null}
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>영문명</span>
                <span className={styles.detailValue}>{selected.name_en}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>slug</span>
                <span className={styles.detailValue}>{selected.slug}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>카테고리</span>
                <span className={styles.detailValue}>
                  {selected.category_name_ko ?? selected.category}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>난이도</span>
                <span className={styles.detailValue}>Lv.{selected.difficulty_level}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>장비</span>
                <span className={styles.detailValue}>
                  {(selected.equipment ?? []).join(', ') || '—'}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>템플릿 참조</span>
                <span className={styles.detailValue}>{selected.wod_usage_count}회</span>
              </div>
              {selected.video_url ? (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>영상</span>
                  <span className={styles.detailValue}>
                    <a href={selected.video_url} target="_blank" rel="noreferrer">
                      링크
                    </a>
                  </span>
                </div>
              ) : null}
              {selected.coaching_points ? (
                <p className={styles.pickerOptionSub}>{selected.coaching_points}</p>
              ) : null}

              <div className={styles.detailActions}>
                {canEdit ? (
                  <Button variant="soft" size="sm" onClick={() => openEdit(selected)}>
                    편집
                  </Button>
                ) : null}
                {canDelete ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={selected.wod_usage_count > 0}
                    title={selected.wod_usage_count > 0 ? '템플릿 참조가 있어 삭제할 수 없습니다' : undefined}
                    onClick={() => setDeleting(selected)}
                  >
                    삭제
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <p className={styles.detailPlaceholder}>목록에서 동작을 선택하면 상세가 표시됩니다.</p>
          )}
        </Card>
      </div>

      {editOpen ? (
        <MovementEditModal
          key={editing?.id ?? 'new'}
          open
          movement={editing}
          categories={categories.data ?? []}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            library.refetch();
          }}
        />
      ) : null}

      <ConfirmModal
        open={deleting != null}
        title="동작 삭제"
        message={
          <>
            <strong>{deleting?.name_ko}</strong> 동작을 삭제합니다. 되돌릴 수 없습니다. (참조 중인
            동작은 삭제 대신 비활성 처리하세요)
          </>
        }
        confirmLabel="삭제"
        variant="danger"
        loading={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
