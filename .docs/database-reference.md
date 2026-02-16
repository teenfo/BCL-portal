# BCL Portal Database Reference

> **⚠️ 이 문서는 데이터베이스 참조 개요입니다.**  
> **상세 정보는 [Database 디렉토리](./database/README.md)를 참조하세요.**

---

## 📋 빠른 참조

### 주요 문서
- 📚 **[Database Architecture](./database/README.md)** - 전체 아키텍처 및 개요
- 📝 **[Schema Files](./database/schema/)** - SQL 스키마 정의
- 🔒 **[RLS Policies](./database/rls-policies/README.md)** - Row Level Security 정책
- 🔄 **[Migration Strategy](./database/migrations/versioning-strategy.md)** - 마이그레이션 관리

---

## 1. 테이블 정의 (Schema Definition)

### 핵심 테이블 요약

#### 운영 핵심 (Core Operations)
| 테이블 | 설명 | 주요 컬럼 |
|--------|------|-----------|
| `facilities` | 지점 정보 | name, address, operating_hours |
| `members` | 회원 프로필 | user_id, name, email, status |
| `coaches` | 코치 정보 | user_id, name, specialties |

#### 멤버십 관리 (Membership)
| 테이블 | 설명 | 주요 컬럼 |
|--------|------|-----------|
| `membership_plans` | 요금제 | name, type, price, duration_days, credit_count |
| `memberships` | 회원권 보유 내역 | member_id, plan_id, start_date, end_date, remaining_credits |

#### 수업 및 예약 (Sessions & Bookings)
| 테이블 | 설명 | 주요 컬럼 |
|--------|------|-----------|
| `sessions` | 수업 일정 | title, session_date, start_time, capacity, wod_description |
| `session_coaches` | 수업-코치 매핑 | session_id, coach_id, role |
| `bookings` | 예약 내역 | session_id, member_id, status |
| `checkins` | 체크인 로그 | member_id, session_id, checkin_time, checkin_method |

#### 결제 및 금융 (Finance)
| 테이블 | 설명 | 주요 컬럼 |
|--------|------|-----------|
| `transactions` | 거래 내역 | member_id, amount, payment_status, category, pg_transaction_id |

#### 커뮤니케이션 (Communication)
| 테이블 | 설명 | 주요 컬럼 |
|--------|------|-----------|
| `notices` | 공지사항 | title, content, category, is_pinned |
| `notifications` | 알림 | user_id, title, message, is_read |
| `support_tickets` | 고객 문의 | member_id, subject, status, priority |

#### 분석 (Analytics)
| 테이블 | 설명 | 주요 컬럼 |
|--------|------|-----------|
| `session_feedback` | 수업 피드백 | session_id, member_id, rating, comments |

### 상세 스키마
- **초기 스키마**: [001_initial_schema.sql](./database/schema/001_initial_schema.sql)
- **전체 컬럼 정의**: Supabase Dashboard 또는 위 SQL 파일 참조

---

## 2. 보안 정책 (Row Level Security)

### RLS 원칙
- ✅ **모든 테이블 RLS 활성화 필수**
- ✅ 클라이언트는 `anon key`만 사용
- ✅ Service Role Key는 서버 사이드에서만 사용

### 역할 기반 접근 제어
- **Admin**: 모든 데이터 접근 가능
- **Coach**: 자신의 수업 관련 데이터만
- **Member**: 자신의 데이터만

### 상세 정책
- **RLS 정책 가이드**: [RLS Policies README](./database/rls-policies/README.md)
- **테이블별 정책**: `database/rls-policies/{table}.md`

---

## 3. 마이그레이션 관리

### 마이그레이션 파일
```
database/schema/
├── 001_initial_schema.sql         # 초기 스키마
├── 002_add_race_tables.sql        # Race 시스템 테이블
├── 003_add_insights_tables.sql    # Insights/Analytics 테이블
└── 004_add_notification_system.sql # 알림 시스템
```

### 실행 방법
```bash
# 1. Supabase Dashboard → SQL Editor
# 2. 마이그레이션 파일 내용 복사
# 3. 실행

# 또는 Supabase CLI 사용
supabase db reset
supabase db push
```

### 상세 가이드
- [마이그레이션 전략](./database/migrations/versioning-strategy.md)
- [롤백 가이드](./database/migrations/rollback-guide.md)

---

## 4. 초기 데이터 설정 (Seeding)

### 인증 계정 (Auth)
**⚠️ 제한사항**: Auth 유저는 Supabase Dashboard에서 수동 생성이 가장 안전합니다.

#### 테스트 계정
- **관리자**: `admin@bcl.com` / `123456`
- **코치**: `coach@bcl.com` / `123456`
- **회원**: `member@bcl.com` / `123456`

### 데이터 시딩 순서
```sql
-- 1. 기본 데이터
INSERT INTO facilities (...) VALUES (...);
INSERT INTO membership_plans (...) VALUES (...);

-- 2. 사용자 연관 데이터
INSERT INTO coaches (...) VALUES (...);
INSERT INTO members (...) VALUES (...);

-- 3. 운영 데이터
INSERT INTO sessions (...) VALUES (...);
INSERT INTO notices (...) VALUES (...);
```

### 시딩 스크립트
```bash
# 개발 환경 시딩
npm run db:seed

# 테스트 환경 시딩
npm run db:seed:test
```

---

## 5. 트러블슈팅 (Troubleshooting)

### 일반적인 문제

#### Q: 데이터가 있는데 API 결과가 빈 배열([])로 나옵니다.
**원인**: RLS가 활성화되어 있으나 정책(Policy)이 없거나 잘못 설정됨

**해결**:
```sql
-- 1. RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'members';

-- 2. 정책 추가 (예시)
CREATE POLICY "Members can view own profile"
    ON public.members
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
```

**참고**: [RLS 정책 가이드](./database/rls-policies/README.md)

---

#### Q: 유저는 생성되는데 `members` 테이블에 데이터가 없습니다.
**원인**: `auth.users` 생성 시 실행되는 트리거 함수 누락 또는 오류

**해결**:
```sql
-- 트리거 함수 확인
SELECT * FROM pg_proc WHERE proname = 'on_auth_user_created';

-- 트리거 확인
SELECT * FROM pg_trigger WHERE tgname LIKE '%auth%';

-- 트리거 재생성 (예시)
CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.members (user_id, email, name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', 'User'));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.on_auth_user_created();
```

---

#### Q: 환경 변수 연결 오류
**이슈**: `Supabase URL or Anon Key is missing`

**해결**:
```bash
# .env.local 확인
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# 환경 변수가 제대로 주입되었는지 확인
npm run dev

# 빌드 시 환경 변수 확인
npm run build
```

**참고**: [환경 변수 가이드](./ENVIRONMENT_VARIABLES_GUIDE.md)

---

#### Q: 마이그레이션 실행 중 오류 발생
**원인**: 순서 문제 또는 의존성 누락

**해결**:
1. 마이그레이션 파일 순서 확인 (`001_`, `002_`, ...)
2. 외래 키 제약 조건 검토
3. 롤백 후 재실행

```sql
-- 트랜잭션으로 안전하게 실행
BEGIN;
-- 마이그레이션 SQL
COMMIT;
-- 문제 발생 시
-- ROLLBACK;
```

**참고**: [마이그레이션 전략](./database/migrations/versioning-strategy.md)

---

#### Q: 쿼리 성능 저하
**원인**: 인덱스 누락 또는 비효율적 쿼리

**해결**:
```sql
-- 쿼리 분석
EXPLAIN ANALYZE
SELECT * FROM bookings
WHERE member_id = 'xxx' AND session_date > '2026-01-01';

-- 인덱스 추가
CREATE INDEX idx_bookings_member_date
ON bookings(member_id, session_date);
```

**참고**: [성능 인덱스 가이드](./database/indexes/performance-indexes.md)

---

## 6. 모니터링 및 유지보수

### Supabase Dashboard 모니터링
1. **Query Performance**: Database → Query Performance
2. **Table Statistics**: Database → Tables → Statistics
3. **API Usage**: Settings → API → Usage

### 백업 확인
```
Database → Backups → Daily Backups
```

### 로그 확인
```
Logs → Postgres Logs
```

---

## 관련 문서

### 필수 문서
- 📚 **[Database Architecture](./database/README.md)** - 전체 개요
- 🔒 **[Security Guide](./security/README.md)** - 보안 정책
- 🧪 **[Testing Strategy](./testing/README.md)** - 테스트 전략
- 🚀 **[Deployment Guide](./deployment-guide.md)** - 배포 가이드

### 기술 문서
- **[API Specification](./API_SPECIFICATION.md)** - API 명세
- **[Project Blueprint](./project-blueprint.md)** - 프로젝트 개요

---

**문서 버전**: 2.0.0  
**최종 업데이트**: 2026년 2월 16일  
**이전 버전**: 1.0.0 (간략 버전)
