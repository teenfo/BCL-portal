'use client';

// 세션 통합 패널 — wod 서브탭 (02-admin §3.6)
// 세션 WOD 조회(fn_get_session_wod) · 배정/오버라이드(fn_upsert_session_wod, draft) · 게시(fn_publish_session_wod).
// ⏳ wod-studio 템플릿 상세 편집·동작 검색은 wod-studio 화면 소관 — 여기선 템플릿 연결 + 조회·게시 위주.
import { useMemo, useState } from 'react';
import { Button, Input, Select, Card, Badge, EmptyState, Skeleton, useToast } from '@/components/ui';
import type { BadgeVariant, SelectOption } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { query, rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { type SessionWod, WOD_FORMAT_OPTIONS } from './types';
import styles from './schedule.module.css';

interface Props {
  sessionId: string;
  canEdit: boolean;
  onChanged: () => void;
}
interface TemplateRow {
  id: string;
  title: string;
  format_type: string | null;
}

const STATE_LABEL: Record<string, string> = {
  none: '미배정',
  draft: '초안',
  published: '게시됨',
  archived: '보관',
};
const STATE_BADGE: Record<string, BadgeVariant> = {
  none: 'neutral',
  draft: 'warning',
  published: 'success',
  archived: 'neutral',
};

export function WodTab({ sessionId, canEdit, onChanged }: Props) {
  const wod = useQuery<SessionWod>(
    () => rpc<SessionWod>(getSupabaseBrowserClient(), 'fn_get_session_wod', { p_session_id: sessionId }),
    [sessionId],
  );

  const templates = useQuery<TemplateRow[]>(
    () =>
      query<TemplateRow[]>(getSupabaseBrowserClient(), 'wod_templates', (q) =>
        q.select('id, title, format_type').order('updated_at', { ascending: false }).limit(200),
      ),
    [],
  );

  const templateOptions = useMemo(
    () => (templates.data ?? []).map((t) => ({ value: t.id, label: t.title })),
    [templates.data],
  );

  if (wod.loading) {
    return (
      <div className={styles.tabPanel}>
        <Skeleton variant="text" />
        <Skeleton variant="text" />
      </div>
    );
  }
  if (wod.error) {
    return (
      <div className={styles.tabPanel}>
        <EmptyState variant="error" title="WOD를 불러오지 못했습니다" description={wod.error} onRetry={wod.refetch} />
      </div>
    );
  }

  const data = wod.data;
  const state = data?.publish_state ?? 'none';
  // fetch 결과가 바뀌면 key로 폼 리마운트 → 초기값 재시드(effect setState 회피)
  const formKey = `${data?.id ?? 'none'}:${data?.published_at ?? ''}`;

  return (
    <div className={styles.tabPanel}>
      <Card
        title="세션 WOD"
        action={<Badge variant={STATE_BADGE[state] ?? 'neutral'}>{STATE_LABEL[state] ?? state}</Badge>}
      >
        <div className={styles.wodMeta}>
          <span className={styles.hint}>
            발행된 WOD는 스냅샷으로 동결됩니다. 상세 동작 편집은 WOD 스튜디오에서 진행하세요.
          </span>
          {data?.published_at ? (
            <span className={styles.hint}>게시: {new Date(data.published_at).toLocaleString('ko-KR')}</span>
          ) : null}
        </div>
      </Card>

      {canEdit ? (
        <WodForm
          key={formKey}
          sessionId={sessionId}
          data={data ?? null}
          state={state}
          templateOptions={templateOptions}
          templatesLoading={templates.loading}
          onSaved={() => {
            wod.refetch();
            onChanged();
          }}
        />
      ) : (
        <Card>
          <span className={styles.hint}>WOD 편집 권한이 없습니다.</span>
        </Card>
      )}
    </div>
  );
}

function WodForm({
  sessionId,
  data,
  state,
  templateOptions,
  templatesLoading,
  onSaved,
}: {
  sessionId: string;
  data: SessionWod | null;
  state: string;
  templateOptions: SelectOption[];
  templatesLoading: boolean;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(data?.template_id ?? null);
  const [title, setTitle] = useState(data?.title_override ?? '');
  const [format, setFormat] = useState<string | null>(data?.format_override ?? null);
  const [timeCap, setTimeCap] = useState(data?.time_cap_override != null ? String(data.time_cap_override) : '');
  const [description, setDescription] = useState(data?.description_override ?? '');

  const save = async () => {
    setBusy(true);
    const res = await rpc(getSupabaseBrowserClient(), 'fn_upsert_session_wod', {
      p_session_id: sessionId,
      p_payload: {
        template_id: templateId,
        title_override: title.trim() || null,
        format_override: format,
        time_cap_override: timeCap.trim() ? Number(timeCap) : null,
        description_override: description.trim() || null,
      },
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.error ?? 'WOD 저장에 실패했습니다.');
      return;
    }
    toast.success('WOD 초안을 저장했습니다.');
    onSaved();
  };

  const publish = async () => {
    setBusy(true);
    const res = await rpc(getSupabaseBrowserClient(), 'fn_publish_session_wod', {
      p_session_id: sessionId,
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.error ?? '게시에 실패했습니다.');
      return;
    }
    toast.success('WOD를 게시했습니다.');
    onSaved();
  };

  return (
    <div className={styles.form}>
      <Select
        label="템플릿 연결 (선택 — wod-studio 게시본)"
        value={templateId}
        onChange={setTemplateId}
        searchable
        placeholder={templatesLoading ? '템플릿 불러오는 중…' : '템플릿 선택(선택)'}
        options={templateOptions}
      />
      <Input label="제목 오버라이드 (선택)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className={styles.formRow}>
        <Select
          label="포맷 오버라이드 (선택)"
          value={format}
          onChange={setFormat}
          placeholder="포맷 선택"
          options={WOD_FORMAT_OPTIONS}
        />
        <Input
          label="타임캡(분, 선택)"
          type="number"
          value={timeCap}
          onChange={(e) => setTimeCap(e.target.value)}
        />
      </div>
      <Input
        label="설명 오버라이드 (선택)"
        multiline
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className={styles.rowActions}>
        <Button variant="soft" disabled={busy} onClick={save}>
          초안 저장
        </Button>
        <Button variant="primary" disabled={busy || state === 'none'} onClick={publish}>
          게시
        </Button>
      </div>
      {state === 'none' ? (
        <span className={styles.hint}>먼저 초안을 저장한 뒤 게시할 수 있습니다.</span>
      ) : null}
    </div>
  );
}
