# Priority 23 — Coach P1-A 수업 표준화 + 회원 컨텍스트 마이그레이션 적용 가이드

이 문서는 Priority 23 P1-A(코치앱 수업 표준화 + 회원 컨텍스트) 마이그레이션을 Supabase 원격 DB에 안전하게 적용하기 위한 단계별 절차서입니다. 마이그레이션 본문은 [supabase/migrations/20260426120000_p1a_class_standardization.sql](../../../supabase/migrations/20260426120000_p1a_class_standardization.sql) 1개 파일이며, 이 가이드는 그 파일을 **DEV → PROD** 순서로 적용하는 실행/검증 스크립트를 모은 동반 문서입니다.

> **중요**: 본 문서의 SQL은 Dashboard SQL Editor에서 그대로 복사·실행할 수 있도록 자기완결적으로 작성되어 있습니다. CLI(`supabase db push`)를 쓸 경우 Step 0~3은 생략 가능합니다.

---

## 0. 사전 조건

| 항목 | 확인 |
|---|---|
| 적용 환경 | DEV(`meklaisrcpecuwwwakhv`) 우선 → 검증 후 PROD(`cbtgziqhahujxffqtjhd`) |
| 다운타임 | 불필요 (모든 DDL은 `CREATE TABLE IF NOT EXISTS` / `CREATE OR REPLACE FUNCTION` / 시드 `ON CONFLICT DO NOTHING`) |
| 의존 마이그레이션 | Priority 22(`20260425120000_coach_p0_session_ops.sql`) 적용 완료 필수 |
| 백업 | Supabase 자동 일일 스냅샷 외 별도 백업 권장 (대시보드 → Database → Backups) |
| 롤백 가능성 | 신규 테이블·함수 추가만 수행 — 기존 컬럼·함수 변경/삭제 없음. 자세한 절차 §6 참조 |

### 변경 요약
1. **신규 테이블 7종**:
   - `movement_library` (12 cols) — 전 시설 공유 운동 사전
   - `wod_templates` (16 cols) — 재사용 WOD 템플릿 (facility NULL=글로벌)
   - `wod_template_movements` (13 cols) — 템플릿 movement line
   - `session_wods` (16 cols) — 세션별 WOD 스냅샷 (UNIQUE session_id)
   - `class_runbook_templates` (15 cols) — 시설 표준 런시트
   - `session_runbooks` (13 cols) — 세션별 런시트 오버라이드 (UNIQUE session_id)
   - `member_alert_flags` (12 cols) — 회원 컨텍스트 플래그
2. **RLS 정책 7세트**: 읽기=authenticated, 관리=admin/coach (member_alert_flags select도 admin/coach 한정)
3. **헬퍼 함수 2종** (`SECURITY DEFINER`):
   - `_p1a_assert_coach_or_admin()` → UUID
   - `_p1a_assert_coach_can_edit_session(p_session_id UUID)` → UUID
4. **신규 RPC 14종** (모두 `SECURITY DEFINER` + `auth.uid()` + 응답 envelope `{success, status, data, error}`):
   - WOD: `fn_search_wod_movements`, `fn_list_wod_templates`, `fn_upsert_wod_template`, `fn_get_session_wod`, `fn_upsert_session_wod`, `fn_publish_session_wod`, `fn_get_class_display_wod`
   - Runbook: `fn_list_runbook_templates`, `fn_upsert_runbook_template`, `fn_get_session_runbook`, `fn_upsert_session_runbook`
   - Member Alert: `fn_list_member_alert_flags`, `fn_upsert_member_alert_flag`, `fn_get_member_context_panel`
5. **시드 데이터**:
   - `movement_library` 35종 (Weightlifting 8 / Gymnastics 10 / Mono 5 / DB 3 / KB 3 / MedBall 2 / Other 2 / Accessory 2)
   - 글로벌 벤치마크 `wod_templates` 10종 (Fran, Grace, Helen, Cindy, Diane, Annie, Karen, Nancy, Isabel, Barbara) + movement line 일괄
6. **DEPRECATED 표기 (삭제 X)**: `public.sessions.wod_description` 컬럼, `public.wods` 테이블 — `/class/wod` 화면이 `fn_get_class_display_wod()`로 전환된 뒤 단계적 제거

---

## 1. Pre-flight 검증 (적용 전, 1분)

마이그레이션 적용 직전 환경 가정이 맞는지 확인합니다.

```sql
-- (1) 대상 테이블이 아직 없어야 합니다 — 결과는 0행
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'movement_library','wod_templates','wod_template_movements',
    'session_wods','class_runbook_templates','session_runbooks',
    'member_alert_flags'
  );

-- (2) Priority 22 마이그레이션이 선행되어야 합니다 — 결과는 6행
SELECT p.proname
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'fn_get_my_coach_context','fn_get_my_coach_dashboard',
    'fn_get_coach_schedule','fn_get_coach_session_board',
    'fn_mark_session_attendance','fn_bulk_mark_session_attendance'
  );

-- (3) 의존 테이블이 존재해야 합니다 — 결과는 5행
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('facilities','sessions','members','memberships','membership_plans');

-- (4) 영향 받는 row 규모 확인 (참고용)
SELECT
    (SELECT COUNT(*) FROM public.sessions) AS sessions_total,
    (SELECT COUNT(*) FROM public.members) AS members_total,
    (SELECT COUNT(*) FROM public.facilities) AS facilities_total;
```

> **이상 시 STOP**: (1)이 0행이 아니면 일부 적용된 상태이거나 충돌 가능성. (2)가 6행 미만이면 Priority 22를 먼저 적용하세요. (3)이 5행 미만이면 base schema가 누락된 환경입니다.

---

## 2. 마이그레이션 본문 적용

### 경로 A — Supabase CLI (권장)
```bash
# 최초 1회
supabase login
supabase link --project-ref meklaisrcpecuwwwakhv   # DEV
# 또는
supabase link --project-ref cbtgziqhahujxffqtjhd   # PROD

# 적용
supabase db push
```

### 경로 B — Dashboard SQL Editor 수동
1. Supabase Dashboard → 대상 프로젝트 → **SQL Editor** → **New query**
2. 로컬 [supabase/migrations/20260426120000_p1a_class_standardization.sql](../../../supabase/migrations/20260426120000_p1a_class_standardization.sql) 파일 전체(1259줄) 복사 → 붙여넣기 → **Run**
3. 정상 종료 메시지 확인 (`Success. No rows returned` 또는 `35 rows affected` 류)

> 본 문서에 SQL 본문을 다시 복제하지 않는 이유: SSOT(`.sql` 파일)와 사본 사이의 drift 위험을 차단하기 위함입니다. 항상 `supabase/migrations/` 파일을 기준으로 사용하세요.

---

## 3. Post-apply 검증 SQL (적용 직후, 3분)

### 3.1 신규 테이블 7종 적용 확인
```sql
-- 7행이 정확히 출력되어야 함
SELECT table_name,
       (SELECT COUNT(*) FROM information_schema.columns c
        WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_name IN (
    'movement_library','wod_templates','wod_template_movements',
    'session_wods','class_runbook_templates','session_runbooks',
    'member_alert_flags'
  )
ORDER BY t.table_name;
-- 기대 컬럼 수: class_runbook_templates(15), member_alert_flags(12),
--             movement_library(12), session_runbooks(13), session_wods(16),
--             wod_template_movements(13), wod_templates(16)

-- session_wods, session_runbooks의 UNIQUE(session_id) 제약 확인 — 각 1행
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid IN ('public.session_wods'::regclass, 'public.session_runbooks'::regclass)
  AND contype = 'u'
ORDER BY conname;

-- 주요 CHECK 제약 — flag_type, severity, publish_state, format_type 등
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid IN (
    'public.movement_library'::regclass,
    'public.wod_templates'::regclass,
    'public.wod_template_movements'::regclass,
    'public.session_wods'::regclass,
    'public.member_alert_flags'::regclass
)
  AND contype = 'c'
ORDER BY conrelid::regclass::text, conname;
```

### 3.2 신규 RPC 14종 + 헬퍼 2종 등록 확인
```sql
-- 14행 (RPC) + 2행 (helper) = 16행
SELECT
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments,
    p.prosecdef AS is_security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
      '_p1a_assert_coach_or_admin',
      '_p1a_assert_coach_can_edit_session',
      'fn_search_wod_movements',
      'fn_list_wod_templates',
      'fn_upsert_wod_template',
      'fn_get_session_wod',
      'fn_upsert_session_wod',
      'fn_publish_session_wod',
      'fn_get_class_display_wod',
      'fn_list_runbook_templates',
      'fn_upsert_runbook_template',
      'fn_get_session_runbook',
      'fn_upsert_session_runbook',
      'fn_list_member_alert_flags',
      'fn_upsert_member_alert_flag',
      'fn_get_member_context_panel'
  )
ORDER BY p.proname;
-- 기대: 모두 prosecdef=true
```

### 3.3 권한(REVOKE PUBLIC + GRANT authenticated) 확인
```sql
-- 14개 RPC × authenticated만 → 14행
SELECT
    p.proname,
    grantee,
    privilege_type
FROM information_schema.routine_privileges rp
JOIN pg_proc p ON p.proname = rp.routine_name
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND rp.routine_name IN (
      'fn_search_wod_movements','fn_list_wod_templates','fn_upsert_wod_template',
      'fn_get_session_wod','fn_upsert_session_wod','fn_publish_session_wod',
      'fn_get_class_display_wod',
      'fn_list_runbook_templates','fn_upsert_runbook_template',
      'fn_get_session_runbook','fn_upsert_session_runbook',
      'fn_list_member_alert_flags','fn_upsert_member_alert_flag',
      'fn_get_member_context_panel'
  )
  AND rp.grantee = 'authenticated'
ORDER BY p.proname;
-- 기대: 14행 (PUBLIC 행은 0)
```

### 3.4 RLS 정책 등록 확인
```sql
-- 7개 테이블 모두 rowsecurity=true, 정책 14개(테이블당 평균 2개)
SELECT
    schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'movement_library','wod_templates','wod_template_movements',
    'session_wods','class_runbook_templates','session_runbooks',
    'member_alert_flags'
  )
ORDER BY tablename;

-- 정책 목록 (각 테이블별 select/manage 패턴)
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'movement_library','wod_templates','wod_template_movements',
    'session_wods','class_runbook_templates','session_runbooks',
    'member_alert_flags'
  )
ORDER BY tablename, policyname;
```

### 3.5 시드 데이터 확인
```sql
-- 35행 (movement_library 시드)
SELECT category, COUNT(*) FROM public.movement_library
GROUP BY category
ORDER BY category;
-- 기대: weightlifting=8, gymnastics=10, monostructural=5, dumbbell=3,
--      kettlebell=3, medball=2, other_equipment=2, accessory=2

-- 10행 (벤치마크 wod_templates 시드)
SELECT title, format_type, rounds, time_cap_minutes, is_shared, is_benchmark
FROM public.wod_templates
WHERE is_benchmark = TRUE
ORDER BY title;
-- 기대 10종: Annie, Barbara, Cindy, Diane, Fran, Grace, Helen, Isabel, Karen, Nancy

-- 벤치마크 WOD movement line 총 31행
SELECT t.title, COUNT(*) AS movement_lines
FROM public.wod_templates t
JOIN public.wod_template_movements m ON m.wod_template_id = t.id
WHERE t.is_benchmark = TRUE
GROUP BY t.title
ORDER BY t.title;
-- 기대: Fran=6, Grace=1, Helen=3, Cindy=3, Diane=6, Annie=10, Karen=1, Nancy=2, Isabel=1, Barbara=4 (Sit-up은 custom_label)

-- custom_label 사용 확인 (Annie의 Sit-up + Barbara의 Sit-up = 6행)
SELECT t.title, m.sort_order, m.custom_label, m.target_value, m.target_unit
FROM public.wod_template_movements m
JOIN public.wod_templates t ON t.id = m.wod_template_id
WHERE m.custom_label IS NOT NULL
ORDER BY t.title, m.sort_order;
```

### 3.6 DEPRECATED COMMENT 부착 확인
```sql
SELECT col_description('public.sessions'::regclass, ordinal_position) AS comment
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'wod_description';
-- 기대: 'DEPRECATED (Priority 23 P1-A): ...' 시작 문구

SELECT obj_description('public.wods'::regclass, 'pg_class') AS comment;
-- 기대: 'DEPRECATED (Priority 23 P1-A): ...' 시작 문구
```

---

## 4. RPC 스모크 테스트 (인증 컨텍스트 필요)

> 이 섹션은 **로그인된 코치/관리자 사용자 세션**에서 실행해야 합니다. Supabase Dashboard SQL Editor는 기본적으로 service role 컨텍스트라 `auth.uid()`가 NULL을 반환합니다. 검증은 다음 두 경로 중 하나로 수행하세요.

### 경로 A — 프론트엔드(추후 Phase 2 UI 적용 후)에서 자연 호출
1. DEV 환경에서 `npm run dev`
2. 코치 계정으로 로그인 → `/coach/schedule` → 세션 카드 → SessionOperationsBoard
3. WOD Builder 진입 → 다음 RPC 응답 확인:
   - `POST /rest/v1/rpc/fn_search_wod_movements` → `{success: true, data: [{...}]}` (movement 검색)
   - `POST /rest/v1/rpc/fn_list_wod_templates` → `{success: true, data: [...]}` (벤치마크/시설 템플릿)
   - `POST /rest/v1/rpc/fn_upsert_session_wod` → 세션 WOD 임시 저장 시
   - `POST /rest/v1/rpc/fn_publish_session_wod` → 발행 버튼 클릭 시
4. `/class/wod` 진입 → `fn_get_class_display_wod` 호출 후 published WOD 표시
5. 회원 상세 → `fn_get_member_context_panel` → 활성 플래그/최근 노트/출석 통계 패널 렌더링

### 경로 B — Dashboard SQL Editor에서 권한 시뮬레이션
> service role을 일시적으로 코치 사용자로 위장합니다. **검증 후 반드시 `RESET ROLE`로 복귀**하세요.

```sql
-- (1) 임의 코치 사용자 user_id 조회
SELECT c.id AS coach_id, c.name, c.user_id, u.email
FROM public.coaches c
JOIN auth.users u ON u.id = c.user_id
WHERE c.status = 'active'
LIMIT 5;

-- (2) JWT claim 흉내 — '<USER_ID>'를 위 결과의 user_id로 교체
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"<USER_ID>","role":"authenticated"}';

-- (3) Movement 검색
SELECT public.fn_search_wod_movements('thrust', NULL, NULL, 20);

-- (4) 벤치마크 템플릿 목록
SELECT public.fn_list_wod_templates('benchmark', NULL, NULL);

-- (5) 임의 세션에 대해 WOD 생성/발행 (트랜잭션 격리)
SELECT s.id AS session_id, s.title, s.session_date
FROM public.sessions s
JOIN public.session_coaches sc ON sc.session_id = s.id
WHERE sc.coach_id = '<COACH_ID>'
ORDER BY s.session_date DESC
LIMIT 5;

BEGIN;
SELECT public.fn_upsert_session_wod(
  '<SESSION_ID>'::UUID,
  jsonb_build_object(
    'template_id', NULL,
    'title_override', 'Test WOD',
    'format_override', 'for_time',
    'movements', jsonb_build_array(
      jsonb_build_object('movement_id', NULL, 'custom_label', 'Test Move', 'target_value', 21, 'target_unit', 'reps')
    )
  )
);
SELECT public.fn_publish_session_wod('<SESSION_ID>'::UUID);
SELECT public.fn_get_class_display_wod('<SESSION_ID>'::UUID, NULL, NULL);
ROLLBACK;

-- (6) 회원 컨텍스트 패널
SELECT m.id, m.name FROM public.members m WHERE m.facility_id = '<FACILITY_ID>' LIMIT 5;
SELECT public.fn_get_member_context_panel('<MEMBER_ID>'::UUID);

-- (7) 회원 알림 플래그 추가/조회/해소
BEGIN;
SELECT public.fn_upsert_member_alert_flag(
  '<MEMBER_ID>'::UUID,
  jsonb_build_object(
    'flag_type', 'trial',
    'severity', 'info',
    'note', '체험 클래스 첫 방문',
    'ends_at', (now() + INTERVAL '14 days')::TEXT
  )
);
SELECT public.fn_list_member_alert_flags('<MEMBER_ID>'::UUID);
ROLLBACK;

-- (8) 권한 위반 케이스 — 다른 시설 회원에 접근 시 forbidden
SELECT public.fn_get_member_context_panel('<OTHER_FACILITY_MEMBER_ID>'::UUID);
-- 기대: { success: false, status: 'forbidden', ... }

-- (9) 컨텍스트 복귀 — 반드시 실행
RESET ROLE;
RESET request.jwt.claims;
```

### 검증 완료 기준 (모두 통과해야 함)
- [ ] `fn_search_wod_movements`가 ILIKE 검색 + category/equipment 필터 정확 반영
- [ ] `fn_list_wod_templates(p_scope='benchmark')`가 10개 글로벌 벤치마크 + movements 배열 포함 응답
- [ ] `fn_upsert_session_wod` → `fn_publish_session_wod`: `publish_state='draft'→'published'`, `source_version+1`, `movements_snapshot` 동결
- [ ] `fn_get_class_display_wod`: published 상태에서만 응답, override 우선 → 없으면 template fallback
- [ ] `fn_upsert_runbook_template` 시 `is_default=TRUE` 지정 시 동일 facility의 기존 default가 자동 해제됨
- [ ] `fn_upsert_session_runbook`: 동일 session_id 재호출 시 ON CONFLICT 갱신
- [ ] `fn_list_member_alert_flags`: resolved/expired 플래그 제외, 활성만 반환
- [ ] `fn_upsert_member_alert_flag(payload.resolved=true)`: `resolved_at`/`resolved_by` 자동 기록
- [ ] `fn_get_member_context_panel`: member + active_flags + recent_notes(5) + attendance + active_membership envelope

---

## 5. 프론트엔드 회귀 체크리스트 (Phase 2/3 적용 시)

> Phase 1 마이그레이션만 적용된 상태에서는 UI 변경이 없으므로 회귀 가능성이 매우 낮습니다. 다만 다음 화면이 기대대로 동작하는지 확인합니다.

| 화면 | 시나리오 | 기대 |
|---|---|---|
| `/coach/schedule` | 세션 카드 진입 | 운영 보드 정상 (P22 동작 유지) |
| 운영 보드 | WOD 자유 텍스트 편집 (`sessions.wod_description`) | 여전히 동작 (Phase 2까지 호환 레이어 유지) |
| `/class/wod` | 일반 진입 | 기존 `wods` 테이블 조회 동작 (Phase 3 전환 전까지 유지) |
| `/coach/members` | 회원 상세 | P22 기준 정상 |
| 운영 보드 | 회원 출결 마킹 | P22 RPC 동작 정상 |

> Phase 2(UI 추가) 적용 시 별도 회귀 가이드 추가 예정.

---

## 6. 롤백 절차 (필요시)

> 본 마이그레이션은 **신규 테이블·함수 추가만** 수행하므로 롤백은 정상 운영(Priority 22 이전 상태 복귀)에 영향이 없으며, 시드 데이터 35종/벤치마크 10종을 잃을 뿐입니다.

```sql
-- (선택) 시드 데이터 백업
CREATE TABLE backup_movement_library_20260426 AS
SELECT * FROM public.movement_library;
CREATE TABLE backup_wod_templates_20260426 AS
SELECT * FROM public.wod_templates;
CREATE TABLE backup_wod_template_movements_20260426 AS
SELECT * FROM public.wod_template_movements;

-- (1) 신규 RPC 14종 + 헬퍼 2종 제거
DROP FUNCTION IF EXISTS public.fn_get_member_context_panel(UUID);
DROP FUNCTION IF EXISTS public.fn_upsert_member_alert_flag(UUID, JSONB);
DROP FUNCTION IF EXISTS public.fn_list_member_alert_flags(UUID);
DROP FUNCTION IF EXISTS public.fn_upsert_session_runbook(UUID, JSONB);
DROP FUNCTION IF EXISTS public.fn_get_session_runbook(UUID);
DROP FUNCTION IF EXISTS public.fn_upsert_runbook_template(JSONB);
DROP FUNCTION IF EXISTS public.fn_list_runbook_templates(UUID, TEXT);
DROP FUNCTION IF EXISTS public.fn_get_class_display_wod(UUID, DATE, UUID);
DROP FUNCTION IF EXISTS public.fn_publish_session_wod(UUID);
DROP FUNCTION IF EXISTS public.fn_upsert_session_wod(UUID, JSONB);
DROP FUNCTION IF EXISTS public.fn_get_session_wod(UUID);
DROP FUNCTION IF EXISTS public.fn_upsert_wod_template(JSONB);
DROP FUNCTION IF EXISTS public.fn_list_wod_templates(TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.fn_search_wod_movements(TEXT, TEXT, TEXT, INT);
DROP FUNCTION IF EXISTS public._p1a_assert_coach_can_edit_session(UUID);
DROP FUNCTION IF EXISTS public._p1a_assert_coach_or_admin();

-- (2) DEPRECATED COMMENT 원복
COMMENT ON COLUMN public.sessions.wod_description IS NULL;
COMMENT ON TABLE public.wods IS NULL;

-- (3) 신규 테이블 7종 제거 (CASCADE로 인덱스/RLS 자동 정리)
DROP TABLE IF EXISTS public.member_alert_flags CASCADE;
DROP TABLE IF EXISTS public.session_runbooks CASCADE;
DROP TABLE IF EXISTS public.class_runbook_templates CASCADE;
DROP TABLE IF EXISTS public.session_wods CASCADE;
DROP TABLE IF EXISTS public.wod_template_movements CASCADE;
DROP TABLE IF EXISTS public.wod_templates CASCADE;
DROP TABLE IF EXISTS public.movement_library CASCADE;
```

> 롤백 후 Phase 2/3 UI(추후 추가될 SessionOperationsBoard 런북 탭, /class/wod 신규 페이지)는 RPC 404를 받게 되므로 코드 또한 P1-A 적용 직전 commit으로 되돌려야 합니다.

---

## 7. 적용 기록 (작업자가 채워주세요)

| 환경 | 적용 일시(KST) | 작업자 | 적용 방식 | Pre-flight | Post-apply | 스모크 | 비고 |
|---|---|---|---|---|---|---|---|
| DEV | | | CLI / Dashboard | ✅/❌ | ✅/❌ | ✅/❌ | |
| PROD | | | CLI / Dashboard | ✅/❌ | ✅/❌ | ✅/❌ | |

---

## 참고
- 본문 SSOT: [supabase/migrations/20260426120000_p1a_class_standardization.sql](../../../supabase/migrations/20260426120000_p1a_class_standardization.sql)
- 마스터 플랜: [.docs/archive/planning/coach-app-master-plan-20260425.md](../../archive/planning/coach-app-master-plan-20260425.md) §9
- Movement 시드 출처: [.docs/planning/wod_exercise_list.md](../../planning/wod_exercise_list.md)
- Priority 22 가이드: [20260425_priority22_apply.md](./20260425_priority22_apply.md)
