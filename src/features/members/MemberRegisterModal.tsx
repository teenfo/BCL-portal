'use client';

// 회원 등록 모달 (02-admin §3.2) — 계정 미연결 허용(members.user_id nullable)
// members 직접 INSERT (admin RLS FOR ALL) — query() 경유.
import { useState } from 'react';
import { Modal, Button, Input, Select, Card, useToast } from '@/components/ui';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from './members.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function MemberRegisterModal({ open, onClose, onSaved }: Props) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState<string>('');
  const [emergency, setEmergency] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      setError('회원 이름을 입력하세요.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      birthday: birthday || null,
      gender: gender || null,
      emergency_contact: emergency.trim() || null,
    };
    const res = await query(getSupabaseBrowserClient(), 'members', (q) =>
      q.insert(payload).select().single(),
    );
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? '회원 등록에 실패했습니다.');
      return;
    }
    toast.success('회원을 등록했습니다.');
    onSaved();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="회원 등록"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button variant="primary" onClick={submit} loading={saving}>
            등록
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

        <Input label="이름" value={name} onChange={(e) => setName(e.target.value)} />
        <div className={styles.formRow}>
          <Input label="연락처" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label="이메일 (선택)" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className={styles.formRow}>
          <Input
            label="생일 (선택)"
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
          />
          <Select
            label="성별 (선택)"
            value={gender || null}
            onChange={setGender}
            placeholder="선택 안 함"
            options={[
              { value: 'male', label: '남성' },
              { value: 'female', label: '여성' },
              { value: 'other', label: '기타' },
            ]}
          />
        </div>
        <Input
          label="비상 연락처 (선택)"
          value={emergency}
          onChange={(e) => setEmergency(e.target.value)}
        />
        <p className={styles.cellSub}>
          계정 미연결 회원으로 등록됩니다. 동일 이메일로 가입 시 자동 연결됩니다.
        </p>
      </div>
    </Modal>
  );
}
