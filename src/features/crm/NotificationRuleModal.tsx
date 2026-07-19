'use client';

// 자동 알림 규칙 생성/편집 모달 (02-admin §3.13)
// 직접 INSERT/UPDATE(notification_rules, admin RLS). ⏳ audit_logs 기록은 서버 RPC 경로 필요.
// trigger_config는 JSON — 시간/이벤트 파라미터(예: {"minutes_before":60}, {"days_before":[7,3,1]}).
import { useState } from 'react';
import { Modal, Button, Input, Select, Checkbox, Card } from '@/components/ui';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { type NotificationRule, CHANNEL_OPTIONS } from './types';
import styles from './crm.module.css';

interface Props {
  rule: NotificationRule | null;
  onClose: () => void;
  onSaved: () => void;
}

export function NotificationRuleModal({ rule, onClose, onSaved }: Props) {
  const [name, setName] = useState(rule?.name ?? '');
  const [description, setDescription] = useState(rule?.description ?? '');
  const [triggerType, setTriggerType] = useState<NotificationRule['trigger_type']>(rule?.trigger_type ?? 'class_reminder');
  const [triggerConfig, setTriggerConfig] = useState(JSON.stringify(rule?.trigger_config ?? {}, null, 2));
  const [titleTemplate, setTitleTemplate] = useState(rule?.title_template ?? '');
  const [messageTemplate, setMessageTemplate] = useState(rule?.message_template ?? '');
  const [category, setCategory] = useState(rule?.category ?? 'system');
  const [channels, setChannels] = useState<string[]>(rule?.channels ?? ['in_app']);
  const [isActive, setIsActive] = useState(rule?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const doSave = async () => {
    if (!name.trim()) {
      setError('규칙 이름을 입력하세요.');
      return;
    }
    if (!titleTemplate.trim() || !messageTemplate.trim()) {
      setError('제목/메시지 템플릿을 입력하세요.');
      return;
    }
    if (channels.length === 0) {
      setError('채널을 하나 이상 선택하세요.');
      return;
    }
    let parsedConfig: Record<string, unknown>;
    try {
      parsedConfig = triggerConfig.trim() ? JSON.parse(triggerConfig) : {};
    } catch {
      setError('트리거 설정(JSON) 형식이 올바르지 않습니다.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      trigger_type: triggerType,
      trigger_config: parsedConfig,
      title_template: titleTemplate.trim(),
      message_template: messageTemplate.trim(),
      category: category.trim() || 'system',
      channels,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    };
    const client = getSupabaseBrowserClient();
    const res = rule
      ? await query(client, 'notification_rules', (q) => q.update(payload).eq('id', rule.id))
      : await query(client, 'notification_rules', (q) => q.insert(payload));
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? '저장에 실패했습니다.');
      return;
    }
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={rule ? '규칙 편집' : '새 규칙'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button variant="primary" onClick={doSave} loading={saving}>
            저장
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        {error ? (
          <Card variant="accent">
            <span className={styles.errorText}>{error}</span>
          </Card>
        ) : null}

        <Input label="규칙 이름" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="설명 (선택)" multiline rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />

        <div className={styles.formRow}>
          <Select
            label="트리거 유형"
            value={triggerType}
            onChange={(v) => setTriggerType(v as NotificationRule['trigger_type'])}
            options={[
              { value: 'class_reminder', label: '수업 리마인더' },
              { value: 'membership_expiry', label: '멤버십 만기' },
              { value: 'waitlist_vacancy', label: '대기열 빈자리' },
              { value: 'absence', label: '장기 미출석' },
              { value: 'birthday', label: '생일' },
              { value: 'manual', label: '수동' },
            ]}
          />
          <Input label="카테고리" value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>

        <Select
          label="채널"
          multiple
          value={channels}
          onChange={setChannels}
          options={CHANNEL_OPTIONS}
        />

        <Input
          label="트리거 설정 (JSON)"
          helper='예: {"minutes_before":60} 또는 {"days_before":[7,3,1]}'
          multiline
          rows={3}
          value={triggerConfig}
          onChange={(e) => setTriggerConfig(e.target.value)}
        />

        <Input label="제목 템플릿" value={titleTemplate} onChange={(e) => setTitleTemplate(e.target.value)} />
        <Input label="메시지 템플릿" multiline rows={3} value={messageTemplate} onChange={(e) => setMessageTemplate(e.target.value)} />

        <Checkbox label="활성 (크론/트리거가 이 규칙을 사용)" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
      </div>
    </Modal>
  );
}
