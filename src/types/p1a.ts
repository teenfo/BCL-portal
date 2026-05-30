/**
 * Priority 23 P1-A — 수업 표준화 + 회원 컨텍스트 DTO 타입
 *
 * Supabase 타입 자동 생성(`src/types/supabase.ts`)은 마이그레이션 적용 후 별도
 * 갱신되지만, 그 사이 Phase 2/3 UI 작업에서 사용할 수 있도록 응답 shape과
 * payload shape을 수동 정의합니다.
 *
 * 모든 RPC는 SECURITY DEFINER + envelope `{ success, status, data, error }` 패턴을
 * 따릅니다. 마이그레이션 본문: supabase/migrations/20260426120000_p1a_class_standardization.sql
 */

// ============================================================
// Envelope
// ============================================================

export type RpcEnvelope<T> =
    | {
        success: true;
        status: string; // 'ok' | 'created' | 'updated' | 'published' | ...
        data: T;
        error: null;
    }
    | {
        success: false;
        status: string; // 'error' | 'forbidden' | 'not_found' | 'invalid_payload' | ...
        data: null;
        error: string;
    };

// ============================================================
// Domain Enums
// ============================================================

export type MovementCategory =
    | 'weightlifting'
    | 'gymnastics'
    | 'monostructural'
    | 'dumbbell'
    | 'kettlebell'
    | 'medball'
    | 'other_equipment'
    | 'accessory';

export type WodTemplateKind =
    | 'daily'
    | 'benchmark'
    | 'skill'
    | 'strength'
    | 'conditioning';

export type WodFormatType =
    | 'for_time'
    | 'amrap'
    | 'emom'
    | 'tabata'
    | 'chipper'
    | 'strength'
    | 'custom'
    | 'station_circuit';

export type SessionWodPublishState = 'draft' | 'published' | 'archived';

export type MemberAlertFlagType =
    | 'trial'
    | 'injury'
    | 'renewal_due'
    | 'returning_after_absence'
    | 'vip_attention';

export type MemberAlertSeverity = 'info' | 'warning' | 'critical';

export type WodTemplateScope = 'shared' | 'facility' | 'benchmark';

// ============================================================
// Tables — Row shapes
// ============================================================

export interface MovementLibraryRow {
    id: string;
    slug: string;
    name_ko: string;
    name_en: string;
    category: MovementCategory;
    equipment: string[];
    difficulty_level: number; // 1-5
    primary_muscles: string[];
    coaching_points: string | null;
    source_tag: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface WodTemplateRow {
    id: string;
    facility_id: string | null;
    template_kind: WodTemplateKind;
    title: string;
    format_type: WodFormatType | null;
    time_cap_minutes: number | null;
    rounds: number | null;
    description: string | null;
    public_notes: string | null;
    coach_notes: string | null;
    is_shared: boolean;
    is_benchmark: boolean;
    created_by: string | null;
    updated_by: string | null;
    published_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface WodTemplateMovementRow {
    id: string;
    wod_template_id: string;
    sort_order: number;
    movement_id: string | null;
    /** movement_library.name_ko — fn_list_wod_templates에서 JOIN하여 반환 */
    movement_name_ko: string | null;
    /** movement_library.name_en — fn_list_wod_templates에서 JOIN하여 반환 */
    movement_name_en: string | null;
    custom_label: string | null;
    target_value: number | null;
    target_unit: string | null;
    distance_meters: number | null;
    duration_seconds: number | null;
    load_male_rx: string | null;
    load_female_rx: string | null;
    rx_notes: string | null;
    scaling_notes: string | null;
    created_at: string;
}

export interface SessionWodRow {
    id: string;
    session_id: string;
    template_id: string | null;
    publish_state: SessionWodPublishState;
    source_version: number;
    title_override: string | null;
    format_override: WodFormatType | null;
    time_cap_override: number | null;
    description_override: string | null;
    movements_snapshot: WodMovementSnapshot[];
    coach_notes: string | null;
    class_display_notes: string | null;
    edited_by: string | null;
    published_by: string | null;
    published_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface WodMovementSnapshot {
    sort_order: number;
    movement_id: string | null;
    name: string;
    custom_label: string | null;
    target_value: number | null;
    target_unit: string | null;
    distance_meters: number | null;
    duration_seconds: number | null;
    load_male_rx: string | null;
    load_female_rx: string | null;
    rx_notes: string | null;
    scaling_notes: string | null;
}

export interface ClassRunbookTemplateRow {
    id: string;
    facility_id: string;
    class_type: string | null;
    name: string;
    warmup: string | null;
    movement_prep: string | null;
    scaling_options: string | null;
    coach_cues: string | null;
    safety_notes: string | null;
    finish_notes: string | null;
    default_wod_template_id: string | null;
    is_default: boolean;
    created_by: string | null;
    updated_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface SessionRunbookRow {
    id: string;
    session_id: string;
    template_id: string | null;
    session_wod_id: string | null;
    warmup_override: string | null;
    movement_prep_override: string | null;
    scaling_override: string | null;
    cue_override: string | null;
    safety_override: string | null;
    finish_note_override: string | null;
    published_at: string | null;
    updated_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface MemberAlertFlagRow {
    id: string;
    member_id: string;
    flag_type: MemberAlertFlagType;
    severity: MemberAlertSeverity;
    starts_at: string;
    ends_at: string | null;
    note: string | null;
    created_by: string | null;
    resolved_by: string | null;
    resolved_at: string | null;
    created_at: string;
    updated_at: string;
}

// ============================================================
// RPC Payloads
// ============================================================

export interface UpsertWodTemplatePayload {
    id?: string;
    facility_id?: string | null;
    template_kind?: WodTemplateKind;
    title: string;
    format_type?: WodFormatType | null;
    time_cap_minutes?: number | null;
    rounds?: number | null;
    description?: string | null;
    public_notes?: string | null;
    coach_notes?: string | null;
    is_shared?: boolean;
    is_benchmark?: boolean;
    publish?: boolean;
    movements: UpsertWodTemplateMovementPayload[];
}

export interface UpsertWodTemplateMovementPayload {
    sort_order: number;
    movement_id?: string | null;
    custom_label?: string | null;
    target_value?: number | null;
    target_unit?: string | null;
    distance_meters?: number | null;
    duration_seconds?: number | null;
    load_male_rx?: string | null;
    load_female_rx?: string | null;
    rx_notes?: string | null;
    scaling_notes?: string | null;
}

export interface UpsertSessionWodPayload {
    template_id?: string | null;
    title_override?: string | null;
    format_override?: WodFormatType | null;
    time_cap_override?: number | null;
    description_override?: string | null;
    coach_notes?: string | null;
    class_display_notes?: string | null;
    movements: UpsertWodTemplateMovementPayload[];
}

export interface UpsertRunbookTemplatePayload {
    id?: string;
    facility_id: string;
    class_type?: string | null;
    name: string;
    warmup?: string | null;
    movement_prep?: string | null;
    scaling_options?: string | null;
    coach_cues?: string | null;
    safety_notes?: string | null;
    finish_notes?: string | null;
    default_wod_template_id?: string | null;
    is_default?: boolean;
}

export interface UpsertSessionRunbookPayload {
    template_id?: string | null;
    session_wod_id?: string | null;
    warmup_override?: string | null;
    movement_prep_override?: string | null;
    scaling_override?: string | null;
    cue_override?: string | null;
    safety_override?: string | null;
    finish_note_override?: string | null;
}

export interface UpsertMemberAlertFlagPayload {
    id?: string;
    flag_type?: MemberAlertFlagType;
    severity?: MemberAlertSeverity;
    starts_at?: string;
    ends_at?: string | null;
    note?: string | null;
    resolved?: boolean;
}

// ============================================================
// RPC Response Data Shapes
// ============================================================

export interface WodTemplateWithMovements extends WodTemplateRow {
    movements: WodTemplateMovementRow[];
    facility_name?: string | null;
}

export interface SessionWodDetail extends SessionWodRow {
    template?: WodTemplateRow | null;
}

export interface ClassDisplayWod {
    session_id: string;
    title: string;
    format_type: WodFormatType | null;
    time_cap_minutes: number | null;
    description: string | null;
    class_display_notes: string | null;
    movements: WodMovementSnapshot[];
    published_at: string | null;
    source: 'session_wod' | 'template' | 'fallback';
}

export interface MemberContextPanel {
    member: {
        id: string;
        name: string;
        phone: string | null;
        gender: string | null;
        birth_date: string | null;
        facility_id: string;
        joined_at: string | null;
    };
    active_flags: MemberAlertFlagRow[];
    recent_notes: Array<{
        id: string;
        author_id: string | null;
        author_name: string | null;
        body: string;
        created_at: string;
    }>;
    attendance: {
        total_checkins: number;
        last_checkin: string | null;
        thirty_day_count: number;
    };
    active_membership: {
        plan_name: string;
        end_date: string;
        days_until_expiry: number;
        status: string;
    } | null;
}

// ============================================================
// RPC Function Type Index
// ============================================================

/**
 * 14개 P1-A RPC 시그니처. 호출은 `rpc()` 헬퍼(`src/lib/supabase/query.ts`)로
 * 진행하고, 응답은 아래 타입으로 캐스팅하여 사용하세요.
 *
 * @example
 * const res = await rpc('fn_get_member_context_panel', { p_member_id: id });
 * const data = res.data as RpcEnvelope<MemberContextPanel>;
 */
export interface P1aRpcMap {
    fn_search_wod_movements: {
        args: { p_query?: string | null; p_category?: MovementCategory | null; p_equipment?: string | null; p_limit?: number };
        returns: RpcEnvelope<MovementLibraryRow[]>;
    };
    fn_list_wod_templates: {
        args: { p_scope?: WodTemplateScope; p_facility_id?: string | null; p_template_kind?: WodTemplateKind | null };
        returns: RpcEnvelope<WodTemplateWithMovements[]>;
    };
    fn_upsert_wod_template: {
        args: { p_payload: UpsertWodTemplatePayload };
        returns: RpcEnvelope<WodTemplateWithMovements>;
    };
    fn_get_session_wod: {
        args: { p_session_id: string };
        returns: RpcEnvelope<SessionWodDetail | null>;
    };
    fn_upsert_session_wod: {
        args: { p_session_id: string; p_payload: UpsertSessionWodPayload };
        returns: RpcEnvelope<SessionWodDetail>;
    };
    fn_publish_session_wod: {
        args: { p_session_id: string };
        returns: RpcEnvelope<SessionWodDetail>;
    };
    fn_get_class_display_wod: {
        args: { p_session_id?: string | null; p_session_date?: string | null; p_facility_id?: string | null };
        returns: RpcEnvelope<ClassDisplayWod | null>;
    };
    fn_list_runbook_templates: {
        args: { p_facility_id: string; p_class_type?: string | null };
        returns: RpcEnvelope<ClassRunbookTemplateRow[]>;
    };
    fn_upsert_runbook_template: {
        args: { p_payload: UpsertRunbookTemplatePayload };
        returns: RpcEnvelope<ClassRunbookTemplateRow>;
    };
    fn_get_session_runbook: {
        args: { p_session_id: string };
        returns: RpcEnvelope<SessionRunbookRow | null>;
    };
    fn_upsert_session_runbook: {
        args: { p_session_id: string; p_payload: UpsertSessionRunbookPayload };
        returns: RpcEnvelope<SessionRunbookRow>;
    };
    fn_list_member_alert_flags: {
        args: { p_member_id: string };
        returns: RpcEnvelope<MemberAlertFlagRow[]>;
    };
    fn_upsert_member_alert_flag: {
        args: { p_member_id: string; p_payload: UpsertMemberAlertFlagPayload };
        returns: RpcEnvelope<MemberAlertFlagRow>;
    };
    fn_get_member_context_panel: {
        args: { p_member_id: string };
        returns: RpcEnvelope<MemberContextPanel>;
    };
}
