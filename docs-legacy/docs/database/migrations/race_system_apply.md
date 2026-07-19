# Race System 마이그레이션 적용 가이드

이 문서는 Race(2.5D 라이브 레이스 + PM5 BLE 기기 + 결과 리더보드) 시스템의 DB 적용 절차서입니다. Race 도메인은 다음 2개 마이그레이션으로 구성되며, 반드시 **순서대로** 적용해야 합니다.

| 순서 | 마이그레이션 | 목적 |
|---|---|---|
| 1 | [supabase/migrations/20260217203700_create_race_system.sql](../../../supabase/migrations/20260217203700_create_race_system.sql) (92줄) | `race_events` / `race_records` / `pm5_devices` 3개 테이블 신규 + 인덱스 + RLS |
| 2 | [supabase/migrations/20260221084721_race_system_enhancement.sql](../../../supabase/migrations/20260221084721_race_system_enhancement.sql) (120줄) | 위 3개 테이블 확장 + `race_teams` / `race_live_state` / `race_recordings` 3개 테이블 추가 + RLS |

> **Priority 21**(Race System Improvements: race stop 자동 적재 / simulator device_id 전략 / recorder lane meta / frontend status·adapter·team 정합성)은 **코드 변경만** 이뤄졌고 DB 스키마 변경은 없습니다. 즉, **현재 개발된 Race 시스템 전체(2.5D 라이브 / PM5 BLE / 팀전·개인전 / 결과 리더보드)는 위 2개 마이그레이션으로 완전 커버됩니다.**
>
> 본 가이드는 `src/types/supabase.ts` 정본 타입(2026-04-25 기준)과 일치합니다. 만약 신규 컬럼 추가 요구가 발생하면 반드시 새 마이그레이션 파일을 추가하고 본 문서를 갱신하십시오.

---

## 0. 사전 조건

| 항목 | 확인 |
|---|---|
| 적용 환경 | DEV(`meklaisrcpecuwwwakhv`) → 검증 후 PROD(`cbtgziqhahujxffqtjhd`) |
| 다운타임 | 불필요 (DDL 모두 `IF NOT EXISTS`, `ALTER ... ADD COLUMN IF NOT EXISTS`) |
| 의존 테이블 | `public.facilities`, `public.sessions`, `public.coaches`, `public.members`, `public.profiles`, `auth.users` 모두 선행 존재해야 함 |
| 백업 | Supabase 자동 일일 스냅샷 외 별도 백업 권장 (대시보드 → Database → Backups) |
| 멱등성 | ✅ 두 파일 모두 재실행 안전 — 단, 1번 파일은 `CREATE INDEX`/`CREATE POLICY`에 `IF NOT EXISTS`가 빠진 라인이 있어 **재실행 시 일부 라인이 에러**를 낼 수 있습니다. 신규 환경에 한해 1회 적용을 권장합니다. 자세한 내용은 §1.1 참조 |

### 변경 요약
**1번 마이그레이션(`create_race_system`)** — 3개 테이블 + 6개 인덱스 + 6개 RLS 정책
- 테이블: `race_events`(11컬럼), `race_records`(11컬럼), `pm5_devices`(9컬럼)
- 인덱스 6개 (`idx_race_events_*` 3개, `idx_race_records_*` 2개, `idx_pm5_devices_facility`)
- RLS: authenticated 읽기 / admin 전체 관리

**2번 마이그레이션(`race_system_enhancement`)** — 컬럼 17개 추가(`race_events` +5, `pm5_devices` +4, `race_records` +8) + 테이블 3개 추가 + RLS 6개
- `race_events` +5: `race_format`(CHECK), `session_id`(FK→sessions), `coach_id`(FK→coaches), `target_distance_m`, `lobby_status`(CHECK)
- `pm5_devices` +4: `mac_address`, `ble_name`, `current_mode`(CHECK), `qr_identifier` + `device_type` CHECK 확장(`treadmill`, `other` 추가)
- `race_records` +8 + `event_id` NULLable화: `max_watts`, `max_hr_bpm`, `avg_spm`, `avg_hr_bpm`, `recording_id`(FK→race_recordings), `team_id`(FK→race_teams), `lane_number`, `finish_rank`
- 신규 테이블 3개:
  - `race_teams`(6컬럼) — 팀전 지원
  - `race_live_state`(14컬럼, **`event_id`/`device_id`/`lane_number` NOT NULL**) — Realtime 구독 대상
  - `race_recordings`(12컬럼) — PM5 CSV 파일 메타데이터
- RLS: authenticated 읽기 / admin·coach 관리

### 정본 타입과의 정합 (`src/types/supabase.ts` 기준)
| 테이블 | 컬럼 수 | 1번 적용 후 | 2번 적용 후 | 핵심 NOT NULL |
|---|---|---|---|---|
| `race_events` | 16 | 11 | 16 | `id`, `name`, `event_date`, `event_type` |
| `race_records` | 19 | 11(`event_id` NOT NULL) | 19(`event_id` NULL 허용) | `id` |
| `pm5_devices` | 13 | 9 | 13 | `id`, `serial_number`, `device_type` |
| `race_teams` | — | (없음) | 6 | `id`, `event_id`, `team_name`, `team_color` |
| `race_live_state` | — | (없음) | 14 | `id`, `event_id`, `device_id`, `lane_number` |
| `race_recordings` | — | (없음) | 12 | `id`, `device_serial`, `file_path` |

---

## 1. Pre-flight 검증 (적용 전, 1분)

```sql
-- (1) 의존 테이블 존재 확인 — 6행 모두 출력되어야 함
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('facilities','sessions','coaches','members','profiles')
ORDER BY table_name;
SELECT 'auth.users' AS table_name, EXISTS(SELECT 1 FROM auth.users LIMIT 1) AS exists;

-- (2) Race 테이블이 아직 없어야 함 — 결과 0행 (신규 환경)
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('race_events','race_records','pm5_devices','race_teams','race_live_state','race_recordings')
ORDER BY table_name;

-- (3) `profiles.role` 컬럼 존재 확인 (RLS 정책이 참조) — 1행
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema='public' AND table_name='profiles' AND column_name='role';
```

### 1.1 부분 적용 환경에서 재실행 시 주의

1번 마이그레이션은 다음 라인에 `IF NOT EXISTS` 가드가 없습니다.
```sql
CREATE INDEX idx_race_events_facility ON public.race_events(facility_id);
-- ... 5개 인덱스 동일
CREATE POLICY "Allow authenticated read race_events" ON public.race_events ...;
-- ... 6개 정책 동일
```

따라서 이미 1번이 일부 적용된 환경에서 재실행하면 `ERROR: relation "idx_..." already exists` 또는 `ERROR: policy "..." already exists` 가 발생할 수 있습니다. 다음 SQL로 사전 정리 후 재시도하세요(또는 신규 환경에서만 1번을 적용).

```sql
-- (선택) 부분 적용 정리 — 주의: 데이터가 있는 테이블에는 사용하지 마십시오
DROP POLICY IF EXISTS "Allow admin manage pm5_devices" ON public.pm5_devices;
DROP POLICY IF EXISTS "Allow admin manage race_records" ON public.race_records;
DROP POLICY IF EXISTS "Allow admin manage race_events" ON public.race_events;
DROP POLICY IF EXISTS "Allow authenticated read pm5_devices" ON public.pm5_devices;
DROP POLICY IF EXISTS "Allow authenticated read race_records" ON public.race_records;
DROP POLICY IF EXISTS "Allow authenticated read race_events" ON public.race_events;
DROP INDEX IF EXISTS public.idx_pm5_devices_facility;
DROP INDEX IF EXISTS public.idx_race_records_member;
DROP INDEX IF EXISTS public.idx_race_records_event;
DROP INDEX IF EXISTS public.idx_race_events_status;
DROP INDEX IF EXISTS public.idx_race_events_date;
DROP INDEX IF EXISTS public.idx_race_events_facility;
```

### 1.2 현재 개발된 Race 시스템 사용 현황 매핑

본 가이드의 2개 마이그레이션이 실제 코드 사용 영역을 어떻게 커버하는지 추적표입니다. 적용 후 각 화면을 회귀 테스트할 때 어느 테이블이 영향받는지 빠르게 파악할 수 있습니다.

| 코드 영역 | 사용 테이블 / 핵심 컬럼 | 1번 적용 | 2번 적용 |
|---|---|---|---|
| `src/app/coach/race/control/page.tsx` 룸 설정 | `race_events`(`race_format`, `event_type`, `target_distance_m`, `lobby_status`, `coach_id`, `session_id`) | 일부(`event_type`) | ✅ 5개 확장 컬럼 |
| `src/app/coach/race/control/*` 레인/팀 운영 | `race_teams`, `race_live_state`(`event_id`+`device_id`+`lane_number` NOT NULL) | — | ✅ 신설 |
| `src/app/coach/race/control/*` BLE 페어링·QR | `pm5_devices`(`mac_address`, `ble_name`, `current_mode`, `qr_identifier`, `device_type` 확장) | 기본 4컬럼 | ✅ 4개 확장 + CHECK 확장 |
| `src/app/class/race/run/page.tsx` 2.5D 라이브 | `race_live_state` Realtime 구독 (`distance_m`, `power_w`, `lane_number`) | — | ✅ 신설 |
| `src/app/class/race/result/page.tsx` 리더보드 | `race_records`(`finish_rank`, `lane_number`, `team_id`, `recording_id`, `result_distance`) | 기본(`event_id`, `result_distance`) | ✅ 8개 확장 + `event_id` NULLable |
| `/personal/race` 개인 기록 적재 | `race_records`(`event_id` NULL 허용, `device_serial`) | — | ✅ NOT NULL 해제 |
| Python BLE 서버 → Recorder | `race_recordings`(`device_serial`, `file_path`, `total_data_points`) → `race_records.recording_id` | — | ✅ 신설 + FK 연결 |
| `/coach/schedule` 카드 race 배지 | `race_events.session_id` (Priority 22 RPC `fn_get_coach_schedule` 참조) | — | ✅ FK 추가 |
| `/admin/race-management` 운영 모니터 | `race_events`, `pm5_devices`, `race_records` 통합 조회 | ✅ | ✅ 확장 |

> **결론**: Priority 21에서 변경된 항목(simulator device_id 처리, recorder lane meta, status·adapter·team 정합성 등)은 모두 **위 컬럼 위에서 코드 레벨로 해결**되었습니다. 추가 마이그레이션은 필요 없습니다.

---

## 2. 마이그레이션 본문 적용

### 경로 A — Supabase CLI (권장)
```bash
# 최초 1회
supabase login
supabase link --project-ref meklaisrcpecuwwwakhv   # DEV
# 또는
supabase link --project-ref cbtgziqhahujxffqtjhd   # PROD

# 적용 — supabase/migrations/ 안의 미적용 파일이 시간순으로 push 됩니다
supabase db push
```

CLI는 `supabase_migrations.schema_migrations` 테이블에 적용 이력을 남기므로 이미 적용된 마이그레이션은 자동 skip 됩니다. 따라서 1·2번 둘 다 미적용 → 둘 다 적용, 1번만 적용 → 2번만 추가 적용으로 안전하게 동작합니다.

### 경로 B — Dashboard SQL Editor 수동
> 두 파일을 **반드시 순서대로** 별도 쿼리로 실행하세요. 한 번에 합쳐 실행하면 트랜잭션 오류 시 롤백 범위가 모호해집니다.

1. Supabase Dashboard → 대상 프로젝트 → **SQL Editor** → **New query**
2. [20260217203700_create_race_system.sql](../../../supabase/migrations/20260217203700_create_race_system.sql) 전체(92줄) 복사 → 붙여넣기 → **Run**
3. 정상 종료 후, **새 쿼리 탭**을 열어 [20260221084721_race_system_enhancement.sql](../../../supabase/migrations/20260221084721_race_system_enhancement.sql) 전체(120줄) 복사 → 붙여넣기 → **Run**

---

## 3. Post-apply 검증 SQL

### 3.1 테이블 6개 생성 확인
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('race_events','race_records','pm5_devices','race_teams','race_live_state','race_recordings')
ORDER BY table_name;
-- 기대: 6행
```

### 3.2 1번 마이그레이션 검증 — 핵심 컬럼/인덱스
```sql
-- race_events 핵심 컬럼
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='race_events'
  AND column_name IN ('id','facility_id','name','event_date','event_type','status')
ORDER BY column_name;
-- 기대: 6행

-- race_records UNIQUE 제약
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.race_records'::regclass AND contype = 'u';
-- 기대: UNIQUE(event_id, member_id)

-- pm5_devices.serial_number UNIQUE
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.pm5_devices'::regclass AND contype = 'u';
-- 기대: UNIQUE(serial_number)

-- 인덱스 6개
SELECT indexname FROM pg_indexes
WHERE schemaname='public'
  AND indexname IN (
    'idx_race_events_facility','idx_race_events_date','idx_race_events_status',
    'idx_race_records_event','idx_race_records_member','idx_pm5_devices_facility'
  )
ORDER BY indexname;
-- 기대: 6행
```

### 3.3 2번 마이그레이션 검증 — 확장 컬럼
```sql
-- race_events 확장 컬럼 5종
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='race_events'
  AND column_name IN ('race_format','session_id','coach_id','target_distance_m','lobby_status')
ORDER BY column_name;
-- 기대: 5행

-- pm5_devices 확장 컬럼 4종 + device_type CHECK 확장
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='pm5_devices'
  AND column_name IN ('mac_address','ble_name','current_mode','qr_identifier')
ORDER BY column_name;
-- 기대: 4행

SELECT pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.pm5_devices'::regclass
  AND conname = 'pm5_devices_device_type_check';
-- 기대: CHECK clause에 'rower','bike','skierg','treadmill','other' 5종 포함

-- race_records 확장 컬럼 8종 + event_id NULLable 해제 (총 9행)
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_schema='public' AND table_name='race_records'
  AND column_name IN ('event_id','max_watts','max_hr_bpm','avg_spm','avg_hr_bpm','recording_id','team_id','lane_number','finish_rank')
ORDER BY column_name;
-- 기대: 9행, event_id.is_nullable='YES', 나머지 8개 모두 is_nullable='YES'

-- race_records 전체 컬럼 수 = 19 (정본 타입과 일치)
SELECT COUNT(*) AS column_count FROM information_schema.columns
WHERE table_schema='public' AND table_name='race_records';
-- 기대: 19

-- race_live_state 핵심 NOT NULL 검증
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_schema='public' AND table_name='race_live_state'
  AND column_name IN ('event_id','device_id','lane_number')
ORDER BY column_name;
-- 기대: 3행 모두 is_nullable='NO'

-- 신규 테이블 3종 핵심 컬럼
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema='public'
  AND table_name IN ('race_teams','race_live_state','race_recordings')
ORDER BY table_name, ordinal_position;
```

### 3.4 RLS 활성화 + 정책 확인
```sql
-- 6개 테이블 모두 RLS 활성화
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname='public'
  AND tablename IN ('race_events','race_records','pm5_devices','race_teams','race_live_state','race_recordings')
ORDER BY tablename;
-- 기대: 6행, rowsecurity=true

-- 정책 카운트 확인
SELECT tablename, COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname='public'
  AND tablename IN ('race_events','race_records','pm5_devices','race_teams','race_live_state','race_recordings')
GROUP BY tablename
ORDER BY tablename;
-- 기대:
--   race_events,race_records,pm5_devices: 각 2 (read + admin manage)
--   race_teams,race_live_state,race_recordings: 각 2 (read + coach/admin manage)
```

### 3.5 외래키 무결성 샘플
```sql
-- race_live_state → race_events / pm5_devices / race_teams / members 4개 FK
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.race_live_state'::regclass AND contype = 'f';

-- race_records.recording_id → race_recordings.id FK
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.race_records'::regclass
  AND contype = 'f'
  AND conname ILIKE '%recording%';
```

---

## 4. 데이터 라이프사이클 스모크 테스트

> 이 시나리오는 실 데이터를 변경하므로 **DEV에서만** 수행하세요. PROD에서는 §3 정적 검증으로 충분합니다.

```sql
BEGIN;

-- (1) 시드: 임의 facility/coach 가져오기
WITH f AS (SELECT id FROM public.facilities LIMIT 1),
     c AS (SELECT id FROM public.coaches LIMIT 1)
SELECT (SELECT id FROM f) AS facility_id, (SELECT id FROM c) AS coach_id;

-- (2) race_event 생성 (위에서 얻은 facility_id, coach_id 대입)
INSERT INTO public.race_events (facility_id, coach_id, name, event_date, event_type, status, race_format, target_distance_m, lobby_status)
VALUES ('<FACILITY_ID>', '<COACH_ID>', '[smoke] race', CURRENT_DATE, 'rowing', 'scheduled', 'individual', 2000, 'setup')
RETURNING id;

-- (3) pm5_device 생성
INSERT INTO public.pm5_devices (facility_id, serial_number, device_type, status, current_mode)
VALUES ('<FACILITY_ID>', 'SMK-PM5-0001', 'rower', 'online', 'idle')
RETURNING id;

-- (4) race_team 생성
INSERT INTO public.race_teams (event_id, team_name, team_color)
VALUES ('<EVENT_ID>', 'Team A', '#FF6A00')
RETURNING id;

-- (5) race_live_state 1행 (event+device UNIQUE)
INSERT INTO public.race_live_state (event_id, device_id, lane_number, distance_m, power_w, connection_status)
VALUES ('<EVENT_ID>', '<DEVICE_ID>', 1, 0, 0, 'connected')
RETURNING id;

-- (6) race_recording → race_record 연결
INSERT INTO public.race_recordings (event_id, device_id, device_serial, file_path, total_data_points, duration_seconds)
VALUES ('<EVENT_ID>', '<DEVICE_ID>', 'SMK-PM5-0001', '/tmp/smk.csv', 100, 60)
RETURNING id;

INSERT INTO public.race_records (event_id, member_id, device_serial, result_distance, finish_rank, lane_number, recording_id)
VALUES ('<EVENT_ID>', NULL, 'SMK-PM5-0001', 2000.00, 1, 1, '<RECORDING_ID>')
RETURNING id;
-- ※ event_id NULLable 검증을 원하면 별도 INSERT (event_id=NULL)도 가능해야 함

-- (7) 정리
ROLLBACK;
```

### 검증 완료 기준
- [ ] 6개 테이블 생성 + RLS 활성화
- [ ] 컬럼 수 일치: `race_events` 16 / `race_records` 19 / `pm5_devices` 13 / `race_teams` 6 / `race_live_state` 14 / `race_recordings` 12 (`src/types/supabase.ts` 기준)
- [ ] `race_live_state.event_id` / `device_id` / `lane_number` 모두 NOT NULL
- [ ] `race_live_state` UNIQUE(`event_id`, `device_id`) 동작
- [ ] `race_records.event_id` NULLable 동작 (개인 기록용 — `/personal/race`에서 event 없이 기록 적재)
- [ ] coach 사용자가 `race_recordings` / `race_live_state` / `race_teams` INSERT 가능 (admin 외 코치 운영 허용)

---

## 5. 프론트엔드 회귀 체크리스트

| 화면 | 시나리오 | 기대 |
|---|---|---|
| `/coach/race` | 진입 | 기기 목록(`pm5_devices`) + 최근 race_events 조회 |
| `/coach/race/control` | 룸 설정 | race_format / target_distance / event_type 선택 후 race_event INSERT |
| `/coach/race/control` | 레인 배정 | race_teams 생성, race_live_state INSERT |
| `/coach/race/control` | GO → 종료 | race_live_state 실시간 갱신 → race_records 일괄 적재 |
| `/class/race/run` | 2.5D 라이브 | race_live_state Realtime 구독으로 lane 진척도 표시 |
| `/class/race/result` | 결과 보드 | finish_rank / result_distance 기준 정렬 |
| `/coach/schedule` | session 카드 race 배지 | `EXISTS (race_events.session_id = s.id)` 일치 |

---

## 6. 알려진 운영 메모 (Priority 21 감사 결과)

다음 항목은 **DB 스키마 변경 불필요**한 코드/운영 영역입니다. 스키마 적용 후 화면 회귀 테스트 시 참고하세요.

| ID | 영역 | 메모 | 코드에서의 처리 방식 |
|---|---|---|---|
| O-1 | `pm5_devices.status` ENUM | 컬럼은 자유 텍스트(`text`). 코드는 `online`/`offline`/`idle`/`racing` 등을 사용 | 어댑터 레이어에서 정규화. 추가 CHECK 제약을 원하면 신규 마이그레이션 필요 |
| O-2 | `race_recordings.device_serial` ↔ `race_records.device_serial` 조인 | FK 없음(문자열 매칭) | Python 서버가 `device_serial`을 신뢰원으로 적재; UI는 `recording_id`로 직접 접근 |
| O-3 | Simulator `device_id` 처리 | `race_live_state.device_id`는 NOT NULL → 시뮬레이터 모드에서도 `pm5_devices`에 simulator 행을 미리 시드 | facility별 `simulator-*` UUID 시드를 코드에서 보장 (Priority 21에서 정합) |
| O-4 | Lane 배정 메타 영속화 | `race_live_state.lane_number`만 영속, "lane→team→member" 매핑 전체는 메모리/Realtime 채널 | 새로 고침 시 `race_live_state` + `race_teams`로 복원 가능 |
| O-5 | `race_records.event_id` NULL | 개인 기록(`/personal/race`) 시 `event_id` NULL로 적재 — 2번 마이그레이션의 NOT NULL 해제 필수 | 적용 누락 시 개인 기록 INSERT 실패 → 반드시 §3.3 9행 검증 통과 |

> 위 메모는 **`/Users/kimchoho/dev/workspace/BCL-portal/src/types/supabase.ts` (2026-04-25 기준) 정본 타입과 현재 코드 사용 현황 감사** 결과입니다. 스키마 변경이 필요하다고 판단되는 항목이 새로 발견되면 신규 마이그레이션을 추가하고 본 표를 갱신하세요.

---

## 7. 롤백 절차

> Race 도메인은 다른 도메인과 직접 의존 관계가 적습니다. 단, **Priority 22 마이그레이션의 `fn_get_coach_schedule` / `fn_get_coach_session_board`가 `race_events.session_id`를 참조**하므로 Race 테이블을 drop하기 전에 Priority 22 RPC를 먼저 제거하거나 함수를 수정해야 합니다.

```sql
-- Priority 22 RPC가 race_events를 참조하는지 확인
SELECT p.proname FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public' AND p.prosrc ILIKE '%race_events%';
-- 기대: fn_get_coach_schedule, fn_get_coach_session_board 등

-- 롤백 (의존성 역순)
DROP TABLE IF EXISTS public.race_recordings CASCADE;
DROP TABLE IF EXISTS public.race_live_state CASCADE;
DROP TABLE IF EXISTS public.race_teams CASCADE;

-- race_records의 추가 컬럼 제거 (테이블 자체는 1번 마이그레이션 자산)
ALTER TABLE public.race_records DROP COLUMN IF EXISTS finish_rank;
ALTER TABLE public.race_records DROP COLUMN IF EXISTS lane_number;
ALTER TABLE public.race_records DROP COLUMN IF EXISTS team_id;
ALTER TABLE public.race_records DROP COLUMN IF EXISTS recording_id;
ALTER TABLE public.race_records DROP COLUMN IF EXISTS avg_hr_bpm;
ALTER TABLE public.race_records DROP COLUMN IF EXISTS avg_spm;
ALTER TABLE public.race_records DROP COLUMN IF EXISTS max_hr_bpm;
ALTER TABLE public.race_records DROP COLUMN IF EXISTS max_watts;
-- event_id NOT NULL 복구는 데이터 정합성 점검 후 수행
ALTER TABLE public.race_records ALTER COLUMN event_id SET NOT NULL;

-- pm5_devices 확장 원복
ALTER TABLE public.pm5_devices DROP CONSTRAINT IF EXISTS pm5_devices_device_type_check;
ALTER TABLE public.pm5_devices ADD CONSTRAINT pm5_devices_device_type_check
    CHECK (device_type IN ('rower','bike','skierg'));
ALTER TABLE public.pm5_devices DROP COLUMN IF EXISTS qr_identifier;
ALTER TABLE public.pm5_devices DROP COLUMN IF EXISTS current_mode;
ALTER TABLE public.pm5_devices DROP COLUMN IF EXISTS ble_name;
ALTER TABLE public.pm5_devices DROP COLUMN IF EXISTS mac_address;

-- race_events 확장 원복
ALTER TABLE public.race_events DROP COLUMN IF EXISTS lobby_status;
ALTER TABLE public.race_events DROP COLUMN IF EXISTS target_distance_m;
ALTER TABLE public.race_events DROP COLUMN IF EXISTS coach_id;
ALTER TABLE public.race_events DROP COLUMN IF EXISTS session_id;
ALTER TABLE public.race_events DROP COLUMN IF EXISTS race_format;

-- 1번 마이그레이션 전체 원복 (Race 시스템 완전 제거)
DROP TABLE IF EXISTS public.race_records CASCADE;
DROP TABLE IF EXISTS public.race_events CASCADE;
DROP TABLE IF EXISTS public.pm5_devices CASCADE;
```

> CASCADE는 다른 객체 의존성이 있는 경우에만 사용하세요. 일반적으로는 RPC/뷰를 먼저 제거하고 테이블을 명시적 drop 하는 편이 안전합니다.

---

## 8. 적용 기록 (작업자가 채워주세요)

| 환경 | 적용 일시(KST) | 작업자 | 적용 방식 | 1번 (`create_race_system`) | 2번 (`race_system_enhancement`) | 스모크 | 비고 |
|---|---|---|---|---|---|---|---|
| DEV | | | CLI / Dashboard | ✅/❌ | ✅/❌ | ✅/❌ | |
| PROD | | | CLI / Dashboard | ✅/❌ | ✅/❌ | ✅/❌ | |

---

## 참고
- 본문 SSOT 1: [supabase/migrations/20260217203700_create_race_system.sql](../../../supabase/migrations/20260217203700_create_race_system.sql)
- 본문 SSOT 2: [supabase/migrations/20260221084721_race_system_enhancement.sql](../../../supabase/migrations/20260221084721_race_system_enhancement.sql)
- 기획서: [.docs/archive/planning/race-system.md](../../archive/planning/race-system.md)
- 사이트맵: [.docs/sitemap/coach-app.md](../../sitemap/coach-app.md) §1-4 Race
- 운영 수용 체크리스트: [.docs/testing/race-acceptance-checklist.md](../../testing/race-acceptance-checklist.md)
- 의존 가이드: [.docs/database/migrations/20260425_priority22_apply.md](./20260425_priority22_apply.md) (Priority 22 RPC가 `race_events`를 참조)
