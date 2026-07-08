'use client';

// 동작(movement_library) 생성/편집 모달 (02-admin §3.8)
// ⏳ 전용 upsert RPC 부재 → admin RLS 직접 쓰기(query 헬퍼 경유). audit_logs 미동반 —
//    fn_upsert_movement 신설 시 RPC 전환 필요(그때 감사 동반). 직접 쓰기는 라이브러리 CRUD에 한정.
import { useState } from 'react';
import { Modal, Button, Input, Select, Card, Checkbox } from '@/components/ui';
import { useToast } from '@/components/ui';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { MovementLibraryItem, MovementCategory } from './types';
import styles from './wod-studio.module.css';

interface Props {
  open: boolean;
  movement: MovementLibraryItem | null; // null = 신규
  categories: MovementCategory[];
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  slug: string;
  name_ko: string;
  name_en: string;
  category: string;
  equipment: string; // 콤마 구분
  difficulty_level: string;
  primary_muscles: string; // 콤마 구분
  coaching_points: string;
  thumbnail_url: string;
  video_url: string;
  is_active: boolean;
}

const toList = (v: string): string[] =>
  v
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

function fromMovement(m: MovementLibraryItem): FormState {
  return {
    slug: m.slug,
    name_ko: m.name_ko,
    name_en: m.name_en,
    category: m.category,
    equipment: (m.equipment ?? []).join(', '),
    difficulty_level: String(m.difficulty_level),
    primary_muscles: (m.primary_muscles ?? []).join(', '),
    coaching_points: m.coaching_points ?? '',
    thumbnail_url: m.thumbnail_url ?? '',
    video_url: m.video_url ?? '',
    is_active: m.is_active,
  };
}

export function MovementEditModal({ open, movement, categories, onClose, onSaved }: Props) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(() =>
    movement
      ? fromMovement(movement)
      : {
          slug: '',
          name_ko: '',
          name_en: '',
          category: categories[0]?.slug ?? '',
          equipment: '',
          difficulty_level: '1',
          primary_muscles: '',
          coaching_points: '',
          thumbnail_url: '',
          video_url: '',
          is_active: true,
        },
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = (): string | null => {
    if (!form.slug.trim()) return 'slug를 입력하세요 (UNIQUE).';
    if (!form.name_ko.trim() || !form.name_en.trim()) return '한글/영문 이름을 모두 입력하세요.';
    if (!form.category) return '카테고리를 선택하세요.';
    const d = Number(form.difficulty_level);
    if (!Number.isInteger(d) || d < 1 || d > 5) return '난이도는 1~5 정수여야 합니다.';
    return null;
  };

  const doSave = async () => {
    const client = getSupabaseBrowserClient();
    const payload = {
      slug: form.slug.trim(),
      name_ko: form.name_ko.trim(),
      name_en: form.name_en.trim(),
      category: form.category,
      equipment: toList(form.equipment),
      difficulty_level: Number(form.difficulty_level),
      primary_muscles: toList(form.primary_muscles),
      coaching_points: form.coaching_points.trim() || null,
      thumbnail_url: form.thumbnail_url.trim() || null,
      video_url: form.video_url.trim() || null,
      is_active: form.is_active,
    };
    setSaving(true);
    setError(null);
    // ⏳ 직접 쓰기(RPC 부재) — RLS: staff insert/update 허용
    const res = movement
      ? await query(client, 'movement_library', (q) =>
          q.update(payload).eq('id', movement.id).select('id').single(),
        )
      : await query(client, 'movement_library', (q) => q.insert(payload).select('id').single());
    setSaving(false);
    if (!res.success) {
      const msg = res.error ?? '';
      setError(
        msg.includes('duplicate') || msg.includes('unique')
          ? '이미 존재하는 slug입니다.'
          : msg || '저장에 실패했습니다.',
      );
      return;
    }
    toast.success(movement ? '동작을 수정했습니다.' : '동작을 추가했습니다.');
    onSaved();
  };

  const onPrimary = () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    void doSave();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={movement ? '동작 편집' : '새 동작'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button variant="primary" onClick={onPrimary} loading={saving}>
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
            label="slug (UNIQUE)"
            value={form.slug}
            onChange={(e) => set('slug', e.target.value)}
          />
          <Select
            label="카테고리"
            value={form.category}
            onChange={(v) => set('category', v)}
            options={categories.map((c) => ({ value: c.slug, label: c.name_ko }))}
          />
        </div>

        <div className={styles.formRow}>
          <Input
            label="이름 (한글)"
            value={form.name_ko}
            onChange={(e) => set('name_ko', e.target.value)}
          />
          <Input
            label="이름 (영문)"
            value={form.name_en}
            onChange={(e) => set('name_en', e.target.value)}
          />
        </div>

        <div className={styles.formRow}>
          <Input
            label="난이도 (1~5)"
            type="number"
            value={form.difficulty_level}
            onChange={(e) => set('difficulty_level', e.target.value)}
          />
          <Input
            label="장비 (콤마 구분)"
            value={form.equipment}
            placeholder="barbell, plates"
            onChange={(e) => set('equipment', e.target.value)}
          />
        </div>

        <Input
          label="주요 근육 (콤마 구분, 선택)"
          value={form.primary_muscles}
          onChange={(e) => set('primary_muscles', e.target.value)}
        />
        <Input
          label="코칭 포인트 (선택)"
          multiline
          value={form.coaching_points}
          onChange={(e) => set('coaching_points', e.target.value)}
        />

        <div className={styles.formRow}>
          <Input
            label="썸네일 URL (선택)"
            value={form.thumbnail_url}
            onChange={(e) => set('thumbnail_url', e.target.value)}
          />
          <Input
            label="영상 URL (선택)"
            value={form.video_url}
            onChange={(e) => set('video_url', e.target.value)}
          />
        </div>

        <Checkbox
          label="활성 (끄면 검색·목록에서 숨김)"
          checked={form.is_active}
          onChange={(e) => set('is_active', e.target.checked)}
        />
      </div>
    </Modal>
  );
}
