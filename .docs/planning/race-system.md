# BCL Portal – Race 시스템 기획서

> **Status**: In Progress
> **Author**: Architect (Opus)
> **Created**: 2026-02-19
> **Last Updated**: 2026-02-21
> **Related**: 
>   - `.docs/planning/remaining-improvements.md` (통합 기획서에서 분리됨)
>   - `.docs/archive/technical/race/` (레거시 기술 문서 5건)
>   - `.docs/archive/technical/race/Screenshot_20260106_202151_ChatGPT.jpg` (프로토타입 이미지)

---

## 1. 개요 및 배경

### 1.1 목적
BCL-Race 시스템은 **Concept2 PM5 에르고미터**를 이용한 실시간 로잉 레이스를 운영하는 핵심 기능이다. 기존에 **FastAPI + Jinja2 + Vanilla JS + WebSocket + 인메모리 상태** 기반으로 독립 서버에서 동작하던 레이스 시스템을 **BCL Portal (Next.js + Supabase) 아키텍처에 통합**하여, 일관된 인증/관리/데이터 흐름을 구현하는 것이 목표이다.

### 1.2 프로토타입 비전

프로토타입 이미지 (`.docs/archive/technical/race/Screenshot_20260106_202151_ChatGPT.jpg`)가 보여주는 핵심 화면:

```
┌─────────────────────────────────────────────────────────────────────┐
│                           R A C E                                    │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌══════════════┐  ┌──────┐  ┌──────┐  ┌──────┐│
│  │ERG 3 │  │ERG 1 │  ║ ERG 1 ↑ 1st  ║  │ERG 5 │  │ERG 8 │  │ERG 9 ││
│  │367m  │  │ 45m  │  ║  (강조 표시)   ║  │ 2Xm  │  │372m  │  │237m  ││
│  │4:14  │  │2:15  │  ║  2:15  30spm  ║  │2:24  │  │2:47  │  │      ││
│  │24spm │  │28spm │  ║  ↑ LEVEL UP!  ║  │25spm │  │25spm │  │      ││
│  │115cal│  │97cal │  ║  27cal  97w   ║  │110w  │  │92w   │  │      ││
│  └──────┘  └──────┘  ╚══════════════╝  └──────┘  └──────┘  └──────┘│
│                                                                      │
│  ──── REMAINING 333m ═══════400══300══400══300══100══ 500m GOAL ──── │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │          2.5D 에르고미터 레이싱 시뮬레이션 뷰                      │ │
│  │  🚣 ERG2   🚣 ERG2   ✨🚣 ERG1✨   🚣 ERG3   🚣 ERG7   🚣 ERG9 │ │
│  │  281m      335m     >>>1ST<<<      248m      293m     287m     │ │
│  │          (2.5D 원근감 + 물 이펙트 + 관중 실루엣)                   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                   🙌 관중 실루엣 응원 🙌                              │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 핵심 난이도 포인트

| 난이도 | 항목 | 설명 |
|--------|------|------|
| ⭐⭐⭐⭐⭐ | **2.5D 레이스 화면** | 원근감 있는 에르고미터 레이싱 뷰, 물 이펙트, 캐릭터 애니메이션, "LEVEL UP" 이펙트 |
| ⭐⭐⭐⭐ | **실시간 데이터 스트리밍** | PM5 BLE 데이터 → 서버 → 모든 클라이언트 0.3초 내 동기화 |
| ⭐⭐⭐⭐ | **PM5 BLE 연동** | Web Bluetooth API로 Concept2 PM5 BLE GATT 특성 구독/파싱 |
| ⭐⭐⭐ | **아키텍처 마이그레이션** | FastAPI in-memory → Next.js CSR + Supabase Realtime |
| ⭐⭐⭐ | **시뮬레이터 이식** | Python 시뮬레이터 → TypeScript/Edge Function 이식 |
| ⭐⭐ | **Coach 레이스 운영** | Coach가 수업 중 직접 PM5 연결/레이스 제어. Admin은 링크/임베드로 동시 접근 |

---

## 2. 레거시 시스템 분석 (As-Is)

### 2.1 레거시 아키텍처 (FastAPI 기반)

```
┌─────────────────────────────────────────────────────────┐
│                    웹 브라우저                           │
│  (Chrome, Firefox, Safari - HTML5, WebSocket 지원)     │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ├── HTTP (Stateless)
                       ├── WebSocket (/ws) — 실시간 스트림
                       └── Static Assets (CSS, JS)
                       │
┌──────────────────────▼──────────────────────────────────┐
│              FastAPI 웹 서버 (Uvicorn)                  │
│             http://0.0.0.0:8000                         │
├──────────────────────────────────────────────────────────┤
│ Routes (12개)    │ APIs (15+ endpoints)                  │
│ ├── GET /race   │ ├── POST /api/race/start              │
│ ├── GET /run    │ ├── POST /api/assign                  │
│ ├── GET /live   │ ├── POST /api/pm5/map                 │
│ └── etc.        │ └── etc.                              │
│                                                         │
│ WebSocket /ws   │ State Snapshot + Diff (0.3s polling)  │
└──────────────────────┬──────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
     RaceStore     Simulator     PM5Manager
     (RLock)       (Thread)      (Bleak/Async)
     │             │             │
     │  In-Memory  │   BLE or    │
     │  (Dict)     │   Synthetic │
     └─────────────┴─────────────┘
```

**핵심 특성**:
- 모든 상태가 **인메모리**(Dict/Dataclass), 서버 재시작 시 초기화
- **RLock** 기반 스레드 안전 동시성 모델
- **WebSocket polling** (0.3초마다 diff 전송)
- PM5 BLE: **Bleak** 라이브러리 (Python asyncio)
- 시뮬레이터: **별도 Thread**에서 0.2초마다 합성 데이터 생성

### 2.2 레거시 데이터 모델

```python
# 참가자
Participant(id, name, created_at, contact, email)

# 레인 배정
LaneAssignment(erg_id, participant_id)

# ERG 상태 (실시간)
ErgState(
    erg_id,         # "ERG_1" ~ "ERG_9"
    distance_m,     # 거리(m)
    power_w,        # 파워(W)
    stroke_rate,    # SPM
    hr_bpm,         # 심박수
    status,         # IDLE | READY | RACING | FINISHED
    last_updated,   # Unix timestamp
    finish_time_ms  # 완료 시간(ms)
)

# 시뮬레이터 패킷 (PM5 BLE 규격 호환)
StrokeData (19 bytes):
├── drive_length_cm
├── drive_time_cs
├── recovery_time_cs
├── stroke_distance
├── peak_drive_force
├── avg_drive_force
├── work_per_stroke
├── stroke_power (watts)
└── stroke_rate (SPM)
```

### 2.3 레거시 WebSocket 프로토콜

```
1. 클라이언트 연결 → WS /ws
2. 서버: 전체 스냅샷 전송
   {
     "ts": 1234567890.5,
     "distance_target_m": 1000,
     "race_started_at": 1234567800.0,
     "participants": { "uuid-1": {...} },
     "assignments": { "ERG_1": {...} },
     "erg_states": { "ERG_1": { "distance_m": 500, "power_w": 250, ... } }
   }
3. 0.3초마다 Diff 전송
   {
     "ts": 1234567890.6,
     "erg_states": {
       "ERG_1": { "distance_m": 510 }  // 변경 필드만
     }
   }
4. 클라이언트: mergeDiff(state, diff) → 재렌더링
```

### 2.4 레거시 화면 구성 (12개 템플릿)

| 화면 | URL | 역할 |
|------|-----|------|
| home.html | `/` | 포털 홈 (3개 메뉴 버튼) |
| race_home.html | `/race` | 레이스 포털 (8개 버튼) |
| admin.html | `/race/admin` | 운영자 대시보드 (배정, PM5, 레이스 제어) |
| race_run.html | `/race/run` | **실시간 레이스 진행** (그리드 카드) |
| live.html | `/race/leaderboard/live` | **실시간 리더보드** (거리 기준 정렬) |
| result.html | `/race/leaderboard/result` | 결과 리더보드 |
| join.html | `/race/join` | 참가 등록 (직접 입력) |
| qr.html | `/race/qr` | QR 참가 등록 |
| sim_setup.html | `/race/sim` | 시뮬레이터 설정 |
| members.html | `/members` | 회원 관리 |
| lounge.html | `/lounge` | 라운지 정보 |
| member_management.html | (include) | 회원 관리 섹션 |

---

## 3. 현재 BCL Portal 내 Race 관련 코드 (As-Is)

### 3.1 DB 스키마 (Supabase)

**`race_events`** 테이블:
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | gen_random_uuid() |
| facility_id | uuid (FK) | 시설 연결 |
| name | varchar (NOT NULL) | 이벤트명 |
| event_date | date (NOT NULL) | 이벤트 날짜 |
| event_type | varchar (NOT NULL) | 이벤트 유형 |
| distance_meters | integer | 목표 거리 |
| duration_minutes | integer | 제한 시간 |
| description | text | 설명 |
| status | varchar | 'scheduled' (기본) |
| created_at / updated_at | timestamptz | |

**`race_records`** 테이블:
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | gen_random_uuid() |
| event_id | uuid (FK) | race_events 참조 |
| member_id | uuid (FK) | members 참조 |
| device_serial | varchar | PM5 시리얼 |
| result_time | interval | 완료 시간 |
| result_distance | numeric | 거리 |
| calories_burned | integer | 칼로리 |
| avg_watts | numeric | 평균 와트 |
| avg_pace | interval | 평균 페이스 |
| is_pr | boolean | 개인 기록 여부 |
| created_at | timestamptz | |

**`pm5_devices`** 테이블:
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | gen_random_uuid() |
| facility_id | uuid (FK) | 시설 연결 |
| serial_number | varchar (NOT NULL) | 시리얼 넘버 |
| device_type | varchar (NOT NULL) | 기기 유형 |
| status | varchar | 'online' (기본) |
| firmware_version | varchar | 펌웨어 버전 |
| last_sync_at | timestamptz | 마지막 동기화 |
| created_at / updated_at | timestamptz | |

### 3.2 현재 구현된 UI 페이지

| 페이지 | 경로 | 구현 상태 |
|--------|------|-----------|
| Admin Race 관리 | `/admin/operations/race` | ✅ PM5 CRUD, 이벤트 목록, 상태 토글 |
| Coach Race 조회 | `/coach/race` | ✅ 이벤트 목록, 기록 조회 |
| Class Live 리더보드 | `/class/live` | ✅ 기본 리더보드 (목데이터 기반) |
| Class Leaderboard | `/class/leaderboard` | ✅ 기록 조회 (Supabase 연동) |

### 3.3 미구현 핵심 기능

```
❌ 실시간 레이스 진행 화면 (2.5D 레이싱 뷰)
❌ PM5 BLE 실시간 데이터 수신 (Web Bluetooth API)
❌ 실시간 데이터 스트리밍 (WebSocket/Supabase Realtime)
❌ 레이스 시작/중지/리셋 실시간 제어
❌ 레인 배정 실시간 동기화
❌ 시뮬레이터 (TypeScript 이식)
❌ 레이스 결과 자동 기록 (race_records INSERT)
```

---

## 4. 개선 설계 (To-Be)

### 4.1 아키텍처 마이그레이션 전략

```
레거시 (FastAPI)              →   BCL Portal (Next.js + Supabase)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
in-memory RaceStore           →   Supabase Realtime + DB
Python WebSocket (/ws)        →   Supabase Realtime channels
FastAPI Routes                →   Next.js CSR Pages
Jinja2 HTML + Vanilla JS      →   React Components (TSX)
PM5Manager (Bleak/Python)     →   Web Bluetooth API (Browser)
Simulator (Python Thread)     →   Edge Function + Realtime
PM5 BLE Parsing (Python)      →   TypeScript BLE Parser

상태 흐름 (Coach 중심):
┌───────────────────────┐
│ Coach Race Control    │ ← 레이스 운영 주체
│ /coach/race/control   │
│ PM5 BLE + 시뮬레이터   │
└──────────┬────────────┘
           │ Supabase Realtime Broadcast
           ▼
┌────────────────────────────────────┐
│ 모든 클라이언트 (동시 시청 가능)      │
│ ├── /coach/race/control  (코치)    │
│ ├── /admin/operations/race (어드민) │ ← 동일 화면 임베드/링크
│ ├── /class/race/live     (대형TV)  │
│ └── /class/race/run      (그리드)  │
└──────────┬─────────────────────────┘
           ▼
┌───────────┐    
│ Supabase  │    race_live_state (실시간 ERG 상태)
│ DB        │    race_records (결과 영구 저장)
└───────────┘
```

### 4.2 Supabase Realtime 전략

레거시의 WebSocket polling을 **Supabase Realtime Broadcast**로 대체:

```
방법 A: Supabase Realtime Broadcast (권장)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Channel: `race:{event_id}`
- 이벤트: `erg_update`, `race_start`, `race_finish`
- 장점: 서버리스, 자동 스케일링, DB 부하 없음
- 단점: 메시지 크기 제한, 비영속

방법 B: Supabase Realtime DB Changes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- `race_live_state` 테이블 LISTEN
- 0.2초마다 DB UPDATE → 실시간 전파
- 장점: 영속, 히스토리
- 단점: DB 부하 높음 (9 ERG × 5 updates/sec = 45 writes/sec)

선택: 방법 A (Broadcast) + 최종 결과만 방법 B (DB)
```

### 4.3 PM5 BLE 연동 설계

```
┌─────────────────────────────────────────────────┐
│ 브라우저 (Coach Race 운영 화면)                  │
│ /coach/race/control                             │
│ ┌─────────────────────────────────────────────┐ │
│ │ Web Bluetooth API                           │ │
│ │ navigator.bluetooth.requestDevice({         │ │
│ │   filters: [{ services: ["CE060030-..."] }] │ │
│ │ })                                          │ │
│ └────────────────┬────────────────────────────┘ │
│                  │                              │
│ ┌────────────────▼────────────────────────────┐ │
│ │ GATT Service: CE060030-...                  │ │
│ │ Characteristics:                            │ │
│ │ ├── C2 General Status (CE060031)            │ │
│ │ │   elapsed_time, distance, power, spm      │ │
│ │ ├── C2 Stroke Data (CE060036)               │ │
│ │ │   drive_length, drive_time, stroke_power  │ │
│ │ ├── C2 Additional Status (CE060032)         │ │
│ │ │   heart_rate, calories                    │ │
│ │ └── C2 Workout Summary (CE060039)           │ │
│ │     total_distance, avg_power, avg_spm      │ │
│ └────────────────┬────────────────────────────┘ │
│                  │                              │
│ ┌────────────────▼────────────────────────────┐ │
│ │ TypeScript Parser (pm5-parsers.ts)          │ │
│ │ parseGeneralStatus(DataView) → ErgState     │ │
│ │ parseStrokeData(DataView) → StrokeMetric    │ │
│ └────────────────┬────────────────────────────┘ │
│                  │                              │
│ ┌────────────────▼────────────────────────────┐ │
│ │ Supabase Realtime Broadcast                 │ │
│ │ channel.send('erg_update', ergState)        │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**PM5 BLE GATT 프로파일 (Concept2 공식)**:

| 서비스/특성 | UUID | 데이터 | 크기 |
|------------|------|--------|------|
| C2 PM Service | `CE060030-43E5-11E4-916C-0800200C9A66` | - | - |
| General Status | `CE060031-...` | elapsed_time, distance, power, spm, calories | 19B |
| Stroke Data | `CE060036-...` | drive_length, drive_time, recovery_time, peak_force, avg_force, work_per_stroke, stroke_power, spm | 19B |
| Additional Status | `CE060032-...` | heart_rate, elapsed_time_2 | 14B |
| Workout Summary | `CE060039-...` | total_distance, avg_power, avg_spm | 20B |

### 4.4 2.5D 레이스 화면 설계 (핵심 난이도)

프로토타입 이미지 분석 결과, 화면은 **세 영역**으로 구성:

```
┌─────────────────────────────────────────────────────────────┐
│ ZONE A: 상단 스코어보드 (HUD 오버레이)                        │
│ ┌─────┐ ┌─────┐ ┌═════════┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│ │ERG3 │ │ERG1 │ ║ ERG1 1st║ │ERG5 │ │ERG8 │ │ERG9 │       │
│ │367m │ │ 45m │ ║  강조   ║ │ 2Xm │ │372m │ │237m │       │
│ │4:14 │ │2:15 │ ║LEVEL UP!║ │2:24 │ │2:47 │ │     │       │
│ │24spm│ │28spm│ ║  30spm  ║ │25spm│ │25spm│ │     │       │
│ │115W │ │97W  │ ║  97W    ║ │110W │ │92W  │ │     │       │
│ └─────┘ └─────┘ ╚═════════╝ └─────┘ └─────┘ └─────┘       │
│                                                              │
│ ═══ REMAINING 333m ═══════ PROGRESS BAR ═══════ 500m GOAL ═ │
├──────────────────────────────────────────────────────────────┤
│ ZONE B: 2.5D 레이싱 뷰 (메인)                                │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ ████████████████ 경기장 조명 ████████████████████████│   │
│   │                                                     │   │
│   │  🚣        🚣       ✨🚣✨      🚣        🚣       │   │
│   │  ERG2      ERG2     ERG1(1st)   ERG3      ERG7     │   │
│   │                                                     │   │
│   │ ~~~ 물 이펙트 / 파도 / 반사광 ~~~~~~~~~~~~~~~~~~~~~~~ │   │
│   │═════════════ 레인 구분선 (원근감) ═══════════════════│   │
│   │                                                     │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ ZONE C: 하단 관중 실루엣                                      │
│    🙌🙋🙌🙋🙌🙋🙌🙋🙌 (CSS 실루엣 + 미세 애니메이션)        │
└──────────────────────────────────────────────────────────────┘
```

#### 2.5D 렌더링 기술 선택지

| 기법 | 난이도 | 성능 | 시각 품질 | 설명 |
|------|--------|------|----------|------|
| **CSS Transform + perspective** | ⭐⭐⭐ | 🟢 높음 | ⭐⭐⭐ | CSS 3D transform으로 원근감, GPU 가속 |
| **Canvas 2D** | ⭐⭐⭐⭐ | 🟢 높음 | ⭐⭐⭐⭐ | 세밀한 제어, 이펙트 자유도 높음 |
| **PixiJS (WebGL 2D)** | ⭐⭐⭐⭐ | 🟢🟢 최고 | ⭐⭐⭐⭐⭐ | 게임급 2D 렌더링, 스프라이트/파티클 |
| **Three.js (WebGL 3D)** | ⭐⭐⭐⭐⭐ | 🟡 | ⭐⭐⭐⭐⭐ | 오버엔지니어링 가능성 |

**권장 선택**: **PixiJS** 또는 **CSS Transform + Canvas 하이브리드**
- PixiJS: 프로토타입 이미지의 물 이펙트, 캐릭터 스프라이트, 파티클(불꽃/LEVEL UP)에 최적
- CSS 하이브리드: 초기 빌드 후 점진적으로 이펙트 추가 가능

#### 시각 이펙트 상세

| 이펙트 | 구현 방법 | 난이도 |
|--------|----------|--------|
| 원근감 레인 | CSS `perspective` + `rotateX` | ⭐⭐ |
| 물 반사/파도 | Canvas 2D 또는 PixiJS 디스플레이스먼트 필터 | ⭐⭐⭐⭐ |
| 캐릭터 로잉 애니메이션 | CSS sprite animation 또는 PixiJS AnimatedSprite | ⭐⭐⭐ |
| 선두 주자 발광 효과 | CSS `box-shadow` glow + PixiJS particle | ⭐⭐⭐ |
| "LEVEL UP!" 팝업 | CSS keyframe animation | ⭐⭐ |
| 관중 실루엣 응원 | SVG + CSS 미세 `translateY` animation | ⭐⭐ |
| 진행 바 | CSS gradient + animated fill | ⭐ |
| 경기장 조명 | CSS radial-gradient + 미세 flicker | ⭐⭐ |

---

## 5. 데이터베이스 변경

### 5.1 신규 테이블: `race_live_state` (실시간 ERG 상태)

> 레이스 진행 중 ERG 데이터를 임시 저장. 레이스 종료 시 `race_records`로 요약 이전.

```sql
-- 실시간 ERG 상태 (레이스 진행 중)
CREATE TABLE IF NOT EXISTS race_live_state (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid REFERENCES race_events(id) ON DELETE CASCADE,
    erg_id varchar NOT NULL,           -- "ERG_1" ~ "ERG_9"
    member_id uuid REFERENCES members(id),
    distance_m numeric DEFAULT 0,
    power_w integer DEFAULT 0,
    stroke_rate integer DEFAULT 0,
    hr_bpm integer,
    status varchar DEFAULT 'IDLE',     -- IDLE, READY, RACING, FINISHED
    finish_time_ms integer,
    last_updated timestamptz DEFAULT now(),
    UNIQUE(event_id, erg_id)
);

-- RLS: 읽기는 모든 인증 사용자, 쓰기는 admin/coach만
ALTER TABLE race_live_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "race_live_state_read" ON race_live_state
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "race_live_state_write" ON race_live_state
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM admins WHERE role IN ('super_admin', 'admin')
        )
        OR
        auth.uid() IN (SELECT user_id FROM coaches)
    );
```

### 5.2 기존 테이블 변경 없음
- `race_events`: 현재 스키마 그대로 활용
- `race_records`: 레이스 완료 시 결과 저장
- `pm5_devices`: BLE MAC 주소 매핑 정보 추가 고려

### 5.3 Supabase Realtime Channel 설계

```typescript
// Channel: race:{event_id}
// Events:
type RaceEvent = 
  | { type: 'race_start'; distance_target: number; started_at: string }
  | { type: 'race_finish' }
  | { type: 'race_reset' }
  | { type: 'erg_update'; erg_id: string; data: ErgStateUpdate }
  | { type: 'state_snapshot'; state: FullRaceState }
```

---

## 6. UI 변경 상세

### 6.1 신규 화면 목록

> ⚠️ **핵심 변경**: 레이스 운영 주체가 Admin에서 **Coach**로 이동.
> Coach가 수업 중 직접 PM5 연결/레이스 제어. Admin은 동일 화면을 링크/임베드로 접근.

| 화면 | 경로 | 난이도 | 설명 |
|------|------|--------|------|
| 🆕 **Coach Race Control** | `/coach/race/control` | ⭐⭐⭐⭐ | **운영 주체 화면** — PM5 연결, 레이스 시작/중지/배정, 시뮬레이터 제어, 실시간 모니터링 |
| 🆕 Race Live View | `/class/race/live` | ⭐⭐⭐⭐⭐ | 2.5D 레이싱 뷰 + 실시간 스코어 (대형 스크린용) |
| 🆕 Race Run View | `/class/race/run` | ⭐⭐⭐ | ERG 그리드 카드 (실시간 데이터) |
| 🔄 Admin Race 링크 | `/admin/operations/race` | ⭐⭐ | Coach Control 화면 임베드 + 이벤트/기록 관리 (CRUD 유지) |
| 🆕 Race Join | `/apps/race/join` | ⭐⭐ | 참가 등록 |
| 🆕 Race Result | `/class/race/result` | ⭐⭐ | 최종 결과 리더보드 |

### 6.2 2.5D Race Live View 상세 (핵심)

```
컴포넌트 구조:
┌── RaceLiveView (페이지 컨테이너)
│   ├── RaceScoreboard (Zone A: 상단 HUD)
│   │   ├── ErgScoreCard (ERG별 스코어 카드, 1st 강조)
│   │   ├── ProgressBar (전체 진행률)
│   │   └── RaceTimer (경과 시간)
│   │
│   ├── RaceArena (Zone B: 2.5D 레이싱 뷰)
│   │   ├── ArenaBackground (경기장 배경 + 조명)
│   │   ├── WaterEffect (물/파도 효과)
│   │   ├── LaneRenderer (원근감 레인 구분선)
│   │   ├── RowerSprite (에르고미터 캐릭터 × N)
│   │   │   ├── RowingAnimation (로잉 동작)
│   │   │   ├── PositionIndicator (거리 기반 위치)
│   │   │   └── LeaderGlow (선두 주자 발광)
│   │   └── EffectsOverlay (LEVEL UP!, 순위 변동 등)
│   │
│   └── CrowdBar (Zone C: 관중 실루엣)
│       └── CrowdSilhouette (미세 응원 애니메이션)
│
├── hooks/
│   ├── useRaceRealtime (Supabase Realtime 구독)
│   ├── usePM5Bluetooth (Web Bluetooth API)
│   ├── useRaceSimulator (TypeScript 시뮬레이터)
│   └── useRaceState (ERG 상태 관리)
│
└── lib/
    ├── pm5-parsers.ts (BLE 데이터 파싱)
    ├── pm5-spec.ts (UUID 상수)
    └── race-simulator.ts (시뮬레이터 로직)
```

---

## 7. 영향 범위 분석

| 파일/모듈 | 변경 내용 | 신규/수정 |
|-----------|-----------|:---------:|
| `src/app/coach/race/control/page.tsx` | **Coach Race Control** (운영 주체) | 🆕 |
| `src/app/class/race/live/page.tsx` | 2.5D Race Live View (핵심) | 🆕 |
| `src/app/class/race/run/page.tsx` | ERG 그리드 실시간 뷰 | 🆕 |
| `src/app/class/race/result/page.tsx` | 최종 결과 리더보드 | 🆕 |
| `src/app/apps/race/join/page.tsx` | 참가 등록 | 🆕 |
| `src/app/admin/operations/race/page.tsx` | Coach Control 임베드 + CRUD 유지 | 🔄 |
| `src/hooks/useRaceRealtime.ts` | Supabase Realtime 훅 | 🆕 |
| `src/hooks/usePM5Bluetooth.ts` | Web Bluetooth API 훅 | 🆕 |
| `src/hooks/useRaceSimulator.ts` | TypeScript 시뮬레이터 훅 | 🆕 |
| `src/hooks/useRaceState.ts` | ERG 상태 관리 훅 | 🆕 |
| `src/lib/pm5-parsers.ts` | PM5 BLE 데이터 파싱 | 🆕 |
| `src/lib/pm5-spec.ts` | PM5 BLE UUID 상수 | 🆕 |
| `src/lib/race-simulator.ts` | TypeScript 시뮬레이터 | 🆕 |
| `src/components/race/**/*.tsx` | 2.5D 렌더링 컴포넌트 (10+) | 🆕 |
| `src/styles/race.module.css` | Race 전용 스타일 | 🆕 |

---

## 8. 구현 단계 및 에이전트 배분

> ⚠️ 이 기획은 Draft 초안입니다. 각 Phase의 상세 작업은 `/plan` 이어쓰기를 통해 정밀화합니다.

### Phase 1: 기반 인프라 (Realtime + 데이터 레이어)
> **담당**: 💻 **Developer (Sonnet)** | **공수**: 1일

| # | 작업 | 상세 |
|---|------|------|
| 1-1 | `race_live_state` 테이블 생성 + RLS | DB 마이그레이션 (Coach 쓰기 권한 포함) |
| 1-2 | `useRaceRealtime` 훅 | Supabase Realtime Broadcast 구독/발행 |
| 1-3 | `useRaceState` 훅 | ERG 상태 관리 (mergeDiff 로직 이식) |
| 1-4 | **Coach Race Control 페이지** | `/coach/race/control` — 레이스 시작/중지/리셋/배정 + Realtime 발행 |
| 1-5 | Admin Race 링크 연동 | `/admin/operations/race`에서 Coach Control 화면 임베드/링크 |

### Phase 2: 시뮬레이터 이식 (Python → TypeScript)
> **담당**: ⚡ **Specialist (Gemini)** | **공수**: 1일

| # | 작업 | 상세 |
|---|------|------|
| 2-1 | `pm5-spec.ts` | PM5 BLE UUID 상수 이식 |
| 2-2 | `pm5-parsers.ts` | 19바이트 StrokeData 파싱 (DataView) |
| 2-3 | `race-simulator.ts` | Python Simulator → TS (requestAnimationFrame 기반, 0.2초 업데이트) |
| 2-4 | `useRaceSimulator` 훅 | 시뮬레이터 시작/중지, Realtime Broadcast 발행 |
| 2-5 | Simulator Setup UI | Admin Race 탭에서 시뮬레이터 제어 |

### Phase 3: Race Run View (ERG 그리드)
> **담당**: ⚡ **Specialist (Gemini)** | **공수**: 1일

| # | 작업 | 상세 |
|---|------|------|
| 3-1 | `/class/race/run` 페이지 | ERG 카드 그리드 (거리, 파워, SPM, 상태) |
| 3-2 | 실시간 데이터 바인딩 | `useRaceRealtime` → 카드 실시간 갱신 |
| 3-3 | 상태 뱃지 애니메이션 | IDLE→RACING→FINISHED 전환 효과 |
| 3-4 | 결과 리더보드 | `/class/race/result` 페이지 |

### Phase 4: PM5 BLE 연동
> **담당**: ⚡ **Specialist (Gemini)** | **공수**: 1.5일

| # | 작업 | 상세 |
|---|------|------|
| 4-1 | `usePM5Bluetooth` 훅 | Web Bluetooth requestDevice, GATT connect, characteristic subscribe |
| 4-2 | PM5 기기 스캔 UI | Admin Race에서 BLE 기기 검색/연결/해제 |
| 4-3 | 실시간 데이터 파이프라인 | BLE notify → parse → Realtime broadcast |
| 4-4 | PM5 ↔ ERG 매핑 | MAC 주소 → ERG ID 매핑 UI 및 저장 |

### Phase 5: 2.5D Race Live View (🔴 핵심 난이도)
> **담당**: ⚡ **Specialist (Gemini)** | **공수**: 3~5일 (반복 리팩토링 필요)

| # | 작업 | 서브태스크 |
|---|------|-----------|
| 5-1 | 렌더링 엔진 선택/설정 | PixiJS 설치 또는 Canvas 2D 기반 구조 결정 |
| 5-2 | Zone A: 스코어보드 HUD | ERG 스코어 카드, 프로그레스 바, 레이스 타이머 |
| 5-3 | Zone B: 경기장 배경 | 조명, 레인 구분선, 원근감 |
| 5-4 | Zone B: 캐릭터 스프라이트 | 에르고미터 + 캐릭터 로잉 애니메이션 |
| 5-5 | Zone B: 위치 시스템 | 거리 데이터 → 2.5D 화면 좌표 변환 |
| 5-6 | Zone B: 물 이펙트 | 파도, 반사광, 물결 |
| 5-7 | Zone B: 이펙트 오버레이 | 선두 발광, LEVEL UP!, 순위 변동 화살표 |
| 5-8 | Zone C: 관중 실루엣 | SVG 실루엣 + 응원 미세 애니메이션 |
| 5-9 | 성능 최적화 | 60fps 유지, 메모리 관리, GPU 최적화 |
| 5-10 | 반복 리팩토링 | 시각 품질 개선 (최소 2~3회 반복 예상) |

### Phase 6: 참가 등록 + 결과 기록
> **담당**: 💻 **Developer (Sonnet)** | **공수**: 0.5일

| # | 작업 | 상세 |
|---|------|------|
| 6-1 | `/apps/race/join` 참가 등록 | 이름 입력 → race_records 등록 |
| 6-2 | 레이스 완료 시 자동 기록 | race_live_state → race_records 요약 INSERT |
| 6-3 | 개인 기록(PR) 자동 판정 | 이전 기록 대비 PR 플래그 설정 |

### Phase 7: 문서 동기화
> **담당**: 🏛️ **Architect (Opus)** | **공수**: 0.5일

---

## 9. 블루프린트 등록용 체크리스트

```markdown
- [ ] Phase 1: 기반 인프라 → 💻 Developer
- [ ] Phase 2: 시뮬레이터 이식 → ⚡ Specialist
- [ ] Phase 3: Race Run View → ⚡ Specialist
- [ ] Phase 4: PM5 BLE 연동 → ⚡ Specialist
- [ ] Phase 5: 2.5D Race Live View → ⚡ Specialist (🔴 핵심)
- [ ] Phase 6: 참가 등록 + 결과 기록 → 💻 Developer
- [ ] Phase 7: 문서 동기화 → 🏛️ Architect
```

---

## 10. 테스트 시나리오

### 정상 흐름
1. **시뮬레이터 레이스 E2E**: Admin에서 시뮬레이터 시작 → 9개 ERG 생성 → 레이스 시작 → `/class/race/live`에서 2.5D 뷰 실시간 갱신 → 목표 도달 시 결과 생성
2. **PM5 BLE E2E**: Admin에서 BLE 스캔 → PM5 연결 → ERG 매핑 → 레이스 시작 → 실제 기기 데이터 실시간 표시
3. **다중 클라이언트 동기화**: 브라우저 탭 3개 (Admin, Race Run, Race Live) 열고 → 데이터 동시 갱신 확인 (300ms 이내)

### 예외 흐름
1. **BLE 연결 해제**: 레이스 중 PM5 기기 연결 끊김 → ERG 상태 "DISCONNECTED" → 재연결 시 자동 복구
2. **브라우저 비호환**: Web Bluetooth 미지원 (Firefox) → 안내 메시지 표시, 시뮬레이터 모드 권장
3. **Realtime 연결 끊김**: Supabase Realtime 끊김 → 자동 재연결 → 최신 스냅샷 동기화

---

## 11. 리스크 및 완화

| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| 2.5D 렌더링 난이도 | 개발 기간 초과 | 단계적 접근: CSS → Canvas → PixiJS. Phase 3(Run View)을 먼저 완성하여 기본 기능 보장 |
| Web Bluetooth 호환성 | Chrome/Edge만 지원 | 시뮬레이터 모드를 기본 제공, BLE는 선택적 확장 |
| Supabase Realtime 성능 | 9 ERG × 5Hz = 45 msg/sec | Broadcast 사용 (DB 부하 없음), 필요시 message throttling |
| PM5 기기 미보유 | 실 테스트 불가 | RecordedData로 BLE 응답 모킹, 시뮬레이터 완성도 우선 |
| PixiJS 번들 크기 | 초기 로딩 지연 | dynamic import, Race 페이지만 로딩 |
| 리팩토링 반복 (Phase 5) | 일정 예측 어려움 | MVP → 이터레이션 방식, 최소 3회 리팩토링 일정 포함 |

---

## 12. Planning Log (기획 진행 기록)

### Session 1 — 2026-02-19
- **작성 범위**: 섹션 1~11 전체 (초안)
- **완성된 섹션**: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
- **Status**: **Draft** (초안)
- **메모**: 
  - `remaining-improvements.md`에서 PM5/Race 항목 분리
  - `.docs/archive/technical/race/` 5건 기술 문서 전체 분석 완료
  - 프로토타입 이미지의 2.5D 레이싱 뷰가 **최고 난이도 항목**
  - Phase 5 (2.5D)는 3~5일 소요 예상, 최소 2~3회 반복 리팩토링 필요
  - PM5 BLE 기기 미보유 시 시뮬레이터 완성도가 핵심

### Session 2 — 2026-02-21
- **변경 사항**: 레이스 운영 주체를 Admin → **Coach**로 이동
- **변경 근거**: 레이스는 코치가 수업 중 직접 운영하는 기능이므로 Coach 포털에 포함되어야 함
- **수정된 섹션**: 1.3, 4.1, 4.3, 6.1, 7, 8 (Phase 1)
- **핵심 변경 내용**:
  - `/coach/race/control` 신규 추가 (레이스 운영 주체 화면)
  - `/admin/operations/race` → Coach Control 임베드/링크로 변경 (CRUD 유지)
  - RLS 정책: Coach 쓰기 권한 이미 포함되어 있어 DB 변경 불필요
  - 아키텍처 상태 흐름: Coach 중심으로 재설계
  - Coach + Admin이 Supabase Realtime으로 동시 시청 가능
- **Status**: **In Progress**
- **TODO (다음 세션)**:
  - [ ] 2.5D 렌더링 엔진 최종 결정 (PixiJS vs Canvas vs CSS 하이브리드)
  - [ ] 캐릭터 스프라이트 에셋 준비 방안 결정
  - [ ] Phase 5 서브태스크 상세화 (각 이펙트별 구현 방법)
  - [ ] Coach Race Control UI 상세 레이아웃 설계
  - [ ] Stitch MCP로 Race UI 디자인 생성 (기획 승인 후)

---
**문서 버전**: 0.2.0 (In Progress — Coach 중심 재설계)
**최종 업데이트**: 2026-02-21
