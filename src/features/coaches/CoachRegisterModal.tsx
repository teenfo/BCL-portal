'use client';

// 코치 등록 2-Step (02-admin §3.7 manage)
// Step 1 프로필(name/email/phone/전문분야/소개) → Step 2 계정 연결(선택).
// 프로필 저장 = coaches 직접 INSERT(admin RLS, user_id null=미연결). ⏳ audit: 전용 RPC 부재 — 후속 audit 대상.
// 계정 연결 시: coaches.user_id 세팅 후 promote_to_coach(user_id) 호출(프로필 role 전환 + audit).
import { useMemo, useState } from 'react';
import { Modal, Button, Input, Select, Card, useToast } from '@/components/ui';
import { query, rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { type LinkableProfile, coachRpcError, parseSpecialties } from './types';
import styles from './coaches.module.css';

interface Props {
  open: boolean;
  linkable: LinkableProfile[];
  onClose: () => void;
  onSaved: () => void;
}

export function CoachRegisterModal({ open, linkable, onClose, onSaved }: Props) {
  const toast = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [bio, setBio] = useState('');
  const [linkUserId, setLinkUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const accountOptions = useMemo(
    () => [
      { value: '', label: '연결 안 함 (미연결 코치로 등록)' },
      ...linkable.map((p) => ({
        value: p.id,
        label: `${p.name ?? '이름 미상'} · ${p.email ?? '이메일 없음'}`,
      })),
    ],
    [linkable],
  );

  const next = () => {
    if (!name.trim()) {
      setError('코치 이름을 입력하세요.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const submit = async () => {
    const client = getSupabaseBrowserClient();
    setSaving(true);
    setError(null);

    // 1) coaches 프로필 INSERT (미연결)
    const ins = await query<{ id: string }>(client, 'coaches', (q) =>
      q
        .insert({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          specialties: parseSpecialties(specialties),
          bio: bio.trim() || null,
          status: 'active',
        })
        .select('id')
        .single(),
    );
    if (!ins.success || !ins.data) {
      setSaving(false);
      setError(ins.error ?? '코치 등록에 실패했습니다.');
      return;
    }

    // 2) 계정 연결(선택): coaches.user_id 세팅 → promote_to_coach(role 전환 + audit)
    if (linkUserId) {
      const upd = await query(client, 'coaches', (q) =>
        q.update({ user_id: linkUserId, linked_at: new Date().toISOString(), status: 'active' }).eq('id', ins.data!.id),
      );
      if (!upd.success) {
        setSaving(false);
        setError(`코치는 등록됐으나 계정 연결에 실패했습니다: ${upd.error ?? ''}`);
        onSaved();
        return;
      }
      const promo = await rpc(client, 'promote_to_coach', { p_target_user_id: linkUserId });
      if (!promo.success) {
        setSaving(false);
        setError(`코치는 등록됐으나 권한 전환에 실패했습니다: ${coachRpcError(promo.error)}`);
        onSaved();
        return;
      }
    }

    setSaving(false);
    toast.success(linkUserId ? '코치를 등록하고 계정을 연결했습니다.' : '코치를 등록했습니다 (계정 미연결).');
    onSaved();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="코치 등록"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            취소
          </Button>
          {step === 2 ? (
            <Button variant="ghost" onClick={() => setStep(1)} disabled={saving}>
              이전
            </Button>
          ) : null}
          {step === 1 ? (
            <Button variant="primary" onClick={next}>
              다음
            </Button>
          ) : (
            <Button variant="primary" onClick={submit} loading={saving}>
              등록
            </Button>
          )}
        </>
      }
    >
      <div className={styles.form}>
        <div className={styles.stepper}>
          <span className={step === 1 ? styles.stepActive : undefined}>1. 프로필</span>
          <span className={styles.stepDivider}>›</span>
          <span className={step === 2 ? styles.stepActive : undefined}>2. 계정 연결</span>
        </div>

        {error ? (
          <Card variant="accent">
            <span className={styles.errorText}>{error}</span>
          </Card>
        ) : null}

        {step === 1 ? (
          <>
            <Input label="이름" value={name} onChange={(e) => setName(e.target.value)} />
            <div className={styles.formRow}>
              <Input label="이메일 (선택)" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input label="전화 (선택)" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <Input
              label="전문분야 (쉼표로 구분)"
              value={specialties}
              onChange={(e) => setSpecialties(e.target.value)}
              helper="예: 로잉, 올림픽 리프팅, 컨디셔닝"
            />
            <Input label="소개 (선택)" multiline value={bio} onChange={(e) => setBio(e.target.value)} />
          </>
        ) : (
          <>
            <p className={styles.note}>
              가입 승인된 회원 계정을 코치로 연결합니다. 연결하면 해당 계정의 권한이 코치로 전환됩니다.
              지금 연결하지 않고 미연결 코치로 등록한 뒤 나중에 연결할 수 있습니다.
            </p>
            <Select
              label="연결할 계정"
              value={linkUserId ?? ''}
              onChange={(v) => setLinkUserId(v || null)}
              searchable
              options={accountOptions}
            />
          </>
        )}
      </div>
    </Modal>
  );
}
