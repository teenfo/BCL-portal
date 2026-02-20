# BCL Portal – WOD 시스템 기획서

> **Status**: Draft
> **Author**: Architect (Opus)
> **Created**: 2026-02-20
> **Last Updated**: 2026-02-20
> **Related**:
>   - `.docs/planning/wod_exercise_list.md` (운동 목록 235+ 항목 — 이 기획의 핵심 데이터 소스)
>   - `src/app/class/wod/page.tsx` (현재 WOD 라이브 디스플레이 페이지)
>   - `src/app/class/timer/page.tsx` (수업 타이머 — WOD 연동 대상)
>   - `src/app/admin/operations/schedule/page.tsx` (현재 wod_description 단순 텍스트 입력)
>   - `.docs/database/schema/001_initial_schema.sql` (sessions.wod_description 컬럼)

---

## 1. 개요 및 배경

### 1.1 목적
BCL Portal의 WOD(Workout of the Day) 시스템은 현재 **텍스트 한 줄(wod_description)**로만 운영된다. 수업 관리자가 자유 텍스트로 WOD를 입력하고, 체육관 TV의 `class/wod` 화면에 표시하는 수준이다.

목표는 `.docs/planning/wod_exercise_list.md`의 235+ 운동 데이터베이스를 기반으로, **구조화된 WOD 빌더 → 라이브 디스플레이 → 회원 조회 → 점수 기록**의 완전한 WOD 워크플로우를 구축하는 것이다.

### 1.2 현재 WOD 데이터 구조 (As-Is)

```
sessions 테이블
└── wod_description: TEXT  ← 자유 텍스트 (예: "Fran: 21-15-9 Thrusters 43kg / Pull-ups")
```

### 1.3 목표 WOD 데이터 구조 (To-Be)

```
exercises 테이블          (운동 라이브러리, 235+ 항목)
wods 테이블               (구조화된 WOD 정의)
wod_movements 테이블      (WOD 내 운동 구성)
wod_scores 테이블         (회원별 점수 기록)
```

### 1.4 핵심 WOD 포맷

| 포맷 | 설명 | 예시 |
|------|------|------|
| **For Time** | 정해진 운동을 최대한 빠르게 완료 | Fran: Thruster + Pull-up 21-15-9 |
| **AMRAP** | 제한 시간 내 최대한 많은 라운드 | AMRAP 20: 5 Pull-ups / 10 Push-ups / 15 Air Squats |
| **EMOM** | 매 분 시작 시 정해진 운동 수행 | EMOM 10: 홀수 분 5 C&J / 짝수 분 10 Pull-ups |
| **Tabata** | 20초 운동 / 10초 휴식 × 8세트 | Tabata Squat |
| **Chipper** | 여러 운동을 순서대로 1회씩 소화 | 50 DU / 40 Sit-ups / 30 KB Swing / 20 Box Jump / 10 HSPU |
| **Strength** | 근력 위주 세트 × 렙 구성 | Back Squat 5×5 @ 80% 1RM |

---

## 2. 현재 구현 상태 (As-Is)

### 2.1 기존 코드 현황

| 파일 | 현재 상태 | 비고 |
|------|-----------|------|
| `class/wod/page.tsx` | 완성된 TV 디스플레이 페이지 | `wods` 테이블 조회하나 테이블이 미생성 |
| `admin/operations/schedule/page.tsx` | `wod_description` 자유 텍스트 입력 UI | `sessions` 테이블 컬럼 |
| `apps/schedule/page.tsx` | `wod_description` 표시만 | 단순 텍스트 출력 |
| `class/timer/page.tsx` | 독립 타이머 (WOD 연동 없음) | EMOM/Tabata 모드 있음 |
| `class/leaderboard/page.tsx` | 레이스 기반 리더보드 | WOD 점수와 무관 |

### 2.2 `class/wod/page.tsx` 기존 WodItem 인터페이스

```typescript
interface WodItem {
    id: string;
    title: string;
    description: string;
    wod_type: string;        // 'for_time' | 'amrap' | 'emom' | 'tabata' | 'chipper'
    time_cap_minutes: number | null;
    rounds: number | null;
    movements: string[] | null;   // ← 운동 이름 배열 (문자열만, 구조 없음)
    session_date: string;
}
```

**한계**: `movements`가 문자열 배열이라 렙 수, 중량, 스케일링 옵션을 담을 수 없음.

### 2.3 미구현 기능

```
❌ exercises 테이블 (운동 라이브러리 DB)
❌ wods 테이블 (Supabase에 미생성, supabase.ts 타입에 없음)
❌ 구조화된 WOD 빌더 (Admin)
❌ WOD 내 운동별 렙/중량/스케일링 구성
❌ WOD-Timer 연동 (AMRAP, EMOM 시 타이머 자동 설정)
❌ 회원 앱에서 WOD 조회 및 점수 입력
❌ WOD 히스토리 및 통계
❌ 운동 코칭 포인트 표시 (TV 디스플레이)
```

---

## 3. 운동 라이브러리 (Exercise Library)

### 3.1 데이터 소스

`.docs/planning/wod_exercise_list.md`에 235+ 운동이 다음 속성으로 정의되어 있다:

| 속성 | 예시 |
|------|------|
| 한국어명 | 스러스터 |
| 영어명 | Thruster |
| 카테고리 | 역도 |
| 필요 장비 | 바벨/덤벨 |
| 난이도 | ★★★☆☆ |
| 주요 근육군 | 전신, 대퇴사두, 삼각근 |
| 설명/코칭포인트 | 프론트 스쿼트 + 푸시 프레스 연속 동작 |

### 3.2 카테고리 분류 (8개)

| 카테고리 | 운동 수 | 대표 장비 |
|---------|---------|----------|
| 역도 (Weightlifting) | 26 | 바벨, 랙 |
| 체조 (Gymnastics) | 47 | 풀업바, 링, 줄넘기 |
| 유산소 (Monostructural) | 6 | 로잉머신, 바이크, 없음 |
| 덤벨 (Dumbbell) | 23 | 덤벨 |
| 케틀벨 (Kettlebell) | 14 | 케틀벨 |
| 메드볼 (Med Ball) | 9 | 메드볼 |
| 기타 (Other Equipment) | 13 | 슬레드, 배틀로프, 샌드백 |
| 보조 (Accessory) | 30+ | 맨몸, 밴드, AB휠 |

---

## 4. 데이터베이스 설계 (To-Be)

### 4.1 신규 테이블: `exercises`

```sql
CREATE TABLE IF NOT EXISTS exercises (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id     uuid REFERENCES facilities(id) ON DELETE CASCADE,
    name_ko         varchar(100) NOT NULL,          -- 한국어명
    name_en         varchar(100),                    -- 영어명
    category        varchar(50) NOT NULL,            -- 'weightlifting' | 'gymnastics' | 'cardio' | 'dumbbell' | 'kettlebell' | 'medball' | 'other' | 'accessory'
    equipment       varchar(200),                    -- 필요 장비
    difficulty      integer DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),  -- 1~5
    primary_muscles varchar(200),                    -- 주요 근육군
    coaching_points text,                            -- 설명/코칭포인트
    is_benchmark    boolean DEFAULT false,           -- Fran, Grace 등 Named WOD 구성 운동
    is_active       boolean DEFAULT true,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

-- 시설별 커스텀 운동 추가 가능
-- facility_id IS NULL → 글로벌 기본 운동 라이브러리 (시드 데이터)
```

### 4.2 신규 테이블: `wods`

```sql
CREATE TABLE IF NOT EXISTS wods (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id         uuid REFERENCES facilities(id) ON DELETE CASCADE,
    session_id          uuid REFERENCES sessions(id) ON DELETE SET NULL,  -- 수업에 연결 (선택)
    title               varchar(200) NOT NULL,       -- WOD 이름 (예: "Fran", "Daily WOD")
    wod_type            varchar(20) NOT NULL,         -- 'for_time' | 'amrap' | 'emom' | 'tabata' | 'chipper' | 'strength'
    wod_date            date NOT NULL,                -- WOD 날짜
    time_cap_minutes    integer,                      -- 제한 시간 (For Time, EMOM에서 사용)
    rounds              integer,                      -- 라운드 수 (AMRAP, EMOM에서 사용)
    description         text,                         -- 자유 텍스트 보조 설명
    is_published        boolean DEFAULT false,        -- TV 디스플레이 표시 여부
    created_by          uuid REFERENCES members(id),
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);
```

### 4.3 신규 테이블: `wod_movements`

```sql
CREATE TABLE IF NOT EXISTS wod_movements (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    wod_id          uuid REFERENCES wods(id) ON DELETE CASCADE,
    exercise_id     uuid REFERENCES exercises(id),
    display_order   integer NOT NULL,                -- 순서
    reps            varchar(50),                     -- 횟수 (예: "21-15-9", "10", "max")
    sets            integer,                         -- 세트 수 (Strength용)
    load_note       varchar(100),                    -- 중량 메모 (예: "43kg/29kg", "70%")
    duration_seconds integer,                        -- 시간 기반 (예: Tabata 20초)
    distance_meters integer,                         -- 거리 기반 (예: 로잉 500m)
    scaling_rx      text,                            -- RX 기준 설명
    scaling_scaled  text,                            -- Scaled 기준 설명
    scaling_beginner text,                           -- 입문 기준 설명
    notes           text
);
```

### 4.4 신규 테이블: `wod_scores`

```sql
CREATE TABLE IF NOT EXISTS wod_scores (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    wod_id          uuid REFERENCES wods(id) ON DELETE CASCADE,
    member_id       uuid REFERENCES members(id) ON DELETE CASCADE,
    score_type      varchar(20) NOT NULL,            -- 'time' | 'reps' | 'weight' | 'rounds+reps'
    score_value     numeric,                         -- 시간(초) or 렙 수 or 중량(kg)
    score_text      varchar(100),                    -- 표시용 (예: "5:23", "142 reps", "100kg")
    is_rx           boolean DEFAULT false,           -- RX 완료 여부
    notes           text,
    recorded_at     timestamptz DEFAULT now(),
    UNIQUE(wod_id, member_id)                        -- 1 WOD당 1 점수 (업데이트 허용)
);
```

### 4.5 기존 테이블 변경

```sql
-- sessions 테이블에 wod_id 컬럼 추가 (wod_description과 공존, 점진적 마이그레이션)
ALTER TABLE sessions ADD COLUMN wod_id uuid REFERENCES wods(id) ON DELETE SET NULL;
```

### 4.6 RLS 정책

```sql
-- exercises: 모든 인증 사용자 읽기, Admin만 쓰기
-- wods: 모든 인증 사용자 읽기, Admin/Coach 쓰기
-- wod_movements: wods와 동일
-- wod_scores: 본인 점수 읽기/쓰기, Admin/Coach 전체 읽기
```

---

## 5. UI 변경 상세

### 5.1 화면 구성 개요

```
┌──────────────────────────────────────────────────────────────────┐
│                      WOD 시스템 화면 맵                            │
├────────────────────┬─────────────────────────────────────────────┤
│  Admin 포털        │  User App                                    │
│  ─────────────     │  ──────────                                  │
│  [수업 관리]        │  [일정] 탭 내 오늘의 WOD 미리보기              │
│   └ WOD 빌더       │  [WOD] 전용 페이지 (신규)                      │
│      └ 운동 선택    │   └ 상세 보기 (운동 목록 + 코칭 포인트)          │
│      └ 렙/중량 설정 │   └ 점수 입력                                 │
│      └ 스케일링     │   └ 히스토리                                  │
│  [운동 라이브러리]   │                                              │
│   └ 235+ 운동 관리  │  Class 디스플레이 (TV)                        │
│      └ CRUD         │  ─────────────────                           │
│                    │  [class/wod] WOD 라이브 디스플레이 (개선)       │
│                    │  [class/timer] WOD 연동 타이머 (개선)           │
└────────────────────┴─────────────────────────────────────────────┘
```

### 5.2 Admin — WOD 빌더 (신규: `admin/operations/schedule` 탭 확장)

현재 수업 생성 모달에서 `wod_description` 텍스트 입력 UI를 **구조화된 WOD 빌더로 교체**:

```
┌─────────────────────────────────────────────────────────────┐
│  WOD 구성                                                    │
│  ┌────────────┐  ┌────────────────────────────────────────┐  │
│  │ WOD 제목    │  │ WOD 유형: [For Time ▼]                 │  │
│  └────────────┘  └────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 시간 캡: [21] 분    라운드: [3]                           │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                              │
│  운동 구성                                       [+ 운동 추가] │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 1. [스러스터 ×] ———————————  렙: [21-15-9]  중량: [43/29kg]│ │
│  │    RX: 43kg/29kg  Scaled: 29kg/20kg  입문: 15kg/10kg    │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │ 2. [풀업 ×] ———————————————  렙: [21-15-9]               │ │
│  │    RX: strict  Scaled: kipping  입문: ring row           │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                              │
│  보조 설명 (선택): [텍스트 입력]                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ [TV 게시 ON/OFF]  [저장]  [미리보기]                       │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Admin — 운동 라이브러리 관리 (신규: `admin/operations/exercises`)

```
┌─────────────────────────────────────────────────────────────────┐
│ Operations > 운동 라이브러리                          [+ 운동 추가] │
│                                                                 │
│ [역도] [체조] [유산소] [덤벨] [케틀벨] [메드볼] [기타] [보조]       │
│                                                                 │
│ 검색: [_______________]                                          │
│                                                                 │
│ 이름          | 카테고리 | 장비      | 난이도    | 상태           │
│ ─────────────────────────────────────────────────────────────  │
│ 스러스터       | 역도     | 바벨/덤벨 | ★★★☆☆   | ● 활성        │
│ 풀업 (스트릭트)  | 체조     | 풀업바    | ★★★☆☆   | ● 활성        │
│ 케틀벨 스윙     | 케틀벨   | 케틀벨   | ★★☆☆☆   | ● 활성        │
│ ...                                                             │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 `class/wod/page.tsx` 개선 (구조화된 디스플레이)

현재: 자유 텍스트 `movements` 배열을 단순 나열
개선: `wod_movements` + `exercises` 조인으로 구조화된 운동 표시

```
┌────────────────────────────────────────────────────────────┐
│                    TODAY'S WOD                              │
│                  2026-02-20  |  FRAN                       │
├────────────────────────────────────────────────────────────┤
│  FOR TIME  ⏱ 15:00                                         │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  21 - 15 - 9                                          │  │
│  │                                                      │  │
│  │  🏋️  THRUSTER                                         │  │
│  │      RX: 43kg / 29kg                                 │  │
│  │      Scaled: 29kg / 20kg                             │  │
│  │                                                      │  │
│  │  🤸  PULL-UP                                          │  │
│  │      RX: Kipping    Scaled: Ring Row                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  프론트 스쿼트 + 푸시 프레스 연속 동작. 바를 몸에서 떨어지지    │
│  않게 유지하고 엘보우를 높게 유지하세요.                       │
│                                                  22:17:35  │
└────────────────────────────────────────────────────────────┘
```

### 5.5 `class/timer/page.tsx` WOD 연동 (개선)

WOD 유형에 따라 타이머 모드 자동 설정:

| WOD 유형 | 타이머 자동 설정 |
|---------|----------------|
| For Time | Countup (시간 캡까지) |
| AMRAP | Countdown (rounds 분) |
| EMOM | EMOM 모드 (1분 × rounds) |
| Tabata | Tabata 모드 (20/10 × 8) |

```
URL 파라미터로 연동:
/class/timer?wod_id={uuid}
→ 타이머가 WOD 정보를 자동 로드하여 모드 설정
```

### 5.6 User App — WOD 페이지 (신규: `apps/wod/page.tsx`)

```
┌─────────────────────────────┐
│ ← 오늘의 WOD                │
│                             │
│  FRAN                       │
│  FOR TIME • 15:00 캡        │
│                             │
│  21-15-9                    │
│  ─────────────              │
│  🏋️ 스러스터                 │
│     43kg / 29kg             │
│     > 프론트 스쿼트 + 푸시... │
│                             │
│  🤸 풀업                    │
│     키핑                    │
│     > 스윙 모멘텀 활용...     │
│                             │
│  ┌───────────────────────┐  │
│  │ 내 점수 입력           │  │
│  │ [5:23]  ○RX  ●Scaled  │  │
│  │ [저장하기]             │  │
│  └───────────────────────┘  │
│                             │
│  오늘 참여자 12명             │
│  최고: 홍길동 3:45 (RX)      │
└─────────────────────────────┘
```

---

## 6. 영향 범위

| 파일/모듈 | 변경 내용 | 신규/수정 |
|-----------|-----------|:---------:|
| `supabase/migrations/YYYYMMDD_wod_system.sql` | exercises, wods, wod_movements, wod_scores 테이블 + RLS | 🆕 |
| `src/app/admin/operations/exercises/page.tsx` | 운동 라이브러리 관리 Admin 페이지 | 🆕 |
| `src/app/admin/operations/schedule/page.tsx` | WOD 빌더 UI (텍스트 → 구조화) | 🔄 |
| `src/app/class/wod/page.tsx` | 구조화된 운동 표시, 코칭 포인트 | 🔄 |
| `src/app/class/timer/page.tsx` | WOD 유형별 타이머 자동 설정 | 🔄 |
| `src/app/apps/wod/page.tsx` | 회원용 WOD 조회 + 점수 입력 | 🆕 |
| `src/app/apps/wod/history/page.tsx` | WOD 히스토리 조회 | 🆕 |
| `src/app/apps/schedule/page.tsx` | WOD 미리보기 연동 | 🔄 |
| `src/types/supabase.ts` | 신규 테이블 타입 재생성 | 🔄 |

---

## 7. 구현 단계

### Phase 1: 데이터베이스 + 운동 라이브러리 시드
> **담당**: 💻 Developer (Sonnet) | **공수**: 1일

| # | 작업 | 상세 |
|---|------|------|
| 1-1 | Supabase 마이그레이션 작성 | `exercises`, `wods`, `wod_movements`, `wod_scores` + RLS |
| 1-2 | `exercises` 시드 데이터 작성 | `wod_exercise_list.md` 235+ 항목 → SQL INSERT |
| 1-3 | `sessions` 테이블 `wod_id` 컬럼 추가 마이그레이션 | |
| 1-4 | `src/types/supabase.ts` 타입 재생성 | `supabase gen types` 실행 |

### Phase 2: Admin — 운동 라이브러리 관리
> **담당**: 💻 Developer (Sonnet) | **공수**: 1일

| # | 작업 | 상세 |
|---|------|------|
| 2-1 | `admin/operations/exercises/page.tsx` 생성 | 카테고리 탭 필터, 검색, CRUD |
| 2-2 | 운동 추가/수정 모달 | name_ko/en, category, equipment, difficulty, muscles, coaching |
| 2-3 | Admin 사이드바에 "운동 라이브러리" 메뉴 추가 | |

### Phase 3: Admin — WOD 빌더
> **담당**: 💻 Developer (Sonnet) | **공수**: 1.5일

| # | 작업 | 상세 |
|---|------|------|
| 3-1 | 수업 생성 모달 내 WOD 빌더 UI | wod_type 선택, time_cap, rounds 입력 |
| 3-2 | 운동 선택 컴포넌트 | 카테고리 필터 + 검색으로 exercises에서 선택 |
| 3-3 | wod_movements 렙/중량/스케일링 입력 | 드래그 앤 드롭 순서 변경 (`@dnd-kit` 활용) |
| 3-4 | WOD 저장 API | `wods` + `wod_movements` INSERT |
| 3-5 | WOD 미리보기 | TV 디스플레이와 동일한 형태로 미리보기 |

### Phase 4: Class 디스플레이 개선
> **담당**: 💻 Developer (Sonnet) | **공수**: 반나절

| # | 작업 | 상세 |
|---|------|------|
| 4-1 | `class/wod/page.tsx` 구조화된 데이터 조회 | `wods` + `wod_movements` + `exercises` JOIN |
| 4-2 | 운동별 코칭 포인트 표시 | 카드 회전 또는 하단 텍스트 표시 |
| 4-3 | `class/timer/page.tsx` WOD 연동 | URL 파라미터로 wod_id 수신, 타이머 자동 설정 |

### Phase 5: User App — WOD 페이지
> **담당**: 💻 Developer (Sonnet) | **공수**: 1일

| # | 작업 | 상세 |
|---|------|------|
| 5-1 | `apps/wod/page.tsx` 생성 | 오늘의 WOD 상세 조회 |
| 5-2 | 운동 코칭 포인트 펼침 UI | 터치로 각 운동 코칭 포인트 토글 |
| 5-3 | 점수 입력 UI | score_type에 따라 시간/렙/중량 입력 |
| 5-4 | RX / Scaled / 입문 선택 | 스케일링 선택 + 점수 저장 |
| 5-5 | 오늘의 WOD 리더보드 미니 표시 | 상위 5명 표시 |
| 5-6 | `apps/wod/history/page.tsx` | 날짜별 WOD + 내 점수 히스토리 |

### Phase 6: Schedule 앱 WOD 미리보기 연동
> **담당**: 💻 Developer (Sonnet) | **공수**: 2시간

| # | 작업 | 상세 |
|---|------|------|
| 6-1 | `apps/schedule/page.tsx`에서 wod 미리보기 카드 표시 | 수업 클릭 시 WOD 요약 표시 |
| 6-2 | WOD 상세 페이지로 이동 링크 | |

### Phase 7: 문서 동기화
> **담당**: 🏛️ Architect (Opus) | **공수**: 반나절

---

## 8. 운동 시드 데이터 구조

`wod_exercise_list.md`의 카테고리-영문 매핑:

```sql
-- 카테고리 매핑
'역도'  → 'weightlifting'
'체조'  → 'gymnastics'
'유산소' → 'cardio'
'덤벨'  → 'dumbbell'
'케틀벨' → 'kettlebell'
'메드볼' → 'medball'
'기타'  → 'other'
'보조'  → 'accessory'

-- 난이도 매핑 (별 개수 → 숫자)
★☆☆☆☆ → 1
★★☆☆☆ → 2
★★★☆☆ → 3
★★★★☆ → 4
★★★★★ → 5

-- facility_id = NULL (글로벌 기본 운동)
-- 시드 데이터 예시
INSERT INTO exercises (name_ko, name_en, category, equipment, difficulty, primary_muscles, coaching_points) VALUES
('스러스터', 'Thruster', 'weightlifting', '바벨/덤벨', 3, '전신, 대퇴사두, 삼각근', '프론트 스쿼트 + 푸시 프레스 연속 동작. Fran의 핵심'),
('풀업 (스트릭트)', 'Strict Pull-up', 'gymnastics', '풀업바', 3, '광배근, 이두근, 코어', '데드행에서 턱이 바 위로. 스윙 없이 순수 근력'),
('케틀벨 스윙 (아메리칸)', 'American Kettlebell Swing', 'kettlebell', '케틀벨', 3, '전신, 햄스트링, 어깨', '머리 위까지. CrossFit 표준. 완전 오버헤드 락아웃'),
-- ... (235개 전체)
;
```

---

## 9. 벤치마크 WOD 시드 데이터

`.docs/planning/wod_exercise_list.md` 섹션 9의 Named WOD를 `wods` 테이블에 기본 시드로 등록:

| WOD | 포맷 | 운동 구성 |
|-----|------|---------|
| Fran | For Time | 스러스터 + 풀업 21-15-9 |
| Grace | For Time | 클린 앤 저크 30회 |
| Helen | For Time | 달리기 400m + 케틀벨스윙 21 + 풀업 12 × 3R |
| Cindy | AMRAP 20 | 풀업 5 + 푸시업 10 + 에어스쿼트 15 |
| Diane | For Time | 데드리프트 + HSPU 21-15-9 |
| Annie | For Time | 더블언더 + 싯업 50-40-30-20-10 |
| Karen | For Time | 월볼 150회 |

---

## 10. 테스트 시나리오

### 정상 흐름
1. **WOD 생성 E2E**: Admin 수업 생성 → WOD 빌더에서 Fran 구성 → 저장 → `class/wod` TV 화면에 구조화된 Fran 표시 확인
2. **회원 점수 입력**: `apps/wod`에서 오늘 WOD 조회 → 점수 입력 → 리더보드에 표시
3. **타이머 연동**: Admin에서 AMRAP 20분 WOD 저장 → `class/timer?wod_id=...` 접근 → 카운트다운 20분 자동 설정
4. **운동 라이브러리**: Admin에서 커스텀 운동 추가 → WOD 빌더에서 선택 가능 확인

### 예외 흐름
1. **WOD 미게시**: `is_published=false` WOD → TV 화면에 미표시, 회원 앱에서 미노출
2. **날짜 WOD 없음**: 해당 날짜 WOD 없을 경우 → `class/wod` 빈 상태 메시지 표시
3. **점수 중복**: 동일 wod_id + member_id 점수 재입력 → UPSERT로 기존 점수 업데이트

---

## 11. 리스크 및 완화

| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| 시드 데이터 235개 작성 | 초기 작업량 많음 | 스크립트로 md → SQL 자동 변환 또는 배치 INSERT |
| `wod_description` → `wod_id` 마이그레이션 | 기존 수업 데이터 호환 | `wod_description` 컬럼 유지 (점진적 마이그레이션) |
| 운동 선택 UX 복잡성 | WOD 빌더 사용성 저하 | 검색 + 카테고리 필터로 빠른 선택, Named WOD 템플릿 제공 |
| `@dnd-kit` 드래그 순서 변경 | 이미 의존성에 있어 충돌 없음 | 기존 schedule 페이지에서 동일 라이브러리 사용 중 |
| supabase.ts 타입 재생성 | 기존 타입 충돌 | `supabase gen types` 후 변경사항 확인 |

---

## 12. Planning Log

### Session 1 — 2026-02-20
- **작성 범위**: 섹션 1~11 전체 (초안)
- **완성된 섹션**: 전체
- **Status**: Draft
- **메모**:
  - `wod_exercise_list.md` 235+ 운동 데이터가 이미 완비되어 있어 DB 시드 작업이 주요 Phase 1
  - `class/wod/page.tsx`의 `WodItem` 인터페이스가 이미 `wod_type`, `time_cap_minutes`, `rounds`를 포함 — DB 설계와 거의 일치
  - `wods` 테이블이 Supabase에 미생성된 상태임을 확인 (supabase.ts에 타입 없음)
  - 기존 `sessions.wod_description` 컬럼과 신규 `sessions.wod_id`를 공존시켜 하위 호환 유지
  - Admin schedule에서 `@dnd-kit`이 이미 사용 중이므로 wod_movements 순서 변경에 바로 활용 가능
  - Named WOD 10개 (`Fran`, `Grace`, `Helen` 등)를 기본 시드로 등록하면 즉시 테스트 가능
- **TODO (다음 세션)**:
  - [ ] Phase 1: Supabase 마이그레이션 SQL 작성 및 실행
  - [ ] Phase 1: 235개 운동 시드 데이터 SQL 작성 (md → SQL 변환)
  - [ ] Phase 2: Admin 운동 라이브러리 페이지 구현
  - [ ] Phase 3: WOD 빌더 UI 구현 (schedule 모달 확장)
  - [ ] `src/types/supabase.ts` 재생성 후 기존 코드 타입 충돌 검토

---
**문서 버전**: 0.1.0 (Draft)
**최종 업데이트**: 2026-02-20
