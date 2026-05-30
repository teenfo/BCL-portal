# 운동 라이브러리 관리 화면 기획서 (확정)

> **작성일**: 2026-05-30  
> **상태**: 기획 확정 ✅  
> **Status**: Approved  
> **경로**: `/admin/operations/movement-library`  
> **사이드바 위치**: OPERATIONS 그룹 > WOD Templates 바로 아래

---

## 1. 배경 및 목적

WOD 템플릿 에디터에서 운동 동작을 **라이브러리에서 검색하여 연결**하는 기능이 이미 구현되어 있으나,  
라이브러리 자체를 추가·수정·삭제하는 **관리 화면이 없다**.

현재 `movement_library` 테이블에는 총 **35개** 운동이 등록되어 있으며,  
**Admin과 Coach 모두 편집 가능**한 관리 화면이 필요하다.

---

## 2. DB 스키마 (현재 + 확장)

### 현재 `movement_library` 테이블

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | uuid | ✅ | PK |
| `slug` | varchar | ✅ | 고유 식별자 (예: `deadlift`) |
| `name_ko` | varchar | ✅ | 한국어 동작명 |
| `name_en` | varchar | ✅ | 영어 동작명 |
| `category` | varchar | ✅ | 카테고리 (FK → `movement_categories` 확장 예정) |
| `equipment` | text[] | — | 필요 기구 배열 |
| `difficulty_level` | integer | ✅ | 난이도 1~5 |
| `primary_muscles` | text[] | — | 주요 사용 근육 |
| `coaching_points` | text | — | 코치 지도 포인트 |
| `source_tag` | varchar | — | 출처 태그 (crossfit / custom 등) |
| `is_active` | boolean | ✅ | 활성 여부 |
| `created_at` | timestamptz | ✅ | 생성일 |
| `updated_at` | timestamptz | ✅ | 수정일 |

### 추가할 필드 (DB 마이그레이션 필요)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `thumbnail_url` | varchar | 운동 썸네일 이미지 URL (Supabase Storage) |
| `video_url` | varchar | 시범 영상 URL (YouTube / Supabase Storage) |

### 카테고리 관리 테이블 (신규)

현재 카테고리가 문자열 하드코딩 → **`movement_categories` 테이블**로 분리  

```sql
CREATE TABLE movement_categories (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug      varchar NOT NULL UNIQUE,   -- 예: 'weightlifting'
  name_ko   varchar NOT NULL,           -- 예: '역도'
  name_en   varchar NOT NULL,           -- 예: 'Weightlifting'
  color     varchar,                    -- 카드 색상 (hex 또는 CSS)
  sort_order integer NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

---

## 3. 현재 카테고리별 현황

| 카테고리 | 등록 수 |
|---------|---------|
| gymnastics | 10 |
| weightlifting | 8 |
| monostructural | 5 |
| dumbbell | 3 |
| kettlebell | 3 |
| medball | 2 |
| accessory | 2 |
| other_equipment | 2 |
| **합계** | **35** |

---

## 4. 화면 설계

### 4.1 레이아웃

**마스터-디테일 패턴** (WOD Templates와 동일):
- **좌측**: 운동 목록 (테이블 형태)
- **우측**: 편집 패널 (480px 고정)

---

### 4.2 목록 영역 (좌측)

#### 상단 컨트롤 바
- **검색창** (`admin-search-input`): 한국어명 / 영어명 / slug 통합 검색  
- **카테고리 필터** (`admin-filter-btn` 탭):  
  - 전체 / 각 카테고리 (DB에서 동적 로드)  
- **상태 필터**: 전체 / 활성 / 비활성  
- **+ 운동 추가** (`admin-action-btn`)

#### 운동 목록 테이블

| # | 썸네일 | 한국어명 | 영어명 | 카테고리 | 난이도 | WOD 사용 수 | 상태 |
|---|-------|---------|-------|---------|-------|-----------|------|
| 1 | 🖼 | 데드리프트 | Deadlift | Weightlifting ● | ★★★☆☆ | 6 | 활성 |

- **썸네일**: 작은 이미지 (32×32px, 없으면 카테고리 아이콘 fallback)
- **카테고리**: color-coded 뱃지 (카테고리 테이블의 color 사용)
- **난이도**: 별 아이콘 시각화
- **WOD 사용 수**: `wod_template_movements` COUNT JOIN
- **비활성 행**: `opacity-50` 처리
- **행 클릭**: 우측 편집 패널 오픈

---

### 4.3 편집 패널 (우측 480px)

#### 모드 전환
- **신규 생성**: `+ 운동 추가` 클릭
- **수정**: 목록 행 클릭

#### 섹션 구성

**① 기본 정보**
```
한국어명 *     [데드리프트                    ]
영어명 *       [Deadlift                      ]
Slug *         [deadlift        ] (자동생성 + 수정 가능)
카테고리 *     [Weightlifting ▼               ]
난이도 *       ★ ★ ★ ☆ ☆  (클릭 인터랙션)
Source Tag     [crossfit ▼                    ]
활성 여부      [● 활성] 토글
```

**② 미디어**
```
썸네일 이미지  [파일 업로드 또는 URL 직접 입력]
               [미리보기 영역 (업로드 시)]
시범 영상 URL  [YouTube URL 또는 Supabase URL]
               [영상 링크 열기 버튼]
```

**③ 상세 정보**
```
기구 (Equipment) — 다중 체크박스
  ☐ Barbell  ☐ Dumbbell  ☐ Kettlebell  ☐ Pull-up Bar
  ☐ Rings    ☐ Box       ☐ Med Ball    ☐ Rope
  ☐ Machine  ☐ Bodyweight ☐ Other

주요 근육      [태그 입력: 허벅지, 코어, ...  ]

코치 포인트    [
               여러 줄 textarea
               ]
```

**④ 메타 (읽기 전용)**
```
WOD 사용 현황  현재 6개 WOD 템플릿에서 사용 중  [▶ 보기]
생성일         2026-01-15
수정일         2026-05-30
```

#### 액션 버튼
- **저장** — 생성 또는 수정
- **비활성화** — is_active 토글 (WOD 사용 중일 때 삭제 대신 권장)
- **삭제** — WOD 사용 수 > 0이면 경고:  
  > "이 운동은 N개 WOD 템플릿에서 사용 중입니다. 삭제 시 Movement Line의 라이브러리 연결이 해제됩니다."  
  > → 2단계 확인 (WOD Templates 삭제 패턴 동일)

---

### 4.4 카테고리 관리 (인라인 섹션)

카테고리 추가/수정/삭제는 별도 화면 없이 **편집 패널 하단 또는 설정 모달**로 처리:

- 편집 패널 카테고리 select 하단 `+ 카테고리 추가` 링크
- 소형 모달: 카테고리명(KO/EN) + 색상 + 순서 설정

---

## 5. UX 규칙

### Slug 자동 생성
- 영어명 입력 시 자동: `"Box Jump"` → `"box-jump"`
- 중복 시 인라인 에러: `"이미 사용 중인 slug입니다"`

### 비활성화 vs 삭제 정책
| 상황 | 권장 액션 |
|------|----------|
| WOD 사용 수 = 0 | 삭제 가능 |
| WOD 사용 수 > 0 | 비활성화 권장, 삭제 경고 후 허용 |

### 검색 반응성
- 검색어 입력 300ms debounce 후 자동 필터
- 카테고리 탭 클릭 즉시 필터

---

## 6. 권한

| 역할 | 목록 조회 | 생성 | 수정 | 삭제 |
|------|---------|------|------|------|
| Admin | ✅ | ✅ | ✅ | ✅ |
| Coach | ✅ | ✅ | ✅ | ✅ |
| Member | ❌ | ❌ | ❌ | ❌ |

→ RLS 정책: `coach` 또는 `admin` role일 때 전체 CRUD 허용

---

## 7. 사이드바 등록

**[AdminSidebar.tsx](src/components/layout/AdminSidebar.tsx)** OPERATIONS 그룹:

```
현재:
  Schedule
  WOD Templates   ← 현재 위치
  Coaches
  ...

추가 후:
  Schedule
  WOD Templates
  Movement Library ← 신규 (덤벨 아이콘)
  Coaches
  ...
```

---

## 8. DB 연동 전략

| 기능 | 방식 |
|------|------|
| 목록 조회 | 신규 RPC `fn_list_movement_library` (필터·검색·WOD 사용 수 포함) |
| 생성 | 신규 RPC `fn_upsert_movement` or 직접 INSERT |
| 수정 | 동일 RPC (id 포함 시 UPDATE) |
| 삭제 | 직접 DELETE (RLS 보호) |
| 카테고리 목록 | `movement_categories` 직접 조회 |
| 카테고리 CRUD | 직접 INSERT/UPDATE/DELETE |

---

## 9. 개발 Phase

### Phase 1: DB 마이그레이션
- [ ] `movement_categories` 테이블 생성 및 기존 카테고리 데이터 이관
- [ ] `movement_library`에 `thumbnail_url`, `video_url` 컬럼 추가
- [ ] RLS 정책: `coach` + `admin` CRUD 허용
- [ ] `fn_list_movement_library` RPC 생성

### Phase 2: 핵심 UI (CRUD)
- [ ] 라우팅: `/admin/operations/movement-library`
- [ ] 사이드바 메뉴 추가 (WOD Templates 아래)
- [ ] 목록 테이블 + 필터/검색
- [ ] 편집 패널 (생성/수정/삭제)
- [ ] 권한 가드 등록

### Phase 3: UX 완성
- [ ] Slug 자동 생성 + 중복 검증
- [ ] 난이도 별 클릭 인터랙션
- [ ] 기구 다중 체크박스
- [ ] 미디어 업로드 (썸네일 / 영상 URL)
- [ ] 삭제 경고 (WOD 사용 수 체크)
- [ ] 카테고리 인라인 추가 모달

### Phase 4: 확장 (선택)
- [ ] CSV 일괄 업로드
- [ ] 운동별 WOD 사용 이력 상세 보기
