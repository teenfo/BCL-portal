# BCL Portal – Race 시스템 기획서

> **Status**: Approved (Architecture Review Completed)
> **Author**: Architect (Opus/Gemini)
> **Created**: 2026-02-19
> **Last Updated**: 2026-02-21 (Session 8 — Architecture Review 반영)
> **Related**: `.docs/planning/remaining-improvements.md`, `.docs/archive/technical/race/`

---

## 1. 아키텍처 오버뷰 (명확한 역할 분담)

이 레이스 프로그램의 가장 중요하고 핵심적인 전제는 다음과 같습니다.

1. **Python (하드웨어 브릿지)**
   - 오직 **장비(PM5)의 BLE 연결 및 실시간 데이터 수신**만을 담당합니다.
   - 복잡한 레이스 로직에 관여하지 않으며, 순수하게 기계의 상태만 브로드캐스트합니다.
   - **다중 기기 및 동글 연결**: 레이스는 최대 **20개**의 기기까지 연결될 수 있습니다. 이를 위해 파이썬 시스템은 단일 블루투스를 넘어서 여러 개의 동글 인식을 통해 대규모 Connection을 스로틀링 없이 감당할 수 있도록 분산/비동기 설계가 포함됩니다.
   - **인증**: Python 서버는 Coach PC 내부에서만 구동되는 **Server-Side Agent**입니다. Supabase 접근 시 **Service Role Key**를 Docker 환경 변수로 주입하여 사용합니다. 클라이언트(브라우저)가 아닌 로컬 서버이므로 프로젝트 규칙 5조("Client에서 Service Role Key 사용 금지")에 저촉되지 않습니다. CORS는 `localhost` 및 내부 네트워크만 허용합니다.
2. **Next.js Admin (머신 정보 관리)**
   - 이미 어드민 화면에 각 머신(로잉 머신, 스키용 등)의 기본 정보(`pm5_devices` 등)가 등록 및 관리되고 있습니다.
3. **Next.js Portal (레이스 본진)**
   - 파이썬에서 보내주는 실시간 데이터를 수신하여, 실제 **레이싱 뷰(2.5D) 렌더링 및 진행 논리**를 전담합니다.

---

## 2. 개요 및 핵심 난이도

**목적**: 기존 독립 서버에서 파편화되어 동작하던 레이스 시스템을 BCL Portal (Next.js + Supabase)로 완전히 편입.

**핵심 난이도 포인트**:
1. **2.5D 레이스 화면 (⭐⭐⭐⭐⭐)**: 원근감, 애니메이션 보간(LERP), 캐릭터 동기화, 이펙트 처리가 요구됨.
2. **실시간 데이터 파이프라인 (⭐⭐⭐⭐)**: PM5 BLE → Python 로컬서버 → Supabase Realtime → 클라이언트로 0.3초 내 스트리밍.

---

## 3. 세부 시스템 설계 (To-Be)

### 3.1 아키텍처 및 상태 흐름
* **로컬 통신 (Python 서버)**: Coach PC에서 실행. `Bleak`로 PM5 스캔 및 구독, BLE 데이터를 파싱하여 Supabase Realtime 채널(`race:{event_id}`)로 Broadcast 전송. 실시간 원시 데이터는 `.jsonl` 형태로 로컬 레코딩 보관.
* **프론트엔드 (Next.js)**: `useRaceRealtime` 훅으로 상태 구독.
* **레이스 운영 주체**: Coach (`/coach/race/control` 접속으로 제어 수행). Admin은 읽기 전용으로 임베드 모니터링 가능.

### 3.2 데이터 흐름도 (Broadcast vs DB 분리)

Python에서 프론트엔드로의 데이터 전달 경로는 **2개로 명확히 분리**됩니다:

```
[PM5 BLE] → [Python 서버] 
    │
    ├── (경로 1: 실시간 렌더링용 — Broadcast)
    │   └── Supabase Realtime Broadcast → race:{event_id} 채널
    │       └── Client (useRaceRealtime 훅) → LERP 애니메이션 렌더링
    │       ※ DB에 기록하지 않음. 순수 메시지 전달.
    │
    ├── (경로 2: 레이스 상태 스냅샷 — DB UPSERT)
    │   └── race_live_state 테이블에 5초 간격 스냅샷 UPSERT
    │       └── 용도: 중도 접속자/재접속 시 현재 레이스 상태 복원
    │       ※ 레이스 종료 시 해당 event_id 의 row 전체 삭제 (ephemeral)
    │
    └── (경로 3: 원시 기록 — JSONL 파일)
        └── 로컬 디스크에 {event_id}_{device_serial}.jsonl 파일 Append
            └── 레이스 종료 후 → 요약 추출 → race_records 테이블에 결과 저장
```

**경로 1 (Broadcast)과 경로 2 (DB)의 역할 분담:**
- Broadcast는 **0.3초 단위**의 즉각적인 데이터 전달 (렌더링)
- DB UPSERT는 **5초 단위**의 상태 저장 (재접속 복원)
- 이 두 경로가 분리되어야 재접속 시 현재 레이스 상태를 점프하여 따라갈 수 있음

### 3.3 2.5D Race Live View 애니메이션 및 동기화 (핵심)
* **대기방 게이미피케이션 (Zwift 벤치마크)**: 레이스 시작 전, 배정 완료된 참가자들의 아바타가 스타트 라인(Starting Pen)에 도열하여 대기하는 모습을 2.5D 뷰로 실감나게 연출. 그룹 레이스의 텐션과 몰입감을 극대화합니다.
* **상태 보간 (State Interpolation - LERP)**: Realtime 수신 주기(2~5Hz)로 인한 끊김 방지. `requestAnimationFrame` 내에서 이전 수신 거리와 목표 거리 간 LERP 처리 및 등속 예측(Prediction) 적용.
* **로잉 애니메이션 제어**: 실시간 SPM 에 반비례하여 CSS `animation-duration` 조절.
* **프론트엔드 상태 관리 패턴**:
  - 20개 레인의 애니메이션 동기화를 위해 **React 외부에서 rAF 루프를 운용**
  - `useRef`로 각 레인의 `{ prevDistance, targetDistance, currentLerp, spm, status }` 관리
  - `useState`는 HUD(순위표, 타이머)처럼 **저빈도 갱신이 필요한 UI에만** 사용
  - rAF 콜백 내에서 직접 DOM element의 `transform` 속성을 조작 → React 리렌더 Bypass
* **Edge Case 및 공정성 방어**: 
  - **카운트다운 전 사전 출발 처리 (Positive UX 방침)**: 사용자가 시합이 아닌 운동을 하러 온 점을 감안하여, 코치의 GO 신호나 카운트다운(5초 윈도우) 전에 장비를 미리 당기더라도 부정 출발 경고로 기분을 상하게 하지 않습니다. 시스템은 카운트다운 완료 전의 로우 데이터(거리/파워)를 단순히 합산에서 무시/스킵하고, **본 레이스(GO)가 시작된 후의 기록만 0부터 깔끔하게 산정**하여 화면에 표출합니다. (징벌적 리셋 없음)
  - 네트워크 지연(1초 이상): 앞 방향 Mock 전진 + `[Reconnecting]` 배지로 튀는 현상 완충.
  - 기기 완전 단절: 레인 Grayscale(흑백) 처리 및 강제 정지 애니메이션(IDLE).
* **렌더링 기술 선택**: **CSS 3D Transform (원근감) + Canvas 2D (물 이펙트) 하이브리드**. MVP 특성상 PixiJS의 무거운 번들을 피함.

### 3.4 로우 데이터 파서 (Raw Data Parser) 기획
다각도 컴피티션과 부정 출발 감지 기능을 구현하기 위해 Python 서버의 **BLE 특성(Characteristic) 파서**가 다음 데이터를 정밀하게 추출하여 프론트엔드로 브로드캐스트합니다.

* **스트로크 데이터 파싱 (PM5 Stroke Data - 19 Bytes)**:
  - `stroke_distance(m)`, `stroke_power(watts)`, `stroke_rate(SPM)`를 0.3초 단위로 추출하여 애니메이션과 실시간 순위 산정에 사용합니다.
* **추가 지표 파싱 (다각도 컴피티션용)**:
  - `hr_bpm` (심박수), `calories_burned` (소모 칼로리)를 추가 구독하여 개인별 한계 돌파 지표로 사용.
  - 전송 주기 내 최고 와트를 기록해두어 **Max Watts** 랭킹을 집계합니다.
* **사전 출발(Early Start) 데이터 무시 처리**:
  - `race_status`가 `READY`(카운트다운 중)일 때 파이썬 파서가 수신하는 모든 `stroke_power`와 `stroke_distance` 변화값은 **누적 합산에서 패스(Pass)** 됩니다.
  - 상태가 `RACING`(GO 신호)으로 전환된 순간부터 들어오는 데이터를 0 기준점으로 삼아 `Next.js` 프론트엔드로 브로드캐스트하여 부드러운 사용자 경험을 제공합니다.

---

## 4. 장비 등록 및 스캔 프로세스 (Web Bluetooth ↔ Python 분업)

사용자의 뛰어난 아이디어를 적용하여, **장비 등록은 브라우저(Web Bluetooth API)**가 담당하고, **실제 레이스 하드코어 통신만 Python**이 전담하도록 설계합니다.

1. **Web Bluetooth 스캔 (Next.js Admin)**:
   - 기기 등록 모달 내에 `[장비 스캔]` 버튼을 누르면, 파이썬 서버를 호출할 필요 없이 **브라우저에 내장된 Web Bluetooth API** 창이 즉각 열립니다.
   - 관리자는 태블릿이나 핸드폰을 들고 체육관을 돌아다니며 주변의 PM5 장비를 즉석에서 스캔하고 손쉽게 모바일 환경에서 등록할 수 있습니다. (파이썬 서버 구동 불필요)

2. **기존 모달 Select Box 연동 (Next.js 내부)**:
   - Web Bluetooth 스캔으로 식별된 기기 중, **이미 DB(`pm5_devices`)에 등록된 시리얼/MAC 주소는 제외**합니다.
   - 신규 기기 정보(MAC 주소 또는 시리얼 포함 기기명)만이 모달 내의 **셀렉트박스(Select Box)**에 나타납니다.

3. **고유 식별자 저장 (Admin UI → Supabase)**:
   - 선택된 기기의 지점, **장비 종류(현재 Rower, Ski, Bike 3종 외에도 향후 트레드밀 등 신규 BLE 장비 추가가 가능하도록 확장성 있게 설계)**, 초기 상태 등을 지정하고 저장합니다.
   - *주의점(Edge Case)*: Mac/iOS 계열의 Web Bluetooth는 보안상 실제 MAC 주소 대신 임의의 UUID를 반환합니다. 이를 방어하기 위해 기기명에 포함된 **PM5 고유 시리얼 넘버(예: PM5 430123456)**를 주 식별자로 파싱하여 `pm5_devices`에 저장합니다.

4. **실전 레이스 통신 (Python 서버의 책임)**:
   - 레이스 전용 운영 PC에 설치된 파이썬 서버는 DB에 저장된 `pm5_devices` 명단(시리얼/MAC 기반)을 읽어들입니다.
   - 이후 실제 레이스가 가동될 때는 파이썬이 다중 동글들을 활용해 해당 명단의 머신들과 강력한 스로틀링 없는 다중 연결(Connection)을 수행합니다.

5. **블루투스 연결 해제(Disconnect) 시점 제어**:
   - **세션 유지 원칙**: 여러 번의 레이스(예: 예선 1조, 2조)가 연속해서 열리는 경우, 레이스가 한 번 끝났다고 해서 개별 기기의 블루투스 통신을 끊지 않습니다. (재연결 시 발생하는 딜레이 방지)
   - **정상 해제 (코치 통제)**: 코치가 패드(Admin)에서 모든 수업을 마치고 **`[레이스 룸 종료/세션 종료]`** 버튼을 누르면, 파이썬 서버가 그제야 일괄적으로 해당 기기들과 맺었던 `BleakClient` 할당을 해제하여 장비들을 자유 상태(`idle`)로 풀어줍니다.
   - **자연 해제 (하드웨어 절전)**: 레이스를 마치고 회원이 아무것도 하지 않은 채 2~4분이 경과하면, PM5는 배터리 절약을 위해 **자동으로 수면(Sleep) 모드**에 들어갑니다. 이때 블루투스 전파가 물리적으로 끊어지며, 파이썬 서버는 이를 감지하여 해당 레인을 조용히 `[Offline]` 상태로 변경합니다.

---

## 5. 데이터 모델 상세 (DDL 수준)

### 5.1 데이터 저장 전략 (파일 vs DB 분리)

레이스 데이터는 **특성에 따라 저장 매체를 분리**합니다:

| 데이터 | 저장 매체 | 근거 |
|--------|----------|------|
| **0.3초 단위 원시 BLE 데이터** | **JSONL 파일** (Python 로컬 디스크) | 초당 66row(20기기) → DB 직접 쓰기 시 과부하. 순차 Append I/O가 최적 |
| **레이스 진행 중 스냅샷** | **`race_live_state` 테이블** (Ephemeral) | 재접속 복원용. 5초 간격 UPSERT. 레이스 종료 시 삭제 |
| **레이스 최종 결과/요약** | **`race_records` 테이블** (Permanent) | 회원 PR, 리더보드, 성장 추이 그래프 등에 활용되는 영구 데이터 |
| **레코딩 메타데이터** | **`race_recordings` 테이블** (Permanent) | JSONL 파일의 경로, 크기, 기기 정보 등 파일에 대한 인덱스 |

#### JSONL 파일 구조
```
race/recordings/
  └── {event_id}/
      ├── {device_serial_1}.jsonl   # 기기별 독립 파일
      ├── {device_serial_2}.jsonl
      └── _meta.json                # 레이스 메타 (시작/종료 시각, 참가자 등)

# JSONL 한 줄 예시:
{"ts":1708500000123,"d":125.4,"p":220,"spm":28,"hr":155,"cal":45,"max_w":285}
# ts=timestamp(ms), d=distance(m), p=power(w), spm=strokeRate, hr=heartRate, cal=calories, max_w=maxWatts
```

**파일 보관 정책:**
- Python 서버 로컬 디스크의 `race/recordings/` 디렉토리에 저장
- 레이스 종료 후 요약 추출 → `race_records`에 적재
- 원시 JSONL 파일은 **30일간 보관 후 자동 삭제** (cron 또는 Python 스케줄러)
- 필요 시 Supabase Storage에 아카이빙 업로드 가능 (향후 확장)

### 5.2 `race_live_state` (신규 — Ephemeral)

레이스 진행 중 **재접속 복원 및 현재 상태 조회용** 임시 테이블.

```sql
CREATE TABLE IF NOT EXISTS public.race_live_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.race_events(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES public.pm5_devices(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id),   -- NULL 가능 (미배정 레인)
    lane_number INT NOT NULL,
    team_id UUID REFERENCES public.race_teams(id),   -- NULL = 개인전
    distance_m DECIMAL(10,2) DEFAULT 0,
    power_w DECIMAL(8,2) DEFAULT 0,
    stroke_rate_spm DECIMAL(5,1) DEFAULT 0,
    hr_bpm INT,                                       -- NULL 가능 (HR 미연동)
    calories_burned INT DEFAULT 0,
    max_watts DECIMAL(8,2) DEFAULT 0,
    connection_status VARCHAR(20) DEFAULT 'connected'
        CHECK (connection_status IN ('connected','racing','idle','disconnected','offline')),
    last_updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, device_id)
);

-- 인덱스
CREATE INDEX idx_race_live_state_event ON public.race_live_state(event_id);

-- ※ 레이스 종료 시 해당 event_id의 모든 row를 DELETE (Python 서버 또는 Coach UI 트리거)
```

### 5.3 `race_recordings` (신규 — JSONL 파일 메타데이터)

Python 서버가 기록한 JSONL 파일의 **인덱스 및 관리용** 테이블.

```sql
CREATE TABLE IF NOT EXISTS public.race_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.race_events(id) ON DELETE SET NULL,
    device_id UUID REFERENCES public.pm5_devices(id) ON DELETE SET NULL,
    device_serial VARCHAR(100) NOT NULL,              -- 파일명 기준 식별자
    file_path VARCHAR(500) NOT NULL,                  -- 상대 경로 (예: recordings/{event_id}/{serial}.jsonl)
    file_size_bytes BIGINT,
    total_data_points INT,                            -- JSONL 총 라인 수
    duration_seconds INT,                             -- 레코딩 시간
    recorded_at TIMESTAMPTZ DEFAULT now(),             -- 레코딩 시작 시각
    recorded_by UUID REFERENCES auth.users(id),       -- 기록 시작한 코치
    facility_id UUID REFERENCES public.facilities(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_race_recordings_event ON public.race_recordings(event_id);
CREATE INDEX idx_race_recordings_device ON public.race_recordings(device_id);
CREATE INDEX idx_race_recordings_recorded_at ON public.race_recordings(recorded_at);
```

### 5.4 `race_records` (기존 테이블 확장 — 최종 결과)

기존 `race_records` 테이블에 **다각도 컴피티션 지표** 컬럼을 추가합니다.

```sql
-- 기존 컬럼: id, event_id, member_id, device_serial, result_time, result_distance,
--           calories_burned, avg_watts, avg_pace, is_pr, created_at

-- 추가 컬럼:
ALTER TABLE public.race_records ADD COLUMN IF NOT EXISTS max_watts DECIMAL(8,2);
ALTER TABLE public.race_records ADD COLUMN IF NOT EXISTS max_hr_bpm INT;
ALTER TABLE public.race_records ADD COLUMN IF NOT EXISTS avg_spm DECIMAL(5,1);
ALTER TABLE public.race_records ADD COLUMN IF NOT EXISTS avg_hr_bpm INT;
ALTER TABLE public.race_records ADD COLUMN IF NOT EXISTS recording_id UUID REFERENCES public.race_recordings(id);
ALTER TABLE public.race_records ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.race_teams(id);
ALTER TABLE public.race_records ADD COLUMN IF NOT EXISTS lane_number INT;
ALTER TABLE public.race_records ADD COLUMN IF NOT EXISTS finish_rank INT;
```

> **`race_recordings` vs `race_records` 관계 명확화:**
> - `race_recordings` = JSONL **파일 자체의 메타데이터** (어떤 기기에서 어떤 파일이 생성되었는지)
> - `race_records` = JSONL 파일에서 **추출한 최종 요약/결과** (순위, PR 판정, 리더보드용)
> - 관계: `race_records.recording_id` → `race_recordings.id` (1:1, optional)

### 5.5 `race_events` (기존 테이블 확장)

기획서에서 요구하는 기능을 지원하기 위해 기존 스키마를 확장합니다.

```sql
-- 기존 컬럼: id, facility_id, name, event_date, event_type, distance_meters,
--           duration_minutes, description, status, created_at, updated_at

-- 추가 컬럼:
ALTER TABLE public.race_events ADD COLUMN IF NOT EXISTS race_format VARCHAR(20) DEFAULT 'individual'
    CHECK (race_format IN ('individual', 'team', 'relay'));
ALTER TABLE public.race_events ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.sessions(id);
ALTER TABLE public.race_events ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES public.coaches(id);
ALTER TABLE public.race_events ADD COLUMN IF NOT EXISTS target_distance_m INT;
ALTER TABLE public.race_events ADD COLUMN IF NOT EXISTS lobby_status VARCHAR(20) DEFAULT 'setup'
    CHECK (lobby_status IN ('setup', 'lobby', 'countdown', 'racing', 'finished'));
```

> **상태 머신 (State Machine):**
> ```
> setup → lobby → countdown → racing → finished
>   ↑                                      │
>   └──────── reset (코치 수동) ←───────────┘
> ```

### 5.6 `race_teams` (신규 — 팀전 지원)

```sql
CREATE TABLE IF NOT EXISTS public.race_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.race_events(id) ON DELETE CASCADE,
    team_name VARCHAR(100) NOT NULL,
    team_color VARCHAR(7) NOT NULL DEFAULT '#FF6A00',  -- HEX 컬러 코드
    total_distance_m DECIMAL(10,2) DEFAULT 0,          -- 실시간 합산 거리 (Broadcast에서 계산)
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, team_name)
);

-- 인덱스
CREATE INDEX idx_race_teams_event ON public.race_teams(event_id);
```

> **팀전 거리 합산 로직**: 프론트엔드에서 `race_live_state`의 `team_id`가 같은 레인들의 `distance_m`을 **클라이언트 사이드에서 실시간 합산**하여 팀 보트 아바타를 전진시킵니다. DB의 `total_distance_m`은 5초 스냅샷 용도.

### 5.7 `pm5_devices` (기존 테이블 확장)

```sql
-- 기존 컬럼: id, facility_id, serial_number, device_type, status, firmware_version,
--           last_sync_at, created_at, updated_at

-- 추가 컬럼:
ALTER TABLE public.pm5_devices ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17);       -- 'AA:BB:CC:DD:EE:FF'
ALTER TABLE public.pm5_devices ADD COLUMN IF NOT EXISTS ble_name VARCHAR(100);          -- 'PM5 430123456'
ALTER TABLE public.pm5_devices ADD COLUMN IF NOT EXISTS current_mode VARCHAR(30) DEFAULT 'idle'
    CHECK (current_mode IN ('idle', 'racing', 'personal_recording'));
ALTER TABLE public.pm5_devices ADD COLUMN IF NOT EXISTS qr_identifier VARCHAR(100);    -- QR코드 부착용 해시

-- device_type CHECK 확장 (향후 트레드밀 등 추가 대비)
-- 기존: CHECK (device_type IN ('rower', 'bike', 'skierg'))
-- 변경: CHECK 제약 제거 후 VARCHAR 자유 입력 또는 CHECK 확장
ALTER TABLE public.pm5_devices DROP CONSTRAINT IF EXISTS pm5_devices_device_type_check;
ALTER TABLE public.pm5_devices ADD CONSTRAINT pm5_devices_device_type_check
    CHECK (device_type IN ('rower', 'bike', 'skierg', 'treadmill', 'other'));
```

### 5.8 RLS 정책 (신규 테이블)

```sql
-- race_live_state: Coach/Admin 쓰기, 인증 사용자 읽기
ALTER TABLE public.race_live_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read race_live_state" ON public.race_live_state
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow coach/admin manage race_live_state" ON public.race_live_state
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','coach'))
    );

-- race_recordings: Coach/Admin 쓰기, 인증 사용자 읽기
ALTER TABLE public.race_recordings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read race_recordings" ON public.race_recordings
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow coach/admin manage race_recordings" ON public.race_recordings
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','coach'))
    );

-- race_teams: Coach/Admin 쓰기, 인증 사용자 읽기
ALTER TABLE public.race_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read race_teams" ON public.race_teams
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow coach/admin manage race_teams" ON public.race_teams
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','coach'))
    );
```

> **⚠️ Python 서버(Service Role Key)는 RLS를 Bypass합니다.** `race_live_state` UPSERT 및 `race_recordings` INSERT는 Python이 Service Role Key로 수행하므로 RLS 정책에 영향받지 않습니다.

### 5.9 Realtime Channel

* **이름**: `race:{event_id}`
* **Events**: `race_start`, `race_finish`, `race_reset`, `erg_update`, `state_snapshot`, `lane_assign`, `team_update`
* **Broadcast 메시지 포맷**:
```json
{
  "event": "erg_update",
  "payload": {
    "device_serial": "430123456",
    "lane": 3,
    "d": 125.4,     
    "p": 220,       
    "spm": 28,      
    "hr": 155,      
    "cal": 45,      
    "ts": 1708500000123
  }
}
```
* **Realtime 부하 한계 참고**: 
  - Supabase Free: 200 concurrent connections → 충분 (대형 스크린 ~2 + 코치 패드 ~1 + 회원 앱 ~20 = ~23)
  - Broadcast 메시지 크기 제한: ~32KB/message → 단일 `erg_update` ~200B이므로 충분
  - 초당 메시지: 20기기 × 3Hz = ~60msg/s → Supabase Pro에서 안정 지원

---

## 6. 로잉 머신(PM5) 활용의 2가지 핵심 모드 및 배정 설계

장비(기기)를 이용해 기록을 측정하는 상황은 크게 두 가지 뚜렷한 목적(정규 수업 레이싱 vs 가외 시간 개인 기록)으로 분리되며, 시스템 아키텍처는 이를 완벽히 포용하고 분리 제어할 수 있어야 합니다.

### 6.1 정규 수업 레이싱 모드 (Racing Mode — 본 레이스 시스템)
- **목적**: 코치가 통제하는 정규 그룹 수업에서, 다수의 회원이 동시에 거대한 스크린(2.5D View)에 연동되어 경쟁/협동.
- **기기 선택 및 커스텀**: 해당 수업의 목표에 맞게 코치가 **사용할 기기 종류(Rower, SkiErg, BikeErg 외 향후 도입될 트레드밀 등 포함)와 참여 기기 개수를 사전에 선택(필터링)**하여 레이스 룸을 세팅할 수 있어야 합니다. 장비 종류는 특정 3종에 영구 종속되지 않도록 확장성을 갖습니다.
- **자유로운 거리 설정**: 고정된 거리가 아니라, 코치가 해당 세션의 목적(예: 500m 스프린트, 2000m 지구력, 834m 이벤트 등)에 맞춰 **원하는 레이스 목표 거리를 커스텀 입력**할 수 있습니다.
- **참여 포맷 (개인전 및 팀전)**: 모든 참가자가 각자 달리는 개인전(Individual) 뿐만 아니라, **팀전(Team Competition) 모드**를 지원합니다. 여기서 **팀전의 핵심 원리**는 특정 레인들(예: 1번, 2번, 3번 로잉머신)을 A팀으로 묶었을 때, **각 기기에서 전송되는 거리(Distance) 데이터가 실시간으로 하나로 합산**된다는 것입니다. 팀원들이 개별적으로 당긴 거리가 합산되어 대형 스크린에서는 하나의 거대한 'A팀 보트'가 전진하는 다이내믹하고 협동적인 인터랙션을 만들어냅니다. (또한 한 기기를 릴레이로 타는 방식도 지원 가능합니다)
- **출석 기반 자동 배정 원칙**: 레이스 전 대기실(Lobby)에서, 현재 진행 중인 세션(수업)에 **출석 체크(Check-in)를 마친 인원 명단**을 바탕으로 시스템이 각 레인(또는 팀)에 참가자를 1차적으로 **자동 할당**하는 것이 기본 프로세스입니다.
- **자율 배정(QR 스캔) 보조**: 아래 Section 6.3 참조.

### 6.2 개인 운동 기록 모드 (Personal Recording Mode)
- **목적**: 정규 수업 시간이 아닌 **개인 가외 운동(Open Gym)** 시, 회원이 로잉 머신을 단독으로 탈 때 자신의 성과를 앱에 기록.
- **상시 작동 방식**: 어드민에서 출력해 부착해 둔 고유 QR(예: `/apps/erg/bind?device_id=UUID`)을 아무 때나 스캔하면, 사용자의 내 앱(app)이 기기와 1:1로 바인딩되는 기능입니다.
- **구현 아키텍처 (Racing Mode와의 차이)**:
  - **데이터 수집 주체**: Personal Mode에서도 **Python 서버가 BLE 데이터를 수집**합니다. Python 서버는 센터 운영 시간 중 상시 구동되는 것을 전제로 합니다. (Web Bluetooth는 포그라운드 탭 유지가 필요하여 실용성 부족)
  - **QR 스캔 → 바인딩 흐름**:
    1. 회원이 기기 앞 QR 스캔 → `/apps/erg/bind?device_id=UUID` 접속
    2. 앱에서 API 호출 → `pm5_devices.current_mode` 확인 (idle인 경우만 진행)
    3. `pm5_devices.current_mode = 'personal_recording'` 으로 UPDATE
    4. Python 서버에 WebSocket/API로 "이 기기의 데이터를 수집 시작" 신호
    5. Python이 해당 기기 데이터를 JSONL로 기록 + 회원 앱에 Broadcast
    6. 운동 종료 시 → 결과 요약을 `race_records`에 저장 (단, `event_id = NULL`)
  - **`race_records.event_id` NULL 허용**: Personal Mode에서는 레이스 이벤트 없이 기록이 생성되므로, FK를 NULLABLE로 변경.
  - **⚠️ 구현 우선순위**: Personal Mode는 Racing Mode 완성 이후 **별도 Phase(향후 Priority)로 진행**합니다. MVP에서는 Racing Mode에 집중합니다.

```sql
-- Personal Mode 지원을 위한 race_records.event_id NULLABLE 변경
ALTER TABLE public.race_records ALTER COLUMN event_id DROP NOT NULL;
-- 또는 기존 FK가 이미 NULL 허용인 경우 변경 불필요 (현재 스키마 확인 필요)
```

### 6.3 QR 자율 배정 구현 아키텍처

```
[회원 스마트폰]                              [코치 패드]
    │                                           │
    │ 1. QR 스캔                                │ 4. Realtime 구독
    │    /apps/race/join?event_id=xxx&lane=3     │    race:{event_id} → lane_assign 이벤트
    │                                           │
    │ 2. API 호출                               │ 5. 대기방(Lobby)에 아바타 추가 표시
    │    → race_live_state UPSERT               │
    │      (member_id 바인딩)                    │
    │                                           │
    │ 3. Broadcast 발행                         │
    │    race:{event_id} → lane_assign          │
    └───────────────────────────────────────────┘
```

**QR 코드 페이로드**: 각 기기에 부착된 QR은 다음 URL을 인코딩합니다:
- **Racing Mode QR**: `/apps/race/join?event_id={CURRENT_EVENT_ID}&lane={LANE_NUMBER}`
  - `event_id`는 코치가 레이스 룸을 열 때 동적으로 생성 (QR을 실시간 갱신하기 어려우므로, 기기별 고정 QR → 앱에서 현재 활성 이벤트 자동 감지 방식 추천)
  - **대안 (권장)**: `/apps/race/join?device_id={DEVICE_UUID}` → 앱이 해당 기기에 현재 매핑된 이벤트를 자동 조회
- **Personal Mode QR**: `/apps/erg/bind?device_id={DEVICE_UUID}` (이벤트 독립)

### 6.4 두 모드의 충돌 방어 (State Lock)

이 두 개념이 한 기기에 혼재되기 때문에 충돌 방어가 매우 중요합니다. 코치가 정규 수업 레이스를 시작하기 위해 기기를 통제 상태로 올렸을 때(`current_mode=racing`), 정규 수업 밖의 회원이 지나가다 빈 기기의 QR을 실수로 스캔하여 **개인 기록 모드(Personal Mode)로 장비를 탈취하는 불상사를 막기 위한 하드 락(Lock)**이 반드시 필요합니다.

```
Lock 판정 흐름:
  QR 스캔 → pm5_devices.current_mode 조회
    ├── 'idle' → 요청 허용 (Racing 또는 Personal 전환 가능)
    ├── 'racing' → Personal 요청 거부 + "현재 수업 중입니다" 안내
    └── 'personal_recording' → Racing 전환 시 기존 Personal 강제 종료 후 전환
```

---

## 7. 프론트엔드 화면 구성

| 구분 | 화면 로케이션 | 주요 역할 |
|---|---|---|
| **운영** | `🆕 /coach/race/control` | Coach 전용. 레이스 설정, BLE 연결, 전체 시작/종료, 레인 배정 |
| **관전** | `🆕 /class/race/live` | 2.5D 레이싱 뷰, 대형 스크린(TV) 렌더링 목적 |
| **관전** | `🆕 /class/race/run` | 데이터 중심의 ERG 실시간 상황 그리드 |
| **운영** | `🔄 /admin/operations/race` | Coach 레이스 제어 화면 임베드, 이벤트 CRUD |
| **결과** | `🆕 /class/race/result` | 종료 후 리더보드 출력. **다각도 컴피티션 (ErgZone 벤치마크)**: 단순 통과 순위뿐 아니라 개인별 Max Watts, 최고 심박수, 칼로리 등을 표기하여 경쟁의 재미를 다각화. |

> **⚠️ Sitemap 동기화 필요**: 아래 화면들이 기존 sitemap에 미등록 또는 경로 불일치:
> - `/coach/race/control` → `coach-app.md`에 `/coach/race`만 존재 → 하위 라우트 추가 필요
> - `/class/race/run`, `/class/race/result` → `class-portal.md`에 `/class/race/live`만 존재 → 추가 필요
> - **블루프린트 이관 시 반드시 sitemap 선행 갱신**

---

## 8. 구현 단계 및 관점 배분

*(참고: Phase 5 핵심 렌더링은 세분화되어 진행)*

| Phase | 내용 | 담당 주체 | 소요기한 |
|---|---|---|---|
| **Phase A** | `pm5_devices` 컬럼 확장, `race_live_state` + `race_recordings` + `race_teams` 마이그레이션, `race_events`/`race_records` 확장 | 💎 Senior Dev | 0.5일 |
| **Phase B** | Python FastAPI + Bleak 인프라 구성 및 JSONL 레코더 구현 | ⚡ Specialist | 1.5일 |
| **Phase C** | 프론트엔드 기기 등록, 레코딩 제어 UI, Realtime 바인딩 기본 | 🎨 UI Developer | 1.0일 |
| **Phase 1** | 기반 인프라 (`race_live_state` Realtime 훅 구현, useRaceRealtime) | 💻 Developer | 1.0일 |
| **Phase 2~4** | 레코딩 기반 시뮬레이터 재생, 그리드 뷰 화면, BLE 연동 안정화 | ⚡ Specialist | 3.5일 |
| **Phase 5-A** | 2.5D 개발 준비 - HUD 바인딩 프레임 기반 평면 LERP 이동 | ⚡ Specialist | 1.0일 |
| **Phase 5-B** | 2.5D 그래픽 적용 - CSS 3D 적용, 캐릭터 애니메이션, 물 파티클 | ⚡ Specialist | 2.0일 |
| **Phase 5-C** | 2.5D 폴리싱 - 선두 이펙트, 예외(Edge Case) 처리, 메모리 최적화 | ⚡ Specialist | 1.0일 |
| **Phase 6~7** | 최종 결과 자동 기록 연동(JSONL→race_records 적재), 문서 동기화 | 🏛️ Architect / 💻 Dev | 1.0일 |

---

## 9. 테스트 및 검증 시나리오

1. **로컬 모킹을 통한 시뮬레이션 E2E**: 기존 레코딩된 jsonl을 Replay 하여 9개의 다중 레인 브로드캐스트 부하 및 동기화 무결점 검증(300ms 랙 내 LERP 보정).
2. **Edge Case 발현**: 강제 네트워크 단절 1초 / 10초 대기에 따른 Grayscale 및 반투명 텍스트 전환 검증.
3. **BLE 실기기 연동**: Python 스캔 → 프론트엔드 확정 → `pm5_devices` 병합 → 라이브 레이스 세일.
4. **재접속 복원**: 레이스 진행 중 브라우저 새로고침 → `race_live_state` 스냅샷으로 현재 상태 즉시 복원 검증.
5. **팀전 합산**: 3기기 A팀 + 3기기 B팀 → 거리 합산이 정확히 일치하는지 검증.
6. **파일 레코딩 무결성**: JSONL 파일 → race_records 적재 시 데이터 포인트 수 일치 확인.

---

## 10. 리스크 및 완화

* **BLE 동시 연결 한계 (다중 기기)**: 하나의 일반적인 블루투스 동글이 안정적으로 관리할 수 있는 동시 연결은 7~10대입니다. 20대를 수용하기 위해 파이썬 환경에서 다수의 동글(또는 어댑터)을 분산하여 스캔/연결하는 로직을 고도화해야 합니다.
* **보간법 최적화 실패/성능 저하**: React 렌더링 비용이 클 시 `requestAnimationFrame` 레벨에서 직접 DOM 객체를 통제하여 React State 변경 사이클을 Bypass 구성.
* **BLE 환경 문제 및 식별자 불일치**: Apple 기기(Mac/iOS)의 Web Bluetooth는 하드웨어 고유 MAC을 숨깁니다. 따라서 Admin(웹)과 파이썬 간의 매칭 키를 MAC이 아닌 **기기 이름에 포함된 PM5 시리얼 넘버**로 통일하도록 로직 방어를 구축해야 합니다.
* **JSONL 파일 디스크 용량**: 20기기 × 3Hz × 200B/line × 30분 = ~21MB/레이스. 하루 10레이스 = ~210MB. 30일 보관 시 ~6.3GB. Coach PC SSD 용량 충분하나, 디스크 모니터링 알림 구성 권장.
* **Python 서버 장애 시 데이터 유실**: JSONL은 로컬 파일이므로 서버 크래시 시 마지막 flush 이후 데이터 유실 가능. 완화: `fsync` 주기 1초 또는 OS-level write buffer 활용.

---

## 11. Planning Log

### Session 1~4 (2026-02-19 ~ 21) 요약
- 레거시 아키텍처 분석(FastAPI 통신 프로토콜, Python BLE 패킷 수신 등) 결과, 연산과 데이터 표출은 BCL-Portal 생태계(Next.js+Supabase) 내로 편입하기로 설계 확정.
- Coach 중심의 실시간 운영 통제가 가능하게 프론트엔드 구조 채택. DB(`race_live_state` 및 `race_recordings`) 구조 신설안 추가 완료.

### Session 5 (2026-02-21) 요약
- 가장 큰 난이도인 '2.5D 레이스 뷰' 해결을 위해 LERP 위치 보간 프레임 이동 및 에지 케이스 정책 상세 설정 완료. 작업 단위를 Phase 5-A, B, C로 세분화.

### Session 7 (2026-02-21)
- **변경 사항**: 장황했던 레거시 사양 설명 및 파이썬 로직, 자잘한 컴포넌트 구조 묘사를 제거하고, 일관성 있는 **가독성 중심의 정보 압축 재편**을 진행함.
- **주요 기획 추가**: 
  - Python(장비 및 데이터 펌프) vs Next.js(머신 정보 관리 및 2.5D 레이스 로직) 역할 완벽 분리.
  - 다중 동글(최대 20개 기기) 연결 방어.
  - Web Bluetooth(브라우저) 기반 장비 스캔 및 등록 프로세스 분업화.
  - Racing vs Personal 모드 충돌 방지 로직(State Lock) 및 팀전 합산 로직 확립.
  - Zwift(게이미피케이션 대기방) 및 ErgZone(부정/조기 출발 완충, 다각도 스코어링) 수준의 프론트엔드 연출 & 룰 완화.
  - Bluetooth Connection 라이프사이클(오프라인 대응 플로우) 완벽 정리.
- **결과**: `[2026-02-21 11:10]` 기획안 전면 **승인(Approved)** 완료.

### Session 8 (2026-02-21) — Architecture Review 반영
- **변경 사항**: 아키텍처 리뷰에서 식별된 **Critical 4건 + Major 4건 + Minor 3건** 전면 보완.
- **주요 보완 항목**:
  1. ✅ `race_live_state` DDL 수준 스키마 정의 (Section 5.2)
  2. ✅ 데이터 저장 전략 확립: **원시 데이터 = JSONL 파일**, DB = 메타/요약만 (Section 5.1)
  3. ✅ `race_recordings` vs `race_records` 관계 명확화: recordings = 파일 메타, records = 결과 요약 (Section 5.4)
  4. ✅ Broadcast vs DB Realtime 데이터 경로 분리 (Section 3.2 데이터 흐름도)
  5. ✅ 팀전 데이터 모델 `race_teams` 테이블 신설 (Section 5.6)
  6. ✅ `race_events` 확장 컬럼 + 상태 머신 정의 (Section 5.5)
  7. ✅ Python 서버 Supabase 인증 전략: Service Role Key (Section 1.1)
  8. ✅ QR 자율 배정 구현 아키텍처 (Section 6.3)
  9. ✅ Personal Recording Mode 상세 아키텍처 + MVP 범위 격리 (Section 6.2)
  10. ✅ Supabase Realtime 부하 한계 확인 (Section 5.9)
  11. ✅ 프론트엔드 애니메이션 상태 관리 패턴 (Section 3.3)
  12. ✅ Sitemap SSOT 동기화 경고 (Section 7)
  13. ✅ 기획서 번호 체계 교정 (Section 3.x 통일)
  14. ✅ JSONL 디스크 용량 + 파일 보관 정책 (Section 5.1, 10)
- **결과**: `[2026-02-21 11:15]` 아키텍처 리뷰 완료. 블루프린트(`plan-to-blueprint`)로 이관 준비 완료.
