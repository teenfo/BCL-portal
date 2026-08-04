# 15. Race 전용 설계 — 핵심 기능 정밀 명세

> **위상**: 재구축 문서 세트의 **최중요 단일 완결 문서**. Race 도메인은 이 문서만 보고 재구현 가능해야 한다.
> **근거 원자료**: `_source/contract.md`(표준 명칭·RPC), `_source/backend-inventory.md`(as-is 스냅샷),
> `_source/nonfunctional-history.md`(도메인 규칙), `.docs/archive/planning/race-system.md`(승인 기획서),
> `.docs/archive/planning/race-system-improvement-20260425.md`(감사 보완), `.docs/testing/race-acceptance-checklist.md`(수용 기준),
> 실코드 `race/`(main.py 895줄/pm5_manager/pm5_parsers/recorder/simulator), `src/hooks/useRaceRealtime.ts`, `src/hooks/useRaceAnimator.ts`.
> **상태 표기**: ✅ 운영 · 🟡 코드완료(검증 대기) · 🧪 mock/시뮬레이션 · ⏳ 미구현(신규 설계) · 🔄 to-be 변경/통합

---

## 0. 스코프와 불변 원칙

### 0.1 스코프
정규 수업 내 그룹 레이스(Racing Mode) 전체: 하드웨어(PM5 BLE) → Python 브릿지 → 실시간 파이프라인 → 상태머신 → 경기 모드 3종 → 화면 5종(2.5D 카트레이싱 포함) → 결과 적재/퍼포먼스 연동 → 수용 게이트.
Personal Recording Mode(개인 가외 운동)는 §7 로드맵으로 격리(⏳ 후속 Phase).

### 0.2 불변 원칙 (재구축 시 위반 금지)
| # | 원칙 | 내용 |
|---|------|------|
| R-1 | **역할 3분할** | Python=BLE 통신·레코딩만 / Admin=기기(pm5_devices) 관리 / Portal(Coach·Class)=레이스 로직·렌더링·진행. Python은 레이스 규칙(순위·팀 합산·PR)을 계산하지 않는다 |
| R-2 | **3경로 데이터 분리** | Broadcast 0.3s(DB 미기록) / `race_live_state` 5s UPSERT(ephemeral, 종료 시 DELETE) / JSONL 로컬 30일(종료 후 `race_records` 멱등 적재). 경로 간 용도 혼용 금지 |
| R-3 | **러버밴딩 없음** | 화면상 위치는 항상 실거리 기반. 연출(LERP·카메라)은 지연 보정일 뿐 순위·거리를 왜곡하지 않는다 |
| R-4 | **부정출발 완화(Positive UX)** | READY(카운트다운) 중 데이터는 조용히 무시, GO 이후 0부터 산정. 징벌적 리셋·경고 없음 |
| R-5 | **시리얼 = 주 식별자** | BLE 매칭 키는 MAC이 아닌 PM5 시리얼(기기명 파싱). Mac/iOS의 MAC 은닉 대응. DB 조인 키는 `pm5_devices.id`(UUID), 스냅샷 복원도 `device_id` 기준(개선 M-2 반영) |
| R-6 | **SRK 격리** | Service Role Key는 Python 서버 Docker env에만 존재. 브라우저 번들(`.next/static`) 검출 0건 = 릴리즈 게이트 |
| R-7 | **서버 권한** | 클라이언트가 coach_id·member_id를 전달하지 않는다. RPC는 `auth.uid()` 내부 검증 + envelope `{success, data, error}` |
| R-8 | **세션당 활성 이벤트 1개** | 같은 세션에 미종료(`status NOT IN (completed, cancelled)`) race_event는 최대 1개 — 부분 유니크 인덱스로 강제 |
| R-9 | **모드락** | `pm5_devices.current_mode`(idle/racing/personal_recording)로 Racing↔Personal 기기 탈취 차단 |
| R-10 | **디자인 토큰 준수** | 모든 Race 화면·에셋은 `--bcl-*` 토큰(12-design-system)만 사용. accent=#FF6A00 단일 |
| R-11 | **기기 타입별 비주얼 테마** 🔄 | 레이스 화면 디자인은 연결 기기에 따라 변한다 — 트랙·배경·이펙트 테마는 `race_events.event_type`, 레인별 캐릭터는 각 레인 `pm5_devices.device_type` 기준(§5b.3b). 데이터 파이프라인·집계 로직은 테마와 무관하게 동일(표현 계층만 분기) |

### 0.3 아키텍처 한눈에
```
[PM5 ×~20]─BLE(멀티 동글)─▶[Python 브릿지 :8001 (Coach PC, SRK)]
                                 │
        ┌────────────────────────┼─────────────────────────┐
        ▼ 경로1 (0.3s)           ▼ 경로2 (5s)               ▼ 경로3 (상시)
  Supabase Broadcast       race_live_state UPSERT     JSONL append (로컬)
  race:{event_id}          (재접속 복원, ephemeral)     recordings/{event}/{serial}.jsonl
        │                        │                         │ 종료(stop)
        ▼                        ▼                         ▼
  useRaceRealtime ──▶ useRaceAnimator(rAF/LERP) ──▶  race_records 멱등 적재
        │                                                  │
  /class/race/view(2.5D)·run(그리드)              /class/race/result·리더보드
  /coach/race/control(운영)                        member_benchmark_results(PR 연동)
```

---

## ① 하드웨어 계층 — PM5 BLE

### 1.1 GATT 스펙 (pm5_spec.py 승계)
- **대상 장비**: Concept2 PM5 모니터 부착 장비 — `device_type`: `rower` / `bike` / `skierg` / `treadmill` / `other` (CHECK 확장형, 특정 3종 비종속)
- **광고명 패턴**: `PM5 {serial}` (예: `PM5 430123456`) → 이름 파싱으로 시리얼 추출이 **주 식별 경로**
- **구독 특성(Characteristic)**: C2 Rowing Service (`CE06xxxx-43E5-11E4-916C-0800200C9A66` 계열)
  - **General Status (0x0031)**: elapsed time, distance, workout state → 진행 거리·상태의 1차 소스
  - **Stroke Data (0x0035, 19 bytes)**: `stroke_distance(m)`, `stroke_power(W)`, `stroke_rate(SPM)` — 0.3s 주기 추출, 애니메이션·순위 산정용
  - **Additional Status 1 (0x0032)**: `hr_bpm`(심박 벨트 연동 시), pace
  - **Additional Status 2 (0x0033)**: `calories_burned`
- **파생 지표**: 전송 주기 내 최고 와트를 누적 추적 → `max_w`(Max Watts 랭킹용). 파싱 책임은 전부 `pm5_parsers.py` — Portal은 파싱 로직을 갖지 않는다(R-1)

### 1.2 규모·멀티 동글 분산
| 항목 | 값 | 근거 |
|---|---|---|
| 최대 동시 연결 | **20대** | 정원 클래스 기준 |
| 동글당 안정 연결 | **7~10대** | 일반 BLE 동글 한계 — 스로틀링 방지 |
| 필요 동글 수 | 2~3개 (`hci0/hci1/hci2`) | `pm5_manager.py`가 어댑터별 라운드로빈 분산 |
| adapter 전달 | 스캔 결과의 `adapter` 값을 connect 요청 payload에 포함(개선 M-4) | 🟡 |

- 분산 규칙: `pm5_manager`가 어댑터별 현재 연결 수를 추적, 신규 연결은 최소 부하 어댑터에 배정. 어댑터 장애 시 해당 어댑터 소속 레인만 `disconnected` 처리(전체 레이스 중단 금지).
- Docker: `race-service` 컨테이너는 `privileged`(BLE 접근) — 배포 문서(11) 참조.

### 1.3 장비 등록 프로세스 (Web Bluetooth ↔ Python 분업)
1. **등록은 브라우저**: Admin `/admin/race`(to-be 통합 화면) 기기 등록 모달 → Web Bluetooth API 스캔(파이썬 불필요, 태블릿 휴대 등록 가능)
2. **중복 제거**: 스캔 결과 중 `pm5_devices`에 이미 있는 시리얼 제외 후 셀렉트박스 노출
3. **iOS/Mac 방어**: Web Bluetooth가 MAC 대신 임의 UUID를 반환 → **기기명에서 시리얼 파싱**해 저장(R-5)
4. **레이스 통신은 Python**: 레이스 가동 시 Python이 DB의 `pm5_devices` 명단(시리얼 기준)으로 멀티 동글 연결 수행
- 상태: 등록 모달 🟡(L2 검증 대기), 미등록 기기 제외 🟡

### 1.4 BLE 연결 라이프사이클
```
[scan] → [connect(멀티 동글)] → (연속 레이스: 연결 유지) → [일괄 해제 or 절전 감지]
```
| 시점 | 규칙 |
|---|---|
| **연속 레이스 간** | 예선 1조→2조처럼 레이스가 이어질 때 **연결을 끊지 않는다**(재연결 딜레이 방지). 레이스 단위 종료 ≠ BLE 해제 |
| **정상 해제** | 코치가 `[레이스 룸 종료]` 버튼 → Python이 `BleakClient` 전체 일괄 해제 → 기기 `current_mode='idle'` 복귀 |
| **자연 해제(절전)** | 무동작 2~4분 후 PM5 자동 sleep → BLE 물리 단절 → Python 감지 → 해당 레인 조용히 `[Offline]` 전환(화면 Grayscale). 경보 없음 |
| **연결 누수 게이트** | disconnect 카운트 == connect 카운트 (수용 5-3), 10회 연속 레이스 메모리 누수 없음(5-2) |

### 1.5 `pm5_devices` 스키마 (to-be, 05_race.sql)
```sql
pm5_devices (
  id UUID PK,
  facility_id UUID NOT NULL REFERENCES facilities(id),   -- 🔄 다중시설 스코핑 필수화 (§7.3)
  serial_number VARCHAR(100) NOT NULL UNIQUE,             -- 주 식별자 (R-5)
  mac_address VARCHAR(17),                                -- 보조 (Linux 스캔 시 채움)
  ble_name VARCHAR(100),                                  -- 'PM5 430123456'
  device_type TEXT NOT NULL CHECK (device_type IN ('rower','bike','skierg','treadmill','other')),
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online','offline','maintenance')),
  current_mode TEXT NOT NULL DEFAULT 'idle' CHECK (current_mode IN ('idle','racing','personal_recording')),
  qr_identifier VARCHAR(100),                             -- 기기 부착 고정 QR 해시 (⏳ Personal Mode)
  firmware_version TEXT, last_sync_at TIMESTAMPTZ,
  created_at/updated_at TIMESTAMPTZ
)
```
- ⚠️ as-is 결함 승계 금지: 프론트 장비 필터는 반드시 `status = 'online'`(as-is의 `'active'` 오필터 — 개선 M-3) 기준.

---

## ② Python 브릿지 서버 (FastAPI :8001)

### 2.1 구동 형태·인증
- **위치**: Coach PC(또는 지점 서버) Docker 컨테이너 `race-service`, 포트 **8001**, `privileged`(BLE)
- **인증**: Supabase **Service Role Key를 Docker env로 주입** — 서버사이드 에이전트이므로 "클라이언트 SRK 금지" 규칙과 무충돌. RLS bypass로 `race_live_state`/`race_recordings`/`race_records` 쓰기 수행(R-6)
- **CORS**: `localhost` + 내부망 대역만 허용. 외부 인터넷 노출 금지(수용 6-2)
- **파일 구성(승계)**: `main.py`(API·오케스트레이션) / `pm5_manager.py`(멀티 어댑터 BLE) / `pm5_parsers.py`(특성 파서) / `pm5_spec.py`(GATT 상수) / `recorder.py`(JSONL) / `simulator.py`(L1 검증)

### 2.2 역할 경계 (R-1 재확인)
| 주체 | 한다 | 하지 않는다 |
|---|---|---|
| Python | BLE 스캔/연결/구독, 파싱, Broadcast 발행, 5s 스냅샷 UPSERT, JSONL 기록, 종료 시 결과 적재 트리거, READY 데이터 스킵 | 순위 계산, 팀 합산, PR 판정, 화면 로직, 이벤트 CRUD |
| Admin | pm5_devices CRUD(Web BT 등록), 이벤트 CRUD·통계, Coach 제어화면 read-only 임베드 | BLE 직접 통신 |
| Portal (Coach/Class) | 레이스 진행 제어(상태머신 전이 명령), 편성, 렌더링, 순위/팀 합산/달성률 계산 | SRK 사용, BLE 통신 |

### 2.3 REST 제어 API 전종 계약 (as-is main.py 승계 + 🔄 확장)
공통: 응답 `{success, data?, error?}` JSON. 호출자는 Coach/Admin 화면(같은 내부망).

| 그룹 | Method Path | 요청 | 응답(data) | 비고 |
|---|---|---|---|---|
| 상태 | `GET /` , `GET /health` | — | 서버 버전, BLE 어댑터 목록, 가동 상태 | 헬스체크(nginx `/health` 연동) |
| BLE | `GET /api/ble/scan` | `?duration=8` | 발견 기기 `[{serial, ble_name, mac, rssi, adapter}]` | 등록 기기와 대조는 프론트 |
| BLE | `POST /api/ble/connect` | `{devices:[{serial, adapter?}]}` | 연결 결과 per-기기 | adapter 미지정 시 서버가 분산 배정(M-4) |
| BLE | `POST /api/ble/disconnect/{serial}` | — | — | 개별 해제 |
| BLE | `POST /api/ble/disconnect-all` | — | 해제 수 | `[레이스 룸 종료]` 경로 |
| BLE | `GET /api/ble/status` | — | 기기별 연결 상태·어댑터·수신률 | Coach Control 폴링 |
| Race | `POST /api/race/setup` | `{event_id, target_distance_m?, duration_s?, race_format, lane_assignments:[{lane, device_serial, device_id, member_id?, member_name?, team_id?}], heat_no?, group_target_m?, carryover_m?}` 🔄 | 세팅 확정 스냅샷 | 모드 파라미터 확장(④-b). 기기 `current_mode='racing'` 전환 |
| Race | `POST /api/race/control` | `{action: 'lobby'\|'countdown'\|'start'\|'stop'\|'reset', event_id}` | 전이 후 상태 | 상태머신 전이의 유일한 명령 표면(④). `stop` 시 recorder.stop → **load-results 자동 트리거**(M-1) + live_state DELETE |
| Race | `GET /api/race/status` | `?facility_id` 🔄 | `{event_id, lobby_status, elapsed, race_format, ...}` | Class 화면의 event_id 폴백 조회. 🔄 facility 스코프 필수화(§7.3) |
| Race | `GET /api/race/live` | — | 현재 레인 스냅샷 배열 | Broadcast 불가 시 0.3s 폴링 폴백 |
| Rec | `GET /api/recordings` / `GET /api/recordings/{event_id}/summary` | — | 파일 목록 / 기기별 요약(avg/max) | JSONL 요약 추출 |
| Rec | `POST /api/recordings/{event_id}/load-results` | — | 적재 건수 | JSONL→`race_records` **멱등 UPSERT**(UNIQUE(event,member)). stop이 자동 호출하나 수동 재시도 가능 |
| WS | `WS /ws/race` | — | erg 스트림 | Broadcast 장애 시 폴백 채널 |
| Sim | `POST /api/sim/{start,stop,reset}` `GET /api/sim/status` `POST /api/sim/replay` | 레인 수/시나리오/JSONL 경로 | — | L1 검증 전용(§6.4). 운영 빌드에서도 유지(리허설용) |

### 2.4 서버 내부 규칙
- **READY 스킵**: `lobby_status='countdown'` 동안 수신되는 distance/power 변화는 누적 합산에서 제외(로그로 `READY skip` 남김 — 수용 2-5). `start` 순간의 기기 누적거리를 0점 오프셋으로 저장 → 이후 `d = raw - offset`
- **flush 내구성**: JSONL write buffer flush 주기 1s(`fsync`) — 비정상 종료(SIGINT)에도 마지막 라인 보존(수용 5-5)
- **시뮬레이터 device_id 전략(M-6)**: 시뮬 가상 기기는 `pm5_devices`에 `SIM-{n}` synthetic 레코드로 사전 시드 → NOT NULL 제약 충돌 제거
- **레코더 메타(M-7)**: `_meta.json`에 `lane_assignments` 전체(레인↔시리얼↔member↔team↔heat) 저장 — 재처리 시 매핑 유실 방지

---

## ③ 3경로 데이터 파이프라인

### 3.1 경로 1 — Supabase Broadcast (실시간 렌더링, DB 미기록)
- **채널**: `race:{event_id}` (Realtime Broadcast, anon key 구독 가능)
- **주기**: 기기당 **0.3s**(≈3Hz). 20대 × 3Hz ≈ 60msg/s — Supabase Pro 안정 범위, 메시지 ~200B ≪ 32KB 한계
- **이벤트 종류**:

| event | payload 핵심 | 발행 주체 |
|---|---|---|
| `erg_update` | `{device_serial, device_id, lane, d, p, spm, hr, cal, max_w, ts, virtual_lane?}` — ⏳ `virtual_lane: true` = 페이스보트 가상 레인(§4b.5, 렌더 전용) | Python |
| `race_countdown` | `{event_id, seconds, ts}` — control('countdown') 시 발행. TV 신호등·승선 연출 진입(racing/finished 상태에선 스테일 무시) | Python (control 명령 수행 시) |
| `race_start` / `race_finish` / `race_reset` | `{event_id, ts}` (+finish: 최종 스냅샷) | Python (control 명령 수행 시) |
| `state_snapshot` | 전 레인 상태(5s 주기, 경로2와 동일 내용) | Python |
| `lane_assign` | `{lane, device_id, member_id, member_name, team_id}` | Portal(코치 편성)·회원 QR 배정 |
| `team_update` | `{team_id, total_distance_m, rank}` | Portal(코치 화면이 합산 계산 후 공유) — 참고용, 관전 화면은 자체 합산 |
| `heat_advance` 🔄 | `{heat_no, carryover_m, cumulative}` | Portal — 단체전 히트 전환(④-b) |
| `target_reached` 🔄 | `{total_m, ts}` | Portal — 단체전 공동목표 달성 연출 트리거 |

- 클라이언트 수신: `useRaceRealtime`(승계) — Broadcast 1차, 실패 시 `/api/race/live` 0.3s 폴링 폴백, 필드 축약형(`d/p/spm/...`)과 전체형 모두 수용.
- ⏳ **가상 레인 규칙(계약 §6b, G-10)**: `virtual_lane: true` 페이로드는 **렌더 전용** — 순위·팀 합산·달성률 집계와 `race_records` 적재에서 제외하며, 경로2(`race_live_state`)·경로3(JSONL)에도 기록하지 않는다(§4b.5).

### 3.2 경로 2 — `race_live_state` (5s 스냅샷, ephemeral)
```sql
race_live_state (
  id UUID PK,
  event_id UUID NOT NULL REFERENCES race_events(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES pm5_devices(id) ON DELETE CASCADE,  -- 복원 기준 키(M-2)
  member_id UUID REFERENCES members(id),          -- NULL = 미배정 레인
  lane_number INT NOT NULL,
  team_id UUID REFERENCES race_teams(id),         -- NULL = 개인/단체전
  distance_m DECIMAL(10,2) DEFAULT 0, power_w DECIMAL(8,2) DEFAULT 0,
  stroke_rate_spm DECIMAL(5,1) DEFAULT 0, hr_bpm INT,
  calories_burned INT DEFAULT 0, max_watts DECIMAL(8,2) DEFAULT 0,
  connection_status TEXT DEFAULT 'connected'
    CHECK (connection_status IN ('connected','racing','idle','disconnected','offline')),
  last_updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, device_id)
)
```
- **용도 단일화**: 중도 접속/새로고침 시 현재 상태 점프 복원(수용 3-4)만. 리더보드·통계 소스로 사용 금지
- **수명**: 레이스 `stop` 시 해당 event_id 행 전체 DELETE(Python) — 종료 후 잔존 0건이 수용 기준(2-7, 5-1)
- 재접속 시퀀스: 화면 mount → `race_live_state` SELECT(스냅샷 즉시 반영, 거리 점프) → Broadcast 구독 → 이후 LERP 재개

### 3.3 경로 3 — JSONL 원시 기록 → `race_records` 적재
```
race/recordings/{event_id}/
  ├── {device_serial}.jsonl        # 기기별 독립 파일, 한 줄 = {"ts","d","p","spm","hr","cal","max_w"}
  └── _meta.json                   # 시작/종료 시각 + lane_assignments 전체(M-7) + race_format/heat_no
```
- **왜 파일인가**: 초당 ~66row(20기기)를 DB에 직접 쓰면 과부하 — 순차 Append I/O가 최적. 용량 ~21MB/레이스, 30일 보관 ~6.3GB(디스크 모니터링 권장)
- **보관**: 로컬 30일 후 자동 삭제(Python 스케줄러). 필요 시 Supabase Storage 아카이빙(확장)
- **적재**: `stop` → `load-results` 자동 트리거(M-1) → JSONL 요약(총거리·시간·avg/max watts·avg spm·avg/max hr·cal) 추출 → `race_records` **UPSERT(UNIQUE(event_id, member_id) 기준 멱등)** → 재실행 안전
- `race_recordings`(파일 메타 인덱스): `event_id, device_id, device_serial, file_path, file_size_bytes, total_data_points, duration_seconds, recorded_at, recorded_by, facility_id`. 관계: `race_records.recording_id → race_recordings.id`(1:1 optional)

### 3.4 네트워크·단절 예외 규칙 (관전 화면 공통)
| 상황 | 처리 |
|---|---|
| 수신 지연 1s+ | 마지막 속도 기반 **Mock 등속 전진** + `[Reconnecting]` 배지(위치 튐 완충) — 순위 확정에는 미사용(R-3) |
| 기기 완전 단절 | 레인 Grayscale + IDLE 애니메이션 정지 |
| PM5 절전(2~4분) | `[Offline]` 배지 — 조용한 전환, 경보 없음 |
| 브라우저 새로고침 | §3.2 복원 시퀀스 |
| Broadcast 채널 장애 | `/api/race/live` 0.3s 폴링 자동 전환(useRaceRealtime 내장) |

---

## ④ 상태머신

### 4.1 레이스 진행 상태 — `race_events.lobby_status`
```
setup ──▶ lobby ──▶ countdown(5s) ──▶ racing ──▶ finished
  ▲                                                 │
  └───────────── reset (코치 수동) ◀─────────────────┘
```
| 상태 | 의미 | 진입 조건 | 화면 |
|---|---|---|---|
| `setup` | 이벤트 생성 직후. 기기 연결·편성 진행 | `fn_prepare_race_session` | Coach Control 세팅 패널 |
| `lobby` | 편성 확정, 참가자 대기(Starting Pen 도열) | 코치 `lobby` 액션 | 2.5D 대기방 연출(Zwift 벤치마크) |
| `countdown` | 5초 신호등. **수신 데이터 전량 스킵**(R-4) | 코치 `countdown` | 신호등 시퀀스(⑤-b) |
| `racing` | GO. 0점 오프셋 기준 실측 진행 | 자동 전이(카운트 완료) | 2.5D/그리드 라이브 |
| `finished` | 목표 달성/시간 종료/코치 stop | 코치 `stop` 또는 전원 완주 | 체커기→포디움→결과 |

- 병행 상태: `race_events.status`(scheduled/in_progress/completed/cancelled)는 **관리 수명주기**(Admin 목록·통계용), `lobby_status`는 **진행 수명주기**. `stop` 시 `status='completed'` 동기 전이.
- 부정출발 완화 재확인: countdown 중 당긴 거리는 화면·기록 어디에도 반영되지 않으며 사용자에게 경고를 표시하지 않는다. GO 후 첫 broadcast는 `d≈0`(수용 2-6).

### 4.2 기기 모드락 — `pm5_devices.current_mode`
```
QR/제어 요청 → current_mode 조회
  ├─ 'idle'                → 허용 (racing 또는 personal 전환 가능)
  ├─ 'racing'              → Personal 요청 거부: "현재 수업 중입니다"
  └─ 'personal_recording'  → Racing 전환 시 기존 Personal 세션 강제 종료 후 전환 (코치 우선권)
```
- `race/setup` 시 참여 기기 전체 `racing` 전환, `[레이스 룸 종료]` 시 `idle` 일괄 복귀. Personal Mode 자체는 ⏳(§7.2)이나 **모드락 컬럼과 판정 로직은 지금 설계에 포함**(후속 Phase가 스키마 변경 없이 진입하도록).

---

## ④-b 경기 모드 3종 — `race_format` 전용 설계

### 4b.0 공통 계약

**enum (to-be)**: `race_events.race_format ∈ {individual, team, group, relay}` 🔄
— `relay`는 팀전의 하위 변형(한 기기를 팀원이 교대)으로 §4b.2에서 함께 명세. as-is enum(individual/team/relay)에 `group` 추가.

**`race_events` 확장 컬럼 (to-be, 05_race.sql)** 🔄
```sql
race_events (
  id UUID PK, facility_id UUID NOT NULL, name TEXT NOT NULL,
  event_date DATE, event_type TEXT CHECK (IN ('rowing','bike','skierg','run','other')),
  status TEXT CHECK (IN ('scheduled','in_progress','completed','cancelled')),
  lobby_status TEXT DEFAULT 'setup' CHECK (IN ('setup','lobby','countdown','racing','finished')),
  race_format TEXT NOT NULL DEFAULT 'individual' CHECK (IN ('individual','team','group','relay')),
  session_id UUID REFERENCES sessions(id),
  coach_id UUID REFERENCES coaches(id),
  target_distance_m INT,              -- 개인/팀/릴레이: 1인(1팀) 목표 거리. NULL=시간제
  duration_minutes INT,               -- 시간제 레이스(달린 거리 경쟁) 시 사용
  group_target_m INT,                 -- 🔄 단체전 A안: 공동 목표 거리 (예: 10000)
  heat_no INT NOT NULL DEFAULT 1,     -- 🔄 단체전 B안: 히트 번호 (1부터). 개인/팀전은 항상 1
  parent_event_id UUID REFERENCES race_events(id),  -- 🔄 히트 시리즈 묶음 (1번 히트 = 부모, 이후 히트가 참조)
  carryover_m DECIMAL(10,2) DEFAULT 0,              -- 🔄 공동목표 분할 진행 시 이월 누계
  created_at/updated_at
);
-- R-8: 세션당 활성 이벤트 1개 (히트 전환은 "기존 종료 → 다음 생성" 순서로 통과)
CREATE UNIQUE INDEX uq_race_events_active_session ON race_events(session_id)
  WHERE status NOT IN ('completed','cancelled') AND session_id IS NOT NULL;
```

**`fn_prepare_race_session` (to-be 시그니처)** 🔄 — 계약서 §4 준수
```sql
fn_prepare_race_session(
  p_session_id  UUID,
  p_race_format TEXT DEFAULT 'individual',   -- individual | team | group | relay
  p_options     JSONB DEFAULT '{}'::jsonb    -- 모드별 옵션 (아래 표)
) RETURNS JSONB  -- {success, data:{created, event_id, event_name, session_id, lobby_status, status,
                 --                 race_format, heat_no, group_target_m, carryover_m}, error}
```
| p_options 키 | 모드 | 의미 |
|---|---|---|
| `target_distance_m` | individual/team/relay | 목표 거리(코치 자유 입력: 500/834/2000 등) |
| `duration_minutes` | 전 모드 | 시간제 레이스 |
| `group_target_m` | group(A안) | 공동 목표 거리 |
| `heat_mode` (bool) | group(B안) | 히트 방식 여부 |
| `next_heat_of` (event_id) | group(B안) | 이 이벤트가 지정 이벤트의 다음 히트임(heat_no+1, parent 연결, carryover 자동 계산) |
| `pacer` (jsonb) ⏳ | 전 모드 공통 | 페이스보트/버추얼 페이서 설정 — `{source, member_id?, split_500m?|pace_schedule?}` (§4b.5, G-10) |

동작 규칙(승계+확장): ① 코치 배정 세션 검증(admin 예외) ② 미종료 이벤트 존재 시 **재개 반환**(created=false) — 단 `next_heat_of` 지정 시 이전 히트가 finished인지 검증 후 신규 생성 ③ 신규 생성 시 `race_format`·옵션 반영. advisory lock으로 동시 호출 직렬화(승계).

**공통 편성 원리**: 편성의 SSOT는 `race/setup` payload의 `lane_assignments`이며 Python이 `_meta.json`과 `race_live_state`에 동일 반영. 자동 배정 소스 = 해당 세션 **체크인 완료자**(`bookings.attendance_outcome='checked_in'` + walk_in) 명단.

---

### 4b.1 개인전 (individual) — 레인별 개인 경쟁 🟡

**편성 UI 플로우 (Coach Control)**
1. 세션 보드 `[Race 시작]` → `fn_prepare_race_session(session_id, 'individual', {target_distance_m})`
2. 기기 패널: `status='online'` 기기 목록 → `[일괄 연결]`(adapter 자동 분산)
3. **자동 레인 배정**: 체크인 명단을 연결 성공 기기 수만큼 레인 1번부터 순차 배정(가나다순 기본, 드래그로 수동 교체). 인원 > 기기 → 초과 인원은 대기 목록(다음 히트 후보), 인원 < 기기 → 빈 레인은 `member_id=NULL`(화면 비표시)
4. **QR 자율 배정(보조)** ⏳: 회원이 기기 부착 QR 스캔 → `/apps/race/join?device_id={uuid}` → 활성 이벤트 자동 감지 → `race_live_state.member_id` 바인딩 + `lane_assign` Broadcast → 코치 화면 실시간 반영
5. `[Lobby 확정]` → 2.5D Starting Pen 도열 → 카운트다운 → GO

**집계 규칙**
- 순위: 거리제=목표 도달 시각 오름차순(완주 전에는 현재 거리 내림차순) / 시간제=종료 시점 거리 내림차순. 계산 주체는 Portal(useRaceRealtime의 rank 필드)
- 동률: 같은 프레임 내 거리 동일 시 max_watts 높은 쪽 상위(표시용 — race_records.finish_rank에 동일 규칙 적용)
- **PR 판정**: 적재 시 동일 회원·동일 event_type·동일 목표거리의 과거 best와 비교 → 갱신 시 `is_pr=true`(수용 4-5)

**화면 변형**: 2.5D=레인별 개인 카트(회원명+개인 컬러), HUD 순위 스택=개인 단위. 그리드=레인 타일. 결과=개인 리더보드+다각도 랭킹(⑤.4)

**결과 적재 스키마** — `race_records` 1행/참가자:
```
{event_id, member_id, device_serial, recording_id, lane_number, finish_rank,
 result_time INTERVAL, result_distance, calories_burned,
 avg_watts, max_watts, avg_spm, avg_hr_bpm, max_hr_bpm, is_pr, team_id=NULL}
UNIQUE(event_id, member_id) — 멱등 적재 키
```

**RPC/API 파라미터**: `fn_prepare_race_session(sid, 'individual', {"target_distance_m":2000})` → `POST /api/race/setup {event_id, race_format:'individual', target_distance_m, lane_assignments:[{lane, device_serial, device_id, member_id, member_name}]}`

---

### 4b.2 팀전 (team / relay 변형) — 팀 거리 실시간 합산 경쟁 🟡

**편성 UI 플로우**
1. `fn_prepare_race_session(sid, 'team', {target_distance_m})` → Control에 **팀 구성 패널** 활성
2. 팀 생성: 팀명+팀 컬러 선택(디자인 시스템 팀 팔레트 8색 — ⑤-b 에셋과 1:1) → `race_teams` INSERT (`UNIQUE(event_id, team_name)`)
3. **레인→팀 매핑 UI**: 좌측 체크인 명단 / 중앙 레인 스트립 / 우측 팀 컬럼 — 레인 카드를 팀 컬럼으로 드래그(또는 탭 토글). `[균등 자동 배정]` 버튼=명단을 팀 수로 스네이크 배분(전력 균형)
4. 검증: 최소 2팀, 팀당 최소 1레인, 미배정 레인 잔존 시 확정 차단(경고)
5. Lobby 확정 시 `lane_assignments[].team_id` 포함 setup 전송 + `race_live_state.team_id` 반영

**집계 규칙**
- **핵심 원리**: 같은 `team_id` 레인들의 `distance_m`을 **클라이언트(관전 화면)가 프레임 단위 실시간 합산** → 팀 보트 1척이 전진. DB `race_teams.total_distance_m`은 5s 스냅샷 참고치일 뿐(합산 SSOT는 경로1 수신치)
- 팀 순위: 합산 거리 내림차순 / 거리제=팀 합산이 `target_distance_m` 도달 순
- **개인 기여도**: 결과 화면에서 팀 내 개인별 거리·비중(%)·avg watts 표기 — race_records 개인 행에서 파생(별도 저장 불필요)
- **relay 변형**: 1팀=1기기, 팀원이 교대 탑승. 편성 UI에서 팀당 기기 1대+주자 순번 리스트. 집계는 기기 누적거리 그대로(교대 감지 불필요 — 기록은 팀 단위, 개인 행은 `member_id=주장(대표)`+`metadata.relay_members[]`)

**화면 변형**: 2.5D=**팀 컬러 카트/보트 1척**(팀원 아바타 스택 탑승), 레인 수=팀 수. HUD=팀 합산 게이지 대결 바(좌우 대칭 or 다팀 스택). 그리드=팀 섹션 그룹핑+팀 합계 헤더. 결과=팀 포디움 → 팀 내 기여도 테이블

**결과 적재 스키마**: 개인 행(4b.1과 동일 + `team_id`, `finish_rank`=팀 순위 기준 공유) + 팀 요약은 조회 시 `GROUP BY team_id` 파생(별도 테이블 불필요 — race_teams가 이름/컬러 보존)

**RPC/API 파라미터**: `fn_prepare_race_session(sid, 'team', {"target_distance_m":5000})` → setup payload `race_format:'team'`, `lane_assignments[].team_id` 필수. relay: `'relay'` + 팀당 1 레인

---

### 4b.3 단체전 (group) — 공동 목표 / 대인원 히트 ⏳ (신규 설계)

참가자 전원이 경쟁이 아닌 **하나의 결과**를 만드는 모드. **2방식을 모두 지원**하며 코치가 이벤트 생성 시 선택한다.

#### A안 — 공동 목표 합산 방식 (`group_target_m`)
> 예: "오늘 클래스 전원이 함께 10,000m를 채운다"

- **편성**: 개인전과 동일한 자동 레인 배정(팀 없음). 인원 ≤ 기기 수일 때 권장
- **집계**: 전 레인 `distance_m` 총합 = **공동 누계**. 달성률 = `(carryover_m + Σ distance_m) / group_target_m`
  - `carryover_m` **이월 규칙**: 목표가 커서 한 번에 못 채우는 경우(수업 구성상 라운드를 나눔) — 라운드 종료 시 누계를 다음 이벤트의 `carryover_m`으로 이월(`fn_prepare_race_session`의 `next_heat_of`가 자동 계산: 이전 히트 race_records 합계). 화면 진행바는 항상 이월 포함 누계 기준
- **종료 판정**: 누계 ≥ `group_target_m` 도달 순간 Portal이 `target_reached` Broadcast → 공동 달성 연출(⑤-b.6) → 코치 stop / 또는 시간 종료(미달 시 달성률로 마감)
- **화면 변형**: 2.5D를 **단일 거대 진행 트랙**으로 전환 — 트랙 위 마일스톤 게이트(25/50/75/100%), 전원 카트가 무리지어 전진(개인 순위 스택 대신 개인 페이스 스트립), 중앙 상단 대형 달성률 게이지+누계 카운터
- **결과**: 승자 없음 — `달성 여부/총거리/소요시간` 헤더 + 개인 기여 리더보드(거리 내림차순, 순위 아닌 "기여" 프레임). PR 판정은 개인 거리 기준 그대로 수행

#### B안 — 대인원 히트 방식 (`heat_no`, 조별 진행 → 통합 랭킹)
> 예: 회원 18명 / 기기 8대 — 3개 조로 나눠 순차 레이스 후 **전체 통합 리더보드**

- **편성**: 체크인 명단을 히트별로 분할(자동: 기기 수 단위 순차 / 수동 조정). 히트 1 편성분만 setup에 포함, 나머지는 대기 큐
- **진행 플로우**:
  1. 히트 1 = 일반 개인전과 동일 진행(동일 `target_distance_m`) → finished
  2. 코치 `[다음 히트]` → `fn_prepare_race_session(sid, 'group', {"heat_mode":true, "next_heat_of":"<히트1 event_id>"})` → `heat_no=2`, `parent_event_id`=히트1 이벤트 생성(R-8은 "이전 종료 후 생성"으로 자연 통과). **BLE 연결은 유지**(§1.4) — 탑승자만 교대
  3. 마지막 히트 종료 시 시리즈 마감
- **히트 간 기록 이월/통합 집계**: 히트별 race_records는 각자 event_id로 적재(멱등 유지). **통합 랭킹 = 시리즈 스코프 조회**:
  ```sql
  -- 시리즈 = parent_event_id(또는 자기 자신 id) 기준 묶음
  SELECT r.*, RANK() OVER (ORDER BY r.result_time ASC) AS overall_rank
  FROM race_records r JOIN race_events e ON e.id = r.event_id
  WHERE COALESCE(e.parent_event_id, e.id) = :series_root_id;
  ```
  거리제=result_time 오름차순, 시간제=result_distance 내림차순. 동일 회원이 복수 히트 출전 시 best 기록만(ROW_NUMBER per member)
- **화면 변형**: 라이브 중=개인전 화면과 동일 + 상단 `HEAT 2/3` 배너 + 우측 "현재까지 통합 TOP5" 오버레이(이전 히트 기록 포함 — 나중 히트 주자가 넘어야 할 기준선 제시, 고스트 마커로 트랙에 표시 가능). 결과=**단일 통합 리더보드**(히트 배지 표기)
- **A+B 결합 허용**: 히트 방식이면서 공동목표(`group_target_m`)를 함께 설정하면 히트 누계가 이월(carryover) — "3개 조가 릴레이로 10,000m 채우기" 시나리오 커버

#### 단체전 결과 적재 스키마
개인 행 구조는 4b.1과 동일(`team_id=NULL`). 시리즈/목표 메타는 `race_events`(group_target_m/heat_no/parent_event_id/carryover_m)가 보유 — records 스키마 오염 없음.

#### 단체전 RPC/API 파라미터 요약
| 시나리오 | RPC 호출 | setup payload 추가 필드 |
|---|---|---|
| A안 시작 | `fn_prepare_race_session(sid,'group',{"group_target_m":10000})` | `group_target_m, carryover_m:0` |
| A안 라운드 이월 | `... {"group_target_m":10000, "next_heat_of":"<prev>"}` | `carryover_m:<이전 누계>` |
| B안 히트1 | `... {"heat_mode":true, "target_distance_m":500}` | `heat_no:1` |
| B안 히트N | `... {"heat_mode":true, "next_heat_of":"<prev>"}` | `heat_no:N` |

### 4b.4 모드 선택 지점 (공통)
- **세션 경로(표준)**: 코치 세션 보드 `[Race 시작]` → 모드 선택 시트(3카드: 개인전/팀전/단체전 + 단체전 하위 A/B 토글, relay는 팀전 카드 내 옵션) → `fn_prepare_race_session(p_session_id, p_race_format, p_options)`
- **Admin 경로**: `/admin/race` 이벤트 생성 폼에서 동일 파라미터 지정(세션 미연동 이벤트 허용 — 특별 이벤트용)
- 미종료 이벤트 재개 시 모드 변경 불가(reset 후 재생성) — 진행 중 모드 전환으로 인한 집계 붕괴 방지

### 4b.5 가상 레인 — 페이스보트/버추얼 페이서 ⏳ (모드 공통 옵션 — G-10, 16 문서)

> 벤치마크: Time-Team pace boat·ErgRace Chase Race·RowPro 페이스보트·EXR PR 고스트·Zwift HoloReplay.
> 트랙 위에 목표 페이스로 전진하는 **가상 레인 1개**를 추가해 참가자가 "지금 이기고 있는지"를 즉시 인지하게 한다.
> 소인원 수업(2~3명)의 경쟁 밀도 보강 효과가 크다. 전 `race_format` 공통 옵션(단체전 A안에서는 목표 페이스 기준선으로 활용).

**페이스 소스 3종** (`p_options.pacer.source`)

| source | 기준 기록 | 파라미터 |
|---|---|---|
| `member_pr` | 회원 본인 PR — `member_benchmark_results`에서 동일 event_type·동일 목표거리 best 조회 | `member_id` (기본: 코치 지정 포커스 레인 회원) |
| `club_record` | 클럽 기록 — 시설 스코프 동일 종목·거리 best(`race_records`/벤치마크) | 자동 조회 |
| `coach_split` | 코치 지정 스플릿 — 고정 페이스 또는 구간별 스케줄 | `split_500m`(초) 또는 `pace_schedule[]` |

**파이프라인 계약 (계약 §6b — 렌더 전용)**
- Broadcast `erg_update`에 **`virtual_lane: true`** 플래그(§3.1) — 이 페이로드는 **렌더 전용**:
  순위·팀 합산·달성률 **집계 제외** + `race_records` **적재 제외** + `race_live_state` UPSERT·JSONL 기록도
  하지 않는다(3경로 중 경로1만 사용 — R-2 경로 분리·결과 데이터 오염 없음)
- 발행 주체: **시뮬레이터 가상 레인 재사용** — `simulator.py`의 가상 레인 엔진이 페이스 스케줄대로
  `erg_update`(시리얼 `PACER-1`) 발행. 파서 이후 코드 공유 원칙(§6.4) 그대로 — 수신 측은 `virtual_lane`
  플래그로만 구분(별도 분기 로직 최소화), `pm5_devices` 시드 불요(DB 미기록 레인이므로 M-6 비적용)
- 설정 경로: `fn_prepare_race_session(p_options.pacer)` → `POST /api/race/setup` payload에 `pacer` 전달 →
  Python이 countdown→GO 전이에 맞춰 발행 시작(READY 스킵 규칙 §2.4 동일 적용, 0점 동기 출발)
- 화면 규칙: 순위 스택·결과 화면·PR 판정 대상에서 제외. 미니맵에는 페이서 도트 표시 가능 —
  §5b.5 고스트 마커(이전 히트 best)와는 별개 개념(페이서는 트랙 위 카트로 렌더)

**연출**: 고스트 반투명 카트 스타일 + 이름 플레이트 `PACER` — §5b.2 표·§5b.7 에셋 `race/fx-pacer-ghost` 참조

---

## ⑤ 화면 계층

| 화면 | 라우트 | 역할 | 대상 | 상태 |
|---|---|---|---|---|
| Coach Control | `/coach/race`(허브 3탭) + `/coach/race/control` | 이벤트 준비·기기 연결·편성·상태머신 제어 | 코치 패드 | 🟡 |
| 2.5D View | `/class/race/view?event={id}` | 카트레이싱 관전 연출 | TV/프로젝터 | 🟡→🔄(⑤-b 재설계) |
| ERG 그리드 | `/class/race/run?event={id}` | 데이터 중심 실시간 그리드 | TV(서브)/코치 | 🟡 |
| 결과 리더보드 | `/class/race/result?event={id}` | 다각도 결과·포디움 | TV | 🟡 |
| Admin Race | `/admin/race` | 이벤트 CRUD·기기 관리·기록 통계 + Control read-only 임베드 | 관리자 | 🟡 |

### 5.1 Coach Control (`/coach/race/control`)
- **진입**: 세션 보드 표준경로(`?event_id` 딥링크) 또는 허브 탭
- **패널 구성**: ① 기기(online 필터, 스캔/일괄연결/어댑터 표시/연결 상태) ② 편성(모드별 4b UI) ③ 진행(상태머신 버튼: Lobby→Countdown→Stop→Reset, 경과 타이머, 레인 미니 모니터) ④ 종료(`[레이스 룸 종료]`=disconnect-all+idle 복귀)
- **데이터**: `fn_prepare_race_session`(진입) / Python REST(제어) / `useRaceRealtime`(모니터) / `race_teams` CRUD(팀전)
- 권한: 코치=배정 세션만, admin=전체(RPC 내부 검증, R-7)

### 5.2 ERG 그리드 (`/class/race/run`)
- 레인 타일 그리드(2×4~4×5 자동 배치): 회원명/거리/500m 페이스/watts/SPM/HR/칼로리, 순위 정렬 옵션
- 팀전=팀 섹션 그룹핑+합산 헤더(DB `race_teams` 이름·컬러 동적 매핑 — 하드코딩 금지, M-5), 단체전=공동 누계 헤더
- 갱신: Broadcast 0.3s + rAF 숫자 트윈. TV 16:9 대형 타이포

### 5.3 결과 리더보드 (`/class/race/result`)
- 소스: `race_records`(자동 적재분) — live_state 사용 금지(이미 삭제됨)
- **다각도 컴피티션(ErgZone 벤치마크)**: 정렬 축 전환 — 완주시간(기본)/Distance/Max Watts/Avg Watts/Max HR/Calories + `is_pr` 배지 강조
- 모드 변형: 개인=포디움+전체 순위 / 팀=팀 포디움+기여도 / 단체 A=달성 헤더+기여 리스트 / 단체 B=통합 랭킹(히트 배지)
- 포디움 시퀀스 연출은 ⑤-b.6

### 5.4 Admin Race (`/admin/race`)
- 3탭: 이벤트(CRUD·시리즈 뷰) / 기기(Web BT 등록 §1.3, 상태·모드 모니터) / 통계(기록 추이·참여율)
- Coach Control 임베드는 **read-only**(제어 버튼 비활성) — 운영 주체는 코치(R-1)

---

## ⑤-b 2.5D 카트레이싱 스타일 연출 설계 🔄

> 레이스 뷰를 "데이터 시각화"에서 **카트 레이싱 게임 문법**으로 재설계한다. 검증된 현행 기술 패턴(CSS3D+Canvas 하이브리드, rAF, LERP, React 우회 — `useRaceAnimator` 승계)은 유지하고 표현 계층만 전면 교체. 러버밴딩 없는 실거리 기반(R-3)은 절대 불변.

### 5b.1 화면 레이아웃 (와이어 수준)
```
┌────────────────────────────────────────────────────────────────┐
│ [이벤트명 · 모드 배지 · HEAT n/N]         [경과 00:00 · 목표 2000m] │  ← 톱바 (6vh)
├──────────┬─────────────────────────────────────────────────────┤
│ 순위 스택  │                    하늘/원경 레이어 (패럴랙스)           │
│ ①🟠 김철수 │      ─────────── 곡선 원근 트랙 ───────────           │
│   +0.0m   │   🚣 레인1  ~~~~~~ (수면 Canvas 이펙트) ~~~~~~        │
│ ②🔵 이영희 │     🚣 레인2   ← 카트(로워/보트) 스프라이트, SPM 동기    │
│   -12.4m  │   🚣 레인3        1위 크라운+글로우                    │
│ ③🟢 …     │     🚣 레인4      추월 순간 스피드라인                  │
│ (좌측 22%) │              결승선(체커 패턴) / 구간 배너               │
├──────────┴─────────────────────────────────────────────────────┤
│ ▶ 미니맵 진행바: 출발┃──●──●───●──────●──────┃결승  (레인 도트)      │  ← 8vh
│ 포커스 레인: 1:52.3/500m ▓▓▓▓▓░░ 파워 게이지 · 28 SPM · ❤154        │  ← 8vh
└────────────────────────────────────────────────────────────────┘
```
- 16:9 고정 설계(TV/프로젝터), 3m 시청거리 기준 최소 텍스트 32px, 핵심 수치 64px+
- 상태별 화면: `lobby`=Starting Pen(카트 도열+이름 플레이트+아이들 애니메이션) / `countdown`=신호등 오버레이 / `racing`=본 화면 / `finished`=체커기→포디움
- 와이어의 🚣(로워/보트)는 `water` 테마 예시 — 트랙·카트·이펙트는 **연결 기기 타입에 따라 테마 전환**(§5b.3b, R-11): bike=로드+사이클리스트, skierg=설원+스키어, run=트랙+러너

### 5b.2 트랙·카메라 연출 규칙
| 요소 | 규칙 |
|---|---|
| 트랙 | CSS 3D: `perspective: 800px; perspectiveOrigin: 50% 30%; rotateX(25deg)`(현행 검증값 승계) + 🔄 좌우로 완만히 굽는 **곡선 세그먼트**(트랙을 3~5개 베지어 구간으로 정의, 진행률→구간 좌표 매핑 테이블 사전 계산). 위치 = `정규화 진행률 x(0..1)` → 트랙 좌표 — **항상 실거리 비례**(R-3) |
| 레인 | 최대 20레인. 8레인 초과 시 트랙 2단(상/하단) 분할 또는 포커스 그룹(선두 8) + 미니맵 전체 표시 |
| 카메라 | 고정 앵글 기본. 🔄 **소프트 팔로우**: 선두 그룹 평균 진행률에 따라 배경 패럴랙스 레이어(하늘/원경/관중석)를 역방향 스크롤 — 카트가 트랙 안에서 이동하되 "전진감"은 배경이 만든다 |
| 추월 강조 | rank 변동 감지(프레임 간 비교) → 추월 카트에 **스피드라인 스프라이트 0.8s + 스케일 펄스(1.0→1.08→1.0)** + 순위 스택 행 스왑 애니메이션(300ms). 동시 다발 시 최상위 1건만 강조(연출 과밀 방지) |
| 1위 표식 | 크라운 스프라이트(카트 상단 부유+회전) + 팀/개인 컬러 글로우(`drop-shadow` 2겹). rank 1 이탈 시 0.5s 페이드로 이양 |
| 구간 배너 | 진행률 25/50/75% 통과 시 상단 배너 슬라이드(“1000m — 김철수 선두!”) 2.5s. 단체전 A안은 마일스톤 게이트 통과 연출로 대체 |
| 트랙 이펙트 | Canvas 2D 별도 레이어: 부유 파티클 ~30개(현행 waterFloat 승계) + 🔄 카트 후방 트레일 파티클 — 스트로크 레이트 비례 방출률. **파티클 종류·색은 테마 팔레트(§5b.3b)를 따름**: water=물보라 웨이크 / road=더스트 라인 / snow=스노 스프레이 / track=더스트 |
| 페이서 가상 레인 ⏳ | `virtual_lane` 수신 레인은 **고스트 스타일** 렌더: 카트 스프라이트 반투명(opacity ~0.45) + `race/fx-pacer-ghost` 오버레이 + 이름 플레이트 **"PACER"**(팀 컬러 대신 중립 회백 톤). 위치 계산은 실레인과 동일(실거리 비례 — R-3), 단 추월 강조·크라운·순위 스택·결과 대상에서 제외 — 렌더 전용(G-10, §4b.5) |

### 5b.3 스프라이트 연출 규칙 (SPM 동기화)
- **스트로크 애니메이션**: 로워 캐릭터 8~12프레임 스프라이트시트를 CSS `steps(N)` 재생. **재생 주기 = 실측 SPM 동기**:
  `animation-duration = 60 / max(currentSPM, 6) 초` — rAF 콜백에서 LERP된 `currentSPM`으로 `style.animationDuration` 직접 갱신(React 우회). SPM<6(사실상 정지)이면 IDLE 루프(2프레임 숨쉬기)로 전환
- **상태별 시트**: `stroke`(본 동작 8~12F) / `idle`(2F) / `celebrate`(완주 4F, 팔들기) / `offline`(1F grayscale — CSS filter로 처리, 별도 시트 불필요)
- **팀 컬러 변형**: 스프라이트는 SVG 1벌 제작, 유니폼·보트 영역을 `var(--team-color)`로 칠함 → **팀 팔레트 8색이 시트 8벌이 아닌 CSS 변수 1개로 해결**. 래스터 시트로 굽는 경우에만 8색 사전 베이크
- **부하 규칙**: 스프라이트 이동은 `transform: translate3d`만 사용(레이아웃 유발 속성 금지), 레인당 DOM 노드 ≤ 6개, 20레인×60fps에서 스타일 쓰기 ≤ 120회/frame

### 5b.3b 기기 타입별 비주얼 테마 🔄 【연결 기기에 따른 디자인 변경 — R-11】
> 어떤 기기가 연결됐는지에 따라 레이스 화면의 트랙·캐릭터·이펙트가 달라진다. 테마는 **표현 계층에만** 적용 — 위치 계산(실거리 R-3)·집계·상태머신은 전 테마 동일.

**테마 결정 규칙 (2단계)**
1. **트랙 테마** = `race_events.event_type` 기준 (이벤트 생성 시 확정, 화면 최상위 `data-race-theme` 속성 1곳으로 전환):

| event_type | 테마 키 | 트랙 바닥 | 배경 무드 | 트레일 이펙트 | 카트 베이스 |
|---|---|---|---|---|---|
| `rowing` | `water` | 수면 타일(`track-water-tile`) | 하늘/산등성이/관중석 | 물보라 웨이크(`fx-wake`) | 보트(`boat-single/team`) |
| `bike` | `road` | 아스팔트 로드 타일(`track-road-tile`) | 도로변/스카이라인 틴트 | 더스트 라인(`fx-dust`) | 자전거 자체(별도 탈것 없음) |
| `skierg` | `snow` | 설원 타일(`track-snow-tile`) | 설산/한랭 틴트 | 스노 스프레이(`fx-snowspray`) | 스키어 자체 |
| `run` | `track` | 러닝 트랙 레인 타일(`track-lane-tile`) | 스타디움 틴트 | 더스트(`fx-dust` 재사용) | 러너 자체 |
| `other` | `track` 폴백 | 러닝 트랙 재사용 | 중립 틴트 | 더스트 | 제네릭 러너 |

2. **레인 캐릭터** = 각 레인에 배정된 `pm5_devices.device_type` 기준 — `rower`→로워, `bike`→사이클리스트, `skierg`→스키어, `treadmill`→러너, `other`→제네릭. **혼합 편성 허용**: 트랙 테마는 event_type 하나로 고정하되 레인마다 다른 기기 캐릭터가 공존 가능(예: rowing 이벤트에 bike 참가 → 수면 트랙 위 사이클리스트, 데이터는 동일 집계).

**애니메이션 동기 지표 (기기별)**

| device_type | 루프 동작 | 동기 지표 | 주기 공식 |
|---|---|---|---|
| `rower` | 스트로크(캐치→드라이브→리커버리) | SPM | `60 / max(SPM, 6)`s (§5b.3) |
| `bike` | 페달 회전 | RPM(케이던스) | `60 / max(RPM, 20)`s — 1프레임=반회전 기준 배속 |
| `skierg` | 더블폴 풀다운 | SPM | 로워와 동일 공식 |
| `treadmill` | 러닝 사이클 | 케이던스(spm 필드 유용) | `120 / max(cadence, 30)`s (1루프=2보) |

- PM5 Broadcast 페이로드의 `spm` 필드는 기기 종류별로 SPM/RPM/케이던스를 담는다(Concept2 규격 그대로) — 파서 분기 불필요, 화면에서 단위 라벨만 교체(`SPM`/`RPM`/`SPM`/`CAD`)
- **구현 규약**: 테마 전환은 CSS `data-race-theme=water|road|snow|track` + 테마 토큰 세트(`--bcl-race-surface`, `--bcl-race-trail`, `--bcl-race-bg-tint` — §5b.6)로만 처리. 컴포넌트 코드에 테마 조건분기 하드코딩 금지. 캐릭터 스프라이트는 `race/char-{type}-{state}` 네이밍 규칙으로 device_type→에셋 자동 매핑
- 배경 3레이어(`bg-sky/ridge/crowd`)는 공용 1벌 + 테마별 틴트 토큰으로 처리(에셋 4벌 제작 금지 — 유지비 통제). 단 트랙 바닥 타일은 테마별 별도 제작(§5b.7)
- HUD·순위 스택·미니맵·신호등·체커기·포디움은 전 테마 공용(테마 색 틴트만 상속)

### 5b.4 신호등·체커기·포디움 시퀀스
| 시퀀스 | 연출 |
|---|---|
| **신호등(countdown)** | 중앙 상단 3구 신호등: 5초 카운트 — 5·4·3(빨강 순차 점등, 비프 저음) → 2·1(황색, 비프 고음) → **GO(녹색+화면 플래시+출발음)**. 신호등 점등과 `racing` 전이 시각은 Python `race_start` broadcast 기준(클라이언트 로컬 타이머 금지 — 다중 화면 동기, 수용 3-8) |
| **체커기(finish)** | 1위 결승 통과 순간: 결승선 체커 패턴 웨이브 애니메이션 + 체커기 스프라이트 스윙 + 통과 카트 셀레브레이트 시트 전환. 이후 완주자마다 축소판 반복 |
| **포디움(finished)** | 전원 완주/stop 5s 후 자동 전환: ① 트랙 페이드아웃 ② 포디움 무대 라이즈(2-1-3 순 등장, 카트+이름+기록) ③ 콘페티 파티클(Canvas) ④ `is_pr` 보유자 PR 배지 팝. 8s 후 결과 리더보드 화면으로 자동 전환(`/class/race/result`) — 수동 조작 없는 TV 무인 흐름 |
| **단체전 달성(A안)** | `target_reached` 수신 → 골 게이트 폭발 연출+전원 셀레브레이트+대형 “10,000m ACHIEVED” 타이포 → 총 기여 리스트 롤업 |

### 5b.5 HUD 구성 (카트게임 문법)
| HUD | 위치 | 내용 | 갱신 |
|---|---|---|---|
| 순위 스택 | 좌측 22% | 순위·컬러 도트·이름·선두와의 격차(m). 순위 변동 시 행 스왑 300ms | rank 변동 시(저빈도 setState 허용 영역) |
| 미니맵 진행바 | 하단 | 트랙 전장 1D 축약, 레인별 도트 + 마일스톤 마커. 단체B=고스트 마커(이전 히트 best) | rAF |
| 포커스 게이지 | 하단 | 선두(또는 코치 지정 레인) 500m 페이스·파워 게이지(0~500W 바)·SPM·HR | rAF |
| 팀전 변형 | 좌측 스택→**팀 합산 게이지 대결**(팀 컬러 수평 바 + 실시간 합산 수치), 하단에 팀 내 개인 미니 스트립 | rAF |
| 단체전 변형 | 중앙 상단 **대형 달성률 게이지+누계 카운터**(이월 포함), 순위 스택 대신 개인 페이스 스트립 | rAF |
| 상태 배지 | 우상단 | `[Reconnecting]`/`[Offline]` 레인 수, Broadcast/폴링 모드 표시 | 이벤트 시 |

### 5b.6 기술 아키텍처 (검증된 현행 패턴 승계)
- **스테이지 렌더 = three.js 0.185 WebGL**(`RaceStage3D`) — CSS 배경(수영장 아레나) 위에
  정사영(Orthographic) 카메라를 **스크린 공간 1:1**(px 단위 frustum)로 두고 캐릭터(GLB 3파트
  조립: 보트+오어+리깅 캐릭터, Draco)·이펙트(글로우/스트릭/오로라)·배너를 합성. 지오메트리는
  `poolLaneX/POOL(%)`을 그대로 사상해 DOM 구현과 구도 동일(R-3). WebGL 미지원 TV는 빈
  스테이지 폴백(HUD는 동작). 그 외 화면(HUD·순위 스택·게이지)은 DOM — PixiJS 등 별도
  렌더 엔진 추가 도입 금지(three.js 단일)
- **rAF 단일 루프**: `useRaceAnimator`(HUD/DOM) + `RaceStage3D` 자체 루프 — `Map<serial, …>`를
  `useRef`로 보관, 프레임마다 LERP(`x: 0.08 / power: 0.15 / spm: 0.1` — 검증 계수 승계) 후
  **DOM/3D 오브젝트 직접 조작으로 React 리렌더 우회**. `useState`는 순위 스택·배너 등 저빈도 UI만.
  위상 누적(`phase += dt/dur`) 규칙 — 절대 위상(t/dur)은 SPM 변동 시 점프 금지
- **단절 처리**: offline/disconnected 레인은 LERP 스킵(현행) + grayscale filter
- **성능 게이트**: 20레인 60fps(프레임 16.6ms 내), 시뮬레이터 2Hz 입력→끊김 없는 보간(수용 3-2), 장시간(30분) 레이스 메모리 안정
- **토큰 연동**: 배경·트랙·HUD 색은 `--bcl-bg/--bcl-surface/--bcl-accent(#FF6A00)/--bcl-text` + Race 전용 확장 `--bcl-race-team-1..8` + **테마 토큰 세트** `--bcl-race-surface/--bcl-race-trail/--bcl-race-bg-tint`(`data-race-theme=water|road|snow|track` 별 값 매핑 — §5b.3b, 12-design-system에 등록). Lexend + 숫자는 tabular-nums

### 5b.7 에셋 매니페스트 — 【전 에셋 = 클로드 디자인 제작】
> 원칙: **SVG 우선**(팀 컬러 = CSS 변수 1벌), 프레임 애니메이션만 스프라이트시트. 형태 언어·팔레트는 12-design-system 토큰과 일관(#FF6A00 accent, 4px 그리드, radius 8px 계열의 라운드 지오메트리). 네이밍 `race/{category}-{name}[-{variant}]`.

| 에셋명 | 유형 | 규격 (px · 프레임) | 팀컬러 변형 | 용도 | 제작 |
|---|---|---|---|---|---|
| `race/char-rower-stroke` | SVG 스프라이트시트 | 프레임 160×120 × **10F** (시트 1600×120) | `var(--team-color)` 영역(유니폼·오어) | 로잉 스트로크 루프(SPM 동기) | 클로드 |
| `race/char-rower-idle` | SVG 스프라이트시트 | 160×120 × 2F | 동일 | 대기/정지 | 클로드 |
| `race/char-rower-celebrate` | SVG 스프라이트시트 | 160×120 × 4F | 동일 | 완주 세리머니 | 클로드 |
| `race/boat-single` | SVG | 220×80 · 1F | 선체 `--team-color` | 개인전 카트(보트) 베이스 | 클로드 |
| `race/boat-team` | SVG | 320×100 · 1F | 동일 | 팀전 합산 보트(아바타 스택 슬롯 4) | 클로드 |
| `race/char-bike-pedal`·`-idle`·`-celebrate` | SVG 스프라이트시트 | 160×120 × 8F/2F/4F | 동일(저지·프레임) | BikeErg 페달 루프(RPM 동기) 🔄 R-11 정식 | 클로드 |
| `race/char-ski-pull`·`-idle`·`-celebrate` | SVG 스프라이트시트 | 160×120 × 8F/2F/4F | 동일(수트·폴) | SkiErg 더블폴 루프(SPM 동기) 🔄 R-11 정식 | 클로드 |
| `race/char-runner-run`·`-idle`·`-celebrate` | SVG 스프라이트시트 | 160×120 × 8F/2F/4F | 동일(유니폼) | 트레드밀/제네릭 러닝 루프(케이던스 동기) 🔄 | 클로드 |
| `race/track-water-tile` | SVG 타일 | 512×256 반복 타일 | — (`--bcl-race-surface`) | 수면 트랙 바닥 (`water` 테마) | 클로드 |
| `race/track-road-tile`·`race/track-snow-tile`·`race/track-lane-tile` | SVG 타일 | 512×256 반복 타일 each | — (`--bcl-race-surface`) | 아스팔트/설원/러닝트랙 바닥 (`road`/`snow`/`track` 테마) 🔄 R-11 | 클로드 |
| `race/bg-sky`·`race/bg-ridge`·`race/bg-crowd` | SVG 레이어 3장 | 1920×360 each | — | 패럴랙스 배경(원경→근경) | 클로드 |
| `race/fx-wake` | Canvas 파티클 정의(코드) | 파티클 4~8px | 팀컬러 틴트 | 카트 후방 물보라 (`water` 테마) | 클로드 |
| `race/fx-dust`·`race/fx-snowspray` | Canvas 파티클 정의(코드) | 파티클 3~6px | `--bcl-race-trail` | 더스트(`road`/`track`)·스노 스프레이(`snow`) 트레일 🔄 R-11 | 클로드 |
| `race/fx-speedline` | SVG | 240×120 · 1F(불투명도 애니) | 팀컬러 틴트 | 추월 강조 | 클로드 |
| `race/fx-pacer-ghost` | SVG(+CSS filter) | 240×100 · 1F(불투명도 펄스) | — (중립 회백 고정) | 페이스보트 가상 레인 고스트 오버레이 + "PACER" 이름 플레이트 ⏳ (G-10, §4b.5) | 클로드 |
| `race/fx-crown` | SVG | 64×48 · 1F(CSS 부유) | — (골드 고정) | 1위 크라운 | 클로드 |
| `race/fx-glow` | SVG(radial) | 280×140 | `--team-color` | 1위/포커스 글로우 | 클로드 |
| `race/ui-trafficlight` | SVG 스프라이트시트 | 120×320 × **6F**(적3·황2·녹1) | — | 카운트다운 신호등 | 클로드 |
| `race/ui-checkerflag` | SVG 스프라이트시트 | 200×160 × 4F | — | 결승 체커기 스윙 | 클로드 |
| `race/ui-finishline` | SVG | 레인폭×24 체커 패턴 | — | 결승선(웨이브 애니는 CSS) | 클로드 |
| `race/ui-podium` | SVG | 900×420 | — | 포디움 무대(2-1-3단) | 클로드 |
| `race/ui-milestone-gate` | SVG | 160×280 | — | 단체전 마일스톤 게이트 | 클로드 |
| `race/ui-minimap-dot`·`race/ui-ghost-marker` | SVG | 24×24 / 24×32 | 팀컬러/회색 | 미니맵 도트·고스트 기준선 | 클로드 |
| `race/emblem-event` | SVG | 240×240 | — | 이벤트 엠블럼(결과·포디움 헤더) | 클로드 |
| `race/badge-pr` | SVG | 96×96 | — (골드/accent) | PR 배지(결과·포디움 팝) | 클로드 |

**팀 컬러 팔레트(8색, 12-design-system 등록)**: `--bcl-race-team-1..8` = `#FF6A00`(accent)·`#3B82F6`·`#22C55E`·`#F59E0B`·`#8B5CF6`·`#EC4899`·`#14B8A6`·`#EF4444` — `race_teams.team_color` 선택지·스프라이트 변수·HUD 도트가 전부 이 8값만 사용(현행 TRACK_COLORS 승계·토큰화).

### 5b.8 코스 레이아웃 2모드 · 라이브 카메라 연출
> 코스 레이아웃 소스 = `race_events.course_layout`(**생성 시 결정** — admin 모달/`fn_prepare_race_session` `p_options.course_layout`, 히트 전환 시 이전 히트 승계. mig 20260719050000). 해석 우선순위: URL `?course=h|v`(데모/QA 오버라이드 한정) > `course_layout` > `vertical` 폴백. **두 모드는 기능 동등** — 허용 분기는 표시 지오메트리(카메라 각·레인 배치·배너/레일 위치)만, 위치 계산(실거리 R-3)·집계·순위·상태머신 분기 금지. 레이스 기능 추가/변경 시 두 레이아웃 모두 반영·검증(CLAUDE.md 불변 규칙).

| 요소 | 규칙 |
|---|---|
| `vertical`(기본) | 측면 뷰 — 원근 레인 적층, 보트 3/4 측면 프로파일. 순위 diff는 상단 배지 레일 |
| `horizontal` | 사선 탑뷰(준-조감) — 좌→우 진행, 레인 세로 적층·전 레인 균일 스케일. 배지 레일 대신 **순위 diff 문장(紋章) 배너**: 보트 선수(뱃머리) 부착 페넌트(레인 메달리온+레인별 문양 변주), 본문 diff 텍스트는 rAF 루프 갱신 |
| 배틀 캠(2분할 PiP) | 최소 간격 ≤4m 경합 페어를 별도 PiP 레이어로 — **경기장 정중앙 2분할 패널**, 패널당 해당 레인의 캐릭터+보트+오어 **전면 풀샷**(레이어 격리, 옆 레인 제외). 출발 25m 이후 발동, 6s 표시/15s 주기(표시 중 페어 고정). **첫 피니셔 발생 후 신규 발동 금지**(피니시 와이드 보호); 간격 2배 초과·페어 피니시·피날레 진입 시 페이드아웃 |
| 피날레 캠 | 선두가 목표 95% 통과~첫 결승선 도달 전까지 1위 단독 클로즈업(1.7x 줌+소프트 팬). 첫 도착 순간 와이드 복귀 — 피니시 세리머니는 전체 화면 관전 |
| 페이스 티어 오로라 | 500m 페이스 임계 돌파 시 캐릭터+보트 글로우: ≤1:45 파랑(`--bcl-info`) → ≤1:40 초록(`--bcl-success`) → ≤1:35 노랑(`--bcl-warning`) → <1:30 빨강(`--bcl-danger`). 검수: 데모 `?glow=1`(레인별 고정 페이스로 전 티어 노출) |

---

## ⑥ 통합 계약

### 6.1 세션 연동
- 표준 진입: 코치 세션 보드 → `fn_prepare_race_session(p_session_id, p_race_format, p_options)` — 재개/생성 판단, 세션당 활성 이벤트 1개(R-8, 부분 유니크+advisory lock)
- 이벤트→세션 역참조로 결과 화면·Admin 통계가 수업 맥락(일자·코치·참가자) 표시

### 6.2 퍼포먼스 이력 연결
- `race_records` 적재 완료 → 트리거 `trg_race_records_benchmark`: 이벤트의 `target_distance_m`이 벤치마크 정의(`benchmark_definitions` — 예: Row 500m/2000m)와 매칭되면 `member_benchmark_results` INSERT(`source='race'`, race_event 연동 컬럼) + PR 재판정(metric_type=time, 낮을수록 우수) 🔄
- 회원 노출: `/apps` 퍼포먼스 허브(03 문서)·코치 퍼포먼스 프로필(`fn_get_member_performance_profile`)에서 Race 기록이 벤치마크와 동일 타임라인에 표시. 배지 연동(⏳): `fn_evaluate_badges`가 race PR을 판정 이벤트로 수신

### 6.3 RLS·보안 계약 (05_race.sql)
| 테이블 | SELECT | INSERT/UPDATE | DELETE |
|---|---|---|---|
| `race_events`·`race_teams`·`race_records` | authenticated + **Class 포털 공개 표면은 05 문서 §6의 anon 예외 화이트리스트** | admin+coach | admin |
| `race_live_state`·`race_recordings` | authenticated (live_state는 Class 공개 표면 포함) | Python(SRK, RLS bypass) / coach·admin | Python·admin |
| `pm5_devices` | admin+coach | admin(등록)·Python(상태) | admin |
- Python SRK는 RLS bypass — 대신 CORS 내부망 제한 + 컨테이너 env 격리(R-6). 게이트: `.next/static`에 SRK 0건.

### 6.4 시뮬레이터 (L1 검증 계약)
- `simulator.py`: 가상 레인 N개 생성(synthetic `SIM-{n}` device — M-6), 시나리오 주행 또는 기존 JSONL **Replay**로 3경로 전부 실구동(Broadcast·스냅샷·레코딩·적재)
- 용도: 하드웨어 없는 CI/개발 검증(수용 L1 전 항목), 2.5D 연출 개발(⑤-b), 재구축 Phase 4의 데모·리허설
- 계약: 시뮬레이터 경로와 실장비 경로는 **파서 이후 코드 100% 공유**(분기 금지) — 시뮬 통과=파이프라인 로직 검증 성립

---

## ⑦ 미완·확장 로드맵

### 7.1 P21 Phase 4 — 실장비 수용검증 🟡 (최우선 잔여)
- 코드 완료 상태이나 **실장비 검증(L2~L4) 미실행**. 재구축에서는 ⑧ 게이트로 정식 편입 — "빌드 통과 ≠ 운영 수용"
- 선행 준비물: PM5 실기기·동글 2~3개·매장 Wi-Fi, 체크리스트 Run Log 누적 기록

### 7.2 Personal Recording Mode ⏳ (후속 Phase)
- 개인 가외 운동(Open Gym) 기록: 기기 부착 고정 QR(`qr_identifier`) 스캔 → `/apps/erg/bind?device_id={uuid}` → 모드락 판정(④.2) → `current_mode='personal_recording'` → Python 수집 시작 신호 → JSONL 기록+회원 앱 Broadcast → 종료 시 `race_records(event_id=NULL)` 적재
- 스키마 선반영: `race_records.event_id` NULLABLE, `pm5_devices.current_mode`·`qr_identifier` — 본 설계에 이미 포함(후속 Phase는 앱 화면+Python 신호 API만 추가)
- Racing 우선권: 코치 setup이 Personal 세션을 강제 종료 가능(④.2)

### 7.3 다중시설 스코핑 🔄 (현행 단일시설 전제 해소)
- as-is 결함: `/api/race/status` 폴백·Class 화면이 시설 무관 전역 조회. to-be: ① Python 인스턴스 = 시설당 1개(env `FACILITY_ID`) ② `/api/race/status?facility_id` 필수 ③ Class 화면은 URL `?event={id}` 명시 우선, 폴백은 시설 스코프 ④ `pm5_devices.facility_id NOT NULL`
- 채널명 `race:{event_id}`는 이벤트 단위라 다중시설 자연 분리 — 변경 불요

### 7.4 기타 확장 (우선순위 낮음)
- 종목 확장: treadmill 등 신규 BLE 장비(`device_type` 개방형 CHECK — 파서만 추가)
- JSONL Supabase Storage 아카이빙, 회원 앱 관전 모드(자기 레인 포커스), 시즌 리그(이벤트 시리즈 집계는 §4b.3 B안 구조 재사용)

---

## ⑧ 수용 기준 — race-acceptance-checklist L1~L4 재구축 게이트 편입

> 원본: `.docs/testing/race-acceptance-checklist.md` (34항목). 재구축에서는 아래 요약 게이트를 **11-deployment-cutover Phase 4의 완료 조건**으로 정식 편입한다. "코드 빌드 통과만으로 운영 수용 완료로 판단하지 않는다."

### 8.1 검증 등급
| 등급 | 환경 | 장비 | 도구 |
|---|---|---|---|
| **L1 시뮬레이터** | 개발 PC | 없음 | `simulator.py` JSONL Replay |
| **L2 단일 장비** | 개발 PC + 데모 PC | PM5 1대 + 동글 1개 | Python 직접 실행 |
| **L3 다중 장비** | 매장 현장 | PM5 4~8대 + 동글 2개 | 매장 Wi-Fi |
| **L4 정원 운영** | 매장 현장(출시 전) | PM5 8~20대 + 동글 2~3개 | Class TV + 다중 클라이언트 |

### 8.2 영역별 핵심 항목 요약 (34항목 → 요약 표, 상세는 원본 체크리스트 유지)
| 영역 | 핵심 항목 (요구 등급) |
|---|---|
| 1. BLE 스캔/연결 (6) | Web BT 등록·시리얼 파싱 fallback·명단 기반 연결·미등록 제외(L2) / 8대 멀티동글 무스로틀(L3) / 20레인 drop 0건·1분(L4) |
| 2. 레이스 운영 (8) | 이벤트 생성+포맷 설정(L1) / 자동 레인 배정·READY 스킵·GO 0m 시작·live_state 삭제(L2) / QR 자율 배정·일괄 BLE 해제(L3) |
| 3. 파이프라인 (8) | LERP 60fps·지연 Mock 전진 배지(L1) / 0.3s 도달·5s UPSERT·재접속 점프 복원·단절 Grayscale(L2) / 절전 Offline·3클라이언트 동기(L3) |
| 4. 레코딩/결과 (7) | 결과 화면 다각도 정렬(L1) / JSONL 스키마·recordings 메타·records 자동 적재·PR 판정(L2) / 30일 자동 삭제(L4) |
| 5. 종료/정리 (5) | live_state 0건·recorder close·SIGINT flush(L2) / 10회 연속 메모리·BLE 연결 누수 0(L3) |
| 6. 권한/보안 (4) | SRK 번들 0건·RLS 정책(L1) / CORS 내부망·recordings 권한 분리(L2) |
| 🔄 신규 추가 (모드 3종) | 팀 합산 정확 일치(3+3 검증, L1) / 단체 A 달성률·이월 정확(L1) / 단체 B 히트 전환·통합 랭킹·best 중복 제거(L1) / 모드별 결과 적재 스키마 검증(L2) |

### 8.3 판정 기준 (재구축 게이트)
| 게이트 | 조건 | 차단 대상 |
|---|---|---|
| **G1 — Phase 4 개발 완료** | L1 100% PASS (시뮬레이터, CI 반복 실행 가능) + 신규 모드 항목 포함 | Phase 4 종료 선언 |
| **G2 — 현장 반입** | L2 100% PASS | 매장 설치 |
| **G3 — 운영 개시** | L3 ≥ 90% PASS (장비 가용성 한계 인정) | 정규 수업 투입 |
| **G4 — 출시 확정** | L4 통합 검증 ≥ 1회 + Run Log 누적 ≥ 1회 | 전체 서비스 컷오버(11 문서 Phase 5) |

---

## 부록 A. 관련 파일 맵 (as-is → to-be 참조)
| 영역 | as-is 경로 | to-be 비고 |
|---|---|---|
| Python | `race/main.py`·`pm5_manager.py`·`pm5_parsers.py`·`pm5_spec.py`·`recorder.py`·`simulator.py` | 구조 승계, §2.3 🔄 파라미터 확장 |
| 훅 | `src/hooks/useRaceRealtime.ts`·`useRaceAnimator.ts` | 패턴 승계(LERP 계수·rAF·ref 맵), group 모드 합산 셀렉터 추가 |
| 화면 | `src/app/coach/race{,/control}`·`src/app/class/race/{view,run,result}`·`src/app/admin/operations/race` | to-be 라우트: `/admin/race`(계약 IA), 2.5D는 ⑤-b 재설계 |
| DDL | `supabase/migrations/20260705100000_p2*` 등 | to-be: `rebuild/sql/05_race.sql`(본 문서 스키마 반영) |
