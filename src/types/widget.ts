// =============================================================================
// Dashboard Widget System – Type Definitions
// =============================================================================

// -----------------------------------------------------------------------------
// Widget Action
// -----------------------------------------------------------------------------
export interface WidgetAction {
    /** 버튼 라벨 */
    label: string;
    /** 액션 유형 */
    type: 'modal' | 'link';
    /** link 타입일 때 이동할 경로 */
    href?: string;
    /** modal 타입일 때 사용할 모달 ID */
    modalId?: string;
    /** 액션 그룹 (렌더링 위치 결정) */
    group: 'primary' | 'secondary' | 'link';
    /** 아이콘 이름 */
    icon?: string;
    /** 액션 설명 (tooltip / aria-label) */
    description?: string;
}

// -----------------------------------------------------------------------------
// Widget Context Item
// -----------------------------------------------------------------------------
export interface WidgetContextItem {
    /** 표시 라벨 */
    label: string;
    /** DB 쿼리 키 */
    queryKey: string;
    /** 표시 포맷 */
    format: 'number' | 'text' | 'time' | 'currency';
    /** 긴급 임계값 (이 값 이상이면 경고 색상) */
    alertThreshold?: number;
}

// -----------------------------------------------------------------------------
// Widget Hero Metric
// -----------------------------------------------------------------------------
export interface WidgetHeroMetric {
    /** DB 쿼리 키 */
    queryKey: string;
    /** 표시 포맷 */
    format: 'number' | 'currency' | 'percentage' | 'fraction';
    /** 통화 기호 (currency일 때) */
    currencySymbol?: string;
    /** 분모 쿼리 키 (fraction일 때) */
    denominatorKey?: string;
}

// -----------------------------------------------------------------------------
// Widget Progress Bar
// -----------------------------------------------------------------------------
export interface WidgetProgressBar {
    /** 현재값 쿼리 키 */
    valueKey: string;
    /** 최대값 쿼리 키 */
    maxKey: string;
    /** 색상 */
    color: string;
}

// -----------------------------------------------------------------------------
// Widget Mini List
// -----------------------------------------------------------------------------
export interface WidgetMiniList {
    /** DB 쿼리 키 */
    queryKey: string;
    /** 최대 표시 건수 */
    maxItems: number;
    /** 각 항목 표시 형식 */
    itemFormat: {
        primary: string;
        secondary: string;
        timestamp?: string;
    };
}

// -----------------------------------------------------------------------------
// Widget Definition (Main)
// -----------------------------------------------------------------------------
export interface WidgetDefinition {
    /** 위젯 고유 식별자 */
    id: string;
    /** 위젯 표시 이름 */
    title: string;
    /** 위젯 설명 (추가 패널에서 표시) */
    description: string;
    /** 위젯 카테고리 */
    category: 'insights' | 'finance' | 'operations' | 'crm' | 'infrastructure';
    /** 아이콘 이름 */
    icon: string;
    /** 아이콘 배경 컬러 */
    iconColor: string;
    /** 배지 데이터 쿼리 키 (null이면 배지 없음) */
    badgeKey: string | null;
    /** Hero Metric 설정 */
    heroMetric: WidgetHeroMetric;
    /** 컨텍스트 데이터 리스트 */
    contextItems: WidgetContextItem[];
    /** 프로그레스바 (null이면 미표시) */
    progressBar: WidgetProgressBar | null;
    /** Quick Action 버튼들 (복수 등록 가능) */
    actions: WidgetAction[];
    /** 미니 리스트 (null이면 미표시) */
    miniList: WidgetMiniList | null;
    /** 기본 활성화 여부 */
    defaultEnabled: boolean;
    /** 기본 정렬 순서 */
    defaultOrder: number;
}

// -----------------------------------------------------------------------------
// Modal Field
// -----------------------------------------------------------------------------
export interface ModalFieldOption {
    value: string;
    label: string;
}

export interface ModalFieldOptionsQuery {
    table: string;
    valueField: string;
    labelField: string;
    filter?: Record<string, string>;
    displayFormat?: string;
}

export interface ModalField {
    name: string;
    label: string;
    type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'multi-select' | 'date' | 'time' | 'textarea' | 'member-search' | 'toggle';
    required: boolean;
    placeholder?: string;
    options?: ModalFieldOption[];
    optionsQuery?: ModalFieldOptionsQuery;
    /** 이 필드의 값이 다른 필드에 의존하는 경우 */
    dependsOn?: string;
    /** 기본값 */
    defaultValue?: unknown;
}

// -----------------------------------------------------------------------------
// Modal Definition
// -----------------------------------------------------------------------------
export interface ModalSubmitAction {
    table: string;
    method: 'insert' | 'update' | 'upsert' | 'delete' | 'select';
    successMessage: string;
    /** 성공 후 리프레시할 위젯 ID 목록 */
    refreshWidgets: string[];
    /** select 시 결과 클릭으로 이동할 경로 */
    navigateOnSelect?: string;
}

export interface ModalDefinition {
    id: string;
    title: string;
    description: string;
    fields: ModalField[];
    submitAction: ModalSubmitAction;
}

// -----------------------------------------------------------------------------
// Widget User State (localStorage / DB)
// -----------------------------------------------------------------------------
export interface WidgetUserState {
    /** 사용자가 활성화한 위젯 ID 목록 (순서대로) */
    activeWidgets: string[];
    /** 마지막 수정 시간 */
    updatedAt: string;
}

// -----------------------------------------------------------------------------
// Widget Settings (DB – facility별)
// -----------------------------------------------------------------------------
export interface WidgetSettings {
    id: string;
    facility_id: string;
    widget_id: string;
    source: 'system' | 'ai_generated' | 'manual';
    definition: WidgetDefinition;
    is_enabled: boolean;
    display_order: number;
    custom_title?: string | null;
    custom_icon?: string | null;
    custom_icon_color?: string | null;
    enabled_actions?: string[] | null;
    created_by?: string | null;
    created_at: string;
    updated_at: string;
}

// -----------------------------------------------------------------------------
// Widget Data (runtime query results)
// -----------------------------------------------------------------------------
export interface WidgetData {
    [queryKey: string]: number | string | unknown[] | null;
}

// -----------------------------------------------------------------------------
// Widget Render Props (merged config + data)
// -----------------------------------------------------------------------------
export interface WidgetRenderProps {
    definition: WidgetDefinition;
    data: WidgetData;
    loading: boolean;
    error: string | null;
    onAction: (action: WidgetAction) => void;
}
