// ─────────────────────────────────────────────────────────────────────────────
// Priority 25 (코치앱 P2) — 퍼포먼스 / 후속 액션 / Race 재통합 타입
// DB: supabase/migrations/20260705100000_p2_performance_followup.sql
// ─────────────────────────────────────────────────────────────────────────────

export type FollowupType = 'injury' | 'trial_conversion' | 'renewal' | 'absence' | 'motivation';
export type FollowupPriority = 'low' | 'normal' | 'high';
export type FollowupStatus = 'open' | 'completed' | 'dismissed';

export interface CoachFollowup {
    id: string;
    member_id: string;
    member_name?: string;
    session_id: string | null;
    followup_type: FollowupType;
    priority: FollowupPriority;
    status: FollowupStatus;
    due_date: string | null;
    note: string | null;
    created_at: string;
    completed_at: string | null;
    is_overdue?: boolean;
}

export const FOLLOWUP_TYPE_META: Record<FollowupType, { label: string; emoji: string; color: string }> = {
    injury: { label: '부상 케어', emoji: '🩹', color: '#EF4444' },
    trial_conversion: { label: '체험 전환', emoji: '🎟', color: '#3B82F6' },
    renewal: { label: '재등록 상담', emoji: '⏳', color: '#F59E0B' },
    absence: { label: '장기 결석', emoji: '📭', color: '#A78BFA' },
    motivation: { label: '동기부여', emoji: '🔥', color: '#22C55E' },
};

export type BenchmarkMetricType = 'time' | 'reps' | 'weight' | 'distance' | 'calories';

export interface BenchmarkDefinition {
    id: string;
    facility_id: string | null;
    name: string;
    metric_type: BenchmarkMetricType;
    unit: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
}

export interface BenchmarkBest {
    benchmark_id: string;
    name: string;
    metric_type: BenchmarkMetricType;
    unit: string;
    best_value: number;
    attempt_count: number;
    last_recorded_at: string;
}

export interface BenchmarkResultRow {
    id: string;
    benchmark_id: string;
    name: string;
    metric_type: BenchmarkMetricType;
    unit: string;
    result_value: number;
    is_pr: boolean;
    session_id: string | null;
    race_event_id: string | null;
    recorded_at: string;
}

export interface RaceRecordSummary {
    id: string;
    event_id: string;
    event_name: string;
    event_date: string;
    result_time_sec: number | null;
    result_distance: number | null;
    avg_watts: number | null;
    max_watts: number | null;
    finish_rank: number | null;
    is_pr: boolean;
}

export interface MemberPerformanceProfile {
    member_id: string;
    benchmark_bests: BenchmarkBest[];
    recent_results: BenchmarkResultRow[];
    race_records: RaceRecordSummary[];
    benchmark_pr_count: number;
    race_pr_count: number;
}

/** metric_type=time인 벤치마크 결과(초)를 mm:ss.s 로 표기 */
export function formatBenchmarkValue(value: number, metricType: BenchmarkMetricType, unit: string): string {
    if (metricType === 'time') {
        const m = Math.floor(value / 60);
        const s = value % 60;
        return `${m}:${s < 10 ? '0' : ''}${Number.isInteger(s) ? s : s.toFixed(1)}`;
    }
    return `${value} ${unit}`.trim();
}
