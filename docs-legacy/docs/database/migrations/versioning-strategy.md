# Database Migration Versioning Strategy

이 문서는 BCL Portal의 데이터베이스 마이그레이션 버전 관리 전략을 정의합니다.

---

## 📋 목차
- [버전 관리 원칙](#버전-관리-원칙)
- [파일 명명 규칙](#파일-명명-규칙)
- [마이그레이션 작성 가이드](#마이그레이션-작성-가이드)
- [실행 절차](#실행-절차)
- [롤백 전략](#롤백-전략)

---

## 버전 관리 원칙

### 1. 순차적 버전 번호
- **형식**: `{version}_{action}_{target}.sql`
- **버전**: 3자리 숫자 (`001`, `002`, `003`, ...)
- **순서 보장**: 파일명 순서대로 실행

### 2. 불변성 (Immutability)
- ✅ **이미 프로덕션에 적용된 마이그레이션은 절대 수정하지 않음**
- ✅ 수정이 필요한 경우 새로운 마이그레이션 파일 생성
- ❌ 기존 파일 삭제 또는 변경 금지

### 3. 명확한 설명
- 각 마이그레이션 파일 상단에 주석으로 목적 명시
- 변경 사항 요약
- 작성자 및 날짜 기록

---

## 파일 명명 규칙

### 형식
```
{version}_{action}_{target}.sql

예시:
001_initial_schema.sql
002_add_race_tables.sql
003_modify_members_add_avatar.sql
004_remove_deprecated_status_column.sql
```

### Action 키워드
- `initial`: 초기 스키마 생성
- `add`: 새로운 테이블/컬럼 추가
- `modify`: 기존 테이블/컬럼 수정
- `remove`: 테이블/컬럼 삭제
- `create`: 인덱스/함수/트리거 생성
- `update`: 데이터 업데이트

### Target 명명
- 테이블명 사용 (예: `members`, `sessions`)
- 복수 테이블인 경우 주요 테이블명 사용
- 설명적 이름 사용 (예: `race_tables`, `notification_system`)

---

## 마이그레이션 작성 가이드

### 템플릿
```sql
-- ============================================
-- Migration: {version}_{action}_{target}
-- Description: {변경 사항 설명}
-- Author: {작성자}
-- Date: {작성 날짜}
-- ============================================

-- ============================================
-- 1. Schema Changes
-- ============================================

-- 테이블 생성/수정/삭제

-- ============================================
-- 2. Indexes
-- ============================================

-- 인덱스 생성

-- ============================================
-- 3. RLS Policies
-- ============================================

-- RLS 정책 생성

-- ============================================
-- 4. Functions/Triggers
-- ============================================

-- 함수 및 트리거 생성

-- ============================================
-- 5. Data Migration (if needed)
-- ============================================

-- 데이터 마이그레이션 (필요한 경우)

-- ============================================
-- Rollback Script (주석 처리)
-- ============================================
/*
-- 롤백 시 실행할 SQL
DROP TABLE IF EXISTS ...;
*/
```

### 작성 규칙

#### 1. 트랜잭션 사용
```sql
BEGIN;

-- 마이그레이션 코드

COMMIT;
```

#### 2. 안전한 DDL
```sql
-- ✅ Good: IF NOT EXISTS 사용
CREATE TABLE IF NOT EXISTS new_table (...);

-- ❌ Bad: 조건 없이 생성
CREATE TABLE new_table (...);
```

#### 3. 외래 키 제약 조건
```sql
-- 외래 키는 명시적 이름 지정
ALTER TABLE bookings
  ADD CONSTRAINT fk_bookings_session
  FOREIGN KEY (session_id)
  REFERENCES sessions(id)
  ON DELETE CASCADE;
```

#### 4. 기본값 설정
```sql
-- 새 컬럼 추가 시 기본값 제공
ALTER TABLE members
  ADD COLUMN avatar_url TEXT DEFAULT NULL;
```

---

## 실행 절차

### 개발 환경 (Development)

#### Step 1: Local에서 마이그레이션 작성
```bash
# 1. 새 마이그레이션 파일 생성
cd .docs/database/schema/
touch $(printf "%03d" $(($(ls -1 *.sql | wc -l) + 1)))_add_new_feature.sql

# 2. SQL 작성
vim 005_add_new_feature.sql
```

#### Step 2: Supabase Local에서 테스트
```bash
# Supabase CLI 사용 (선택 사항)
supabase db reset
supabase db push
```

#### Step 3: Git 커밋
```bash
git add .docs/database/schema/005_add_new_feature.sql
git commit -m "feat(db): add new feature schema"
git push
```

---

### 스테이징 환경 (Staging)

#### Step 1: 마이그레이션 파일 확인
```bash
git pull origin main
cat .docs/database/schema/005_add_new_feature.sql
```

#### Step 2: Supabase Dashboard에서 실행
1. Supabase Dashboard 로그인
2. SQL Editor 열기
3. 마이그레이션 파일 내용 복사
4. **실행 전 백업 확인**
5. Execute SQL

#### Step 3: 검증
```sql
-- 테이블 존재 확인
SELECT * FROM information_schema.tables WHERE table_name = 'new_table';

-- RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'new_table';

-- 데이터 무결성 확인
SELECT COUNT(*) FROM new_table;
```

---

### 프로덕션 환경 (Production)

#### Step 1: 백업 생성
```bash
# Supabase Dashboard에서 자동 백업 확인
# 또는 수동 백업 생성
```

#### Step 2: 점검 시간 공지
```
- 사용자에게 점검 시간 사전 공지 (최소 24시간 전)
- 예상 소요 시간 명시
```

#### Step 3: 마이그레이션 실행
```sql
-- 1. 트랜잭션으로 실행
BEGIN;

-- 2. 마이그레이션 SQL 복사/붙여넣기

-- 3. 검증
SELECT * FROM new_table LIMIT 5;

-- 4. 문제 없으면 커밋
COMMIT;

-- 5. 문제 발생 시 롤백
-- ROLLBACK;
```

#### Step 4: 모니터링
```
- 쿼리 성능 모니터링 (Supabase Dashboard)
- 에러 로그 확인
- API 응답 시간 확인
```

---

## 롤백 전략

### 롤백이 필요한 경우
1. 마이그레이션 실행 중 오류 발생
2. 프로덕션에서 예상치 못한 문제 발생
3. 성능 저하 발생

### 롤백 방법

#### 1. 트랜잭션 롤백 (실행 중)
```sql
-- 마이그레이션 실행 중 문제 발생 시
ROLLBACK;
```

#### 2. 수동 롤백 (실행 후)
```sql
-- 마이그레이션 파일에 포함된 롤백 스크립트 실행
/*
-- 예시: 테이블 삭제
DROP TABLE IF EXISTS new_table CASCADE;

-- 예시: 컬럼 제거
ALTER TABLE members DROP COLUMN IF EXISTS avatar_url;
*/
```

#### 3. 백업 복원 (치명적 오류)
```
1. Supabase Dashboard → Database → Backups
2. 최근 백업 선택
3. Restore 실행
4. 데이터 무결성 확인
```

### 롤백 테스트
```bash
# 개발 환경에서 롤백 스크립트 테스트
1. 마이그레이션 실행
2. 롤백 스크립트 실행
3. 원래 상태로 복구 확인
```

---

## 버전 추적

### 마이그레이션 이력 테이블 (선택 사항)
```sql
CREATE TABLE IF NOT EXISTS _migrations (
  version VARCHAR(10) PRIMARY KEY,
  description TEXT NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT now(),
  executed_by TEXT,
  rollback_script TEXT
);

-- 마이그레이션 실행 시 기록
INSERT INTO _migrations (version, description, executed_by)
VALUES ('005', 'Add new feature schema', 'admin@bcl.com');
```

---

## 체크리스트

### 마이그레이션 작성 전
- [ ] 변경 사항 명확히 정의
- [ ] 롤백 전략 수립
- [ ] 영향 받는 테이블/데이터 파악

### 마이그레이션 작성 중
- [ ] 순차적 버전 번호 사용
- [ ] 명확한 파일명 및 주석
- [ ] 안전한 DDL (IF NOT EXISTS 등)
- [ ] 롤백 스크립트 포함
- [ ] RLS 정책 포함

### 마이그레이션 실행 전
- [ ] 개발 환경 테스트 완료
- [ ] 백업 확인
- [ ] 점검 시간 공지 (프로덕션)
- [ ] 롤백 계획 준비

### 마이그레이션 실행 후
- [ ] 데이터 무결성 검증
- [ ] RLS 정책 동작 확인
- [ ] 성능 모니터링
- [ ] Git 커밋 및 문서 업데이트

---

## 관련 문서
- [롤백 가이드](./rollback-guide.md)
- [데이터베이스 README](../README.md)
- [RLS 정책](../rls-policies/README.md)

---

**문서 버전**: 1.0.0  
**최종 업데이트**: 2026년 2월 16일
