// =============================================================================
// Modal Registry – Default System Modals for Dashboard Widgets
// =============================================================================
import { ModalDefinition } from '@/types/widget';

export const defaultModalRegistry: ModalDefinition[] = [
    // ── 회원 관리 모달 ──
    {
        id: 'quick-add-member',
        title: '신규 회원 등록',
        description: '새로운 회원을 빠르게 등록합니다.',
        fields: [
            { name: 'name', label: '이름', type: 'text', required: true, placeholder: '홍길동' },
            { name: 'email', label: '이메일', type: 'email', required: true, placeholder: 'hong@email.com' },
            { name: 'phone', label: '전화번호', type: 'tel', required: true, placeholder: '010-0000-0000' },
            { name: 'facility_id', label: '소속 지점', type: 'select', required: true, optionsQuery: { table: 'facilities', valueField: 'id', labelField: 'name' } },
        ],
        submitAction: { table: 'members', method: 'insert', successMessage: '회원이 등록되었습니다.', refreshWidgets: ['members'] },
    },
    {
        id: 'quick-search-member',
        title: '회원 검색',
        description: '이름 또는 전화번호로 회원을 검색합니다.',
        fields: [
            { name: 'search_term', label: '검색어', type: 'text', required: true, placeholder: '이름 또는 전화번호' },
        ],
        submitAction: { table: 'members', method: 'select', successMessage: '', refreshWidgets: [], navigateOnSelect: '/admin/members/{id}' },
    },

    // ── 수업 관리 모달 ──
    {
        id: 'quick-add-session',
        title: '빠른 수업 등록',
        description: '새로운 수업을 빠르게 등록합니다.',
        fields: [
            { name: 'class_name', label: '수업명', type: 'text', required: true, placeholder: '모닝 WOD' },
            { name: 'start_time', label: '시작 시간', type: 'time', required: true },
            { name: 'date', label: '날짜', type: 'date', required: true },
            { name: 'coach_id', label: '담당 코치', type: 'select', required: true, optionsQuery: { table: 'coaches', valueField: 'id', labelField: 'name', filter: { status: 'active' } } },
            { name: 'max_capacity', label: '정원', type: 'number', required: true, placeholder: '12' },
        ],
        submitAction: { table: 'sessions', method: 'insert', successMessage: '수업이 등록되었습니다.', refreshWidgets: ['schedule'] },
    },
    {
        id: 'quick-cancel-session',
        title: '수업 취소',
        description: '오늘 수업을 취소하고 예약자에게 알림을 보냅니다.',
        fields: [
            { name: 'session_id', label: '취소할 수업', type: 'select', required: true, optionsQuery: { table: 'sessions', valueField: 'id', labelField: 'class_name', filter: { date: 'today' }, displayFormat: '{class_name} ({start_time})' } },
            { name: 'reason', label: '취소 사유', type: 'textarea', required: true, placeholder: '취소 사유를 입력하세요' },
            { name: 'notify_members', label: '예약자 알림 발송', type: 'toggle', required: false, defaultValue: true },
        ],
        submitAction: { table: 'sessions', method: 'update', successMessage: '수업이 취소되었습니다.', refreshWidgets: ['schedule', 'notifications'] },
    },
    {
        id: 'quick-change-coach',
        title: '코치 변경',
        description: '수업의 담당 코치를 변경합니다.',
        fields: [
            { name: 'session_id', label: '대상 수업', type: 'select', required: true, optionsQuery: { table: 'sessions', valueField: 'id', labelField: 'class_name', filter: { date: 'today' }, displayFormat: '{class_name} ({start_time}) - {coach_name}' } },
            { name: 'new_coach_id', label: '새 코치', type: 'select', required: true, optionsQuery: { table: 'coaches', valueField: 'id', labelField: 'name', filter: { status: 'active' } } },
        ],
        submitAction: { table: 'sessions', method: 'update', successMessage: '코치가 변경되었습니다.', refreshWidgets: ['schedule', 'coaches'] },
    },

    // ── 체크인 모달 ──
    {
        id: 'quick-manual-checkin',
        title: '수동 체크인',
        description: 'QR 미지참/단말기 오류 시 수동으로 체크인합니다.',
        fields: [
            { name: 'member_id', label: '회원 검색', type: 'member-search', required: true, placeholder: '이름/전화번호 검색' },
            { name: 'facility_id', label: '지점', type: 'select', required: true, optionsQuery: { table: 'facilities', valueField: 'id', labelField: 'name' } },
        ],
        submitAction: { table: 'checkins', method: 'insert', successMessage: '체크인이 처리되었습니다.', refreshWidgets: ['checkins'] },
    },
    {
        id: 'quick-cancel-checkin',
        title: '체크인 취소',
        description: '잘못된 체크인 기록을 취소합니다.',
        fields: [
            { name: 'member_id', label: '회원 검색', type: 'member-search', required: true, placeholder: '이름/전화번호 검색' },
            { name: 'checkin_id', label: '체크인 기록', type: 'select', required: true, dependsOn: 'member_id', optionsQuery: { table: 'checkins', valueField: 'id', labelField: 'checkin_time', filter: { date: 'today' }, displayFormat: '{checkin_time} ({checkin_method})' } },
        ],
        submitAction: { table: 'checkins', method: 'delete', successMessage: '체크인이 취소되었습니다.', refreshWidgets: ['checkins'] },
    },

    // ── 결제 모달 ──
    {
        id: 'quick-add-transaction',
        title: '수동 결제 등록',
        description: '현금/계좌이체 등 수동 결제를 등록합니다.',
        fields: [
            { name: 'member_id', label: '회원 검색', type: 'member-search', required: true, placeholder: '이름/전화번호 검색' },
            { name: 'amount', label: '결제 금액', type: 'number', required: true, placeholder: '50000' },
            {
                name: 'category', label: '결제 항목', type: 'select', required: true, options: [
                    { value: 'membership', label: '멤버십' },
                    { value: 'pt', label: 'PT 수업' },
                    { value: 'goods', label: '상품 판매' },
                    { value: 'other', label: '기타' },
                ]
            },
            {
                name: 'payment_method', label: '결제 수단', type: 'select', required: true, options: [
                    { value: 'cash', label: '현금' },
                    { value: 'transfer', label: '계좌이체' },
                    { value: 'card', label: '카드' },
                ]
            },
            { name: 'note', label: '메모', type: 'textarea', required: false, placeholder: '추가 메모 (선택)' },
        ],
        submitAction: { table: 'transactions', method: 'insert', successMessage: '결제가 등록되었습니다.', refreshWidgets: ['transactions'] },
    },
    {
        id: 'quick-refund',
        title: '환불 처리',
        description: '결제 건에 대한 환불을 처리합니다.',
        fields: [
            { name: 'member_id', label: '회원 검색', type: 'member-search', required: true, placeholder: '이름/전화번호 검색' },
            { name: 'transaction_id', label: '결제 내역', type: 'select', required: true, dependsOn: 'member_id', optionsQuery: { table: 'transactions', valueField: 'id', labelField: 'amount', filter: { payment_status: 'completed' }, displayFormat: '₩{amount} - {category} ({created_at})' } },
            { name: 'refund_amount', label: '환불 금액', type: 'number', required: true, placeholder: '전액 환불 시 빈칸' },
            { name: 'reason', label: '환불 사유', type: 'textarea', required: true, placeholder: '환불 사유를 입력하세요' },
        ],
        submitAction: { table: 'transactions', method: 'update', successMessage: '환불이 처리되었습니다.', refreshWidgets: ['transactions'] },
    },

    // ── 알림 모달 ──
    {
        id: 'quick-send-notification',
        title: '빠른 알림 전송',
        description: '전체 또는 특정 그룹에게 알림을 발송합니다.',
        fields: [
            {
                name: 'target', label: '대상', type: 'select', required: true, options: [
                    { value: 'all', label: '전체 회원' },
                    { value: 'active', label: '활성 회원만' },
                    { value: 'expiring', label: '만료 임박 회원' },
                ]
            },
            { name: 'title', label: '알림 제목', type: 'text', required: true, placeholder: '알림 제목' },
            { name: 'message', label: '내용', type: 'textarea', required: true, placeholder: '알림 내용을 입력하세요' },
        ],
        submitAction: { table: 'notifications', method: 'insert', successMessage: '알림이 발송되었습니다.', refreshWidgets: ['notifications'] },
    },
    {
        id: 'quick-schedule-notification',
        title: '예약 알림 등록',
        description: '특정 시간에 자동으로 발송할 알림을 예약합니다.',
        fields: [
            {
                name: 'target', label: '대상', type: 'select', required: true, options: [
                    { value: 'all', label: '전체 회원' },
                    { value: 'active', label: '활성 회원만' },
                ]
            },
            { name: 'title', label: '알림 제목', type: 'text', required: true, placeholder: '알림 제목' },
            { name: 'message', label: '내용', type: 'textarea', required: true, placeholder: '알림 내용' },
            { name: 'scheduled_at', label: '발송 예정 시간', type: 'date', required: true },
        ],
        submitAction: { table: 'notifications', method: 'insert', successMessage: '예약 알림이 등록되었습니다.', refreshWidgets: ['notifications'] },
    },
    {
        id: 'quick-class-reminder',
        title: '수업 안내 발송',
        description: '오늘 수업 예약자에게 안내 알림을 발송합니다.',
        fields: [
            { name: 'session_id', label: '대상 수업', type: 'select', required: true, optionsQuery: { table: 'sessions', valueField: 'id', labelField: 'class_name', filter: { date: 'today' }, displayFormat: '{class_name} ({start_time})' } },
            { name: 'message', label: '안내 메시지', type: 'textarea', required: false, placeholder: '추가 안내 (선택, 미입력 시 기본 안내 발송)', defaultValue: '오늘 예약하신 수업이 곧 시작됩니다. 준비해주세요!' },
        ],
        submitAction: { table: 'notifications', method: 'insert', successMessage: '수업 안내가 발송되었습니다.', refreshWidgets: ['notifications'] },
    },

    // ── 멤버십 모달 ──
    {
        id: 'quick-assign-membership',
        title: '멤버십 부여',
        description: '회원에게 멤버십을 직접 부여합니다.',
        fields: [
            { name: 'member_id', label: '회원 검색', type: 'member-search', required: true, placeholder: '이름/전화번호 검색' },
            { name: 'plan_id', label: '요금제', type: 'select', required: true, optionsQuery: { table: 'plans', valueField: 'id', labelField: 'name', displayFormat: '{name} (₩{price})' } },
            { name: 'start_date', label: '시작일', type: 'date', required: true },
        ],
        submitAction: { table: 'memberships', method: 'insert', successMessage: '멤버십이 부여되었습니다.', refreshWidgets: ['memberships', 'members'] },
    },
    {
        id: 'quick-pause-membership',
        title: '멤버십 일시정지',
        description: '멤버십을 일시정지(홀딩) 처리합니다.',
        fields: [
            { name: 'member_id', label: '회원 검색', type: 'member-search', required: true, placeholder: '이름/전화번호 검색' },
            { name: 'membership_id', label: '멤버십', type: 'select', required: true, dependsOn: 'member_id', optionsQuery: { table: 'memberships', valueField: 'id', labelField: 'plan_name', filter: { status: 'active' }, displayFormat: '{plan_name} (~{end_date})' } },
            { name: 'pause_days', label: '정지 일수', type: 'number', required: true, placeholder: '7' },
            { name: 'reason', label: '사유', type: 'textarea', required: false, placeholder: '정지 사유 (선택)' },
        ],
        submitAction: { table: 'memberships', method: 'update', successMessage: '멤버십이 일시정지되었습니다.', refreshWidgets: ['memberships'] },
    },
    {
        id: 'quick-extend-membership',
        title: '멤버십 기간 연장',
        description: '멤버십 기간을 수동으로 연장합니다.',
        fields: [
            { name: 'member_id', label: '회원 검색', type: 'member-search', required: true, placeholder: '이름/전화번호 검색' },
            { name: 'membership_id', label: '멤버십', type: 'select', required: true, dependsOn: 'member_id', optionsQuery: { table: 'memberships', valueField: 'id', labelField: 'plan_name', displayFormat: '{plan_name} (~{end_date})' } },
            { name: 'extend_days', label: '연장 일수', type: 'number', required: true, placeholder: '30' },
            { name: 'reason', label: '사유', type: 'textarea', required: false, placeholder: '연장 사유 (선택)' },
        ],
        submitAction: { table: 'memberships', method: 'update', successMessage: '멤버십 기간이 연장되었습니다.', refreshWidgets: ['memberships', 'members'] },
    },

    // ── 코치 모달 ──
    {
        id: 'quick-add-coach',
        title: '코치 등록',
        description: '새로운 코치를 등록합니다.',
        fields: [
            { name: 'name', label: '이름', type: 'text', required: true, placeholder: '홍길동' },
            { name: 'email', label: '이메일', type: 'email', required: true, placeholder: 'coach@email.com' },
            { name: 'phone', label: '전화번호', type: 'tel', required: true, placeholder: '010-0000-0000' },
            {
                name: 'specialties', label: '전문 분야', type: 'multi-select', required: false, options: [
                    { value: 'crossfit', label: 'CrossFit' },
                    { value: 'yoga', label: '요가' },
                    { value: 'pilates', label: '필라테스' },
                    { value: 'pt', label: 'PT' },
                    { value: 'swimming', label: '수영' },
                    { value: 'boxing', label: '복싱' },
                ]
            },
        ],
        submitAction: { table: 'coaches', method: 'insert', successMessage: '코치가 등록되었습니다.', refreshWidgets: ['coaches'] },
    },
    {
        id: 'quick-assign-coach',
        title: '수업 코치 배정',
        description: '미배정 수업에 코치를 배정합니다.',
        fields: [
            { name: 'session_id', label: '미배정 수업', type: 'select', required: true, optionsQuery: { table: 'sessions', valueField: 'id', labelField: 'class_name', filter: { coach_id: 'null', date: 'today' }, displayFormat: '{class_name} ({start_time})' } },
            { name: 'coach_id', label: '배정 코치', type: 'select', required: true, optionsQuery: { table: 'coaches', valueField: 'id', labelField: 'name', filter: { status: 'active' } } },
        ],
        submitAction: { table: 'sessions', method: 'update', successMessage: '코치가 배정되었습니다.', refreshWidgets: ['coaches', 'schedule'] },
    },

    // ── 고객지원 모달 ──
    {
        id: 'quick-reply-ticket',
        title: '빠른 답변',
        description: '대기 중인 최우선 문의에 바로 답변합니다.',
        fields: [
            { name: 'ticket_id', label: '문의 선택', type: 'select', required: true, optionsQuery: { table: 'support_tickets', valueField: 'id', labelField: 'subject', filter: { status: 'pending' }, displayFormat: '[{priority}] {subject} - {member_name}' } },
            { name: 'reply', label: '답변 내용', type: 'textarea', required: true, placeholder: '답변 내용을 입력하세요' },
            {
                name: 'status', label: '상태 변경', type: 'select', required: true, options: [
                    { value: 'resolved', label: '해결됨' },
                    { value: 'in_progress', label: '처리 중' },
                ]
            },
        ],
        submitAction: { table: 'support_tickets', method: 'update', successMessage: '답변이 등록되었습니다.', refreshWidgets: ['support'] },
    },
];
