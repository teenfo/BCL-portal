# BCL-Race - 기술 아키텍처

## 1. 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    웹 브라우저                           │
│  (Chrome, Firefox, Safari - HTML5, WebSocket 지원)     │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ├── HTTP (Stateless 요청)
                       ├── WebSocket (실시간 스트림)
                       └── Static Assets (CSS, JS)
                       │
┌──────────────────────▼──────────────────────────────────┐
│              FastAPI 웹 서버 (Uvicorn)                  │
│             http://0.0.0.0:8000                         │
├──────────────────────────────────────────────────────────┤
│ Routes                                                   │
│ ├── GET / → home.html                                  │
│ ├── GET /race → race_home.html                         │
│ ├── GET /members → members.html                        │
│ ├── GET /race/admin → admin.html                       │
│ └── ... (11 more routes)                               │
│                                                         │
│ APIs                                                    │
│ ├── POST /api/participant/create                       │
│ ├── POST /api/race/start                               │
│ ├── POST /api/assign                                   │
│ └── ... (15 more endpoints)                            │
│                                                         │
│ WebSocket                                               │
│ └── WS /ws (state updates, 0.3s polling)               │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
    ┌────────┐   ┌──────────┐   ┌──────────┐
    │ State  │   │ Simulator│   │PM5 BLE   │
    │ Store  │   │ (Thread) │   │Manager   │
    │(RLock) │   │          │   │(Async)   │
    └────────┘   └──────────┘   └──────────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
    ┌─────────┐               ┌────────────┐
    │Data     │               │BLE Devices │
    │Files    │               │(PM5)       │
    │(JSON)   │               │Or Simulator│
    └─────────┘               └────────────┘
```

## 2. 계층 구조

### 프레젠테이션 계층 (Presentation Layer)
```
HTML Templates (Jinja2)
├── home.html
├── members.html
├── race_home.html
├── admin.html
├── race_run.html
├── live.html
└── ...
       ↓
   CSS/JavaScript (Vanilla)
   ├── styles.css (500+ lines)
   └── Inline JS in templates
       ↓
   WebSocket Connection (/ws)
```

### 비즈니스 로직 계층 (Business Logic Layer)
```
FastAPI Routes & API Endpoints
├── Route Handlers (GET /*)
│   └── Template Rendering (Jinja2)
│
├── API Handlers (POST /api/*)
│   ├── Participant Management
│   ├── Race Management
│   ├── Assignment Management
│   └── PM5 Management
│
└── WebSocket Handler (/ws)
    └── State Snapshot & Diff Streaming
```

### 데이터 모델 계층 (Data Model Layer)
```
Python Dataclasses
├── Participant (id, name, created_at, contact, email)
├── LaneAssignment (erg_id, participant_id)
├── ErgState (distance, power, stroke_rate, hr, status)
└── RaceStore (participants, assignments, erg_states)
    └── Thread-safe with RLock
```

### 통합 계층 (Integration Layer)
```
External Systems
├── PM5 BLE Devices (Bleak)
│   ├── BLE Scanning
│   ├── Characteristic Subscribe
│   └── Data Parsing
│
├── Simulator (Thread-based)
│   └── Random Data Generation
│
└── Virtual PM5 (Async-based)
    └── Synthetic Packets
```

## 3. 주요 컴포넌트 설명

### RaceStore (app/state.py)
```python
class RaceStore:
    # 스레드 안전 상태 저장소
    # RLock을 사용해 동시 접근 제어
    
    # 주요 메서드:
    - snapshot()      # 현재 상태 스냅샷
    - get_diff()      # 마지막 업데이트 이후 변경사항
    - _dict_diff()    # 재귀적 딕셔너리 비교
    
    # 상태:
    - participants    # Dict[pid, Participant]
    - assignments     # Dict[erg_id, LaneAssignment]
    - erg_states      # Dict[erg_id, ErgState]
    - race_started_at # float | None
    - race_finished   # bool
```

**왜 RLock?**
- 웹소켓 메시지 처리와 PM5/시뮬레이터 데이터 업데이트가 동시에 발생
- Reentrant Lock으로 같은 스레드가 여러 번 획득 가능
- 데이터 일관성 보장

### PM5Manager (app/pm5.py)
```python
class PM5Manager:
    # 두 가지 모드:
    
    1. BLE Mode (USE_PM5_BLE=1)
       ├── BleakClient로 실제 PM5 연결
       ├── 스캔 및 자동 발견
       └── 특성 구독 및 알림 처리
    
    2. Simulator Mode (USE_PM5_BLE=0)
       ├── 가상 기기 생성
       ├── 합성 데이터 주입
       └── 테스트 및 개발용
    
    # 주요 메서드:
    - start()              # BLE 스캔 시작
    - set_sim_devices()    # 시뮬레이터 기기 설정
    - inject_sim_packet()  # 합성 패킷 주입
    - list_devices()       # 연결된 기기 목록
```

### Simulator (app/simulator.py)
```python
class Simulator:
    # 레이스 진행 시뮬레이션 (스레드 기반)
    
    # 역할:
    - 백그라운드 스레드에서 실행
    - 0.2초마다 상태 업데이트
    - 거리, 파워, SPM 증가
    - 완료 시간 기록
    
    # 특징:
    - race_started_at 확인 후만 활동
    - 배정된 참가자만 업데이트
    - 거리 목표 도달 시 FINISHED 상태
```

### SimPM5 (app/sim_pm5.py)
```python
class SimPM5:
    # PM5 시뮬레이터 (Async 기반, SimulationMode별 전용)
    
    # 역할:
    - configure()       # 가상 기기 개수 설정
    - connect()         # 시뮬레이터 초기화
    - start_sending()   # 데이터 전송 시작
    - stop()            # 정지
    
    # 생성하는 패킷:
    - Stroke Data (19 bytes)
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

## 4. 데이터 흐름

### 회원 생성 플로우
```
1. 클라이언트 (members.html)
   → POST /api/participant/create
   
2. FastAPI Handler (main.py)
   → participant_create()
   
3. Validation
   → name 길이 확인 (2-50자)
   → participant_id 중복 확인
   
4. RaceStore 업데이트 (with lock)
   → store.participants[pid] = Participant(...)
   
5. Response
   → {"ok": true, "participant_id": "..."}
   
6. WebSocket Broadcast
   → get_diff() → 클라이언트에 전송
   
7. 클라이언트 리렌더링
   → renderParticipants()
```

### 레이스 시작 플로우
```
1. 운영자 (admin.html)
   → POST /api/race/start
   
2. FastAPI Handler
   → race_start()
   
3. RaceStore 업데이트
   ├── race_started_at = now
   ├── distance_target_m = value
   └── 모든 ERG 상태 초기화
   
4. 시뮬레이터 시작 (PM5 모드 아닐 때)
   → sim.start()
   
5. 백그라운드 작업 시작
   ├── Simulator 스레드 활성화
   └── PM5 Manager 알림 대기
   
6. WebSocket Broadcast
   → 0.3초마다 diff 전송
   
7. 클라이언트 실시간 업데이트
   ├── race_run.html
   ├── live.html
   └── admin.html (상태 표시)
```

### WebSocket 실시간 업데이트 플로우
```
1. 클라이언트 연결
   → connectWS() → WS /ws
   
2. 초기 스냅샷 전송
   └── server: snapshot()
       {
         "participants": {...},
         "assignments": {...},
         "erg_states": {...},
         ...
       }
   
3. 클라이언트 상태 저장
   → state = {participants, assignments, erg_states}
   
4. 0.3초마다 Diff 전송
   └── server: get_diff()
       {
         "ts": ...,
         "erg_states": {
           "ERG_1": {"distance_m": 510}  // 변경된 필드만
         }
       }
   
5. 클라이언트 Merge
   → mergeDiff(state, diff)
   
6. 재렌더링
   → render() 함수 실행
```

## 5. 프로토콜 상세

### HTTP Routes
```
GET /                           → home.html
GET /lounge                     → lounge.html
GET /members                    → members.html
GET /race                       → race_home.html
GET /race/join                  → join.html
GET /race/qr                    → qr.html
GET /race/qr.png                → PNG (QR Code)
GET /race/admin                 → admin.html
GET /race/run                   → race_run.html
GET /race/sim                   → sim_setup.html
GET /race/leaderboard/live      → live.html
GET /race/leaderboard/result    → result.html

GET /api/state                  → JSON (snapshot)
GET /api/pm5/devices            → JSON (device list)
GET /api/pm5/max                → JSON (max_devices)
GET /api/sim/state              → JSON (sim state)

POST /api/participant/create    → Form (name, id, contact, email)
POST /api/participant/delete    → Form (participant_id)
POST /api/assign                → Form (erg_id, participant_id)
POST /api/unassign              → Form (erg_id)
POST /api/race/start            → Form (distance_target_m)
POST /api/race/reset            → -
POST /api/race/finish           → -
POST /api/pm5/label             → Form (mac, name, note)
POST /api/pm5/map               → Form (mac, erg_id)
POST /api/pm5/max               → Form (value)
POST /api/sim/config            → Form (erg_count)
POST /api/sim/start             → -
POST /api/sim/send_start        → -
POST /api/sim/stop              → -

WS /ws                          → JSON stream
```

### Form 데이터 형식
```
Content-Type: application/x-www-form-urlencoded

예시:
name=철수&participant_id=test1&contact=010-1111-1111&email=test@example.com
erg_id=ERG_1&participant_id=uuid-1
distance_target_m=1000
```

### JSON 응답 형식
```
Success:
{"ok": true, "participant_id": "uuid-1"}

Error:
{"ok": false, "error": "participant already assigned"}

State Snapshot:
{
  "ts": 1234567890.5,
  "distance_target_m": 1000,
  "race_started_at": 1234567800.0,
  "participants": {...},
  "assignments": {...},
  "erg_states": {...}
}

Diff Update:
{
  "ts": 1234567890.6,
  "erg_states": {
    "ERG_1": {
      "distance_m": 510,
      "power_w": 255
    }
  }
}
```

## 6. 동시성 모델

### 스레드 구조
```
Main Thread (FastAPI/Uvicorn)
├── HTTP 요청 처리
├── WebSocket 메시지 수신/송신
├── RaceStore 업데이트 (lock 획득)
└── 응답 반환

Simulator Thread (daemon)
├── race_started_at 확인
├── 0.2초마다 상태 업데이트
├── RaceStore 업데이트 (lock 획득)
└── 계속 실행

PM5 BLE Manager (Async)
├── BleakScanner.discover() (5초마다)
├── BleakClient.connect()
├── 알림 콜백에서 RaceStore 업데이트
└── _on_notify() (데이터 수신 시)

WebSocket Handler (Async, per connection)
├── 초기 snapshot() 전송
├── 0.3초마다 get_diff() 폴링
└── 연결 종료 시 정리
```

### Lock 전략
```
RLock (Reentrant Lock)를 사용하는 이유:

1. Simulator 스레드
   ├── lock 획득
   ├── erg_states 업데이트
   └── lock 해제

2. PM5 Callback (_on_notify)
   ├── lock 획득
   ├── erg_states 업데이트
   └── lock 해제

3. HTTP Handler (POST /api/race/start)
   ├── lock 획득
   ├── store.lock 추가 획득 (RLock이므로 가능)
   ├── 모든 상태 초기화
   └── lock 해제

RLock이 없다면 deadlock 발생 가능!
```

### 메모리 모델
```
모든 상태는 메모리에만 저장됨 (ephemeral)

┌─────────────────────┐
│   RaceStore         │  ← in-memory
│  (Python objects)   │  ← Thread-safe (RLock)
└─────────────────────┘
         ↕
    ┌─────────────┐
    │  Disk I/O   │  (선택사항)
    │- pm5_labels │
    │- pm5_config │
    └─────────────┘

서버 재시작 시:
- 모든 참가자, 배정, ERG 상태 초기화
- PM5 라벨/설정만 유지
```

## 7. 성능 특성

### 요청 처리
```
HTTP 요청: ~1-5ms (로컬)
→ 디바운싱 없음, 클라이언트 책임

WebSocket 업데이트:
→ 0.3초마다 polling (저 대역폭)
→ 실시간성: 300ms 지연

PM5 데이터:
→ ~0.1초마다 알림 (hardware dependent)
→ 패킷당 19 바이트
→ 10 기기 × 10 Hz ≈ 20 KB/s
```

### 메모리 사용
```
Baseline:
- FastAPI + Uvicorn: ~50 MB
- Python runtime: ~30 MB

Per Participant:
- Participant object: ~200 bytes

Per ERG:
- ErgState object: ~200 bytes

예시 (100명 참가자, 9 ERG):
- Participants: 100 × 200 = 20 KB
- Assignments: 9 × 100 = 900 B
- ErgStates: 9 × 200 = 1.8 KB
- 총 추가: ~22 KB

안정적, 메모리 누수 없음
```

### 확장성
```
수직 확장 (단일 서버):
- 파티션 없음
- 모든 상태가 메모리에 있음
- ~500 동시 WebSocket 연결 가능 (1 GB 메모리)

수평 확장 (권장되지 않음):
- 현재 아키텍처는 단일 서버 전제
- 필요시: Redis + 상태 동기화 추가 필요
```

## 8. 보안 고려사항

### 입력 검증
```
회원 ID:
- Pattern: [A-Za-z0-9_-]+
- IME 필터링 (합성 입력 제거)
- Max length: 제한 없음 (backend에서 처리)

이름:
- 2-50자 (생성)
- 2-20자 (join)
- UTF-8 모든 문자 허용

거리:
- 0 (무제한) 또는 100-10000m
```

### 부재한 기능 (추가 필요)
```
- 인증 (Authentication)
- 인가 (Authorization)
- HTTPS/WSS
- CORS
- Rate limiting
- SQL Injection 방지 (현재 DB 없음)
- XSS 방지 (Jinja2 자동 escape)
```

### 권장 배포 설정
```
1. Reverse Proxy (nginx)
   ├── HTTPS 종료
   ├── 압축
   └── Rate limiting

2. Firewall
   ├── 포트 8000만 허용
   └── 신뢰할 수 있는 IP만

3. 환경 변수
   ├── USE_PM5_BLE 제어
   └── 로깅 레벨 관리
```

## 9. 확장 포인트

### 데이터베이스 추가
```python
# 현재: in-memory only
# 추가: SQLAlchemy + PostgreSQL

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine("postgresql://...")
Session = sessionmaker(bind=engine)

# RaceStore를 DB와 동기화
- participants 테이블
- assignments 테이블
- erg_states 테이블
```

### 인증 추가
```python
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from jose import JWTError, jwt

security = HTTPBearer()

@app.post("/api/race/start")
async def race_start(
    credentials: HTTPAuthCredentials = Depends(security),
    ...
):
    token = credentials.credentials
    # JWT 검증
```

### 알림 추가
```python
# 이메일 알림
from fastapi_mail import FastMail, MessageSchema

# SMS 알림
import twilio.rest

# 레이스 완료 시 알림 발송
```

### 분석/로깅
```python
# 구글 애널리틱스
# Sentry (에러 추적)
# ELK Stack (로그 수집)
# InfluxDB (메트릭)
```

---

**최종 업데이트:** 2026년 1월 8일  
**아키텍처 버전:** 1.0
