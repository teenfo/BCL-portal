'use client';

// profile §앱 설정 — members.preferences (랭킹 익명 표시·주간 목표). 본인 update.
// 참고: 테마는 회원 앱이 light/mobile 고정(ThemeScope) — 테마 토글은 범위 외.
import { useState } from 'react';
import { Button, Checkbox, Input, useToast } from '@/components/ui';
import { BottomSheet } from '@/features/member-shell';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { MemberProfile } from '../types';
import styles from '../profile.module.css';

export function AppSettingsSheet({
  member,
  onClose,
  onSaved,
}: {
  member: MemberProfile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const prefs = member.preferences ?? {};
  const [anonymous, setAnonymous] = useState(Boolean(prefs['anonymous_ranking']));
  const [weeklyGoal, setWeeklyGoal] = useState(
    prefs['weekly_goal'] != null ? String(prefs['weekly_goal']) : '',
  );
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const next = {
      ...prefs,
      anonymous_ranking: anonymous,
      weekly_goal: weeklyGoal ? Number(weeklyGoal) : null,
    };
    const res = await query(getSupabaseBrowserClient(), 'members', (q) =>
      q.update({ preferences: next }).eq('id', member.id),
    );
    setBusy(false);
    if (!res.success) {
      toast.error(res.error ?? '저장에 실패했습니다.');
      return;
    }
    toast.success('앱 설정이 저장되었습니다.');
    onSaved();
    onClose();
  };

  return (
    <BottomSheet
      variant="auto"
      title="앱 설정"
      onClose={onClose}
      footer={
        <Button variant="primary" block loading={busy} onClick={save}>
          저장
        </Button>
      }
    >
      <div className={styles.toggleRow}>
        <Checkbox
          label="랭킹에서 내 이름 익명 처리"
          checked={anonymous}
          onChange={(e) => setAnonymous(e.target.checked)}
        />
      </div>
      <Input
        label="주간 운동 목표 (회)"
        type="number"
        inputMode="numeric"
        value={weeklyGoal}
        onChange={(e) => setWeeklyGoal(e.target.value)}
        helper="선택 입력"
      />
    </BottomSheet>
  );
}
