'use client';

// profile §내 정보 — members 본인 행 수정 (RLS "members own update") + 아바타 Storage 업로드.
import { useRef, useState } from 'react';
import { Button, Input, useToast } from '@/components/ui';
import { BottomSheet } from '@/features/member-shell';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { MemberProfile } from '../types';
import styles from '../profile.module.css';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export function ProfileInfoSheet({
  member,
  onClose,
  onSaved,
}: {
  member: MemberProfile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(member.name ?? '');
  const [phone, setPhone] = useState(member.phone ?? '');
  const [birthday, setBirthday] = useState(member.birthday ?? '');
  const [emergency, setEmergency] = useState(member.emergency_contact ?? '');
  const [avatarUrl, setAvatarUrl] = useState(member.avatar_url ?? '');
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 아바타 업로드 — Storage 경로는 auth.uid() 폴더(RLS 기준), members.avatar_url 갱신.
  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일 재선택 허용
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('2MB 이하 이미지만 업로드할 수 있습니다.');
      return;
    }
    setUploading(true);
    try {
      const client = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) {
        toast.error('로그인이 필요합니다.');
        return;
      }
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/avatar.${ext}`;
      const up = await client.storage.from('avatars').upload(path, file, {
        upsert: true,
        cacheControl: '3600',
      });
      if (up.error) {
        toast.error('업로드에 실패했습니다.');
        return;
      }
      const { data: pub } = client.storage.from('avatars').getPublicUrl(path);
      const url = `${pub.publicUrl}?v=${Date.now()}`; // 캐시 버스트
      const res = await query(client, 'members', (q) =>
        q.update({ avatar_url: url }).eq('id', member.id),
      );
      if (!res.success) {
        toast.error(res.error ?? '저장에 실패했습니다.');
        return;
      }
      setAvatarUrl(url);
      toast.success('프로필 사진이 변경되었습니다.');
      onSaved();
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error('이름을 입력해주세요.');
      return;
    }
    setBusy(true);
    const res = await query(getSupabaseBrowserClient(), 'members', (q) =>
      q
        .update({
          name: name.trim(),
          phone: phone || null,
          birthday: birthday || null,
          emergency_contact: emergency || null,
        })
        .eq('id', member.id),
    );
    setBusy(false);
    if (!res.success) {
      toast.error(res.error ?? '저장에 실패했습니다.');
      return;
    }
    toast.success('내 정보가 저장되었습니다.');
    onSaved();
    onClose();
  };

  return (
    <BottomSheet
      variant="auto"
      title="내 정보"
      onClose={onClose}
      footer={
        <Button variant="primary" block loading={busy} onClick={save}>
          저장
        </Button>
      }
    >
      <div className={styles.avatarEdit}>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="프로필 사진" className={styles.avatar} />
        ) : (
          <span className={`${styles.avatar} ${styles.avatarFallback}`}>
            {(name.trim()[0] ?? '·').toUpperCase()}
          </span>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={onPickFile}
        />
        <Button variant="soft" size="sm" loading={uploading} onClick={() => fileRef.current?.click()}>
          사진 변경
        </Button>
      </div>

      <Input label="이름" value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="연락처" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <Input label="생일" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
      <Input label="비상 연락처" value={emergency} onChange={(e) => setEmergency(e.target.value)} helper="선택 입력" />
    </BottomSheet>
  );
}
