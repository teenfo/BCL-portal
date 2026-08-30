// 일일 WOD 화이트보드 공용 데이터 계층 — fn_get_class_wod_board(anon, Display-Safe).
// 전체화면 보드(class-leaderboard/WodBoard)와 수업 플로우 스트립(class-console/FlowMode)이
// 동일 타입·페처·포맷터를 공유한다(중복 정의 금지 — 이 파일이 단일 소스).
import { rpc, type Envelope } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export type RxStatus = 'rx_plus' | 'rx' | 'scaled';
export type ScoreType = 'time' | 'reps' | 'rounds_reps' | 'weight' | 'distance' | 'calories';

export interface WodBoardResult {
  rank: number;
  member_name: string;
  score: number;
  score_type: ScoreType;
  rx_status: RxStatus;
  /** 기록 시각 — 기록순 정렬 옵션용(2-1) */
  created_at?: string;
}

/** 리더보드 정렬 옵션(2-1, SugarWOD 패턴) — rank=점수순(서버 계층 정렬) / recent=기록순 / name=이름순 */
export type BoardSort = 'rank' | 'recent' | 'name';

export function sortBoardRows(rows: WodBoardResult[], sort: BoardSort): WodBoardResult[] {
  if (sort === 'recent') {
    return [...rows].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  }
  if (sort === 'name') {
    return [...rows].sort((a, b) => a.member_name.localeCompare(b.member_name, 'ko'));
  }
  return rows; // rank — 서버 계층 정렬(Rx+→Rx→Scaled + score_type 방향) 그대로
}

export interface WodBoardData {
  session_id: string;
  session_title: string | null;
  session_date: string | null;
  wod_title: string | null;
  format: string | null;
  results: WodBoardResult[];
}

export const RX_BADGE_LABEL: Record<RxStatus, string> = {
  rx_plus: 'RX+',
  rx: 'RX',
  scaled: 'SC',
};

/** 점수 표시 — score_type별 해석(rounds_reps는 rounds + reps/100 소수 인코딩, WodRecordSheet 정합) */
export function formatBoardScore(score: number, type: ScoreType): string {
  switch (type) {
    case 'time': {
      const m = Math.floor(score / 60);
      const s = Math.floor(score % 60);
      return `${m}:${s < 10 ? '0' + s : s}`;
    }
    case 'weight':
      return `${score}kg`;
    case 'distance':
      return `${Math.round(score)}m`;
    case 'calories':
      return `${Math.round(score)}cal`;
    case 'rounds_reps': {
      const rounds = Math.floor(score);
      const reps = Math.round((score - rounds) * 100);
      return reps > 0 ? `${rounds}R+${reps}` : `${rounds}R`;
    }
    case 'reps':
    default:
      return `${score} reps`;
  }
}

export function fetchWodBoard(sessionId: string): Promise<Envelope<WodBoardData>> {
  return rpc<WodBoardData>(getSupabaseBrowserClient(), 'fn_get_class_wod_board', {
    p_session_id: sessionId,
  });
}
