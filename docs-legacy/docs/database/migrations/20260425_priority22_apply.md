# Priority 22 — Coach P0 Session Operations 마이그레이션 적용 가이드

이 문서는 Priority 22(코치앱 P0 운영 안정화) 마이그레이션을 Supabase 원격 DB에 안전하게 적용하기 위한 단계별 절차서입니다. 마이그레이션 본문은 [supabase/migrations/20260425120000_coach_p0_session_ops.sql](../../../supabase/migrations/20260425120000_coach_p0_session_ops.sql) 1개 파일이며, 이 가이드는 그 파일을 **DEV → PROD** 순서로 적용하는 실행/검증 스크립트를 모은 동반 문서입니다.

> **중요**: 본 문서의 SQL은 dashboard SQL Editor에서 그대로 복사·실행할 수 있도록 자기완결적으로 작성되어 있습니다. CLI(`supabase db push`)를 쓸 경우 Step 0~3은 생략 가능합니다.

---

## 0. 사전 조건

| 항목 | 확인 |
|---|---|
| 적용 환경 | DEV(`meklaisrcpecuwwwakhv`) 우선 → 검증 후 PROD(`cbtgziqhahujxffqtjhd`) |
| 다운타임 | 불필요 (모든 DDL은 `ADD COLUMN IF NOT EXISTS`, 함수는 `CREATE OR REPLACE`) |
| 백업 | Supabase 자동 일일 스냅샷 외 별도 백업 권장 (대시보드 → Database → Backups) |
| 롤백 가능성 | 컬럼 추가/함수 추가만 수행 — 기존 컬럼·함수 변경/삭제 없음. 자세한 절차 §6 참조 |

### 변경 요약
1. `bookings` 테이블에 5개 컬럼 추가: `attendance_outcome`, `attendance_marked_at`, `attendance_marked_by`, `waitlist_promoted_at`, `cancel_reason`
2. `session_coaches` 테이블에 2개 컬럼 추가: `assignment_role`, `display_order`
3. 신규 RPC 6종 등록 (`SECURITY DEFINER` + `auth.uid()` 권한 체크):
   - `fn_get_my_coach_context()`
   - `fn_get_my_coach_dashboard()`
   - `fn_get_coach_schedule(p_from DATE, p_to DATE)`
   - `fn_get_coach_session_board(p_session_id UUID)`
   - `fn_mark_session_attendance(p_session_id UUID, p_member_id UUID, p_action TEXT)`
   - `fn_bulk_mark_session_attendance(p_session_id UUID, p_payload JSONB)`
4. 기존 RPC 3종 DEPRECATED 표기(삭제 X): `fn_get_coach_dashboard`, `fn_get_session_attendees`, `fn_coach_mark_attendance`
5. 백필: 기존 `checkins` 보유 booking → `attendance_outcome='checked_in'`, 기존 `bookings.status='no_show'` → `attendance_outcome='no_show'`, 기존 `session_coaches.role='assistant'` → `assignment_role='assistant'`

---

## 1. Pre-flight 검증 (적용 전, 1분)

마이그레이션 적용 직전 환경 가정이 맞는지 확인합니다.

```sql
-- (1) 대상 컬럼이 아직 없어야 합니다 — 결과는 0행
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'bookings'
  AND column_name IN ('attendance_outcome','attendance_marked_at','attendance_marked_by','waitlist_promoted_at','cancel_reason');

SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'session_coaches'
  AND column_name IN ('assignment_role','display_order');

-- (2) DEPRECATED COMMENT가 참조하는 기존 함수 시그니처가 존재해야 합니다 — 결과는 정확히 3행
SELECT n.nspname AS schema, p.proname AS function, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('fn_get_coach_dashboard','fn_get_session_attendees','fn_coach_mark_attendance')
ORDER BY p.proname;

-- (3) bookings.status에 사용된 값 분포 확인 (waitlist/waitlisted 혼용 여부)
SELECT status, COUNT(*) FROM public.bookings GROUP BY status ORDER BY 2 DESC;

-- (4) 영향 받는 row 규모 추정
SELECT
    (SELECT COUNT(*) FROM public.bookings) AS bookings_total,
    (SELECT COUNT(*) FROM public.checkins) AS checkins_total,
    (SELECT COUNT(*) FROM public.session_coaches) AS session_coaches_total;
```

> **이상 시 STOP**: (1)이 0행이 아니면 이미 일부 적용된 상태이거나 충돌 가능성이 있습니다. (2)가 3행이 아니면 마지막 DEPRECATED COMMENT 단계가 실패합니다.

---

## 2. 마이그레이션 본문 적용

### 경로 A — Supabase CLI (권장)
```bash
# 최초 1회
supabase login
supabase link --project-ref meklaisrcpecuwwwakhv   # DEV
# 또는
supabase link --project-ref cbtgziqhahujxffqtjhd   # PROD

# 적용 (이 1줄만으로 supabase/migrations/ 안의 미적용 파일이 push 됩니다)
supabase db push
```

### 경로 B — Dashboard SQL Editor 수동
1. Supabase Dashboard → 대상 프로젝트 → **SQL Editor** → **New query**
2. 로컬 [supabase/migrations/20260425120000_coach_p0_session_ops.sql](../../../supabase/migrations/20260425120000_coach_p0_session_ops.sql) 파일 전체(713줄) 복사 → 붙여넣기 → **Run**
3. 정상 종료 메시지 확인 (`Success. No rows returned` 또는 `8 rows affected` 류)

> 본 문서에 SQL 본문을 다시 복제하지 않는 이유: SSOT(`.sql` 파일)와 사본 사이의 drift 위험을 차단하기 위함입니다. 항상 `supabase/migrations/` 파일을 기준으로 사용하세요.

---

## 3. Post-apply 검증 SQL (적용 직후, 2분)

### 3.1 스키마 적용 확인
```sql
-- bookings 5개 컬럼 모두 추가되었는지 — 5행
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'bookings'
  AND column_name IN ('attendance_outcome','attendance_marked_at','attendance_marked_by','waitlist_promoted_at','cancel_reason')
ORDER BY column_name;

-- attendance_outcome CHECK 제약 확인 — 1행 (CHECK clause에 6개 값 포함)
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.bookings'::regclass AND contype = 'c'
  AND pg_get_constraintdef(oid) ILIKE '%attendance_outcome%';

-- session_coaches 2개 컬럼 — 2행
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'session_coaches'
  AND column_name IN ('assignment_role','display_order')
ORDER BY column_name;

-- 인덱스 — 1행
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname='public' AND tablename='bookings' AND indexname='idx_bookings_attendance_outcome';
```

### 3.2 신규 RPC 6종 등록 확인
```sql
-- 6행이 정확히 출력되어야 함 (시그니처 포함)
SELECT
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments,
    p.prosecdef AS is_security_definer,
    p.proconfig AS search_path_config
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
      'fn_get_my_coach_context',
      'fn_get_my_coach_dashboard',
      'fn_get_coach_schedule',
      'fn_get_coach_session_board',
      'fn_mark_session_attendance',
      'fn_bulk_mark_session_attendance'
  )
ORDER BY p.proname;
-- 기대: prosecdef=true, search_path_config={search_path=public}
```

### 3.3 권한(REVOKE PUBLIC + GRANT authenticated) 확인
```sql
-- 각 함수별로 authenticated만 EXECUTE 권한이 있어야 함
SELECT
    p.proname,
    grantee,
    privilege_type
FROM information_schema.routine_privileges rp
JOIN pg_proc p ON p.proname = rp.routine_name
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND rp.routine_name IN (
      'fn_get_my_coach_context',
      'fn_get_my_coach_dashboard',
      'fn_get_coach_schedule',
      'fn_get_coach_session_board',
      'fn_mark_session_attendance',
      'fn_bulk_mark_session_attendance'
  )
ORDER BY p.proname, grantee;
-- 기대: PUBLIC 행 없음, authenticated 행만 존재
```

### 3.4 백필 결과 확인
```sql
-- attendance_outcome 분포 — checked_in/no_show가 일부, 나머지는 pending
SELECT attendance_outcome, COUNT(*) AS cnt
FROM public.bookings
GROUP BY attendance_outcome
ORDER BY cnt DESC;

-- 기존 checkin이 있는데 attendance_outcome='pending'인 booking — 0행이어야 함
SELECT b.id, b.session_id, b.member_id
FROM public.bookings b
JOIN public.checkins c ON c.session_id = b.session_id AND c.member_id = b.member_id
WHERE b.attendance_outcome = 'pending'
LIMIT 10;

-- session_coaches assignment_role 분포 — lead/assistant 2종
SELECT assignment_role, COUNT(*) FROM public.session_coaches GROUP BY 1;

-- 기존 role='assistant'인데 assignment_role!='assistant'인 행 — 0행
SELECT id, session_id, coach_id, role, assignment_role
FROM public.session_coaches
WHERE role = 'assistant' AND assignment_role <> 'assistant';
```

### 3.5 DEPRECATED COMMENT 부착 확인
```sql
-- 3행 모두 [DEPRECATED]로 시작
SELECT
    p.proname,
    pg_get_function_identity_arguments(p.oid) AS args,
    obj_description(p.oid, 'pg_proc') AS comment
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('fn_get_coach_dashboard','fn_get_session_attendees','fn_coach_mark_attendance')
ORDER BY p.proname;
```

---

## 4. RPC 스모크 테스트 (인증 컨텍스트 필요)

> 이 섹션은 **로그인된 코치 사용자 세션**에서 실행해야 합니다. Supabase Dashboard SQL Editor는 기본적으로 service role 컨텍스트라 `auth.uid()`가 NULL을 반환합니다. 검증은 다음 두 경로 중 하나로 수행하세요.

### 경로 A — 프론트엔드(`/coach/dashboard`)에서 자연 호출
1. DEV 환경에서 `npm run dev`
2. 코치 계정으로 로그인 → `/coach/dashboard` 진입
3. 네트워크 탭에서 다음 RPC 호출이 200으로 응답하는지 확인:
   - `POST /rest/v1/rpc/fn_get_my_coach_context` → `{success: true, status: "linked_active"|"linked_unassigned"|...}`
   - `POST /rest/v1/rpc/fn_get_my_coach_dashboard` → `{success: true, data: {today_sessions, risk_summary, ...}}`
4. `/coach/schedule` 진입 → `fn_get_coach_schedule` 호출 확인
5. 세션 카드 클릭 → `fn_get_coach_session_board` 호출 + 운영 보드 렌더링 확인
6. 회원 출결 버튼(✅/🚫/⏰/🛡) 클릭 → `fn_mark_session_attendance` 호출 후 카운터 갱신 확인
7. 일괄 체크인 → `fn_bulk_mark_session_attendance` 호출 후 응답 `success_count`/`failure_count` 확인

### 경로 B — Dashboard SQL Editor에서 권한 시뮬레이션
> service role을 일시적으로 코치 사용자로 위장합니다. **검증 후 반드시 `RESET ROLE`로 복귀**하세요.

```sql
-- (1) 임의 코치 사용자 user_id 조회
SELECT c.id AS coach_id, c.name, c.user_id, u.email
FROM public.coaches c
JOIN auth.users u ON u.id = c.user_id
WHERE c.status = 'active'
LIMIT 5;

-- (2) JWT claim을 흉내내어 auth.uid()가 해당 user_id를 반환하도록 설정
--     아래 '<USER_ID>'를 (1)에서 얻은 user_id로 교체
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"<USER_ID>","role":"authenticated"}';

-- (3) 컨텍스트 RPC 호출
SELECT public.fn_get_my_coach_context();
SELECT public.fn_get_my_coach_dashboard();
SELECT public.fn_get_coach_schedule(CURRENT_DATE - 7, CURRENT_DATE + 7);

-- (4) 세션 보드 — 위 사용자가 배정된 세션 1개를 골라
SELECT s.id, s.title, s.session_date, s.start_time
FROM public.sessions s
JOIN public.session_coaches sc ON sc.session_id = s.id
WHERE sc.coach_id = '<COACH_ID>'
ORDER BY s.session_date DESC
LIMIT 5;

SELECT public.fn_get_coach_session_board('<SESSION_ID>');

-- (5) (선택) 출결 액션은 데이터를 변경하므로 begin/rollback로 격리
BEGIN;
SELECT public.fn_mark_session_attendance('<SESSION_ID>', '<MEMBER_ID>', 'checked_in');
ROLLBACK;

-- (6) 권한 위반 케이스 — 다른 코치의 세션에 접근 시 forbidden 응답이어야 함
SELECT public.fn_get_coach_session_board('<OTHER_COACH_SESSION_ID>');
-- 기대: { success: false, status: 'forbidden', error: 'not_assigned_to_session' }

-- (7) 컨텍스트 복귀 — 반드시 실행
RESET ROLE;
RESET request.jwt.claims;
```

### 검증 완료 기준 (모두 통과해야 함)
- [ ] `fn_get_my_coach_context`가 4가지 상태(`linked_active` / `linked_unassigned` / `unlinked` / `on_leave`)를 정확히 분기
- [ ] `fn_get_my_coach_dashboard`가 `risk_summary`(`waitlist`/`unchecked_confirmed`/`starting_soon`) 필드 포함
- [ ] `fn_get_coach_schedule(p_from, p_to)`가 `race_linked`/`waitlist_count`/`no_show_count`/`late_cancel_count` 모두 반환
- [ ] `fn_get_coach_session_board(p_session_id)`: 배정 코치 → `success:true`, 미배정 코치 → `forbidden`
- [ ] `fn_mark_session_attendance`: `checked_in` 시 `checkins` 신규 row 생성, `bookings.attendance_outcome` 갱신, `attendance_marked_by`에 `auth.uid()` 기록
- [ ] `fn_bulk_mark_session_attendance`: 부분 성공 응답(`success_count`/`failure_count`/`results[]`) 반환

---

## 5. 프론트엔드 회귀 체크리스트

마이그레이션 적용 후 코치앱이 기대대로 동작하는지 확인합니다.

| 화면 | 시나리오 | 기대 |
|---|---|---|
| `/coach/dashboard` | 일반 진입 | Risk Summary 카드 + Today Sessions 카드 정상 |
| `/coach/dashboard` | 미배정 코치 로그인 | `CoachStateScreen(linked_unassigned)` 노출, 위젯 미렌더 |
| `/coach/dashboard` | 미연결 사용자 로그인(코치 매핑 X) | `CoachStateScreen(unlinked)` + `/coach/profile` 링크만 가능 |
| `/coach/schedule` | day/week 토글 | RPC 응답 즉시 갱신 |
| `/coach/schedule` | 세션 카드 클릭 | `SessionOperationsBoard` 바텀시트 진입 |
| 운영 보드 | 단건 출결 (✅/🚫/⏰/🛡) | 카운터 즉시 갱신, 실패 시 토스트 |
| 운영 보드 | 일괄 체크인/노쇼 | 부분 성공 시 실패 케이스 노출 |
| `/coach/members` | 기본 진입 | 스코프 `담당 회원`이 활성 상태로 표시 |
| `/coach/profile` | 활동 중 코치 | 상태 배지 `✅ 활동 중 · 배정 N건` |
| `/coach/profile` | 미배정/휴직 코치 | 상태 배지 + 운영 메뉴(일정/회원/Race) 숨김 |

---

## 6. 롤백 절차 (필요시)

> 본 마이그레이션은 **추가만** 수행하므로 롤백은 정상 운영에 영향이 없으며, 백필된 `attendance_outcome` 데이터를 잃을 뿐입니다. 롤백 전에 백필 데이터 백업을 권장합니다.

```sql
-- (선택) 백필 데이터 백업
CREATE TABLE backup_bookings_attendance_20260425 AS
SELECT id, attendance_outcome, attendance_marked_at, attendance_marked_by
FROM public.bookings
WHERE attendance_outcome <> 'pending';

-- (1) 신규 RPC 6종 제거
DROP FUNCTION IF EXISTS public.fn_bulk_mark_session_attendance(UUID, JSONB);
DROP FUNCTION IF EXISTS public.fn_mark_session_attendance(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.fn_get_coach_session_board(UUID);
DROP FUNCTION IF EXISTS public.fn_get_coach_schedule(DATE, DATE);
DROP FUNCTION IF EXISTS public.fn_get_my_coach_dashboard();
DROP FUNCTION IF EXISTS public.fn_get_my_coach_context();

-- (2) DEPRECATED COMMENT 원복
COMMENT ON FUNCTION public.fn_get_coach_dashboard(UUID) IS NULL;
COMMENT ON FUNCTION public.fn_get_session_attendees(UUID) IS NULL;
COMMENT ON FUNCTION public.fn_coach_mark_attendance(UUID, UUID, UUID) IS NULL;

-- (3) session_coaches 컬럼 제거
ALTER TABLE public.session_coaches DROP COLUMN IF EXISTS display_order;
ALTER TABLE public.session_coaches DROP COLUMN IF EXISTS assignment_role;

-- (4) bookings 컬럼 제거
DROP INDEX IF EXISTS public.idx_bookings_attendance_outcome;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS cancel_reason;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS waitlist_promoted_at;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS attendance_marked_by;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS attendance_marked_at;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS attendance_outcome;
```

> 롤백 후 프론트엔드는 신규 RPC 호출에서 404를 받게 되므로, 코드 또한 이전 버전(commit `a54f224` 이전)으로 되돌려야 합니다.

---

## 7. 적용 기록 (작업자가 채워주세요)

| 환경 | 적용 일시(KST) | 작업자 | 적용 방식 | Pre-flight | Post-apply | 스모크 | 비고 |
|---|---|---|---|---|---|---|---|
| DEV | | | CLI / Dashboard | ✅/❌ | ✅/❌ | ✅/❌ | |
| PROD | | | CLI / Dashboard | ✅/❌ | ✅/❌ | ✅/❌ | |

---

## 참고
- 본문 SSOT: [supabase/migrations/20260425120000_coach_p0_session_ops.sql](../../../supabase/migrations/20260425120000_coach_p0_session_ops.sql)
- 실행 스펙: [.docs/archive/planning/coach-app-p0-execution-20260425.md](../../archive/planning/coach-app-p0-execution-20260425.md)
- 사이트맵: [.docs/sitemap/coach-app.md](../../sitemap/coach-app.md)
- 마스터 플랜: [.docs/archive/planning/coach-app-master-plan-20260425.md](../../archive/planning/coach-app-master-plan-20260425.md)
