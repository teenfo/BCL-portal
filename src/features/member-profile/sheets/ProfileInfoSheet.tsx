'use client';

// profile §내 정보 — members 본인 행 수정 (RLS "members own update"). 아바타 Storage 업로드는 범위 외(FLAG).
import { useState } from 'react';
import { Button, Input, useToast } from '@/components/ui';
import { BottomSheet } from '@/features/member-shell';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { MemberProfile } from '../types';

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
  const [busy, setBusy] = useState(false);

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
      <Input label="이름" value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="연락처" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <Input label="생일" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
      <Input label="비상 연락처" value={emergency} onChange={(e) => setEmergency(e.target.value)} helper="선택 입력" />
    </BottomSheet>
  );
}
