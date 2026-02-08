---
name: db-migration
description: Supabase DB 마이그레이션 생성 및 RLS 정책을 관리하는 전문 스킬입니다.
---

# Database Migration Skill (db-migration)

이 스킬은 데이터베이스 스키마 변경 시 안전성과 일관성을 유지하기 위한 규칙입니다.

## 1. 명명 규칙 (Naming Convention)
- 마이그레이션 파일명은 `YYYYMMDDHHMMSS_description_in_snake_case.sql` 형식을 권장합니다.
- 테이블명과 컬럼명은 반드시 `snake_case`를 사용합니다.

## 2. RLS (Row Level Security) 필수 정책
모든 새로운 테이블 생성 시 다음 SQL 패턴을 반드시 포함해야 합니다:
```sql
-- RLS 활성화
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

-- 조회 권한 (예: 누구나 조회 가능하거나 인증된 사용자만 가능)
CREATE POLICY "Allow public read access" ON public.table_name
  FOR SELECT USING (true);

-- 관리자 권한 (예: 특정 role을 가진 사용자만 수정 가능)
CREATE POLICY "Allow admin to manage" ON public.table_name
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');
```

## 3. 안정성 체크리스트
- [ ] `id` 컬럼에 `uuid_generate_v4()` 또는 `bigint` 자동 증가값이 설정되었는가?
- [ ] `created_at` 및 `updated_at` 타임스탬프가 포함되었는가?
- [ ] 외래 키(Foreign Key) 설정 시 `ON DELETE CASCADE` 등 삭제 정책이 명확한가?
- [ ] 인덱스가 필요한 조회 컬럼에 `CREATE INDEX`가 선언되었는가?

## 4. 실행 가이드
- `apply_migration` 도구를 사용하기 전에 항상 SQL 구문의 문법 오류를 검토합니다.
- 데이터 삭제 또는 테이블 드랍(Drop)이 포함된 경우 반드시 사전에 확인 메시지를 출력합니다.
