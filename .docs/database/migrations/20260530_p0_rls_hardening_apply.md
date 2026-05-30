# P0 RLS 하드닝 — 마이그레이션 적용 가이드

이 문서는 P0 보안 점검 결과 확정된 RLS 하드닝 2건을 Supabase 원격 DB에 안전하게 적용하기 위한 단계별 절차서입니다. 마이그레이션 본문은 [supabase/migrations/20260530220000_p0_rls_hardening.sql](../../../supabase/migrations/20260530220000_p0_rls_hardening.sql) 1개 파일이며, 본 가이드는 그 파일을 **DEV → PROD** 순서로 적용하는 실행/검증 동반 문서입니다.

> 점검 전체 맥락(오탐 정정·anon HUD 설계·race 보류 사유)은 [.docs/security/README.md](../../security/README.md) "📌 P0 RLS 점검 결과" 섹션 참조.

---

## ⚠️ 적용 전 반드시 알 것 — `supabase db push` 사용 불가

DEV/PROD DB의 마이그레이션 히스토리 테이블에는 **로컬 repo에 없는 버전 ~64개**가 기록되어 있습니다(로컬 24개 파일). 즉 로컬 repo와 원격 히스토리가 이미 어긋나 있어 `supabase db push`가 다음 에러로 중단됩니다:

```
Remote migration versions not found in local migrations directory.
```

- 이는 이번 변경이 만든 문제가 아니라 **기존 프로젝트의 마이그레이션 SSOT 불일치**(종합 평가 P0 로드맵의 "prod↔repo diff" 항목)입니다.
- `supabase migration repair`(64개 버전 상태 재작성) / `supabase db pull`(원격→로컬 덮어쓰기)은 히스토리 전체를 건드리는 위험 작업이므로 **이번 보안 패치 적용과 분리**합니다.
- 따라서 본 마이그레이션은 **Dashboard SQL Editor 수동 실행(경로 B)** 으로 적용합니다. 본 SQL은 `DROP POLICY IF EXISTS` + `CREATE POLICY`만 사용해 히스토리 동기화와 무관하게 안전하게 실행됩니다.

---

## 0. 사전 조건

| 항목 | 확인 |
|---|---|
| 적용 환경 | DEV(`meklaisrcpecuwwwakhv`) 우선 → 회귀 검증 후 PROD(`cbtgziqhahujxffqtjhd`) |
| 다운타임 | 불필요 (정책 교체만, DDL 테이블 변경 없음) |
| 의존 마이그레이션 | `20260426120000_p1a_class_standardization.sql`(wod_templates 등), `20260530193000_wod_station_circuit.sql`(session_rotation_states), `20260217204600_phase3_rls_security_hardening.sql`(`is_admin()`/`is_admin_or_coach()`) 선행 필수 |
| 백업 | 정책 변경뿐이라 데이터 영향 없음. 그래도 적용 전 §1 스냅샷 쿼리로 기존 정책 텍스트 보관 권장 |
| 롤백 가능성 | 기존 정책 텍스트를 §5로 복원 가능 |

### 변경 요약
1. **`session_rotation_states` 쓰기 제한** — 기존 `"Enable write access for coaches and admins"`(임의 코치 OR 관리자) 제거 → `is_admin()` 관리자 정책 + `session_coaches` 배정 코치 정책으로 분리. **SELECT 정책(`"Enable read access for all"`)은 변경하지 않음**(미인증 TV HUD 의존).
2. **템플릿 DELETE 관리자 전용** — `wod_templates` / `wod_template_movements` / `class_runbook_templates`의 기존 `"... coach admin manage"`(`FOR ALL`) 제거 → coach/admin INSERT·UPDATE + **admin 전용 DELETE**로 분리. (coach의 SELECT/INSERT/UPDATE = WOD 저작 유지)

---

## 1. Pre-flight 검증 (적용 전, 1분)

```sql
-- (1) 헬퍼 함수 선행 확인 — 2행 (is_admin, is_admin_or_coach)
SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('is_admin','is_admin_or_coach');

-- (2) 대상 테이블 존재 확인 — 4행
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('session_rotation_states','wod_templates','wod_template_movements','class_runbook_templates');

-- (3) 교체될 '기존 정책'이 실재하는지 — 4행 (적용 후 모두 사라져야 함)
SELECT tablename, policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND policyname IN (
  'Enable write access for coaches and admins',
  'wod_templates coach admin manage',
  'wod_template_movements coach admin manage',
  'class_runbook_templates coach admin manage'
) ORDER BY tablename;

-- (4) 보존되어야 할 anon SELECT 정책 확인 — 1행 (절대 삭제 금지)
SELECT tablename, policyname, cmd, roles, qual FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'session_rotation_states' AND cmd = 'SELECT';

-- (5) (선택) 기존 정책 전체 텍스트 스냅샷 — 롤백 대비 보관
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('session_rotation_states','wod_templates','wod_template_movements','class_runbook_templates')
ORDER BY tablename, policyname;
```

> **이상 시 STOP**: (1)이 2행 미만이면 `20260217204600` 미적용 — 먼저 적용. (3)이 4행 미만이면 일부 이미 변경된 상태이니 §2 실행 전 차이를 확인하세요.

---

## 2. 마이그레이션 본문 적용 (Dashboard SQL Editor)

1. Supabase Dashboard → **DEV(`meklaisrcpecuwwwakhv`)** → **SQL Editor** → **New query**
2. 로컬 [supabase/migrations/20260530220000_p0_rls_hardening.sql](../../../supabase/migrations/20260530220000_p0_rls_hardening.sql) 전체 복사 → 붙여넣기 → **Run**
3. `Success. No rows returned` 확인
4. DEV §3 검증 + §4 회귀 통과 후, 동일 절차를 **PROD(`cbtgziqhahujxffqtjhd`)** 에 반복

> SQL 본문을 본 문서에 복제하지 않는 이유: SSOT(`.sql` 파일)와 사본 간 drift 차단. 항상 `supabase/migrations/` 파일 기준 사용.

---

## 3. Post-apply 검증 SQL (적용 직후, 2분)

```sql
-- 3.1 교체 대상 기존 정책이 모두 사라졌는지 — 0행
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public' AND policyname IN (
  'Enable write access for coaches and admins',
  'wod_templates coach admin manage',
  'wod_template_movements coach admin manage',
  'class_runbook_templates coach admin manage'
);

-- 3.2 신규 정책 등록 확인 — 11행
--   rotation: admin manage(ALL), assigned coach manage(ALL) = 2
--   각 템플릿 테이블: insert / update / delete = 3 × 3 = 9
SELECT tablename, policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND policyname IN (
  'session_rotation_states admin manage',
  'session_rotation_states assigned coach manage',
  'wod_templates coach admin insert','wod_templates coach admin update','wod_templates admin delete',
  'wod_template_movements coach admin insert','wod_template_movements coach admin update','wod_template_movements admin delete',
  'class_runbook_templates coach admin insert','class_runbook_templates coach admin update','class_runbook_templates admin delete'
) ORDER BY tablename, cmd;

-- 3.3 anon SELECT 정책이 그대로 보존됐는지 — 여전히 1행, USING=true
SELECT tablename, policyname, cmd, qual FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'session_rotation_states' AND cmd = 'SELECT';
-- 기대: "Enable read access for all", qual = true (변경 없음)

-- 3.4 DELETE 정책이 admin 전용인지 — with USING = is_admin()
SELECT tablename, policyname, qual FROM pg_policies
WHERE schemaname = 'public' AND cmd = 'DELETE'
  AND tablename IN ('wod_templates','wod_template_movements','class_runbook_templates')
ORDER BY tablename;
-- 기대: qual에 is_admin() 포함
```

---

## 4. 권한 동작/회귀 검증

### 4.1 프론트엔드 회귀 (필수 — 가장 중요)

| 화면 | 시나리오 | 기대 |
|---|---|---|
| `/class/rotation-hud?session_id=...` | **로그아웃 상태**(공용 TV)에서 진입 | 로테이션/팀 상태 **정상 표시 + 실시간 갱신** (SELECT 미변경 확인) |
| `/coach/schedule/rotation?session_id=...` | **배정 코치**가 로테이션 저장 | 저장 성공 |
| `/admin/operations/wod-templates` | 관리자가 템플릿 삭제 | 삭제 성공 |
| WOD Builder (coach) | 코치가 WOD 저장(`fn_upsert_*`) | 정상 (RPC = SECURITY DEFINER, 영향 없음) |

> **HUD가 깨지면 즉시 §5 롤백.** anon SELECT를 건드렸는지 §3.3로 재확인.

### 4.2 권한 차단 시뮬레이션 (Dashboard SQL Editor)

> service role을 임시로 코치 사용자로 위장. **검증 후 반드시 `RESET ROLE`.**

```sql
-- (1) 임의 활성 코치 + 그 코치가 '배정되지 않은' 세션 찾기
SELECT c.id AS coach_id, c.user_id, u.email
FROM public.coaches c JOIN auth.users u ON u.id = c.user_id
WHERE c.status = 'active' LIMIT 5;

-- 배정 안 된 세션 1개 (위 coach_id로 교체)
SELECT s.id AS unassigned_session_id FROM public.sessions s
WHERE NOT EXISTS (
  SELECT 1 FROM public.session_coaches sc WHERE sc.session_id = s.id AND sc.coach_id = '<COACH_ID>'
) LIMIT 1;

-- (2) 코치 컨텍스트 위장 (<USER_ID> = 위 user_id)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"<USER_ID>","role":"authenticated"}';

-- (3) 비배정 세션 로테이션 직접 쓰기 → 거부(0행/권한오류) 기대
BEGIN;
INSERT INTO public.session_rotation_states (session_id, facility_id, total_rounds)
VALUES ('<UNASSIGNED_SESSION_ID>'::uuid,
        (SELECT facility_id FROM public.sessions WHERE id = '<UNASSIGNED_SESSION_ID>'::uuid), 3);
ROLLBACK;
-- 기대: new row violates row-level security policy

-- (4) 코치가 템플릿 직접 DELETE → 거부 기대
BEGIN;
DELETE FROM public.wod_templates WHERE id = (SELECT id FROM public.wod_templates LIMIT 1);
ROLLBACK;
-- 기대: 0 rows deleted (RLS 차단)

-- (5) 복귀 — 반드시 실행
RESET ROLE;
RESET request.jwt.claims;
```

### 검증 완료 기준 (모두 통과)
- [ ] 로그아웃 TV HUD(`/class/rotation-hud`) 정상 표시·실시간 갱신
- [ ] 배정 코치 로테이션 저장 성공 / 비배정 코치 쓰기 거부
- [ ] 관리자 템플릿 삭제 성공 / 코치 직접 DELETE 거부
- [ ] 코치 WOD 저장(RPC) 정상

---

## 5. 롤백 절차 (필요시)

> 정책 교체뿐이라 데이터 영향 없음. 아래로 적용 직전 상태(임의 코치 쓰기 허용)로 복원.

```sql
-- (1) session_rotation_states 원복
DROP POLICY IF EXISTS "session_rotation_states admin manage" ON public.session_rotation_states;
DROP POLICY IF EXISTS "session_rotation_states assigned coach manage" ON public.session_rotation_states;
CREATE POLICY "Enable write access for coaches and admins" ON public.session_rotation_states
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.coaches WHERE coaches.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

-- (2) 템플릿 3종 원복 (각 테이블 반복; 예: wod_templates)
DROP POLICY IF EXISTS "wod_templates coach admin insert" ON public.wod_templates;
DROP POLICY IF EXISTS "wod_templates coach admin update" ON public.wod_templates;
DROP POLICY IF EXISTS "wod_templates admin delete" ON public.wod_templates;
CREATE POLICY "wod_templates coach admin manage" ON public.wod_templates
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','coach')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','coach')));
-- wod_template_movements / class_runbook_templates 도 동일 패턴으로 원복
```

---

## 6. 후속(별도 작업) — 마이그레이션 히스토리 SSOT 정리

본 패치와 분리해 다뤄야 할 사안:
- 원격 히스토리(~64 버전) ↔ 로컬 repo(24 파일) 불일치 해소.
- 선택지: `supabase db pull`로 원격 기준 재정렬 후 로컬 정리 / 또는 `migration repair`로 히스토리 테이블 정합화.
- **위험**: 둘 다 히스토리/로컬 파일을 재작성하므로 별도 점검·백업 후 단독 작업 권장. 종합 평가 P0 로드맵 "prod↔repo 마이그레이션 diff" 항목과 연결.

---

## 7. 적용 기록 (작업자가 채워주세요)

| 환경 | 적용 일시(KST) | 작업자 | 적용 방식 | Pre-flight | Post-apply | 회귀(HUD/저장/삭제) | 비고 |
|---|---|---|---|---|---|---|---|
| DEV | | | Dashboard SQL Editor | ✅/❌ | ✅/❌ | ✅/❌ | |
| PROD | | | Dashboard SQL Editor | ✅/❌ | ✅/❌ | ✅/❌ | |

---

## 참고
- 본문 SSOT: [supabase/migrations/20260530220000_p0_rls_hardening.sql](../../../supabase/migrations/20260530220000_p0_rls_hardening.sql)
- 점검 결과/오탐 정정: [.docs/security/README.md](../../security/README.md) "📌 P0 RLS 점검 결과"
- 차용한 기존 패턴: `session_wods assigned coach manage` (`20260426120000_p1a_class_standardization.sql`)
