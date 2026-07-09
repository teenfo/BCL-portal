'use client';

// WOD 스튜디오 — 템플릿 탭 (02-admin §3.8)
// 목록 fn_list_wod_templates(스코프/kind) + format 클라이언트 필터 · 편집 fn_get_wod_template → fn_upsert_wod_template
// 게시 fn_publish_wod_template (draft → publish, ConfirmModal). facility 스코프는 시설 컨텍스트 미배선으로 제외(⏳).
import { useMemo, useState } from 'react';
import { Button, Table, Badge, Select, ConfirmModal, useToast } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useQuery } from '@/lib/data/useQuery';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { TemplateEditModal } from './TemplateEditModal';
import {
  type WodTemplate,
  type TemplateScope,
  TEMPLATE_KIND_LABEL,
  FORMAT_TYPE_LABEL,
  TEMPLATE_KIND_OPTIONS,
  FORMAT_TYPE_OPTIONS,
} from './types';
import styles from './wod-studio.module.css';

const SCOPE_OPTIONS: { value: TemplateScope; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'shared', label: '공유 (Shared)' },
  { value: 'benchmark', label: '벤치마크 (Benchmark)' },
];

export function TemplatesTab() {
  const toast = useToast();
  const { can } = useMyPermissions();
  const canEdit = can('wod_studio', 'edit');

  const [scope, setScope] = useState<TemplateScope>('all');
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<WodTemplate | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [publishing, setPublishing] = useState<WodTemplate | null>(null);
  const [publishBusy, setPublishBusy] = useState(false);

  const templates = useQuery<WodTemplate[]>(
    () =>
      rpc<WodTemplate[]>(getSupabaseBrowserClient(), 'fn_list_wod_templates', {
        p_scope: scope,
        p_template_kind: kindFilter === 'all' ? null : kindFilter,
      }),
    [scope, kindFilter],
  );

  // format은 서버 필터 없음 → 클라이언트 필터
  const rows = useMemo(() => {
    const list = templates.data ?? [];
    if (formatFilter === 'all') return list;
    return list.filter((t) => t.format_type === formatFilter);
  }, [templates.data, formatFilter]);

  const openNew = () => {
    setEditing(null);
    setEditOpen(true);
  };

  // 편집: 상세는 fn_get_wod_template로 재조회 후 모달 오픈(계약 §4)
  const openEdit = async (t: WodTemplate) => {
    setLoadingDetail(true);
    const res = await rpc<WodTemplate>(getSupabaseBrowserClient(), 'fn_get_wod_template', {
      p_template_id: t.id,
    });
    setLoadingDetail(false);
    if (!res.success || !res.data) {
      toast.error(res.error ?? '템플릿을 불러오지 못했습니다.');
      return;
    }
    setEditing(res.data);
    setEditOpen(true);
  };

  const confirmPublish = async () => {
    if (!publishing) return;
    setPublishBusy(true);
    const res = await rpc(getSupabaseBrowserClient(), 'fn_publish_wod_template', {
      p_template_id: publishing.id,
    });
    setPublishBusy(false);
    if (!res.success) {
      toast.error(
        res.error === 'forbidden'
          ? '권한이 없습니다.'
          : res.error ?? '게시에 실패했습니다.',
      );
      return;
    }
    toast.success('템플릿을 게시했습니다.');
    setPublishing(null);
    templates.refetch();
  };

  const columns: TableColumn<WodTemplate>[] = [
    { key: 'title', header: '제목', render: (t) => t.title },
    {
      key: 'kind',
      header: '종류',
      render: (t) => <Badge variant="neutral">{TEMPLATE_KIND_LABEL[t.template_kind]}</Badge>,
    },
    {
      key: 'format',
      header: '포맷',
      render: (t) =>
        t.format_type ? (
          <Badge variant="info">{FORMAT_TYPE_LABEL[t.format_type]}</Badge>
        ) : (
          <span>—</span>
        ),
    },
    {
      key: 'meta',
      header: '캡/라운드',
      align: 'right',
      render: (t) =>
        [t.time_cap_minutes != null ? `${t.time_cap_minutes}분` : null, t.rounds != null ? `${t.rounds}R` : null]
          .filter(Boolean)
          .join(' · ') || '—',
    },
    {
      key: 'moves',
      header: '동작',
      align: 'right',
      render: (t) => `${t.movements?.length ?? 0}개`,
    },
    {
      key: 'scope',
      header: '스코프',
      render: (t) =>
        t.is_benchmark ? (
          <Badge variant="accent">벤치마크</Badge>
        ) : t.facility_id == null || t.is_shared ? (
          <Badge variant="neutral">공유</Badge>
        ) : (
          <Badge variant="neutral">시설</Badge>
        ),
    },
    {
      key: 'state',
      header: '상태',
      render: (t) => (
        <div className={styles.rowActions}>
          {t.published_at ? (
            <Badge variant="success">게시</Badge>
          ) : (
            <Badge variant="warning">초안</Badge>
          )}
          {t.is_member_visible ? <Badge variant="info">회원공개</Badge> : null}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (t) => (
        <div className={styles.rowActions}>
          {canEdit ? (
            <Button variant="ghost" size="sm" disabled={loadingDetail} onClick={() => void openEdit(t)}>
              편집
            </Button>
          ) : null}
          {canEdit && !t.published_at ? (
            <Button variant="ghost" size="sm" onClick={() => setPublishing(t)}>
              게시
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className={styles.tabPanel}>
      <div className={styles.toolbar}>
        <div className={styles.filter}>
          <Select
            label="스코프"
            value={scope}
            onChange={(v) => setScope(v as TemplateScope)}
            options={SCOPE_OPTIONS}
          />
        </div>
        <div className={styles.filter}>
          <Select
            label="종류"
            value={kindFilter}
            onChange={setKindFilter}
            options={[{ value: 'all', label: '전체' }, ...TEMPLATE_KIND_OPTIONS]}
          />
        </div>
        <div className={styles.filter}>
          <Select
            label="포맷"
            value={formatFilter}
            onChange={setFormatFilter}
            options={[{ value: 'all', label: '전체' }, ...FORMAT_TYPE_OPTIONS]}
          />
        </div>
        <div className={styles.spacer} />
        {canEdit ? (
          <Button variant="primary" onClick={openNew}>
            새 템플릿
          </Button>
        ) : null}
      </div>

      <Table<WodTemplate>
        columns={columns}
        rows={rows}
        rowKey={(t) => t.id}
        loading={templates.loading}
        empty={
          templates.error
            ? {
                variant: 'error',
                title: '템플릿을 불러오지 못했습니다',
                description: templates.error,
                onRetry: templates.refetch,
              }
            : {
                title: '템플릿이 없습니다',
                description: '새 WOD 템플릿을 만들어 세션에 배정하세요.',
                action: canEdit ? { label: '새 템플릿', onClick: openNew } : undefined,
              }
        }
      />

      {editOpen ? (
        <TemplateEditModal
          key={editing?.id ?? 'new'}
          open
          template={editing}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            templates.refetch();
          }}
        />
      ) : null}

      <ConfirmModal
        open={publishing != null}
        title="템플릿 게시"
        message={
          <>
            <strong>{publishing?.title}</strong> 템플릿을 게시합니다. 게시본만 세션에 배정할 수
            있습니다.
          </>
        }
        confirmLabel="게시"
        variant="primary"
        loading={publishBusy}
        onConfirm={confirmPublish}
        onClose={() => setPublishing(null)}
      />
    </div>
  );
}
