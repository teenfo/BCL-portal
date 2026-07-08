'use client';

// 코치 편집 (02-admin §3.7 manage) — 전문분야/소개 + 급여(base_salary/session_allowance)
// 급여·프로필 쓰기 = coaches 직접 UPDATE(admin RLS). ⏳ audit: 전용 RPC 부재 — 급여 변경은 후속 audit 대상.
// 급여 변경 시 "적용 시작 월 명시" 인라인 안내(정산 Basis 영향).
import { useState } from 'react';
import { Modal, Button, Input, Card, useToast } from '@/components/ui';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { type CoachRow, parseSpecialties } from './types';
import styles from './coaches.module.css';

interface Props {
  open: boolean;
  coach: CoachRow;
  onClose: () => void;
  onSaved: () => void;
}

export function CoachEditModal({ open, coach, onClose, onSaved }: Props) {
  const toast = useToast();
  const [name, setName] = useState(coach.name);
  const [email, setEmail] = useState(coach.email ?? '');
  const [phone, setPhone] = useState(coach.phone ?? '');
  const [specialties, setSpecialties] = useState((coach.specialties ?? []).join(', '));
  const [bio, setBio] = useState(coach.bio ?? '');
  const [baseSalary, setBaseSalary] = useState(String(coach.base_salary));
  const [sessionAllowance, setSessionAllowance] = useState(String(coach.session_allowance));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const salaryChanged =
    Number(baseSalary) !== coach.base_salary || Number(sessionAllowance) !== coach.session_allowance;

  const save = async () => {
    if (!name.trim()) {
      setError('코치 이름을 입력하세요.');
      return;
    }
    const base = Number(baseSalary);
    const allowance = Number(sessionAllowance);
    if (!Number.isFinite(base) || base < 0 || !Number.isFinite(allowance) || allowance < 0) {
      setError('급여 값은 0 이상이어야 합니다.');
      return;
    }
    setSaving(true);
    setError(null);
    const res = await query(getSupabaseBrowserClient(), 'coaches', (q) =>
      q
        .update({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          specialties: parseSpecialties(specialties),
          bio: bio.trim() || null,
          base_salary: base,
          session_allowance: allowance,
        })
        .eq('id', coach.id),
    );
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? '저장에 실패했습니다.');
      return;
    }
    toast.success('코치 정보를 수정했습니다.');
    onSaved();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="코치 편집"
      size="md"
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
        {error ? (
          <Card variant="accent">
            <span className={styles.errorText}>{error}</span>
          </Card>
        ) : null}

        <Input label="이름" value={name} onChange={(e) => setName(e.target.value)} />
        <div className={styles.formRow}>
          <Input label="이메일 (선택)" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="전화 (선택)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <Input
          label="전문분야 (쉼표로 구분)"
          value={specialties}
          onChange={(e) => setSpecialties(e.target.value)}
        />
        <Input label="소개 (선택)" multiline value={bio} onChange={(e) => setBio(e.target.value)} />

        <div className={styles.formRow}>
          <Input
            label="기본급 (월, 원)"
            type="number"
            value={baseSalary}
            onChange={(e) => setBaseSalary(e.target.value)}
          />
          <Input
            label="세션당 수당 (원)"
            type="number"
            value={sessionAllowance}
            onChange={(e) => setSessionAllowance(e.target.value)}
          />
        </div>

        {salaryChanged ? (
          <Card variant="accent">
            <span className={styles.note}>
              급여를 변경하면 <strong>이번 달 정산분부터</strong> 반영됩니다(정산 Basis 영향). ⏳ 변경
              이력 감사(audit)는 후속 audit RPC 도입 시 기록됩니다.
            </span>
          </Card>
        ) : null}
      </div>
    </Modal>
  );
}
