---
name: db-migration
description: Supabase DB 마이그레이션 생성 및 RLS 정책을 관리하는 전문 스킬입니다.
---

# Database Migration Skill (db-migration)

이 스킬은 데이터베이스 스키마 변경 시 안전성과 일관성을 유지하기 위한 규칙과 실행 절차를 정의합니다.
Supabase MCP 서버의 `apply_migration` 도구를 사용하여 마이그레이션을 적용합니다.

> **⚠️ 이 스킬은 💎 Senior Dev 관점에서 전담 수행해야 합니다.**
> DB 스키마 변경은 보안과 데이터 무결성에 직결되므로, 가장 정밀한 추론이 필요합니다.
> **권장 모델**: Claude Opus 4.6

---

## 🤖 관점별 역할

| 역할 | 관점 | 핵심 책임 |
|:-----|:-----|:---------|
| 스키마 설계 & SQL 작성 | 💎 **Senior Dev** | 테이블/컬럼 설계, RLS 정책, 인덱스 전략 |
| 마이그레이션 적용 | 💎 **Senior Dev** | Supabase MCP `apply_migration` 실행 |
| 문서 갱신 | 💎 **Senior Dev** | `database-reference.md` 업데이트 |
| 최종 검토 | 🏛️ **Architect** | 아키텍처 적합성, 보안 정책 검토 |

---

## 언제 이 스킬을 사용하는가?

- 새로운 테이블/뷰를 생성할 때
- 기존 테이블에 컬럼을 추가/변경할 때
- RLS 정책을 추가/수정할 때
- DB 함수(RPC)를 생성/변경할 때
- 인덱스를 추가할 때
- 트리거를 생성할 때

---

## 핵심 원칙

> 1. **모든 DDL 변경은 `apply_migration` 도구를 사용**한다 (`execute_sql`은 DML/조회만).
> 2. **모든 새 테이블에는 RLS가 필수**이다.
> 3. **Client에서는 `anon key`로만 접근** — `service_role` 키를 클라이언트 코드에서 사용하지 않는다.
> 4. **마이그레이션은 되돌릴 수 없다** — 적용 전 반드시 SQL 검토.
> 5. **변경 후 `database-reference.md`를 즉시 갱신**한다.

---

## 스킬 실행 절차

### 1️⃣ 현황 분석

기획서 또는 요청 사항을 바탕으로 현재 DB 상태를 분석한다.

// turbo
```bash
cat .docs/database-reference.md
```

**확인 사항**:
- 관련 테이블이 이미 존재하는지 확인
- 기존 RLS 정책 확인
- 외래 키 관계 파악

**Supabase MCP 활용**:
```javascript
// 현재 테이블 목록 확인
mcp_supabase-mcp-server_list_tables({
  project_id: "{PROJECT_ID}",
  schemas: ["public"]
});

// 기존 마이그레이션 이력 확인
mcp_supabase-mcp-server_list_migrations({
  project_id: "{PROJECT_ID}"
});
```

---

### 2️⃣ SQL 작성

마이그레이션 SQL을 작성한다. 다음 규칙을 반드시 준수한다.

#### 명명 규칙 (Naming Convention)

| 대상 | 규칙 | 예시 |
|------|------|------|
| 테이블명 | `snake_case`, 복수형 | `badge_definitions`, `race_records` |
| 컬럼명 | `snake_case` | `created_at`, `facility_id` |
| 외래 키 | `fk_{테이블}_{참조테이블}` | `fk_members_facilities` |
| 인덱스 | `idx_{테이블}_{컬럼}` | `idx_reservations_date` |
| RLS 정책 | 동작을 설명하는 영문 | `Allow authenticated read access` |
| 마이그레이션 이름 | `snake_case`, 동작 설명 | `create_badge_definitions_table` |

#### 필수 컬럼 패턴

```sql
CREATE TABLE public.{table_name} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ... 비즈니스 컬럼 ...
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at 자동 갱신 트리거 (선택, 권장)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_{table_name}_updated_at
  BEFORE UPDATE ON public.{table_name}
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### RLS 정책 필수 패턴

```sql
-- 1. RLS 활성화 (필수)
ALTER TABLE public.{table_name} ENABLE ROW LEVEL SECURITY;

-- 2. 조회 권한 설정 (상황에 맞게 선택)
-- 옵션 A: 인증된 사용자 전체 조회
CREATE POLICY "Allow authenticated read access"
  ON public.{table_name}
  FOR SELECT TO authenticated
  USING (true);

-- 옵션 B: 본인 데이터만 조회
CREATE POLICY "Allow users to read own data"
  ON public.{table_name}
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 3. 관리자 전체 권한 (필요 시)
CREATE POLICY "Allow admin full access"
  ON public.{table_name}
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

---

### 3️⃣ SQL 검토

작성된 SQL을 적용 전 자체 검토한다.

**검토 체크리스트**:
- [ ] 문법 오류 없음 (세미콜론, 괄호 등)
- [ ] `id` 컬럼에 `gen_random_uuid()` 또는 자동 증가값 설정됨
- [ ] `created_at` 및 `updated_at` 타임스탬프 포함됨
- [ ] 외래 키(Foreign Key) 설정 시 `ON DELETE` 정책 명확함
- [ ] 인덱스가 필요한 조회 컬럼에 `CREATE INDEX` 선언됨
- [ ] RLS 활성화됨 (`ENABLE ROW LEVEL SECURITY`)
- [ ] RLS 정책이 최소 권한 원칙을 따름
- [ ] 데이터 삭제/테이블 드랍 포함 시 **사용자 확인 완료**

---

### 4️⃣ 마이그레이션 적용

Supabase MCP의 `apply_migration` 도구를 사용하여 적용한다.

```javascript
mcp_supabase-mcp-server_apply_migration({
  project_id: "{PROJECT_ID}",
  name: "{migration_name_in_snake_case}",
  query: "{SQL 쿼리}"
});
```

> ⚠️ `apply_migration`은 DDL(스키마 변경) 전용입니다.
> 데이터 조회/조작은 `execute_sql`을 사용합니다.

**적용 후 확인**:
```javascript
// 마이그레이션 성공 확인
mcp_supabase-mcp-server_list_migrations({
  project_id: "{PROJECT_ID}"
});

// 테이블 생성 확인
mcp_supabase-mcp-server_list_tables({
  project_id: "{PROJECT_ID}",
  schemas: ["public"]
});

// 보안 어드바이저 확인 (RLS 누락 감지)
mcp_supabase-mcp-server_get_advisors({
  project_id: "{PROJECT_ID}",
  type: "security"
});
```

---

### 5️⃣ 문서 갱신

마이그레이션 적용 후 `database-reference.md`를 즉시 갱신한다.

**갱신 항목**:
- 새 테이블 스키마 추가
- 변경된 컬럼 반영
- RLS 정책 목록 갱신
- 인덱스 목록 갱신
- DB 함수 목록 갱신

---

### 6️⃣ 타입 생성 (선택)

TypeScript 타입을 최신화한다.

```javascript
mcp_supabase-mcp-server_generate_typescript_types({
  project_id: "{PROJECT_ID}"
});
```

> 생성된 타입을 `src/types/supabase.ts`에 반영한다.

---

## ✅ 전체 체크리스트

### 💎 Senior Dev 관점 (권장: Claude Opus 4.6) — 전담
- [ ] 현황 분석 완료 (기존 테이블/RLS 확인)
- [ ] SQL 작성 완료 (명명 규칙 준수)
- [ ] 필수 컬럼 포함 (`id`, `created_at`, `updated_at`)
- [ ] RLS 활성화 + 정책 설정 완료
- [ ] 외래 키 `ON DELETE` 정책 명확
- [ ] 인덱스 필요 컬럼 설정 완료
- [ ] SQL 자체 검토 통과
- [ ] `apply_migration` 적용 성공
- [ ] `database-reference.md` 갱신 완료
- [ ] 보안 어드바이저 경고 없음 확인

### 🏛️ Architect 관점 (권장: Gemini 3 Pro High) — 검토
- [ ] 아키텍처 적합성 확인
- [ ] RLS 정책 최소 권한 원칙 준수 확인

---

## ⚠️ 주의사항

- ❌ DDL 변경을 `execute_sql`로 실행하지 않는다 (`apply_migration` 사용)
- ❌ RLS 없이 테이블을 생성하지 않는다
- ❌ `service_role` 키를 클라이언트 코드에서 사용하지 않는다
- ❌ `database-reference.md` 갱신 없이 마이그레이션을 완료 처리하지 않는다
- ❌ 데이터 삭제/테이블 드랍 포함 시 사용자 확인 없이 실행하지 않는다
- ✅ 모든 새 테이블에 RLS + 최소 권한 정책 적용
- ✅ `apply_migration` 후 `list_migrations`로 성공 확인
- ✅ `get_advisors`로 보안 경고 없음 확인
- ✅ 마이그레이션명은 동작을 명확히 설명하는 `snake_case`

---

## 🔗 관련 스킬/워크플로우

| 항목 | 용도 |
|------|------|
| `/develop` | 개발 워크플로우의 DB Phase에서 이 스킬 사용 |
| `/plan` | 기획서에 DB 설계가 포함되면 이 스킬로 구현 |
| `feature-planning` 스킬 | 기획서의 § 4. 데이터베이스 변경 섹션 참고 |
| `commit-bot` 스킬 | 마이그레이션 후 문서 커밋 |
