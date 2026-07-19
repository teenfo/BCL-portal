# Dashboard Widget System – 상세 설계서

> **문서 위치**: `.docs/sitemap/admin/dashboard-widgets.md`  
> **작성일**: 2026-02-17  
> **상위 문서**: [01-insights.md](./01-insights.md) § 종합 대시보드

---

## 1. 개요

대시보드의 Quick Actions 영역을 **위젯(Widget) 기반 시스템**으로 전면 개편합니다.
각 위젯은 **컨텍스트 데이터 + 실행 가능한 액션**을 결합한 미니 대시보드 카드입니다.

### 핵심 원칙
- **Registry Pattern**: 모든 위젯은 JSON 레지스트리에 정의되며, 새 위젯 추가 시 레지스트리에 항목을 추가하는 것만으로 확장 가능
- **사용자 커스터마이징**: 관리자가 위젯을 추가/제거/재배치할 수 있음
- **상태 영속성**: 위젯 배치 상태는 `localStorage`에 저장 (향후 DB 마이그레이션 가능)

---

## 2. UX 인터랙션 사양

### 2.1 Quick Actions 헤더

```
┌──────────────────────────────────────────────────────────────┐
│  ⚡ Quick Actions                               [＋ 위젯 추가] │
│  ──────────────────────────────────────────────────────────── │
│  드래그하여 위젯 순서를 변경하세요                               │
└──────────────────────────────────────────────────────────────┘
```

- **제목**: "Quick Actions" (기존과 동일)
- **[＋ 위젯 추가] 버튼**: 클릭 시 위젯 선택 패널(Drawer) 오픈
- **부제**: 편집 모드 진입 시 "드래그하여 위젯 순서를 변경하세요" 안내 텍스트 노출

### 2.2 위젯 추가 패널 (Add Widget Drawer)

`[＋ 위젯 추가]` 클릭 시 우측에서 슬라이드-인 되는 패널:

```
┌── 위젯 추가 ──────────────────────┐
│                                    │
│  🔍 위젯 검색...                   │
│                                    │
│  ── 현재 사용 중 ──               │
│  ✅ 회원 관리         [추가됨]     │
│  ✅ 수업 스케줄       [추가됨]     │
│  ✅ 체크인            [추가됨]     │
│                                    │
│  ── 추가 가능 ──                  │
│  ☐ 결제 내역                       │
│     오늘 결제 건수, 미확인 건 등    │
│                    [+ 추가]        │
│  ☐ 알림 센터                       │
│     미읽음 알림, 예약 발송 등       │
│                    [+ 추가]        │
│  ☐ 멤버십 현황                     │
│     활성 멤버십, 만료 임박 등       │
│                    [+ 추가]        │
│  ...                               │
│                                    │
│               [닫기]               │
└────────────────────────────────────┘
```

- 이미 추가된 위젯은 `[추가됨]` 으로 비활성화
- 미추가 위젯은 `[+ 추가]` 버튼 활성
- 위젯 설명(description)이 함께 표시됨

### 2.3 위젯 드래그 & 드롭

#### 재배치
- 각 위젯 카드의 **헤더 영역을 길게 클릭(또는 드래그 핸들 ⠿ 아이콘)** 하면 드래그 모드 활성화
- 드래그 중인 위젯은 반투명 처리 + 살짝 확대 (`scale(1.02)`)
- 다른 위젯 위에 올리면 해당 위치에 drop indicator(점선 테두리) 노출
- 드롭 시 위젯 순서 변경 + localStorage 자동 저장

#### 삭제 (Trash Zone)
- 드래그 모드가 활성화되면 화면 **하단 중앙**에 Trash Zone이 fade-in으로 등장:

```
                    ┌─────────────────────┐
                    │  🗑️ 여기에 놓으면   │
                    │     위젯이 제거됩니다 │
                    └─────────────────────┘
```

- Trash Zone 위에 위젯을 hover하면 Zone이 **빨간색 강조** 처리
- 드롭하면 해당 위젯이 목록에서 제거됨 (삭제 애니메이션 적용)
- 제거된 위젯은 "위젯 추가" 패널의 "추가 가능" 목록에 자동 복귀

### 2.4 위젯 카드 구조 (공통)

각 위젯은 **여러 개의 Quick Action**을 등록할 수 있습니다.
액션이 많을 경우 Primary 액션은 버튼으로, Secondary 액션은 작은 칩/텍스트 링크로 표현합니다.

```
┌─────────────────────────────────────────────┐
│  ⠿  🔵 위젯 제목              🔴 Badge(3)  │  ← 헤더 (드래그 핸들 포함)
│─────────────────────────────────────────────│
│                                             │
│  ███ 주요 수치 (Hero Metric)                │  ← 본문
│  ▒▒▒ 부가 정보 / 프로그레스바               │
│  ▒▒▒ 미니 리스트 (최대 3건)                 │
│                                             │
│─────────────────────────────────────────────│
│  [🔘 Primary Action 1] [🔘 Primary 2]      │  ← 주요 액션 (버튼)
│  [🔗 Link 1]  [🔗 Link 2]  [🔗 Link 3]    │  ← 보조 액션 (텍스트 링크)
└─────────────────────────────────────────────┘
```

#### 액션 레이아웃 규칙

| 액션 group | 스타일 | 위치 | 최대 개수 |
|-----------|--------|------|----------|
| `primary` | 버튼 (`admin-action-btn`) | 상단 행 — 가로 배치 | 2개 권장, 3개까지 |
| `secondary` | 작은 텍스트 버튼 (outline) | 중간 행 — 가로 배치 | 3개까지 |
| `link` | 텍스트 링크 (`→` suffix) | 하단 행 — 인라인 | 제한 없음 |

- 액션이 **1~2개**인 경우: 한 줄에 나란히 배치
- 액션이 **3~4개**인 경우: Primary 행 + Link 행 (2행)
- 액션이 **5개 이상**인 경우: Primary 행 + Secondary 행 + Link 행 (3행)
- `primary` 그룹이 3개 이상이면 버튼이 좁아지므로 **최대 2개 권장**

| 영역 | 규격 | 설명 |
|------|------|------|
| 드래그 핸들 | `⠿` 아이콘 (6px dot grip) | 헤더 좌측, cursor: grab |
| 아이콘 | 24×24px SVG | 위젯 유형별 고유 아이콘 |
| 제목 | `text-sm font-bold` | 위젯 이름 |
| Badge | `rounded-full` 뱃지 | 긴급/미처리 건수 (0이면 숨김) |
| Hero Metric | `text-2xl font-black` | 핵심 수치 1개 |
| Context | `text-xs text-muted` | 부가 설명 2~3줄 |
| Action (primary) | `admin-action-btn` 스타일 | 모달 트리거 또는 강조 링크 |
| Action (secondary) | `outline btn` 소형 | 보조 모달/링크 |
| Action (link) | `text-xs underline` | 페이지 이동 텍스트 링크 |

### 2.5 그리드 레이아웃

```
Desktop (≥1280px):  grid-cols-4  (한 행에 4개)
Tablet  (≥768px):   grid-cols-2  (한 행에 2개)
Mobile  (<768px):   grid-cols-1  (세로 1열)
```

- Gap: `24px` (gap-6)
- 위젯 최소 높이: `200px`
- 위젯 최대 높이: `auto` (콘텐츠에 따라 가변)

---

## 3. 위젯 레지스트리 (JSON 정의)

### 3.1 타입 정의

```typescript
// src/types/widget.ts

interface WidgetDefinition {
  /** 위젯 고유 식별자 */
  id: string;

  /** 위젯 표시 이름 */
  title: string;

  /** 위젯 설명 (추가 패널에서 표시) */
  description: string;

  /** 위젯 카테고리 (그룹핑용) */
  category: 'insights' | 'finance' | 'operations' | 'crm' | 'infrastructure';

  /** 아이콘 컴포넌트 이름 (AdminIcons에서 import) */
  icon: string;

  /** 아이콘 배경 컬러 (hex) */
  iconColor: string;

  /** 배지에 표시할 데이터 쿼리 키 (null이면 배지 없음) */
  badgeKey: string | null;

  /** Hero Metric 설정 */
  heroMetric: {
    /** DB 쿼리 키 */
    queryKey: string;
    /** 표시 포맷 (number, currency, percentage, fraction) */
    format: 'number' | 'currency' | 'percentage' | 'fraction';
    /** KRW 등 통화 기호 (format이 currency일 때) */
    currencySymbol?: string;
    /** 분모 쿼리 키 (format이 fraction일 때) */
    denominatorKey?: string;
  };

  /** 컨텍스트 데이터 (부가 정보 리스트) */
  contextItems: Array<{
    /** 표시 라벨 */
    label: string;
    /** DB 쿼리 키 */
    queryKey: string;
    /** 표시 포맷 */
    format: 'number' | 'text' | 'time' | 'currency';
    /** 긴급 임계값 (이 값 이상이면 경고 색상) */
    alertThreshold?: number;
  }>;

  /** 프로그레스바 설정 (null이면 미표시) */
  progressBar: {
    /** 현재값 쿼리 키 */
    valueKey: string;
    /** 최대값 쿼리 키 */
    maxKey: string;
    /** 색상 */
    color: string;
  } | null;

  /** Quick Action 버튼들 (복수 등록 가능, group별 렌더링 위치 분리) */
  actions: Array<{
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
    /** 아이콘 (optional) */
    icon?: string;
    /** 액션 설명 (tooltip 또는 aria-label) */
    description?: string;
  }>;

  /** 미니 리스트 설정 (최근 항목 2~3건 표시) */
  miniList: {
    /** DB 쿼리 키 */
    queryKey: string;
    /** 최대 표시 건수 */
    maxItems: number;
    /** 각 항목 표시 형식 */
    itemFormat: {
      primary: string;   // 주요 텍스트 필드
      secondary: string; // 부가 텍스트 필드
      timestamp?: string; // 시간 필드 (optional)
    };
  } | null;

  /** 기본 활성화 여부 (처음 대시보드 접속 시 자동 추가) */
  defaultEnabled: boolean;

  /** 기본 정렬 순서 (defaultEnabled가 true인 위젯들의 초기 순서) */
  defaultOrder: number;
}
```

### 3.2 위젯 레지스트리 데이터

```json
[
  {
    "id": "members",
    "title": "회원 관리",
    "description": "총 회원 수, 활성/만료 현황, 신규 가입 추적 및 빠른 회원 등록",
    "category": "finance",
    "icon": "IconMembers",
    "iconColor": "#3B82F6",
    "badgeKey": "members_today_new",
    "heroMetric": {
      "queryKey": "members_active_count",
      "format": "fraction",
      "denominatorKey": "members_total_count"
    },
    "contextItems": [
      {
        "label": "오늘 신규",
        "queryKey": "members_today_new",
        "format": "number"
      },
      {
        "label": "만료 임박 (7일)",
        "queryKey": "members_expiring_soon",
        "format": "number",
        "alertThreshold": 3
      }
    ],
    "progressBar": {
      "valueKey": "members_active_count",
      "maxKey": "members_total_count",
      "color": "#3B82F6"
    },
    "actions": [
      {
        "label": "+ 회원 등록",
        "type": "modal",
        "modalId": "quick-add-member",
        "group": "primary",
        "icon": "IconPlus",
        "description": "새로운 회원을 빠르게 등록합니다"
      },
      {
        "label": "회원 검색",
        "type": "modal",
        "modalId": "quick-search-member",
        "group": "primary",
        "icon": "IconSearch",
        "description": "이름/전화번호로 회원을 검색합니다"
      },
      {
        "label": "만료 임박 회원",
        "type": "link",
        "href": "/admin/members?filter=expiring",
        "group": "secondary",
        "icon": "IconAlert",
        "description": "7일 이내 멤버십 만료 예정 회원 목록"
      },
      {
        "label": "전체 목록 →",
        "type": "link",
        "href": "/admin/members",
        "group": "link"
      }
    ],
    "miniList": null,
    "defaultEnabled": true,
    "defaultOrder": 1
  },

  {
    "id": "schedule",
    "title": "수업 스케줄",
    "description": "오늘 수업 현황, 다음 수업 정보, 예약률 확인 및 빠른 수업 등록",
    "category": "operations",
    "icon": "IconCalendar",
    "iconColor": "#F59E0B",
    "badgeKey": "schedule_remaining_today",
    "heroMetric": {
      "queryKey": "schedule_remaining_today",
      "format": "number"
    },
    "contextItems": [
      {
        "label": "다음 수업",
        "queryKey": "schedule_next_session_time",
        "format": "time"
      },
      {
        "label": "오늘 평균 예약률",
        "queryKey": "schedule_avg_booking_rate",
        "format": "percentage"
      },
      {
        "label": "오늘 총 수업",
        "queryKey": "schedule_total_today",
        "format": "number"
      }
    ],
    "progressBar": null,
    "actions": [
      {
        "label": "+ 수업 추가",
        "type": "modal",
        "modalId": "quick-add-session",
        "group": "primary",
        "icon": "IconPlus",
        "description": "새 수업을 빠르게 등록합니다"
      },
      {
        "label": "수업 취소",
        "type": "modal",
        "modalId": "quick-cancel-session",
        "group": "secondary",
        "icon": "IconClose",
        "description": "오늘 수업을 취소하고 예약자에게 알림"
      },
      {
        "label": "코치 변경",
        "type": "modal",
        "modalId": "quick-change-coach",
        "group": "secondary",
        "icon": "IconSwap",
        "description": "오늘 수업의 담당 코치를 변경합니다"
      },
      {
        "label": "오늘 스케줄 →",
        "type": "link",
        "href": "/admin/operations/schedule",
        "group": "link"
      },
      {
        "label": "예약 현황 →",
        "type": "link",
        "href": "/admin/operations/reservations",
        "group": "link"
      }
    ],
    "miniList": {
      "queryKey": "schedule_upcoming_sessions",
      "maxItems": 2,
      "itemFormat": {
        "primary": "start_time",
        "secondary": "coach_name",
        "timestamp": "start_time"
      }
    },
    "defaultEnabled": true,
    "defaultOrder": 2
  },

  {
    "id": "checkins",
    "title": "체크인",
    "description": "오늘 체크인 현황, 실시간 입장 기록, 수동 체크인 처리",
    "category": "operations",
    "icon": "IconFaceId",
    "iconColor": "#22C55E",
    "badgeKey": null,
    "heroMetric": {
      "queryKey": "checkins_today_count",
      "format": "number"
    },
    "contextItems": [
      {
        "label": "QR 체크인",
        "queryKey": "checkins_today_qr",
        "format": "number"
      },
      {
        "label": "키오스크",
        "queryKey": "checkins_today_kiosk",
        "format": "number"
      },
      {
        "label": "수동 처리",
        "queryKey": "checkins_today_manual",
        "format": "number"
      }
    ],
    "progressBar": null,
    "actions": [
      {
        "label": "수동 체크인",
        "type": "modal",
        "modalId": "quick-manual-checkin",
        "group": "primary",
        "icon": "IconHand",
        "description": "QR 미지참/단말기 오류 시 수동 체크인"
      },
      {
        "label": "체크인 취소",
        "type": "modal",
        "modalId": "quick-cancel-checkin",
        "group": "secondary",
        "icon": "IconUndo",
        "description": "잘못된 체크인 기록을 취소합니다"
      },
      {
        "label": "QR 재생성",
        "type": "link",
        "href": "/admin/operations/infrastructure",
        "group": "secondary",
        "icon": "IconQR",
        "description": "현장 체크인 QR 코드를 재생성합니다"
      },
      {
        "label": "전체 로그 →",
        "type": "link",
        "href": "/admin/checkins",
        "group": "link"
      }
    ],
    "miniList": {
      "queryKey": "checkins_recent",
      "maxItems": 3,
      "itemFormat": {
        "primary": "member_name",
        "secondary": "checkin_method",
        "timestamp": "checkin_time"
      }
    },
    "defaultEnabled": true,
    "defaultOrder": 3
  },

  {
    "id": "transactions",
    "title": "결제 내역",
    "description": "오늘 결제 현황, 미확인 결제 건수, 수동 결제 등록",
    "category": "finance",
    "icon": "IconDollar",
    "iconColor": "#8B5CF6",
    "badgeKey": "transactions_pending_count",
    "heroMetric": {
      "queryKey": "transactions_today_total",
      "format": "currency",
      "currencySymbol": "₩"
    },
    "contextItems": [
      {
        "label": "오늘 결제 건수",
        "queryKey": "transactions_today_count",
        "format": "number"
      },
      {
        "label": "미확인 건",
        "queryKey": "transactions_pending_count",
        "format": "number",
        "alertThreshold": 1
      },
      {
        "label": "이번 달 누적",
        "queryKey": "transactions_month_total",
        "format": "currency"
      }
    ],
    "progressBar": null,
    "actions": [
      {
        "label": "+ 수동 결제",
        "type": "modal",
        "modalId": "quick-add-transaction",
        "group": "primary",
        "icon": "IconPlus",
        "description": "현금/계좌이체 등 수동 결제를 등록합니다"
      },
      {
        "label": "환불 처리",
        "type": "modal",
        "modalId": "quick-refund",
        "group": "primary",
        "icon": "IconRefund",
        "description": "결제 건에 대한 환불을 처리합니다"
      },
      {
        "label": "미확인 결제",
        "type": "link",
        "href": "/admin/transactions?status=pending",
        "group": "secondary",
        "icon": "IconAlert",
        "description": "확인 대기 중인 결제 건 목록"
      },
      {
        "label": "전체 내역 →",
        "type": "link",
        "href": "/admin/transactions",
        "group": "link"
      },
      {
        "label": "월간 정산 →",
        "type": "link",
        "href": "/admin/insights/finance",
        "group": "link"
      }
    ],
    "miniList": {
      "queryKey": "transactions_recent",
      "maxItems": 2,
      "itemFormat": {
        "primary": "member_name",
        "secondary": "amount",
        "timestamp": "created_at"
      }
    },
    "defaultEnabled": true,
    "defaultOrder": 4
  },

  {
    "id": "notifications",
    "title": "알림 센터",
    "description": "발송 현황, 미읽음 알림 추적, 빠른 알림 전송",
    "category": "crm",
    "icon": "IconMegaphone",
    "iconColor": "#EC4899",
    "badgeKey": "notifications_unread_count",
    "heroMetric": {
      "queryKey": "notifications_unread_count",
      "format": "number"
    },
    "contextItems": [
      {
        "label": "오늘 발송",
        "queryKey": "notifications_today_sent",
        "format": "number"
      },
      {
        "label": "미읽음",
        "queryKey": "notifications_unread_count",
        "format": "number",
        "alertThreshold": 5
      },
      {
        "label": "예약 발송 대기",
        "queryKey": "notifications_scheduled_count",
        "format": "number"
      }
    ],
    "progressBar": null,
    "actions": [
      {
        "label": "빠른 알림 전송",
        "type": "modal",
        "modalId": "quick-send-notification",
        "group": "primary",
        "icon": "IconMegaphone",
        "description": "전체 또는 특정 그룹에게 알림 발송"
      },
      {
        "label": "예약 알림 등록",
        "type": "modal",
        "modalId": "quick-schedule-notification",
        "group": "secondary",
        "icon": "IconClock",
        "description": "특정 시간에 자동으로 발송할 알림 예약"
      },
      {
        "label": "수업 안내 발송",
        "type": "modal",
        "modalId": "quick-class-reminder",
        "group": "secondary",
        "icon": "IconCalendar",
        "description": "오늘 수업 예약자에게 안내 알림 발송"
      },
      {
        "label": "알림 센터 →",
        "type": "link",
        "href": "/admin/crm/notifications",
        "group": "link"
      },
      {
        "label": "발송 규칙 설정 →",
        "type": "link",
        "href": "/admin/crm/notifications?tab=rules",
        "group": "link"
      }
    ],
    "miniList": null,
    "defaultEnabled": true,
    "defaultOrder": 5
  },

  {
    "id": "memberships",
    "title": "멤버십 현황",
    "description": "활성 멤버십, 만료 임박 회원, 인기 요금제 파악",
    "category": "finance",
    "icon": "IconCreditCard",
    "iconColor": "#06B6D4",
    "badgeKey": "memberships_expiring_7days",
    "heroMetric": {
      "queryKey": "memberships_active_count",
      "format": "number"
    },
    "contextItems": [
      {
        "label": "활성 멤버십",
        "queryKey": "memberships_active_count",
        "format": "number"
      },
      {
        "label": "7일 내 만료",
        "queryKey": "memberships_expiring_7days",
        "format": "number",
        "alertThreshold": 3
      },
      {
        "label": "인기 요금제",
        "queryKey": "memberships_popular_plan",
        "format": "text"
      }
    ],
    "progressBar": null,
    "actions": [
      {
        "label": "+ 멤버십 부여",
        "type": "modal",
        "modalId": "quick-assign-membership",
        "group": "primary",
        "icon": "IconPlus",
        "description": "회원에게 멤버십을 직접 부여합니다"
      },
      {
        "label": "일시정지 처리",
        "type": "modal",
        "modalId": "quick-pause-membership",
        "group": "secondary",
        "icon": "IconPause",
        "description": "멤버십을 일시정지(홀딩) 처리합니다"
      },
      {
        "label": "만료 연장",
        "type": "modal",
        "modalId": "quick-extend-membership",
        "group": "secondary",
        "icon": "IconExtend",
        "description": "멤버십 기간을 수동으로 연장합니다"
      },
      {
        "label": "만료 임박 →",
        "type": "link",
        "href": "/admin/memberships?filter=expiring",
        "group": "link"
      },
      {
        "label": "요금제 관리 →",
        "type": "link",
        "href": "/admin/plans",
        "group": "link"
      },
      {
        "label": "전체 멤버십 →",
        "type": "link",
        "href": "/admin/memberships",
        "group": "link"
      }
    ],
    "miniList": null,
    "defaultEnabled": true,
    "defaultOrder": 6
  },

  {
    "id": "coaches",
    "title": "코치 현황",
    "description": "활동 코치 수, 오늘 배정 현황, 미배정 수업 추적",
    "category": "operations",
    "icon": "IconSettings",
    "iconColor": "#F97316",
    "badgeKey": "coaches_unassigned_sessions",
    "heroMetric": {
      "queryKey": "coaches_active_count",
      "format": "number"
    },
    "contextItems": [
      {
        "label": "오늘 배정 코치",
        "queryKey": "coaches_assigned_today",
        "format": "number"
      },
      {
        "label": "미배정 수업",
        "queryKey": "coaches_unassigned_sessions",
        "format": "number",
        "alertThreshold": 1
      }
    ],
    "progressBar": {
      "valueKey": "coaches_assigned_today",
      "maxKey": "coaches_active_count",
      "color": "#F97316"
    },
    "actions": [
      {
        "label": "+ 코치 등록",
        "type": "modal",
        "modalId": "quick-add-coach",
        "group": "primary",
        "icon": "IconPlus",
        "description": "새로운 코치를 등록합니다"
      },
      {
        "label": "수업 배정",
        "type": "modal",
        "modalId": "quick-assign-coach",
        "group": "primary",
        "icon": "IconCalendar",
        "description": "미배정 수업에 코치를 배정합니다"
      },
      {
        "label": "코치 관리 →",
        "type": "link",
        "href": "/admin/operations/coaches",
        "group": "link"
      },
      {
        "label": "배정 현황 →",
        "type": "link",
        "href": "/admin/operations/schedule",
        "group": "link"
      },
      {
        "label": "성과 분석 →",
        "type": "link",
        "href": "/admin/insights/coaches",
        "group": "link"
      }
    ],
    "miniList": null,
    "defaultEnabled": true,
    "defaultOrder": 7
  },

  {
    "id": "support",
    "title": "고객 문의",
    "description": "미처리 티켓, 오늘 접수 문의, 긴급 문의 추적",
    "category": "crm",
    "icon": "IconHand",
    "iconColor": "#EF4444",
    "badgeKey": "support_pending_count",
    "heroMetric": {
      "queryKey": "support_pending_count",
      "format": "number"
    },
    "contextItems": [
      {
        "label": "미처리 문의",
        "queryKey": "support_pending_count",
        "format": "number",
        "alertThreshold": 1
      },
      {
        "label": "오늘 접수",
        "queryKey": "support_today_count",
        "format": "number"
      },
      {
        "label": "긴급",
        "queryKey": "support_urgent_count",
        "format": "number",
        "alertThreshold": 1
      }
    ],
    "progressBar": null,
    "actions": [
      {
        "label": "빠른 답변",
        "type": "modal",
        "modalId": "quick-reply-ticket",
        "group": "primary",
        "icon": "IconReply",
        "description": "대기 중인 최우선 문의에 바로 답변합니다"
      },
      {
        "label": "FAQ 추가",
        "type": "modal",
        "modalId": "quick-add-faq",
        "group": "secondary",
        "icon": "IconPlus",
        "description": "자주 묻는 질문 항목을 추가합니다"
      },
      {
        "label": "대기 문의 →",
        "type": "link",
        "href": "/admin/crm/support?status=pending",
        "group": "link"
      },
      {
        "label": "문의 센터 →",
        "type": "link",
        "href": "/admin/crm/support",
        "group": "link"
      },
      {
        "label": "피드백 →",
        "type": "link",
        "href": "/admin/crm/feedback",
        "group": "link"
      }
    ],
    "miniList": {
      "queryKey": "support_recent_tickets",
      "maxItems": 2,
      "itemFormat": {
        "primary": "subject",
        "secondary": "member_name",
        "timestamp": "created_at"
      }
    },
    "defaultEnabled": true,
    "defaultOrder": 8
  }
]
```

---

## 4. 사용자 상태 관리 (Widget State)

### 4.1 저장 구조

```typescript
// src/types/widget.ts

interface WidgetUserState {
  /** 사용자가 활성화한 위젯 ID 목록 (순서대로) */
  activeWidgets: string[];
  
  /** 마지막 수정 시간 */
  updatedAt: string;
}
```

### 4.2 localStorage 키

```
Key:    "bcl_dashboard_widgets_{user_id}"
Value:  WidgetUserState (JSON)
```

### 4.3 초기 상태 (First Visit)

처음 방문 시 `defaultEnabled: true`이고 `defaultOrder` 순으로 정렬된 위젯 목록이 자동 설정:

```json
{
  "activeWidgets": [
    "members",
    "schedule", 
    "checkins",
    "transactions",
    "notifications",
    "memberships",
    "coaches",
    "support"
  ],
  "updatedAt": "2026-02-17T09:00:00Z"
}
```

### 4.4 상태 변경 트리거

| 이벤트 | 동작 |
|--------|------|
| 위젯 추가 (패널에서 [+ 추가]) | `activeWidgets` 배열 끝에 추가 |
| 위젯 제거 (Trash Zone에 드롭) | `activeWidgets`에서 해당 ID 제거 |
| 위젯 재배치 (드래그 & 드롭) | `activeWidgets` 배열 순서 변경 |
| 모든 변경 | `updatedAt` 갱신 + localStorage 저장 |

---

## 5. 데이터 쿼리 맵 (Query Map)

각 `queryKey`가 어떤 Supabase 쿼리에 매핑되는지 정의합니다.

### 5.1 Members 위젯

| queryKey | 쿼리 | 반환값 |
|----------|------|--------|
| `members_active_count` | `members.select('id', {count:'exact', head:true}).eq('status','Active')` | `count` |
| `members_total_count` | `members.select('id', {count:'exact', head:true})` | `count` |
| `members_today_new` | `members.select('id', {count:'exact', head:true}).gte('created_at', today)` | `count` |
| `members_expiring_soon` | `memberships.select('id', {count:'exact', head:true}).eq('status','active').lte('end_date', today+7d).gte('end_date', today)` | `count` |

### 5.2 Schedule 위젯

| queryKey | 쿼리 | 반환값 |
|----------|------|--------|
| `schedule_remaining_today` | `sessions.select('id', {count:'exact', head:true}).eq('session_date', today).gte('start_time', now)` | `count` |
| `schedule_total_today` | `sessions.select('id', {count:'exact', head:true}).eq('session_date', today)` | `count` |
| `schedule_next_session_time` | `sessions.select('start_time').eq('session_date', today).gte('start_time', now).order('start_time').limit(1)` | `HH:MM` |
| `schedule_avg_booking_rate` | Computed: 오늘 세션들의 (bookings count / capacity) 평균 | `0~100` |
| `schedule_upcoming_sessions` | `sessions.select('*, session_coaches(coaches(name))').eq('session_date', today).gte('start_time', now).order('start_time').limit(2)` | `Session[]` |

### 5.3 Check-in 위젯

| queryKey | 쿼리 | 반환값 |
|----------|------|--------|
| `checkins_today_count` | `checkins.select('id', {count:'exact', head:true}).gte('checkin_time', today)` | `count` |
| `checkins_today_qr` | `checkins.select('id', {count:'exact', head:true}).gte('checkin_time', today).eq('checkin_method','qr')` | `count` |
| `checkins_today_kiosk` | `checkins.select('id', {count:'exact', head:true}).gte('checkin_time', today).eq('checkin_method','kiosk')` | `count` |
| `checkins_today_manual` | `checkins.select('id', {count:'exact', head:true}).gte('checkin_time', today).eq('checkin_method','manual')` | `count` |
| `checkins_recent` | `checkins.select('*, members(name)').order('checkin_time', {ascending:false}).limit(3)` | `Checkin[]` |

### 5.4 Transactions 위젯

| queryKey | 쿼리 | 반환값 |
|----------|------|--------|
| `transactions_today_total` | `transactions.select('amount').gte('created_at', today).eq('payment_status','completed')` → `sum(amount)` | `number` |
| `transactions_today_count` | `transactions.select('id', {count:'exact', head:true}).gte('created_at', today)` | `count` |
| `transactions_pending_count` | `transactions.select('id', {count:'exact', head:true}).eq('payment_status','pending')` | `count` |
| `transactions_month_total` | `transactions.select('amount').gte('created_at', monthStart).eq('payment_status','completed')` → `sum(amount)` | `number` |
| `transactions_recent` | `transactions.select('*, members(name)').order('created_at', {ascending:false}).limit(2)` | `Transaction[]` |

### 5.5 Notifications 위젯

| queryKey | 쿼리 | 반환값 |
|----------|------|--------|
| `notifications_unread_count` | `notifications.select('id', {count:'exact', head:true}).eq('is_read', false)` | `count` |
| `notifications_today_sent` | `notifications.select('id', {count:'exact', head:true}).gte('created_at', today)` | `count` |
| `notifications_scheduled_count` | `notifications.select('id', {count:'exact', head:true}).eq('status','scheduled')` | `count` |

### 5.6 Memberships 위젯

| queryKey | 쿼리 | 반환값 |
|----------|------|--------|
| `memberships_active_count` | `memberships.select('id', {count:'exact', head:true}).eq('status','active')` | `count` |
| `memberships_expiring_7days` | `memberships.select('id', {count:'exact', head:true}).eq('status','active').lte('end_date', today+7d).gte('end_date', today)` | `count` |
| `memberships_popular_plan` | `memberships.select('plan_id, membership_plans(name)').eq('status','active')` → `GROUP BY plan_id, limit 1` | `string` |

### 5.7 Coaches 위젯

| queryKey | 쿼리 | 반환값 |
|----------|------|--------|
| `coaches_active_count` | `coaches.select('id', {count:'exact', head:true}).eq('status','active')` | `count` |
| `coaches_assigned_today` | `session_coaches.select('coach_id', {count:'exact'}).eq('sessions.session_date', today)` → `DISTINCT count` | `count` |
| `coaches_unassigned_sessions` | `sessions.select('id', {count:'exact', head:true}).eq('session_date', today).is('session_coaches', null)` | `count` |

### 5.8 Support 위젯

| queryKey | 쿼리 | 반환값 |
|----------|------|--------|
| `support_pending_count` | `support_tickets.select('id', {count:'exact', head:true}).eq('status','pending')` | `count` |
| `support_today_count` | `support_tickets.select('id', {count:'exact', head:true}).gte('created_at', today)` | `count` |
| `support_urgent_count` | `support_tickets.select('id', {count:'exact', head:true}).eq('priority','urgent').eq('status','pending')` | `count` |
| `support_recent_tickets` | `support_tickets.select('*, members(name)').eq('status','pending').order('created_at', {ascending:false}).limit(2)` | `Ticket[]` |

---

## 6. 모달 액션 상세 (Modal Definitions)

### 6.1 모달 레지스트리

```typescript
// src/types/widget.ts

interface ModalDefinition {
  id: string;
  title: string;
  description: string;
  fields: ModalField[];
  submitAction: {
    table: string;
    method: 'insert' | 'update' | 'upsert';
    successMessage: string;
    /** 성공 후 리프레시할 위젯 ID 목록 */
    refreshWidgets: string[];
  };
}

interface ModalField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'date' | 'time' | 'textarea' | 'member-search';
  required: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  /** select 타입에서 DB에서 옵션을 가져올 때 */
  optionsQuery?: {
    table: string;
    valueField: string;
    labelField: string;
    filter?: Record<string, string>;
  };
}
```

### 6.2 모달 상세 정의

#### `quick-add-member` — 신규 회원 등록

```json
{
  "id": "quick-add-member",
  "title": "신규 회원 등록",
  "description": "새로운 회원을 빠르게 등록합니다.",
  "fields": [
    {
      "name": "name",
      "label": "이름",
      "type": "text",
      "required": true,
      "placeholder": "홍길동"
    },
    {
      "name": "email",
      "label": "이메일",
      "type": "email",
      "required": true,
      "placeholder": "hong@email.com"
    },
    {
      "name": "phone",
      "label": "전화번호",
      "type": "tel",
      "required": true,
      "placeholder": "010-0000-0000"
    },
    {
      "name": "facility_id",
      "label": "소속 지점",
      "type": "select",
      "required": true,
      "optionsQuery": {
        "table": "facilities",
        "valueField": "id",
        "labelField": "name"
      }
    }
  ],
  "submitAction": {
    "table": "members",
    "method": "insert",
    "successMessage": "회원이 등록되었습니다.",
    "refreshWidgets": ["members"]
  }
}
```

#### `quick-add-session` — 수업 추가

```json
{
  "id": "quick-add-session",
  "title": "빠른 수업 추가",
  "description": "오늘 또는 내일 수업을 빠르게 추가합니다.",
  "fields": [
    {
      "name": "session_date",
      "label": "날짜",
      "type": "date",
      "required": true
    },
    {
      "name": "start_time",
      "label": "시작 시간",
      "type": "time",
      "required": true
    },
    {
      "name": "title",
      "label": "수업명",
      "type": "text",
      "required": true,
      "placeholder": "CrossFit WOD"
    },
    {
      "name": "coach_id",
      "label": "담당 코치",
      "type": "select",
      "required": true,
      "optionsQuery": {
        "table": "coaches",
        "valueField": "id",
        "labelField": "name",
        "filter": { "status": "active" }
      }
    },
    {
      "name": "capacity",
      "label": "정원",
      "type": "number",
      "required": true,
      "placeholder": "20"
    },
    {
      "name": "wod_description",
      "label": "WOD 설명",
      "type": "textarea",
      "required": false,
      "placeholder": "오늘의 운동 내용 (선택사항)"
    }
  ],
  "submitAction": {
    "table": "sessions",
    "method": "insert",
    "successMessage": "수업이 추가되었습니다.",
    "refreshWidgets": ["schedule", "coaches"]
  }
}
```

#### `quick-manual-checkin` — 수동 체크인

```json
{
  "id": "quick-manual-checkin",
  "title": "수동 체크인",
  "description": "QR 미지참 또는 단말기 오류 시 수동으로 체크인을 처리합니다.",
  "fields": [
    {
      "name": "member_id",
      "label": "회원 검색",
      "type": "member-search",
      "required": true,
      "placeholder": "이름 또는 전화번호로 검색"
    },
    {
      "name": "facility_id",
      "label": "지점",
      "type": "select",
      "required": true,
      "optionsQuery": {
        "table": "facilities",
        "valueField": "id",
        "labelField": "name"
      }
    }
  ],
  "submitAction": {
    "table": "checkins",
    "method": "insert",
    "successMessage": "체크인이 완료되었습니다.",
    "refreshWidgets": ["checkins"]
  }
}
```

#### `quick-add-transaction` — 수동 결제 등록

```json
{
  "id": "quick-add-transaction",
  "title": "수동 결제 등록",
  "description": "현금 결제 등 PG를 거치지 않는 결제를 직접 등록합니다.",
  "fields": [
    {
      "name": "member_id",
      "label": "회원 검색",
      "type": "member-search",
      "required": true,
      "placeholder": "이름 또는 전화번호로 검색"
    },
    {
      "name": "amount",
      "label": "결제 금액",
      "type": "number",
      "required": true,
      "placeholder": "100000"
    },
    {
      "name": "category",
      "label": "결제 항목",
      "type": "select",
      "required": true,
      "options": [
        { "value": "membership", "label": "멤버십 결제" },
        { "value": "pt", "label": "PT 수업" },
        { "value": "merchandise", "label": "용품 판매" },
        { "value": "etc", "label": "기타" }
      ]
    },
    {
      "name": "payment_method",
      "label": "결제 수단",
      "type": "select",
      "required": true,
      "options": [
        { "value": "cash", "label": "현금" },
        { "value": "card", "label": "카드 (수기)" },
        { "value": "transfer", "label": "계좌이체" }
      ]
    },
    {
      "name": "note",
      "label": "메모",
      "type": "textarea",
      "required": false,
      "placeholder": "결제 관련 메모 (선택)"
    }
  ],
  "submitAction": {
    "table": "transactions",
    "method": "insert",
    "successMessage": "결제가 등록되었습니다.",
    "refreshWidgets": ["transactions"]
  }
}
```

#### `quick-send-notification` — 빠른 알림 전송

```json
{
  "id": "quick-send-notification",
  "title": "빠른 알림 전송",
  "description": "전체 또는 특정 그룹에게 알림을 발송합니다.",
  "fields": [
    {
      "name": "target_group",
      "label": "대상 그룹",
      "type": "select",
      "required": true,
      "options": [
        { "value": "all", "label": "전체 회원" },
        { "value": "active", "label": "활성 회원만" },
        { "value": "expiring", "label": "만료 임박 회원" }
      ]
    },
    {
      "name": "title",
      "label": "제목",
      "type": "text",
      "required": true,
      "placeholder": "알림 제목"
    },
    {
      "name": "message",
      "label": "내용",
      "type": "textarea",
      "required": true,
      "placeholder": "알림 내용을 입력하세요"
    }
  ],
  "submitAction": {
    "table": "notifications",
    "method": "insert",
    "successMessage": "알림이 발송되었습니다.",
    "refreshWidgets": ["notifications"]
  }
}
```

---

### 6.3 추가 모달 정의 (확장 액션용)

아래는 위젯 다중 액션 확장에 따라 새로 추가된 모달들입니다.

#### `quick-search-member` — 회원 빠른 검색

```json
{
  "id": "quick-search-member",
  "title": "회원 검색",
  "description": "이름 또는 전화번호로 회원을 검색하고 프로필로 이동합니다.",
  "fields": [
    {
      "name": "search_query",
      "label": "검색어",
      "type": "text",
      "required": true,
      "placeholder": "이름, 이메일 또는 전화번호"
    }
  ],
  "submitAction": {
    "table": "members",
    "method": "select",
    "successMessage": "",
    "refreshWidgets": [],
    "navigateOnSelect": "/admin/members/{id}"
  }
}
```

#### `quick-cancel-session` — 수업 취소

```json
{
  "id": "quick-cancel-session",
  "title": "수업 취소",
  "description": "오늘 수업을 취소하고 예약자에게 자동 알림을 발송합니다.",
  "fields": [
    {
      "name": "session_id",
      "label": "취소할 수업",
      "type": "select",
      "required": true,
      "optionsQuery": {
        "table": "sessions",
        "valueField": "id",
        "labelField": "title",
        "filter": { "session_date": "today", "status": "active" },
        "displayFormat": "{title} ({start_time})"
      }
    },
    {
      "name": "cancel_reason",
      "label": "취소 사유",
      "type": "select",
      "required": true,
      "options": [
        { "value": "coach_absence", "label": "코치 부재" },
        { "value": "low_enrollment", "label": "예약 부족" },
        { "value": "facility_issue", "label": "시설 문제" },
        { "value": "weather", "label": "기상 악화" },
        { "value": "other", "label": "기타" }
      ]
    },
    {
      "name": "notify_members",
      "label": "예약자 알림 발송",
      "type": "toggle",
      "required": false,
      "defaultValue": true
    },
    {
      "name": "note",
      "label": "메모",
      "type": "textarea",
      "required": false,
      "placeholder": "추가 안내 사항 (선택)"
    }
  ],
  "submitAction": {
    "table": "sessions",
    "method": "update",
    "successMessage": "수업이 취소되었습니다. 예약자에게 알림이 발송됩니다.",
    "refreshWidgets": ["schedule", "notifications"]
  }
}
```

#### `quick-change-coach` — 코치 변경

```json
{
  "id": "quick-change-coach",
  "title": "코치 변경",
  "description": "오늘 수업의 담당 코치를 변경합니다.",
  "fields": [
    {
      "name": "session_id",
      "label": "대상 수업",
      "type": "select",
      "required": true,
      "optionsQuery": {
        "table": "sessions",
        "valueField": "id",
        "labelField": "title",
        "filter": { "session_date": "today" },
        "displayFormat": "{title} ({start_time}) - {current_coach}"
      }
    },
    {
      "name": "new_coach_id",
      "label": "변경할 코치",
      "type": "select",
      "required": true,
      "optionsQuery": {
        "table": "coaches",
        "valueField": "id",
        "labelField": "name",
        "filter": { "status": "active" }
      }
    }
  ],
  "submitAction": {
    "table": "session_coaches",
    "method": "update",
    "successMessage": "코치가 변경되었습니다.",
    "refreshWidgets": ["schedule", "coaches"]
  }
}
```

#### `quick-cancel-checkin` — 체크인 취소

```json
{
  "id": "quick-cancel-checkin",
  "title": "체크인 취소",
  "description": "잘못된 체크인 기록을 삭제합니다.",
  "fields": [
    {
      "name": "member_id",
      "label": "회원 검색",
      "type": "member-search",
      "required": true,
      "placeholder": "이름 또는 전화번호로 검색"
    },
    {
      "name": "checkin_id",
      "label": "취소할 체크인",
      "type": "select",
      "required": true,
      "optionsQuery": {
        "table": "checkins",
        "valueField": "id",
        "labelField": "checkin_time",
        "filter": { "member_id": "{member_id}", "date": "today" },
        "displayFormat": "{checkin_time} ({checkin_method})"
      },
      "dependsOn": "member_id"
    },
    {
      "name": "reason",
      "label": "취소 사유",
      "type": "text",
      "required": true,
      "placeholder": "중복 체크인, 오입장 등"
    }
  ],
  "submitAction": {
    "table": "checkins",
    "method": "delete",
    "successMessage": "체크인이 취소되었습니다.",
    "refreshWidgets": ["checkins"]
  }
}
```

#### `quick-refund` — 환불 처리

```json
{
  "id": "quick-refund",
  "title": "환불 처리",
  "description": "결제 건에 대한 환불을 처리합니다.",
  "fields": [
    {
      "name": "member_id",
      "label": "회원 검색",
      "type": "member-search",
      "required": true,
      "placeholder": "이름 또는 전화번호로 검색"
    },
    {
      "name": "transaction_id",
      "label": "환불 대상 결제",
      "type": "select",
      "required": true,
      "optionsQuery": {
        "table": "transactions",
        "valueField": "id",
        "labelField": "created_at",
        "filter": { "member_id": "{member_id}", "payment_status": "completed" },
        "displayFormat": "₩{amount} - {category} ({created_at})"
      },
      "dependsOn": "member_id"
    },
    {
      "name": "refund_amount",
      "label": "환불 금액",
      "type": "number",
      "required": true,
      "placeholder": "부분 환불 시 금액 입력"
    },
    {
      "name": "refund_reason",
      "label": "환불 사유",
      "type": "select",
      "required": true,
      "options": [
        { "value": "cancel_membership", "label": "멤버십 해지" },
        { "value": "overcharge", "label": "과다 청구" },
        { "value": "service_issue", "label": "서비스 불만" },
        { "value": "other", "label": "기타" }
      ]
    }
  ],
  "submitAction": {
    "table": "transactions",
    "method": "insert",
    "successMessage": "환불이 처리되었습니다.",
    "refreshWidgets": ["transactions"]
  }
}
```

#### `quick-schedule-notification` — 예약 알림 등록

```json
{
  "id": "quick-schedule-notification",
  "title": "예약 알림 등록",
  "description": "특정 시간에 자동으로 발송할 알림을 예약합니다.",
  "fields": [
    {
      "name": "target_group",
      "label": "대상 그룹",
      "type": "select",
      "required": true,
      "options": [
        { "value": "all", "label": "전체 회원" },
        { "value": "active", "label": "활성 회원만" },
        { "value": "expiring", "label": "만료 임박 회원" }
      ]
    },
    {
      "name": "scheduled_date",
      "label": "발송 날짜",
      "type": "date",
      "required": true
    },
    {
      "name": "scheduled_time",
      "label": "발송 시간",
      "type": "time",
      "required": true
    },
    {
      "name": "title",
      "label": "제목",
      "type": "text",
      "required": true,
      "placeholder": "알림 제목"
    },
    {
      "name": "message",
      "label": "내용",
      "type": "textarea",
      "required": true,
      "placeholder": "알림 내용을 입력하세요"
    }
  ],
  "submitAction": {
    "table": "notifications",
    "method": "insert",
    "successMessage": "예약 알림이 등록되었습니다.",
    "refreshWidgets": ["notifications"]
  }
}
```

#### `quick-class-reminder` — 수업 안내 발송

```json
{
  "id": "quick-class-reminder",
  "title": "수업 안내 발송",
  "description": "오늘 수업 예약자에게 안내 알림을 발송합니다.",
  "fields": [
    {
      "name": "session_id",
      "label": "대상 수업",
      "type": "select",
      "required": true,
      "optionsQuery": {
        "table": "sessions",
        "valueField": "id",
        "labelField": "title",
        "filter": { "session_date": "today" },
        "displayFormat": "{title} ({start_time}) - 예약 {booking_count}명"
      }
    },
    {
      "name": "message",
      "label": "추가 안내사항",
      "type": "textarea",
      "required": false,
      "placeholder": "추가 안내가 있으면 입력하세요 (선택)"
    }
  ],
  "submitAction": {
    "table": "notifications",
    "method": "insert",
    "successMessage": "수업 안내가 발송되었습니다.",
    "refreshWidgets": ["notifications"]
  }
}
```

#### `quick-assign-membership` — 멤버십 부여

```json
{
  "id": "quick-assign-membership",
  "title": "멤버십 부여",
  "description": "회원에게 멤버십을 직접 부여합니다 (프로모션, 보상 등).",
  "fields": [
    {
      "name": "member_id",
      "label": "회원 검색",
      "type": "member-search",
      "required": true,
      "placeholder": "이름 또는 전화번호로 검색"
    },
    {
      "name": "plan_id",
      "label": "요금제",
      "type": "select",
      "required": true,
      "optionsQuery": {
        "table": "membership_plans",
        "valueField": "id",
        "labelField": "name",
        "displayFormat": "{name} (₩{price})"
      }
    },
    {
      "name": "start_date",
      "label": "시작 날짜",
      "type": "date",
      "required": true
    },
    {
      "name": "note",
      "label": "부여 사유",
      "type": "textarea",
      "required": false,
      "placeholder": "프로모션, 보상, 이벤트 당첨 등"
    }
  ],
  "submitAction": {
    "table": "memberships",
    "method": "insert",
    "successMessage": "멤버십이 부여되었습니다.",
    "refreshWidgets": ["memberships", "members"]
  }
}
```

#### `quick-pause-membership` — 멤버십 일시정지

```json
{
  "id": "quick-pause-membership",
  "title": "멤버십 일시정지",
  "description": "멤버십을 일시정지(홀딩) 처리합니다.",
  "fields": [
    {
      "name": "member_id",
      "label": "회원 검색",
      "type": "member-search",
      "required": true,
      "placeholder": "이름 또는 전화번호로 검색"
    },
    {
      "name": "membership_id",
      "label": "대상 멤버십",
      "type": "select",
      "required": true,
      "optionsQuery": {
        "table": "memberships",
        "valueField": "id",
        "labelField": "plan_name",
        "filter": { "member_id": "{member_id}", "status": "active" },
        "displayFormat": "{plan_name} (~{end_date})"
      },
      "dependsOn": "member_id"
    },
    {
      "name": "pause_days",
      "label": "정지 기간 (일)",
      "type": "number",
      "required": true,
      "placeholder": "7"
    },
    {
      "name": "reason",
      "label": "정지 사유",
      "type": "select",
      "required": true,
      "options": [
        { "value": "injury", "label": "부상" },
        { "value": "travel", "label": "여행/출장" },
        { "value": "personal", "label": "개인 사유" },
        { "value": "other", "label": "기타" }
      ]
    }
  ],
  "submitAction": {
    "table": "memberships",
    "method": "update",
    "successMessage": "멤버십이 일시정지되었습니다.",
    "refreshWidgets": ["memberships"]
  }
}
```

#### `quick-extend-membership` — 멤버십 기간 연장

```json
{
  "id": "quick-extend-membership",
  "title": "멤버십 기간 연장",
  "description": "멤버십 만료일을 수동으로 연장합니다.",
  "fields": [
    {
      "name": "member_id",
      "label": "회원 검색",
      "type": "member-search",
      "required": true,
      "placeholder": "이름 또는 전화번호로 검색"
    },
    {
      "name": "membership_id",
      "label": "대상 멤버십",
      "type": "select",
      "required": true,
      "optionsQuery": {
        "table": "memberships",
        "valueField": "id",
        "labelField": "plan_name",
        "filter": { "member_id": "{member_id}" },
        "displayFormat": "{plan_name} (~{end_date})"
      },
      "dependsOn": "member_id"
    },
    {
      "name": "extend_days",
      "label": "연장 기간 (일)",
      "type": "number",
      "required": true,
      "placeholder": "30"
    },
    {
      "name": "reason",
      "label": "연장 사유",
      "type": "text",
      "required": true,
      "placeholder": "시설 공사, 서비스 보상 등"
    }
  ],
  "submitAction": {
    "table": "memberships",
    "method": "update",
    "successMessage": "멤버십이 연장되었습니다.",
    "refreshWidgets": ["memberships"]
  }
}
```

#### `quick-add-coach` — 코치 등록

```json
{
  "id": "quick-add-coach",
  "title": "코치 등록",
  "description": "새로운 코치를 빠르게 등록합니다.",
  "fields": [
    {
      "name": "name",
      "label": "이름",
      "type": "text",
      "required": true,
      "placeholder": "코치 이름"
    },
    {
      "name": "email",
      "label": "이메일",
      "type": "email",
      "required": true,
      "placeholder": "coach@bcl.com"
    },
    {
      "name": "phone",
      "label": "전화번호",
      "type": "tel",
      "required": false,
      "placeholder": "010-0000-0000"
    },
    {
      "name": "specialties",
      "label": "전문 분야",
      "type": "multi-select",
      "required": false,
      "options": [
        { "value": "crossfit", "label": "CrossFit" },
        { "value": "olympic_lifting", "label": "Olympic Lifting" },
        { "value": "gymnastics", "label": "Gymnastics" },
        { "value": "endurance", "label": "Endurance" },
        { "value": "mobility", "label": "Mobility" }
      ]
    }
  ],
  "submitAction": {
    "table": "coaches",
    "method": "insert",
    "successMessage": "코치가 등록되었습니다.",
    "refreshWidgets": ["coaches"]
  }
}
```

#### `quick-assign-coach` — 수업 코치 배정

```json
{
  "id": "quick-assign-coach",
  "title": "수업 코치 배정",
  "description": "미배정 수업에 코치를 배정합니다.",
  "fields": [
    {
      "name": "session_id",
      "label": "대상 수업",
      "type": "select",
      "required": true,
      "optionsQuery": {
        "table": "sessions",
        "valueField": "id",
        "labelField": "title",
        "filter": { "session_date": "today", "has_coach": false },
        "displayFormat": "{title} ({start_time}) - 코치 미배정"
      }
    },
    {
      "name": "coach_id",
      "label": "배정할 코치",
      "type": "select",
      "required": true,
      "optionsQuery": {
        "table": "coaches",
        "valueField": "id",
        "labelField": "name",
        "filter": { "status": "active" }
      }
    },
    {
      "name": "role",
      "label": "역할",
      "type": "select",
      "required": true,
      "options": [
        { "value": "lead", "label": "메인 코치" },
        { "value": "assistant", "label": "보조 코치" }
      ]
    }
  ],
  "submitAction": {
    "table": "session_coaches",
    "method": "insert",
    "successMessage": "코치가 배정되었습니다.",
    "refreshWidgets": ["coaches", "schedule"]
  }
}
```

#### `quick-reply-ticket` — 문의 빠른 답변

```json
{
  "id": "quick-reply-ticket",
  "title": "문의 빠른 답변",
  "description": "대기 중인 최우선 문의에 바로 답변합니다.",
  "fields": [
    {
      "name": "ticket_id",
      "label": "대상 문의",
      "type": "select",
      "required": true,
      "optionsQuery": {
        "table": "support_tickets",
        "valueField": "id",
        "labelField": "subject",
        "filter": { "status": "pending" },
        "displayFormat": "[{priority}] {subject} - {member_name}"
      }
    },
    {
      "name": "reply_message",
      "label": "답변 내용",
      "type": "textarea",
      "required": true,
      "placeholder": "회원에게 보낼 답변을 입력하세요"
    },
    {
      "name": "new_status",
      "label": "처리 상태",
      "type": "select",
      "required": true,
      "options": [
        { "value": "in_progress", "label": "처리 중" },
        { "value": "resolved", "label": "처리 완료" }
      ]
    }
  ],
  "submitAction": {
    "table": "support_tickets",
    "method": "update",
    "successMessage": "답변이 전송되었습니다.",
    "refreshWidgets": ["support"]
  }
}
```

#### `quick-add-faq` — FAQ 추가

```json
{
  "id": "quick-add-faq",
  "title": "FAQ 추가",
  "description": "자주 묻는 질문 항목을 추가합니다.",
  "fields": [
    {
      "name": "question",
      "label": "질문",
      "type": "text",
      "required": true,
      "placeholder": "자주 묻는 질문을 입력하세요"
    },
    {
      "name": "answer",
      "label": "답변",
      "type": "textarea",
      "required": true,
      "placeholder": "답변 내용을 입력하세요"
    },
    {
      "name": "category",
      "label": "카테고리",
      "type": "select",
      "required": true,
      "options": [
        { "value": "membership", "label": "멤버십" },
        { "value": "reservation", "label": "예약" },
        { "value": "payment", "label": "결제/환불" },
        { "value": "facility", "label": "시설 이용" },
        { "value": "etc", "label": "기타" }
      ]
    }
  ],
  "submitAction": {
    "table": "faqs",
    "method": "insert",
    "successMessage": "FAQ가 추가되었습니다.",
    "refreshWidgets": ["support"]
  }
}
```

---

## 7. 드래그 & 드롭 기술 구현 사양

### 7.1 라이브러리 선택

**`@dnd-kit/core` + `@dnd-kit/sortable`** 사용 (React 전용, 경량, 접근성 최적화)

### 7.2 컴포넌트 트리

```
<DashboardPage>
  └─ <WidgetSection>
       ├─ <WidgetSectionHeader>      // "Quick Actions" + [+ 위젯 추가] 버튼
       ├─ <DndContext>
       │    ├─ <SortableContext>
       │    │    ├─ <SortableWidget id="members" />
       │    │    ├─ <SortableWidget id="schedule" />
       │    │    ├─ <SortableWidget id="checkins" />
       │    │    └─ ...
       │    └─ <DragOverlay />        // 드래그 중 표시되는 ghost 카드
       │
       └─ <TrashZone />              // 드래그 모드 시 하단에 나타나는 삭제 영역
  
  <WidgetDrawer isOpen={...}>         // 우측 슬라이드-인 패널
       ├─ <DrawerHeader />
       ├─ <SearchInput />
       ├─ <EnabledWidgetList />
       └─ <AvailableWidgetList />

  <QuickActionModal modalId={...}>    // 동적 모달 렌더러
       ├─ <ModalHeader />
       ├─ <DynamicForm fields={...} />
       └─ <ModalActions />
```

### 7.3 드래그 인터랙션 상세

| 상태 | 스타일 |
|------|--------|
| **idle** | `cursor: default`, 드래그 핸들만 `cursor: grab` |
| **dragging** | 원본: `opacity: 0.3`, Ghost: `scale(1.02)`, `box-shadow: 0 20px 60px rgba(0,0,0,0.4)` |
| **over drop target** | Target: `border: 2px dashed var(--primary)`, `background: var(--primary)/5%` |
| **over trash** | Trash Zone: `background: #EF4444/20%`, `border-color: #EF4444`, `scale(1.05)` |
| **dropped** | 이동 애니메이션: `transition: transform 200ms ease` |
| **trash dropped** | 삭제 애니메이션: `scale(0) + opacity(0)` → 300ms → 제거 |

### 7.4 Trash Zone 사양

```
위치:     화면 하단 중앙, position: fixed
크기:     width: 200px, height: 60px
노출:     드래그 시작 시 fade-in (0 → 1, 300ms)
숨김:     드래그 종료 시 fade-out (1 → 0, 200ms)
기본 색:  bg-white/5, border: dashed white/20
활성 색:  bg-red-500/20, border: solid red-500
아이콘:   🗑 (trash can emoji 또는 SVG)
텍스트:   "여기에 놓으면 위젯 제거"
```

---

## 8. 파일 구조 (Implementation Plan)

```
src/
├─ types/
│   └─ widget.ts                          # WidgetDefinition, ModalDefinition, WidgetUserState 타입
│
├─ config/
│   ├─ widget-registry.ts                 # 위젯 레지스트리 (JSON 데이터, 8개 기본 위젯)
│   └─ modal-registry.ts                  # 모달 레지스트리 (JSON 데이터, 기본 5개 + 확장 13개)
│
├─ hooks/
│   ├─ useWidgetState.ts                  # localStorage 기반 위젯 상태 관리
│   ├─ useWidgetData.ts                   # 위젯별 데이터 쿼리 훅
│   └─ useWidgetRegistry.ts              # 코드 + DB 레지스트리 통합 (AI 생성 위젯 병합)
│
├─ components/
│   ├─ dashboard/
│   │   ├─ WidgetSection.tsx              # 위젯 섹션 컨테이너 (DnD + 추가/제거만)
│   │   ├─ WidgetCard.tsx                 # 개별 위젯 카드 (공통 래퍼)
│   │   ├─ WidgetCardContent.tsx          # 위젯 카드 내부 콘텐츠 렌더러
│   │   ├─ WidgetActionFooter.tsx         # 다중 액션 그리드 렌더러 (primary/secondary/link)
│   │   ├─ WidgetDrawer.tsx              # 위젯 추가 사이드 패널
│   │   ├─ QuickActionModal.tsx          # 동적 모달 렌더러
│   │   └─ AIWidgetGenerator.tsx         # AI 위젯 생성 다이얼로그 (프롬프트 → 미리보기 → 확정)
│   │
│   └─ settings/
│       └─ QuickActionManagerTab.tsx      # Settings 탭: 위젯 전체 관리 + AI 로그 + AI 생성 호출
│
├─ app/admin/dashboard/
│   └─ page.tsx                           # 대시보드 – WidgetSection 통합
│
└─ app/admin/setup/settings/
    └─ page.tsx                           # Settings – Quick Action Manager 탭 포함
```

### 역할 분리 원칙

| 화면 | 역할 | 사용 가능 액션 |
|------|------|---------------|
| **Dashboard** | 개인별 위젯 배치 | 위젯 추가, 순서 변경 (DnD), 비표시 (드래그→트래시), Reset |
| **Settings → Quick Action Manager** | 전체 위젯 관리 (관리자) | 위젯 목록 조회, 기본 표시 ON/OFF, AI 위젯 생성, AI 생성 로그, 위젯 영구 삭제 |

> **대시보드에서의 "삭제"**: 대시보드에서 위젯을 트래시에 드롭하면 해당 사용자의 화면에서만 숨겨짐. 위젯 자체는 삭제되지 않음.
> **Settings에서의 "삭제"**: AI 생성/커스텀 위젯만 영구 삭제 가능. 시스템 위젯은 삭제 불가.

---

## 9. 향후 확장 계획

### 추가 가능 위젯 후보

| 위젯 ID | 제목 | 카테고리 | 설명 |
|---------|------|---------|------|
| `race` | Race 이벤트 | operations | 진행 중 레이스 현황, 최근 기록 |
| `feedback` | 피드백 | crm | 저평가 수업 알림, 평균 만족도 |
| `attendance-heatmap` | 출석 히트맵 | insights | 요일/시간별 방문 패턴 미니맵 |
| `revenue-trend` | 매출 추이 | insights | 최근 7일 매출 스파크라인 차트 |
| `expiring-alert` | 만료 알림 | finance | 오늘/내일 만료 회원 긴급 목록 |
| `content` | 콘텐츠 관리 | crm | 최근 공지, 배너 상태 |

### 확장 절차

1. `widget-registry.ts`에 새 `WidgetDefinition` 항목 추가
2. (모달이 필요하면) `modal-registry.ts`에 `ModalDefinition` 추가  
3. `useWidgetData.ts`에 해당 queryKey의 쿼리 핸들러 추가
4. — 끝. 별도 컴포넌트 생성 불필요 —

---

## 10. 비기능 요구사항

| 항목 | 사양 |
|------|------|
| **데이터 갱신 주기** | 컴포넌트 마운트 시 1회 + 60초 간격 polling (또는 Supabase Realtime) |
| **로딩 상태** | 위젯별 개별 Skeleton 로더 |
| **에러 처리** | 위젯별 개별 에러 표시 (다른 위젯에 영향 없음) |
| **접근성** | 드래그 핸들에 `aria-label`, 키보드 방향키로 순서 변경 지원 |
| **성능** | 보이는 위젯만 쿼리 실행 (Intersection Observer 또는 active 목록 기반) |
| **반응형** | 4col → 2col → 1col 자동 전환 |

---

## 11. Database Schema (Supabase)

### `widget_definitions` 테이블

위젯 정의를 저장하는 테이블 (시스템/AI 생성/커스텀).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | TEXT PK | 위젯 고유 ID (예: 'members', 'ai-weather-2024') |
| `title` | TEXT NOT NULL | 위젯 제목 |
| `description` | TEXT | 위젯 설명 |
| `category` | TEXT | 카테고리 (finance, operations, crm, insights, infrastructure) |
| `icon` | TEXT | 아이콘 이름 |
| `icon_color` | TEXT DEFAULT '#FF6B00' | 아이콘 색상 |
| `default_enabled` | BOOLEAN DEFAULT true | 새 사용자에게 기본 표시 여부 |
| `default_order` | INT DEFAULT 99 | 기본 정렬 순서 |
| `hero_metric` | JSONB | 히어로 메트릭 정의 |
| `context_items` | JSONB | 컨텍스트 항목 배열 |
| `progress_bar` | JSONB | 프로그레스 바 설정 |
| `badge_key` | TEXT | 뱃지 키 |
| `actions` | JSONB | 액션 버튼 배열 |
| `detail_href` | TEXT | 상세 페이지 링크 |
| `source` | TEXT DEFAULT 'system' | 출처 (system / ai_generated / custom) |
| `created_at` | TIMESTAMPTZ | 생성일 |
| `updated_at` | TIMESTAMPTZ | 수정일 |

### `modal_definitions` 테이블

위젯에서 사용하는 모달(Quick Action) 정의.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | TEXT PK | 모달 고유 ID |
| `title` | TEXT NOT NULL | 모달 제목 |
| `description` | TEXT | 모달 설명 |
| `fields` | JSONB | 폼 필드 정의 |
| `submit_endpoint` | TEXT | 제출 엔드포인트/테이블 |
| `success_message` | TEXT | 성공 메시지 |
| `refresh_widgets` | TEXT[] | 새로고침 대상 위젯 ID 목록 |
| `source` | TEXT DEFAULT 'system' | 출처 |
| `created_at` / `updated_at` | TIMESTAMPTZ | 타임스탬프 |

### `widget_settings` 테이블

사용자별 위젯 커스터마이징 설정.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK DEFAULT gen_random_uuid() | 고유 ID |
| `user_id` | UUID NOT NULL (FK auth.users) | 사용자 |
| `widget_order` | TEXT[] | 위젯 순서 |
| `hidden_widgets` | TEXT[] | 숨김 위젯 목록 |
| `custom_colors` | JSONB | 색상 오버라이드 |
| `created_at` / `updated_at` | TIMESTAMPTZ | 타임스탬프 |

### `ai_widget_generation_logs` 테이블

AI Agent가 위젯을 생성/수정한 기록.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK DEFAULT gen_random_uuid() | 고유 ID |
| `user_id` | UUID (FK auth.users) | 요청 사용자 |
| `prompt` | TEXT NOT NULL | 사용자 입력 프롬프트 |
| `model_used` | TEXT DEFAULT 'gemini-2.0-flash' | 사용 모델 |
| `generated_widget_id` | TEXT | 생성된 위젯 ID |
| `generated_modal_ids` | TEXT[] | 생성된 모달 ID 목록 |
| `status` | TEXT DEFAULT 'pending' | 상태 (pending/success/failed/rejected) |
| `error_message` | TEXT | 에러 메시지 |
| `created_at` | TIMESTAMPTZ | 생성일 |

### RLS 정책

- 모든 테이블: RLS 활성화
- `widget_definitions` / `modal_definitions`: 인증된 사용자 전체 읽기, 관리자만 쓰기
- `widget_settings`: 본인 데이터만 CRUD
- `ai_widget_generation_logs`: 본인 로그만 읽기, 로그 삽입은 관리자만

---

## 12. AI Agent (Edge Function)

### `ai-widget-generator` Edge Function

**엔드포인트**: `POST /functions/v1/ai-widget-generator`

**인증**: JWT 필수 (verify_jwt: true)

**요청 파라미터**:

```json
{
  "prompt": "이번 달 만료 예정 멤버십을 보여주는 위젯을 만들어줘",
  "action": "generate" | "preview"
}
```

**처리 흐름**:

```
1. 프롬프트 수신 → system prompt + user prompt 조합
2. Gemini 2.0 Flash API 호출
3. JSON 파싱 (widget_definition + modal_definitions)
4. action=preview → 미리보기 응답만 반환
5. action=generate → widget_definitions / modal_definitions 테이블에 INSERT
6. ai_widget_generation_logs에 로그 기록
```

**아키텍처 다이어그램**:

```
Settings → AI 위젯 생성 버튼 → AIWidgetGenerator UI
                                ↓ (prompt)
                       Supabase Edge Function (ai-widget-generator)
                                ↓ (Gemini 2.0 Flash API)
                       JSON: WidgetDefinition + ModalDefinition
                                ↓ (preview → 사용자 확인)
                                ↓ (confirm → DB 저장)
               widget_definitions / modal_definitions 테이블
                                ↓ (useWidgetRegistry 훅)
Dashboard WidgetSection → 코드 위젯 + DB 위젯 병합 → WidgetCard 렌더링
```

