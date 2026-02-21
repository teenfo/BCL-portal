# BCL Portal – Race 시스템 기획서

> **Status**: In Progress
> **Author**: Architect (Opus/Gemini)
> **Created**: 2026-02-19
> **Last Updated**: 2026-02-21 (Session 6)
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

## 4-A. Race Python 서버 아키텍처 (race/ 디렉토리)

> ⚠️ **핵심 결정**: BLE 통신은 **Python (Bleak)** 이 담당한다.
> Web Bluetooth API가 아닌, 레거시 시스템과 동일하게 Python 서버가 BLE 스캔/연결/데이터 수신을 처리한다.
> 프론트엔드(Next.js)는 Python 서버의 HTTP API + WebSocket으로 데이터를 수신한다.

### 4-A.1 현재 race/ 디렉토리 상태

```
race/
├── main.py              # FastAPI 서버 (골격만 존재, Mock 데이터)
├── requirements.txt     # fastapi, uvicorn, websockets, supabase
└── Dockerfile           # Python 3.11-slim, port 8000
```

### 4-A.2 확장 후 디렉토리 구조 (To-Be)

```
race/
├── main.py              # FastAPI 메인 앱 (라우터 통합)
├── pm5_spec.py          # 🆕 PM5 BLE UUID 상수 (레거시 이식)
├── pm5_parsers.py       # 🆕 BLE 패킷 파싱 (레거시 이식)
├── pm5_manager.py       # 🆕 Bleak BLE 스캔/연결/구독
├── recorder.py          # 🆕 JSONL 파일 기반 데이터 레코딩
├── simulator.py         # 🆕 시뮬레이터 (레거시 이식)
├── requirements.txt     # + bleak 추가
├── Dockerfile           # port 8001로 변경
└── data/
    └── recordings/      # 🆕 JSONL 레코딩 파일 저장
        ├── rec_20260221_093000_rower_PM5430123.jsonl
        └── index.json   # 레코딩 목록 인덱스
```

### 4-A.3 Python ↔ Next.js 통신 아키텍처

```
┌───────────────────────────────────────────────────────┐
│ Next.js 프론트엔드 (port 3000)                         │
│  /coach/race, /admin/operations/race                  │
│  → HTTP API 호출 + WebSocket 실시간 수신               │
└──────────────────────┬────────────────────────────────┘
                       │ HTTP + WebSocket
                       ▼
┌───────────────────────────────────────────────────────┐
│ Python FastAPI 서버 (port 8001)                        │
│  race/main.py                                         │
│                                                        │
│  ┌─ PM5Manager (Bleak) ─────────────────────────────┐ │
│  │  • BLE 스캔 → MAC 주소 + 기기명 검출              │ │
│  │  • BLE 연결 → GATT Characteristic 구독           │ │
│  │  • Notification 수신 → pm5_parsers로 파싱         │ │
│  └──────────────────────┬────────────────────────────┘ │
│                         │ parsed data                   │
│  ┌──────────────────────▼────────────────────────────┐ │
│  │  Recorder (recorder.py)                           │ │
│  │  • 모든 BLE Notification을 JSONL 파일에 기록       │ │
│  │  • 레코딩 시작/종료 제어                           │ │
│  │  • 종료 시 요약 → Supabase race_recordings INSERT  │ │
│  └───────────────────────────────────────────────────┘ │
│                                                        │
│  API Endpoints:                                        │
│    GET  /api/pm5/scan         → BLE 스캔               │
│    GET  /api/pm5/devices      → 연결된 기기 목록       │
│    POST /api/pm5/register     → pm5_devices에 등록     │
│    POST /api/pm5/connect      → 특정 MAC BLE 연결      │
│    POST /api/pm5/disconnect   → BLE 연결 해제          │
│    POST /api/recording/start  → 레코딩 시작            │
│    POST /api/recording/stop   → 레코딩 종료            │
│    GET  /api/recording/status → 레코딩 상태            │
│    GET  /api/recording/list   → 레코딩 목록            │
│    WS   /ws/race              → 실시간 데이터 스트림   │
└──────────────────────┬────────────────────────────────┘
                       │ Bleak (BLE)
                       ▼
┌───────────────────────────────────────────────────────┐
│ Concept2 PM5 에르고미터 (로잉머신 / 스키머신)           │
│  BLE Service: CE060030-43E5-11E4-916C-0800200C9A66   │
└───────────────────────────────────────────────────────┘
```

### 4-A.4 BLE 기기 스캔 → 등록 흐름

```
[코치/관리자가 "BLE 스캔" 버튼 클릭]
       │
       ▼ (Next.js → Python API)
  GET /api/pm5/scan
       │
       ▼ (Python 서버)
  Bleak.BleakScanner.discover(timeout=5)
  → PM5 서비스 UUID 필터링
  → 검출된 기기 목록 반환:
    [
      { "mac": "AA:BB:CC:DD:EE:FF", "name": "PM5 430123456", "rssi": -45 },
      { "mac": "11:22:33:44:55:66", "name": "PM5 430789012", "rssi": -52 }
    ]
       │
       ▼ (프론트엔드)
  스캔 결과 UI에 표시 → 사용자가 기기 선택
       │
       ▼ (Next.js → Python API)
  POST /api/pm5/register
    { "mac": "AA:BB:CC:DD:EE:FF", "name": "PM5 430123456", "device_type": "rower" }
       │
       ▼ (Python 서버 → Supabase)
  pm5_devices INSERT (
    mac_address: "AA:BB:CC:DD:EE:FF",
    ble_name: "PM5 430123456",
    serial_number: "430123456",  -- 이름에서 추출
    device_type: "rower"
  )
```

### 4-A.5 데이터 레코딩 설계

#### 레코딩 대상: 모든 BLE Notification (raw 전체)

PM5는 여러 Characteristic에서 각각 다른 주기로 Notification을 보냄:

| Characteristic | UUID 끝자리 | 데이터 | 크기 | 주기 |
|---|---|---|---|---|
| General Status | `0031` | elapsed_time, distance, power, spm, cal | 19B | ~매 스트로크 |
| Stroke Data | `0036` | drive_length, drive_time, recovery_time, peak/avg_force, work, power, spm | 19B | ~매 스트로크 |
| Additional Status | `0032` | heart_rate, elapsed_time | 14B | ~1초 |
| Workout Summary | `0039` | total_distance, avg_power, avg_spm | 20B | 종료 시 |

#### 저장 형식: JSONL (JSON Lines)

**한 줄에 하나의 BLE Notification**을 기록:

```jsonl
{"ts":1708487400123,"ch":"0031","raw":"0a1b2c3d...","parsed":{"elapsed_ms":1200,"distance_m":2.3,"power_w":185,"spm":28,"calories":1}}
{"ts":1708487400125,"ch":"0036","raw":"ff0e2a3b...","parsed":{"drive_length_cm":142,"drive_time_cs":88,"recovery_time_cs":112,"peak_force":320,"avg_force":280,"work_per_stroke":210,"stroke_power":185,"stroke_rate":28}}
{"ts":1708487400340,"ch":"0032","raw":"a1b2c3d4...","parsed":{"heart_rate":72,"elapsed_time_2":1400}}
```

각 필드:
- **`ts`**: Unix timestamp (ms) — 노티 도착 정확한 시각
- **`ch`**: Characteristic UUID 끝 4자리
- **`raw`**: hex 인코딩된 **원본 바이트** (파싱 로직 검증/디버깅용)
- **`parsed`**: 파싱된 값 (재생 시 편의용)

#### 데이터 볼륨 예상

```
1 스트로크 ≈ 0031 + 0036 + 0032 = 3 노티
SPM 28 기준 → 초당 ~2.4 노티

30분 레코딩: ~4,320줄 × ~200B = ~864KB
1시간 레코딩: ~8,640줄 = ~1.7MB
```

→ 로컬 JSONL 파일로 충분. DB 부하 없음.

#### 저장 위치

- **프레임 데이터**: `race/data/recordings/*.jsonl` (로컬 파일)
- **요약 메타**: Supabase `race_recordings` 테이블 (종료 시 1건만 INSERT)
- **`race_recording_frames` 테이블 불필요** — 로컬 파일로 대체

#### Recorder 핵심 로직 (Python)

```python
class Recorder:
    def start(self, device_mac, device_type):
        """레코딩 시작 — JSONL 파일 열기"""
        ts = time.strftime("%Y%m%d_%H%M%S")
        self.filename = f"rec_{ts}_{device_type}_{device_mac.replace(':','')}.jsonl"
        self.file = open(f"data/recordings/{self.filename}", 'a')
        self.recording = True

    def on_notify(self, char_uuid: str, raw_bytes: bytes, parsed: dict):
        """모든 BLE Notification을 기록"""
        if not self.recording: return
        line = json.dumps({
            "ts": int(time.time() * 1000),
            "ch": char_uuid[-4:],
            "raw": raw_bytes.hex(),
            "parsed": parsed
        }, ensure_ascii=False)
        self.file.write(line + "\n")
        self.file.flush()
        self.frame_count += 1

    def stop(self) -> dict:
        """레코딩 종료 → 요약 반환 (Supabase INSERT용)"""
        self.file.close()
        self.recording = False
        return {"filename": self.filename, "frame_count": self.frame_count}
```

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

**최종 결정**: **CSS Transform + Canvas 하이브리드**
- MVP 단계에서는 PixiJS의 무거운 번들(약 400KB)을 피하고, 브라우저 네이티브 CSS 3D Transform으로 원근감을, Canvas 2D로 물결/입자 이펙트를 구현하여 성능과 개발 속도의 균형을 맞춘다. 추후 고도화 필요 시 PixiJS로 전환할 수 있도록 컴포넌트를 분리한다.

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

### 5.2 신규 테이블: `race_recordings` (시뮬레이션/레코딩용)

> Python 서버에서 추출한 BLE 데이터 파일(.jsonl)의 메타 정보를 저장.

```sql
CREATE TABLE IF NOT EXISTS race_recordings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id uuid REFERENCES facilities(id),
    device_mac varchar NOT NULL,        -- 기기 MAC 주소
    device_serial varchar,              -- PM5 시리얼
    recorded_at timestamptz DEFAULT now(),
    duration_interval interval,         -- 총 레코딩 시간
    total_distance numeric,             -- 총 주행 거리
    file_path varchar NOT NULL,         -- JSONL 파일 경로 (ex: rec_20260221_093000.jsonl)
    frame_count integer,                -- 저장된 BLE 노티프레임 수
    created_by uuid REFERENCES auth.users(id),
    status varchar DEFAULT 'completed', -- recording, completed, error
    created_at timestamptz DEFAULT now()
);

ALTER TABLE race_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "race_recordings_read" ON race_recordings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "race_recordings_write" ON race_recordings
    FOR ALL USING (
        auth.uid() IN (SELECT user_id FROM admins WHERE role IN ('super_admin', 'admin')) OR
        auth.uid() IN (SELECT user_id FROM coaches)
    );
```

### 5.3 기존 테이블 변경
- `pm5_devices`: BLE 스캔 시 식별을 위해 `mac_address` (VARCHAR) 및 `ble_name` (VARCHAR) 컬럼 추가.
- `race_events`: 현재 스키마 그대로 활용
- `race_records`: 레이스 완료 시 결과 저장

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

### 6.2 Coach Race Control (운영 주체 화면) UI 상세 레이아웃

코치가 태블릿/노트북에서 레이스를 제어하는 핵심 운영 화면.

```text
┌─────────────────────────────────────────────────────────────┐
│ 탭 메뉴: [ 레이스 설정 ]  [ 실시간 제어 ]  [ BLE & 레코딩 ]       │
├─────────────────────────────────────────────────────────────┤
│ (실시간 제어 탭 선택 시)                                       │
│ ┌──────────────────────┐ ┌────────────────────────────────┐ │
│ │ Event: 주말 정기 레이스  │ │ GLOBAL CONTROLS                │ │
│ │ Target: 2000m        │ │ [ START ]  [ STOP ]  [ RESET ] │ │
│ └──────────────────────┘ └────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ERG ASSIGNMENTS & LIVE STATUS                           │ │
│ │                                                         │ │
│ │  ERG 1 [BLE 연결완료] | User: 김철수   | 240m | 24spm | 1:45 │ │
│ │  ERG 2 [BLE 연결완료] | User: 이영희   | 245m | 26spm | 1:42 │ │
│ │  ERG 3 [오프라인]     | User: 박지훈   | ---  | ---   | ---  │ │
│ │                                                         │ │
│ │ [+ 추가 레인 배정]                                          │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

- **상단 탭**: 레이스 설정(종목/목표 설정), 설정이 끝나면 실시간 제어로 이동, 디버그 및 백그라운드 작업을 위한 BLE & 레코딩 탭 분리
- **Global Controls**: 전체 레이스 동시 시작/종료 소켓 메시지 (`Supabase Broadcast`) 발송
- **Live Status**: 각 레인의 BLE 연결 상태 확인 및 실시간 거리/SPM 텍스트 모니터링

### 6.3 2.5D Race Live View 애니메이션 및 동기화 설계 (핵심)

레이싱 뷰의 생명은 **자연스러운 모션**과 **정확한 실시간 상태 동기화**입니다. 다음 규칙을 통해 끊김 현상과 어색함을 방지합니다.

#### 1) State Interpolation (상태 보간 및 부드러운 이동)
* **문제점**: Supabase Realtime Broadcast는 초당 약 2~5회(200~500ms 간격) 데이터를 송신하므로, 좌표를 그대로 반영하면 캐릭터가 뚝뚝 끊기며 이동함.
* **해결책 (Linear Interpolation - LERP)**:
  * 리액트 `requestAnimationFrame` 루프를 캔버스(또는 CSS Transform) 렌더링에 사용.
  * 이전 수신 거리(`prev_distance`)와 목표 거리(`target_distance`) 사이를 렌더링 프레임마다 LERP로 계산하여 캐릭터의 `X/Y 좌표` 결정.
  * 수신 지연 시 남은 거리를 추정하여 등속 이동 브레딕션(Prediction) 적용.

#### 2) 로잉 캐릭터 애니메이션 (CSS Sprite 또는 Canvas)
* SPM(Stroke Per Minute) 데이터에 비례하여 캐릭터의 로잉 애니메이션 재생 속도를 동적으로 조절 (`animation-duration = 60 / SPM` 초).
* 캐릭터 상태 플래그: `IDLE` (정지), `RACING` (로잉 루프), `FINISHED` (환호/휴식 모션).

#### 3) Edge Case 관리 전략 (데이터 랙 및 끊김)
* **네트워크 지연/손실**: 특정 레인의 데이터가 1초 이상 갱신되지 않으면, 마지막 SPM을 기준으로 가상(Mock) 거리를 전진시키되, 캐릭터 위탁 반투명 처리나 `[Reconnecting...]` 배지 노출.
* **BLE 일시 끊김**: Python 서버가 `disconnect` 이벤트를 Broadcast 하면, 해당 레인의 속도를 서서히 0으로 줄임(자연스럽게 정지).
* **기기 완전 오프라인**: 레이스 중 이탈 시 해당 선수의 레인을 회색조(Grayscale) 처리.

```
컴포넌트 구조:
┌── RaceLiveView (페이지 컨테이너)
│   ├── RaceScoreboard (Zone A: 상단 HUD)
│   │   ├── ErgScoreCard (ERG별 스코어 카드, 1st 강조)
│   │   ├── ProgressBar (전체 진행률)
│   │   └── RaceTimer (경과 시간)
│   │
│   ├── RaceArena (Zone B: 2.5D 레이싱 뷰 - Canvas/CSS Hybrid)
│   │   ├── ArenaBackground (경기장 배경 + 조명)
│   │   ├── WaterEffect (물/파도 효과 - Canvas)
│   │   ├── LaneRenderer (원근감 레인 구분선 - CSS Perspective)
│   │   ├── RowerUnit (에르고미터 캐릭터 컴포넌트 × N)
│   │   │   ├── useLerpPosition (거리 LERP 훅)
│   │   │   ├── useSpmAnimation (SPM 비례 애니메이션 훅)
│   │   │   ├── PositionIndicator (거리 기반 텍스트)
│   │   │   └── LeaderGlow (1위 선두 주자 발광 효과)
│   │   └── EffectsOverlay (LEVEL UP!, 하트레이트 경고 등)
│   │
│   └── CrowdBar (Zone C: 관중 실루엣)
│       └── CrowdSilhouette (미세 응원 애니메이션)
│
├── hooks/
│   ├── useRaceRealtime (Supabase Realtime 구독)
│   ├── useRaceState (ERG 통합 상태 관리 + Prediction)
...
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

> ⚠️ 이 기획은 In Progress 상태입니다. Session 3에서 BLE 기기 등록 + 레코딩 Phase 추가.
> Phase A~D는 **기기 등록 + 데이터 레코딩** 선행 작업 (이번 기획 추가분)
> Phase 1~7은 **레이스 시스템 본 기능** (기존 기획, 추후 정밀화)

### 🆕 Phase A: DB 확장 (pm5_devices + race_recordings)
> **담당**: 💎 **Senior Dev (Opus)** | **공수**: 0.5일

| # | 작업 | 상세 |
|---|------|------|
| A-1 | `pm5_devices` 테이블 확장 | `mac_address VARCHAR(17)`, `ble_name VARCHAR(100)` 컬럼 추가 |
| A-2 | `race_recordings` 테이블 생성 | 레코딩 세션 요약 메타 (기기, 종목, 총거리/시간, 파일명 등) |
| A-3 | RLS 정책 | Coach/Admin 쓰기, 인증 사용자 읽기 |
| A-4 | 인덱스 | device_id, created_by, recorded_at |

### 🆕 Phase B: Python 서버 확장 (race/ — BLE + 레코딩)
> **담당**: ⚡ **Specialist (Gemini)** | **공수**: 1.5일

| # | 작업 | 상세 |
|---|------|------|
| B-1 | `race/pm5_spec.py` | 레거시 `app/pm5_spec.py` 이식 — PM5 BLE UUID 상수 |
| B-2 | `race/pm5_parsers.py` | 레거시 `app/pm5_parsers.py` 이식 — BLE 패킷 파싱 |
| B-3 | `race/pm5_manager.py` | 레거시 `app/pm5.py` 이식 — Bleak BLE 스캔/연결/구독 |
| B-4 | `race/recorder.py` | 🆕 JSONL 파일 기반 레코딩 — 모든 BLE Notification raw 기록 |
| B-5 | `race/main.py` 확장 | BLE 스캔/등록/연결 API + 레코딩 API 추가 |
| B-6 | `race/requirements.txt` | `bleak` 추가 |
| B-7 | `race/Dockerfile` | port 8001로 변경 |

### 🆕 Phase C: 프론트엔드 — 기기 등록 + 레코딩 UI
> **담당**: 🎨 **UI Developer (Gemini)** | **공수**: 1일

| # | 작업 | 상세 |
|---|------|------|
| C-1 | Admin 기기 등록 모달 개선 | "BLE 스캔" 버튼 → Python `/api/pm5/scan` 호출 → 결과에서 선택 → 자동 등록 |
| C-2 | Coach Race 기기 관리 섹션 | 기기 스캔/등록/연결 UI |
| C-3 | 연결 상태 실시간 표시 | Python 서버 WebSocket → 기기 연결/미연결 반영 |
| C-4 | 레코딩 시작/중지 컨트롤 | 연결 기기 선택 → 레코딩 → 모니터링 → 종료 |
| C-5 | 실시간 모니터링 뷰 | 거리, 파워, SPM, HR 실시간 표시 (WebSocket) |
| C-6 | 레코딩 목록/상세 | 저장된 레코딩 조회 + 요약 통계 |
| C-7 | 브라우저 호환성 안내 | Python 서버 연결 불가 시 안내 메시지 |

### 🆕 Phase D: 문서 동기화 (기기 등록 + 레코딩)
> **담당**: 🏛️ **Architect** | **공수**: 0.5일

| # | 작업 | 상세 |
|---|------|------|
| D-1 | sitemap 갱신 | 기기 등록 BLE 스캔, 레코딩 기능 추가 |
| D-2 | database-reference.md 갱신 | pm5_devices 확장 + race_recordings 추가 |
| D-3 | project-blueprint.md 갱신 | Phase A~D 완료 처리 |

---

> **이하 Phase 1~7은 레이스 본 기능 (기존 기획, 기기등록/레코딩 완료 후 진행)**

### Phase 1: 기반 인프라 (Realtime + 데이터 레이어)
> **담당**: 💻 **Developer (Sonnet)** | **공수**: 1일

| # | 작업 | 상세 |
|---|------|------|
| 1-1 | `race_live_state` 테이블 생성 + RLS | DB 마이그레이션 (Coach 쓰기 권한 포함) |
| 1-2 | `useRaceRealtime` 훅 | Supabase Realtime Broadcast 구독/발행 |
| 1-3 | `useRaceState` 훅 | ERG 상태 관리 (mergeDiff 로직 이식) |
| 1-4 | **Coach Race Control 페이지** | `/coach/race/control` — 레이스 시작/중지/리셋/배정 + Realtime 발행 |
| 1-5 | Admin Race 링크 연동 | `/admin/operations/race`에서 Coach Control 화면 임베드/링크 |

### Phase 2: 시뮬레이터 — 레코딩 데이터 기반 재생
> **담당**: ⚡ **Specialist (Gemini)** | **공수**: 1일
> ⚠️ Phase A~D에서 레코딩한 JSONL 데이터를 재생하는 시뮬레이터

| # | 작업 | 상세 |
|---|------|------|
| 2-1 | `race/replay.py` | JSONL 파일 읽기 → 타임스탬프 기반 재생 → WebSocket 스트리밍 |
| 2-2 | `/api/sim/replay` API | 레코딩 파일 선택 → 재생 시작/속도/중지 제어 |
| 2-3 | `race/simulator.py` | 레거시 시뮬레이터 이식 (랜덤 데이터, 레코딩 없을 때 사용) |
| 2-4 | Realtime Broadcast 발행 | 재생 데이터를 Supabase Realtime으로 전송 |

### Phase 3: Race Run View (ERG 그리드)
> **담당**: ⚡ **Specialist (Gemini)** | **공수**: 1일

| # | 작업 | 상세 |
|---|------|------|
| 3-1 | `/class/race/run` 페이지 | ERG 카드 그리드 (거리, 파워, SPM, 상태) |
| 3-2 | 실시간 데이터 바인딩 | `useRaceRealtime` → 카드 실시간 갱신 |
| 3-3 | 상태 뱃지 애니메이션 | IDLE→RACING→FINISHED 전환 효과 |
| 3-4 | 결과 리더보드 | `/class/race/result` 페이지 |

### Phase 4: PM5 BLE 실시간 레이스 연동
> **담당**: ⚡ **Specialist (Gemini)** | **공수**: 1.5일
> ⚠️ Python 서버(Bleak) 기반. Phase B에서 구축한 BLE 인프라 활용.

| # | 작업 | 상세 |
|---|------|------|
| 4-1 | PM5 실시간 → Realtime Broadcast | BLE notify → parse → Supabase Broadcast 자동 연결 |
| 4-2 | 기기 ↔ ERG 매핑 | MAC → ERG ID 매핑 API + 프론트엔드 UI |
| 4-3 | 레이스 중 데이터 파이프라인 | BLE → parse → broadcast + DB live_state 동시 기록 |
| 4-4 | 연결 끊김 복구 | 레이스 중 PM5 연결 끊김 → 자동 재연결 |

### Phase 5: 2.5D Race Live View (🔴 핵심 난이도)
> **담당**: ⚡ **Specialist (Gemini)** | **공수**: 4~6일 (단계를 3개의 Sub-Phase로 분리)

**Phase 5-A: 기본 구조 및 데이터 바인딩 (수치적 렌더링)**
| # | 작업 | 서브태스크 |
|---|------|-----------|
| 5-1 | HUD 스코어보드 구현 | 상단 Zone A (ErgScoreCard, ProgressBar). 실시간 데이터 연결 확인 |
| 5-2 | 2D 평면 기반 캐릭터 이동 | 캐릭터를 단순히 가로(X축)로 거리 비례 이동 테스트 |
| 5-3 | LERP 보간 로직 적용 | 뚝뚝 끊기는 이동을 부드러운 애니메이션 프레임 기반으로 변환 |

**Phase 5-B: 2.5D 그래픽 및 이펙트 적용 (시각화)**
| # | 작업 | 서브태스크 |
|---|------|-----------|
| 5-4 | 2.5D 레인(Lane) 렌더링 | CSS Transform `perspective`, `rotateX`를 이용한 입체 경기장 구현 |
| 5-5 | 캐릭터 스프라이트 애니메이션 | SPM 값과 CSS Animation `animation-duration` 연동하여 젓는 속도 조절 |
| 5-6 | Canvas 기반 물 이펙트 | 캐릭터 주변 파도, 트레일, 반사광 등 기초 Canvas 렌더링 영역 결합 |

**Phase 5-C: 고도화 및 예외 처리 (폴리싱)**
| # | 작업 | 서브태스크 |
|---|------|-----------|
| 5-7 | 선두(1위) 동적 이펙트 | 1위 레인에 테두리 발광, 입자 효과 추가 |
| 5-8 | 레이스 상태 및 팝업 이펙트 | 시작/끝 애니메이션 도입, 목표 도달 축하 이펙트 |
| 5-9 | 네트워크 지연/끊김 예외 구현 | 데이터 수신 1초 초과 시 Mock 속도 적용, 그 이상 시 회색 처리 로직 |
| 5-10 | GPU/메모리 컴포넌트 최적화 | React.memo, useCallback 적용, Canvas 프레임 드랍 최적화 |

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
--- 기기 등록 + 데이터 레코딩 (선행) ---
- [ ] Phase A: DB 확장 (pm5_devices + race_recordings) → 💎 Senior Dev
- [ ] Phase B: Python 서버 확장 (BLE + 레코딩) → ⚡ Specialist
- [ ] Phase C: 프론트엔드 기기등록 + 레코딩 UI → 🎨 UI Developer
- [ ] Phase D: 문서 동기화 (기기등록/레코딩) → 🏛️ Architect

--- 레이스 본 기능 ---
- [ ] Phase 1: 기반 인프라 → 💻 Developer
- [ ] Phase 2: 시뮬레이터 (레코딩 재생) → ⚡ Specialist
- [ ] Phase 3: Race Run View → ⚡ Specialist
- [ ] Phase 4: PM5 BLE 실시간 레이스 → ⚡ Specialist
- [ ] Phase 5: 2.5D Race Live View → ⚡ Specialist (🔴 핵심)
- [ ] Phase 6: 참가 등록 + 결과 기록 → 💻 Developer
- [ ] Phase 7: 문서 동기화 → 🏛️ Architect
```

---

## 10. 테스트 시나리오

### 정상 흐름 — 기기 등록 + 레코딩
1. **BLE 스캔 → 기기 등록**: Coach/Admin에서 "BLE 스캔" 클릭 → Python 서버가 Bleak 스캔 → 결과 목록 표시 → 선택 → pm5_devices 등록
2. **데이터 레코딩**: 등록된 기기 선택 → 레코딩 시작 → 실시간 모니터링 (거리/파워/SPM) → 30분 운동 → 레코딩 종료 → JSONL 파일 저장 + Supabase 요약 저장
3. **레코딩 재생**: 저장된 JSONL 선택 → 시뮬레이터 재생 → WebSocket으로 프론트엔드에 실시간 스트리밍

### 정상 흐름 — 레이스 본 기능
4. **시뮬레이터 레이스 E2E**: 레코딩 데이터 기반 시뮬레이터 → 9개 ERG 재생 → 레이스 시작 → 2.5D 뷰 실시간 갱신
5. **PM5 실시간 레이스 E2E**: BLE 연결 → ERG 매핑 → 레이스 시작 → 실제 기기 데이터 실시간 표시
6. **다중 클라이언트 동기화**: 브라우저 탭 3개 (Coach, Race Run, Race Live) 열고 → 데이터 동시 갱신 (300ms 이내)

### 예외 흐름
1. **BLE 연결 해제**: 레이스/레코딩 중 PM5 연결 끊김 → 상태 "DISCONNECTED" → 레코딩은 자동 일시정지 → 재연결 시 자동 속개
2. **Python 서버 미기동**: 프론트엔드에서 Python 서버 연결 불가 → 안내 메시지 + 시뮬레이터 모드 권장
3. **레코딩 중 서버 종료**: JSONL 파일은 flush()로 실시간 기록되므로 마지막 프레임까지 보존
4. **Realtime 연결 끊김**: Supabase Realtime 끊김 → 자동 재연결 → 최신 스냅샷 동기화

---

## 11. 리스크 및 완화

| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| Python 서버 BLE 환경 | macOS/Linux Bleak 호환성 | macOS는 CoreBluetooth 백엔드 자동 사용, Docker에서는 호스트 BLE 패스스루 필요 |
| PM5 기기 미보유 | 실 BLE 테스트 불가 | 레거시 시뮬레이터 모드로 합성 데이터 생성, 레코딩과 동일한 JSONL 포맷 |
| 레코딩 데이터 용량 | 장기 누적 시 디스크 사용 | 1시간 ≈ 1.7MB, 월 100회 ≈ 170MB — 문제없음. 필요시 오래된 파일 아카이브 |
| 2.5D 렌더링 난이도 | 개발 기간 초과 | 단계적 접근: CSS → Canvas → PixiJS. Phase 3(Run View)을 먼저 완성 |
| Supabase Realtime 성능 | 9 ERG × 5Hz = 45 msg/sec | Broadcast 사용 (DB 부하 없음), 필요시 message throttling |
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

### Session 3 — 2026-02-21
- **변경 사항**: BLE 기기 등록 + 시뮬레이션 데이터 레코딩 기능 추가
- **변경 근거**: race 시스템 구축에 필요한 시뮬레이션 소스 데이터를 실제 머신(로잉/스키)에서 레코딩
- **핵심 결정 사항**:
  - ❌ Web Bluetooth API → ✅ **Python Bleak** (레거시 아키텍처 유지)
  - BLE 통신은 `race/` Python 서버가 전담, 프론트엔드는 HTTP/WS로 접근
  - 레코딩 데이터는 **로컬 JSONL 파일**에 저장 (모든 BLE Notification raw 기록)
  - DB에는 **요약 메타만** 저장 (`race_recordings` — `race_recording_frames` 불필요)
  - 기기 등록: Python 서버가 Bleak 스캔 → MAC 주소 검출 → Supabase `pm5_devices` INSERT
- **추가된 섹션**: 4-A (Race Python 서버 아키텍처)
- **수정된 섹션**: 5 (DB 변경), 8 (Phase A~D 추가), 9 (체크리스트), 10 (테스트), 11 (리스크)
- **Status**: **In Progress** (미확정 — 사용자 리뷰 필요)
### Session 4 — 2026-02-21
- **변경 사항**: Session 3의 TODO 항목 작성 완료
- **핵심 작성 내용**:
  - `race_recordings` DB 스키마 상세화 (SQL 추가).
  - 2.5D 렌더링 엔진 최종 결정을 "CSS Transform + Canvas 하이브리드"로 확정.
  - Coach Race Control UI 상세 레이아웃 스케치 추가.
- **Status**: **Approved** (최종 기획 확정)
- **다음 액션**:
  - `/plan-to-blueprint` 워크플로우를 실행하여 블루프린트에 관점별 작업 등록.
  - UI Phase 진행 시 `Stitch MCP`로 2.5D 뷰 및 Coach Control 화면 생성.

### Session 5 — 2026-02-21
- **변경 사항**: 기획안 고도화를 위해 Status를 `In Progress`로 롤백 및 내용 세분화 업데이트.
- **가장 큰 변경점 (2.5D 레이싱 화면 고도화)**:
  - 레이스 컴포넌트에서 프레임드랍/뚝뚝 끊기는 현상을 방지하기 위해 **LERP(선형 보간) 프레임 기반 위치 렌더링** 전략 추가.
  - SPM(Stroke Per Minute) 데이터 비율에 연동하여 캐릭터 로잉 애니메이션 속도 제어 로직 기획 반영.
  - 레이스 중 흔히 발생할 수 있는 데이터 누락/BLE 끊김 현상을 대비한 **에지 케이스(Edge Case) 대응 전략** 추가.
  - 너무 큰 범위의 작업을 단계별로 나누기 위해 **Phase 5를 5-A(데이터), 5-B(2.5D 그래픽), 5-C(폴리싱)** 로 세분화.
- **Status**: **Approved** (고도화 완료, 다시 블루프린트 등록 대기 상태)
- **TODO (진행 중)**:
  - 2.5D 레이싱 UI/UX의 세부 에지 케이스, 보간 전략까지 기획 완료.
  - 이제 승인(Approved) 상태이므로 `/plan-to-blueprint`를 통해 작업을 분배할 예정.

### Session 6 — 2026-02-21
- **변경 사항**: 사용자의 요청에 의해 기획안 상태를 다시 `In Progress`로 변경.
- **Status**: **In Progress**
- **TODO (진행 중)**:
  - 계속해서 고도화할 기획 내용(추가 요구사항 등) 대기 중.

---
**문서 버전**: 0.4.1 (In Progress — 기획 고도화 지속)
**최종 업데이트**: 2026-02-21
