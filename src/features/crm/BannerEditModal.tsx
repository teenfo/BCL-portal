'use client';

// 배너 생성/편집 모달 (02-admin §3.13)
// 직접 INSERT/UPDATE(banners, admin RLS). ⏳ audit_logs 기록은 서버 RPC 경로 필요.
// ⏳ 이미지 파일 업로드(Storage, 10MB)는 범위 외 — 현재는 image_url 직접 입력.
import { useState } from 'react';
import { Modal, Button, Input, Select, Checkbox, Card } from '@/components/ui';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Banner } from './types';
import { toLocalInput, toIsoOrNull } from './datetime';
import styles from './crm.module.css';

interface Props {
  banner: Banner | null;
  onClose: () => void;
  onSaved: () => void;
}

function defaultStart(): string {
  return toLocalInput(new Date().toISOString());
}
function defaultEnd(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return toLocalInput(d.toISOString());
}

export function BannerEditModal({ banner, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(banner?.title ?? '');
  const [description, setDescription] = useState(banner?.description ?? '');
  const [imageUrl, setImageUrl] = useState(banner?.image_url ?? '');
  const [linkUrl, setLinkUrl] = useState(banner?.link_url ?? '');
  const [position, setPosition] = useState<Banner['position']>(banner?.position ?? 'home_top');
  const [priorityOrder, setPriorityOrder] = useState(String(banner?.priority_order ?? 0));
  const [startDate, setStartDate] = useState(banner ? toLocalInput(banner.start_date) : defaultStart());
  const [endDate, setEndDate] = useState(banner ? toLocalInput(banner.end_date) : defaultEnd());
  const [isActive, setIsActive] = useState(banner?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const doSave = async () => {
    if (!title.trim()) {
      setError('제목을 입력하세요.');
      return;
    }
    const startIso = toIsoOrNull(startDate);
    const endIso = toIsoOrNull(endDate);
    if (!startIso || !endIso) {
      setError('노출 시작/종료 일시를 입력하세요.');
      return;
    }
    if (new Date(endIso) <= new Date(startIso)) {
      setError('종료 일시는 시작 일시보다 뒤여야 합니다.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      image_url: imageUrl.trim() || null,
      link_url: linkUrl.trim() || null,
      position,
      priority_order: Number(priorityOrder) || 0,
      start_date: startIso,
      end_date: endIso,
      is_active: isActive,
    };
    const client = getSupabaseBrowserClient();
    const res = banner
      ? await query(client, 'banners', (q) => q.update(payload).eq('id', banner.id))
      : await query(client, 'banners', (q) => q.insert(payload));
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
      title={banner ? '배너 편집' : '새 배너'}
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

        <Input label="제목" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input label="설명 (선택)" multiline rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        <Input
          label="이미지 URL"
          helper="파일 업로드(Storage, 10MB)는 추후 — 현재는 이미지 URL 직접 입력"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
        <Input label="링크 URL (선택)" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />

        <div className={styles.formRow}>
          <Select
            label="노출 위치"
            value={position}
            onChange={(v) => setPosition(v as Banner['position'])}
            options={[
              { value: 'home_top', label: '홈 상단' },
              { value: 'home_mid', label: '홈 중단' },
              { value: 'home_bottom', label: '홈 하단' },
              { value: 'popup', label: '팝업' },
              { value: 'event', label: '이벤트' },
            ]}
          />
          <Input label="노출 순서" type="number" value={priorityOrder} onChange={(e) => setPriorityOrder(e.target.value)} />
        </div>

        <div className={styles.formRow}>
          <Input label="노출 시작" type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input label="노출 종료" type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        <Checkbox label="활성 (끄면 비노출)" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
      </div>
    </Modal>
  );
}
