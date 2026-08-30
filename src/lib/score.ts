// rounds_reps 점수 인코딩 계약 — 앱 중립 단일 소스 (src/lib/brand.ts 선례).
// numeric 컬럼 1개에 라운드+횟수를 담는 소수 인코딩: value = rounds + min(99, reps)/100
// (예: 5R+12 → 5.12). 작성(회원 앱 WodRecordSheet)·해석(회원 앱 formatScore, TV 화이트보드
// formatBoardScore)이 이 모듈만 사용한다 — 로컬 재구현이 드리프트 실결함('72 rd')을 낸 이력.

/** 라운드+횟수 → 소수 인코딩 값(reps는 2자리 캡) */
export function encodeRoundsReps(rounds: number, reps: number): number {
  return rounds + Math.min(99, Math.max(0, reps)) / 100;
}

/** 소수 인코딩 값 → 라운드/횟수 복원 */
export function decodeRoundsReps(value: number): { rounds: number; reps: number } {
  const rounds = Math.floor(value);
  const reps = Math.round((value - rounds) * 100);
  return { rounds, reps };
}

/** 표준 표기: `5R+12` / 잔여 reps 없으면 `5R` */
export function formatRoundsReps(value: number): string {
  const { rounds, reps } = decodeRoundsReps(value);
  return reps > 0 ? `${rounds}R+${reps}` : `${rounds}R`;
}
