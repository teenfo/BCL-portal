'use client';

// 설정 · 사이트 탭 (02-admin §3.14 site)
// system_config 키-값 관리(사이트 정보/업로드 설정 등). config_value(JSONB) 편집.
// is_secret 항목은 값 마스킹 + 편집 잠금. 쓰기 = admin RLS 직접(⏳ audit 후속).
import { useState } from 'react';
import { Card, Button, Input, Badge, Modal, useToast } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { type SystemConfigRow } from './types';
import styles from './settings.module.css';

export function SiteTab() {
  const { can } = useMyPermissions();
  const canEdit = can('settings', 'edit');

  const configs = useQuery<SystemConfigRow[]>(
    () =>
      query<SystemConfigRow[]>(getSupabaseBrowserClient(), 'system_config', (q) =>
        q
          .select('id,config_key,config_value,category,description,is_secret,updated_at')
          .order('category', { ascending: true })
          .order('config_key', { ascending: true }),
      ),
    [],
  );

  const [editing, setEditing] = useState<SystemConfigRow | null>(null);

  const rows = configs.data ?? [];

  return (
    <div className={styles.tabPanel}>
      <Card title="시스템 설정 (system_config)">
        {configs.loading ? (
          <p className={styles.note}>불러오는 중…</p>
        ) : configs.error ? (
          <p className={styles.errorText}>{configs.error}</p>
        ) : rows.length === 0 ? (
          <p className={styles.note}>등록된 설정 키가 없습니다.</p>
        ) : (
          <div className={styles.kvList}>
            {rows.map((c) => (
              <div key={c.id} className={styles.kvRow}>
                <div className={styles.cellStack}>
                  <div className={styles.badgeRow}>
                    <span>{c.config_key}</span>
                    <Badge variant="neutral">{c.category}</Badge>
                    {c.is_secret ? <Badge variant="warning">비밀</Badge> : null}
                  </div>
                  <span className={styles.cellSub}>
                    {c.description ?? '설명 없음'} · 값:{' '}
                    {c.is_secret ? '•••• (마스킹)' : JSON.stringify(c.config_value)}
                  </span>
                </div>
                {canEdit && !c.is_secret ? (
                  <Button variant="ghost" size="sm" onClick={() => setEditing(c)}>
                    편집
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      {editing ? (
        <ConfigEditModal
          key={editing.id}
          config={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            configs.refetch();
          }}
        />
      ) : null}
    </div>
  );
}

function ConfigEditModal({
  config,
  onClose,
  onSaved,
}: {
  config: SystemConfigRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [raw, setRaw] = useState(JSON.stringify(config.config_value ?? null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      setError('유효한 JSON 값이 아닙니다. 문자열은 큰따옴표로 감싸세요. 예: "값"');
      return;
    }
    setSaving(true);
    setError(null);
    const res = await query(getSupabaseBrowserClient(), 'system_config', (q) =>
      q.update({ config_value: parsed }).eq('id', config.id),
    );
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? '저장에 실패했습니다.');
      return;
    }
    toast.success('설정 값을 저장했습니다.');
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`설정 편집 · ${config.config_key}`}
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
        <p className={styles.note}>{config.description ?? '설명 없음'}</p>
        <Input
          label="값 (JSON)"
          multiline
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          helper='JSON 형식으로 입력 — 문자열은 "따옴표", 숫자/불리언은 그대로'
        />
      </div>
    </Modal>
  );
}
