'use client';

// 배지 정의 생성/편집 모달 (02-admin §3.11 definitions)
// 전용 RPC 부재 → badge_definitions 직접 insert/update(admin manage RLS). ⏳ audit 미기록.
// 조건: metric_type + threshold_value(간이 폼). 아이콘은 디자인 시스템 아이콘 키(문자열).
import { useState } from 'react';
import { Modal, Button, Input, Select, Card, Checkbox } from '@/components/ui';
import { useToast } from '@/components/ui';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  type BadgeDefinition,
  type BadgeCategory,
  type BadgeMetricType,
  writeError,
} from './types';
import { BADGE_EMOJI_SUGGESTIONS, badgeGlyph } from './glyph';
import styles from './badges.module.css';

interface Props {
  badge: BadgeDefinition | null; // null = 신규
  onClose: () => void;
  onSaved: () => void;
}

export function BadgeDefEditModal({ badge, onClose, onSaved }: Props) {
  const toast = useToast();
  const client = getSupabaseBrowserClient();
  const isEdit = badge != null;

  const [slug, setSlug] = useState(badge?.slug ?? '');
  const [name, setName] = useState(badge?.name ?? '');
  const [description, setDescription] = useState(badge?.description ?? '');
  const [icon, setIcon] = useState(badge?.icon ?? '');
  const [category, setCategory] = useState<BadgeCategory>(badge?.category ?? 'attendance');
  const [metricType, setMetricType] = useState<BadgeMetricType>(badge?.metric_type ?? 'checkin_count');
  const [threshold, setThreshold] = useState(String(badge?.threshold_value ?? 1));
  const [sortOrder, setSortOrder] = useState(String(badge?.sort_order ?? 0));
  const [isActive, setIsActive] = useState(badge?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isManual = metricType === 'manual';

  const doSave = async () => {
    if (!slug.trim()) {
      setError('slug를 입력하세요.');
      return;
    }
    if (!name.trim()) {
      setError('배지 이름을 입력하세요.');
      return;
    }
    // manual이 아니면 threshold_value는 CHECK(> 0). manual은 판정 미사용이나 기본 1 유지.
    const th = isManual ? 1 : Number(threshold);
    if (!Number.isFinite(th) || th <= 0) {
      setError('기준값은 0보다 커야 합니다.');
      return;
    }
    const payload = {
      slug: slug.trim(),
      name: name.trim(),
      description: description.trim() || null,
      icon: icon.trim() || null,
      category,
      metric_type: metricType,
      threshold_value: th,
      sort_order: Number(sortOrder) || 0,
      is_active: isActive,
    };
    setSaving(true);
    setError(null);
    const res = isEdit
      ? await query(client, 'badge_definitions', (q) => q.update(payload).eq('id', badge.id))
      : await query(client, 'badge_definitions', (q) => q.insert(payload));
    setSaving(false);
    if (!res.success) {
      setError(writeError(res.error));
      return;
    }
    toast.success(isEdit ? '배지 정의를 수정했습니다.' : '배지 정의를 생성했습니다.');
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? '배지 정의 편집' : '새 배지 정의'}
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

        <div className={styles.formRow}>
          <Input
            label="slug (고유)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            helper="예: checkin-10"
          />
          <Input label="이름" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className={styles.formRow}>
          <Select
            label="분류 (category)"
            value={category}
            onChange={(v) => setCategory(v as BadgeCategory)}
            options={[
              { value: 'attendance', label: '출석' },
              { value: 'performance', label: '퍼포먼스' },
              { value: 'race', label: '레이스' },
              { value: 'membership', label: '멤버십' },
              { value: 'special', label: '특별' },
            ]}
          />
          <Input
            label="아이콘 이모지 (선택)"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="예: 🔥"
            helper={icon ? `표시: ${badgeGlyph(icon)}` : '이모지를 붙여넣거나 아래에서 선택'}
          />
        </div>

        <div className={styles.emojiPicker} role="group" aria-label="아이콘 이모지 빠른 선택">
          {BADGE_EMOJI_SUGGESTIONS.map((e) => (
            <button
              type="button"
              key={e}
              className={`${styles.emojiChip}${icon === e ? ` ${styles.emojiChipActive}` : ''}`}
              onClick={() => setIcon(e)}
              aria-label={`아이콘 ${e}`}
            >
              {e}
            </button>
          ))}
        </div>

        <div className={styles.formRow}>
          <Select
            label="조건 유형 (metric_type)"
            value={metricType}
            onChange={(v) => setMetricType(v as BadgeMetricType)}
            options={[
              { value: 'checkin_count', label: '출석 누적(회)' },
              { value: 'checkin_streak_weeks', label: '연속 출석(주)' },
              { value: 'pr_count', label: 'PR 달성(회)' },
              { value: 'race_count', label: 'Race 완주(회)' },
              { value: 'race_podium_count', label: 'Race 입상(3위 이내)' },
              { value: 'membership_days', label: '멤버십 지속(일)' },
              { value: 'manual', label: '수동 수여 전용' },
            ]}
          />
          {isManual ? (
            <div />
          ) : (
            <Input
              label="기준값 (threshold)"
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          )}
        </div>

        <Input
          label="설명 (선택)"
          multiline
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className={styles.formRow}>
          <Input
            label="정렬 순서"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
          <div />
        </div>

        <Checkbox
          label="활성 (끄면 판정·노출 제외)"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />

        {isManual ? (
          <p className={styles.note}>
            수동 수여 전용 배지입니다. 자동 판정되지 않으며 [수여 현황] 탭에서만 수여됩니다.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
