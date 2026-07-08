// 코치 앱 공용 포맷 헬퍼

/** Postgres time("18:00:00") → "18:00" */
export function hhmm(time: string | null | undefined): string {
  if (!time) return '--:--';
  return time.slice(0, 5);
}

const FOLLOWUP_TYPE_KO: Record<string, string> = {
  injury: '부상',
  trial_conversion: '체험 전환',
  renewal: '재등록',
  absence: '장기 결석',
  motivation: '동기부여',
};

export function followupTypeLabel(type: string): string {
  return FOLLOWUP_TYPE_KO[type] ?? type;
}

const FLAG_TYPE_KO: Record<string, string> = {
  trial: '체험',
  injury: '부상',
  renewal_due: '만기 임박',
  returning_after_absence: '복귀',
  vip_attention: 'VIP',
};

export function flagTypeLabel(type: string): string {
  return FLAG_TYPE_KO[type] ?? type;
}
