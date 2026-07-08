// datetime-local <-> ISO 변환 헬퍼 (CRM 콘텐츠 폼 공용)

/** ISO 문자열 → datetime-local 입력값(YYYY-MM-DDTHH:mm, 로컬 기준). null이면 빈 문자열 */
export function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** datetime-local 입력값 → ISO 문자열. 빈 값이면 null */
export function toIsoOrNull(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
