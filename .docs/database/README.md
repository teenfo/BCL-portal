# BCL Portal Database Architecture

이 문서는 BCL Portal의 데이터베이스 아키텍처, 스키마 관리 및 마이그레이션 전략을 통합 관리하는 가이드입니다.

---

## 📋 목차
- [아키텍처 개요](#아키텍처-개요)
- [스키마 파일 구조](#스키마-파일-구조)
- [마이그레이션 전략](#마이그레이션-전략)
- [RLS 정책 관리](#rls-정책-관리)
- [인덱스 전략](#인덱스-전략)

---

## 아키텍처 개요

### 기술 스택
- **Database**: PostgreSQL (Supabase 관리형)
- **ORM/Client**: Supabase JS SDK
- **보안**: Row Level Security (RLS) 필수
- **접근 제어**: Role-Based Access Control (RBAC)

### 핵심 원칙
1. **RLS 필수**: 모든 테이블은 RLS가 활성화되어야 함
2. **Client-Side Access**: 클라이언트는 `anon key`만 사용
3. **Service Role 제한**: Service Role Key는 서버 사이드에서만 사용
4. **마이그레이션 버전 관리**: 모든 스키마 변경은 버전화된 마이그레이션 파일로 관리

---

## 스키마 파일 구조

```
.docs/database/
├── README.md                           # 이 문서
├── schema/                             # 스키마 정의
│   ├── 001_initial_schema.sql         # 초기 스키마 (핵심 테이블)
│   ├── 002_add_race_tables.sql        # Race 시스템 테이블
│   ├── 003_add_insights_tables.sql    # Insights/Analytics 테이블
│   └── 004_add_notification_system.sql # 알림 시스템 테이블
├── migrations/                         # 마이그레이션 관리
│   ├── versioning-strategy.md         # 버전 관리 전략
│   └── rollback-guide.md              # 롤백 가이드
├── rls-policies/                       # RLS 정책
│   ├── README.md                      # RLS 개요
│   ├── members.md                     # 회원 테이블 정책
│   ├── sessions.md                    # 수업 테이블 정책
│   ├── bookings.md                    # 예약 테이블 정책
│   └── transactions.md                # 결제 테이블 정책
└── indexes/                            # 인덱스 최적화
    └── performance-indexes.md         # 성능 인덱스 정의
```

---

## 마이그레이션 전략

### 버전 관리 원칙
1. **순차적 번호**: `001_`, `002_`, `003_` 형식 사용
2. **명확한 이름**: `add_`, `modify_`, `remove_` 접두사 사용
3. **롤백 가능성**: 각 마이그레이션은 롤백 스크립트 포함 권장
4. **환경별 동기화**: dev → staging → production 순서 적용

### 마이그레이션 파일 명명 규칙
```
{version}_{action}_{target}.sql

예시:
- 001_initial_schema.sql
- 002_add_race_tables.sql
- 003_modify_members_add_avatar.sql
- 004_remove_deprecated_columns.sql
```

### 실행 순서
```bash
# 개발 환경
1. Local DB에서 마이그레이션 작성 및 테스트
2. .docs/database/schema/ 에 파일 저장
3. Git 커밋

# 스테이징 환경
4. Supabase Dashboard에서 SQL Editor 실행
5. 마이그레이션 파일 내용 복사 후 실행
6. 테스트 및 검증

# 프로덕션 환경
7. 백업 생성
8. 마이그레이션 실행
9. 검증 및 모니터링
```

자세한 내용은 [마이그레이션 가이드](./migrations/versioning-strategy.md)를 참조하세요.

---

## RLS 정책 관리

### RLS 정책 구조
각 테이블별로 다음 정책을 정의합니다:
1. **SELECT**: 누가 데이터를 읽을 수 있는가?
2. **INSERT**: 누가 데이터를 생성할 수 있는가?
3. **UPDATE**: 누가 데이터를 수정할 수 있는가?
4. **DELETE**: 누가 데이터를 삭제할 수 있는가?

### 역할 기반 정책
- **Admin**: 모든 데이터 접근 가능
- **Coach**: 자신의 수업 관련 데이터 접근
- **Member**: 자신의 데이터만 접근

자세한 내용은 [RLS 정책 디렉토리](./rls-policies/)를 참조하세요.

---

## 인덱스 전략

### 인덱스 생성 원칙
1. **자주 조회되는 컬럼**: `WHERE`, `JOIN`, `ORDER BY`에 사용되는 컬럼
2. **복합 인덱스**: 여러 컬럼을 함께 조회하는 경우
3. **성능 모니터링**: 느린 쿼리 로그 분석 후 인덱스 추가

### 기본 인덱스
```sql
-- 회원 관련
CREATE INDEX idx_members_user_id ON members(user_id);
CREATE INDEX idx_members_status ON members(status);

-- 수업 관련
CREATE INDEX idx_sessions_date ON sessions(session_date);
CREATE INDEX idx_sessions_facility ON sessions(facility_id);

-- 예약 관련
CREATE INDEX idx_bookings_session ON bookings(session_id);
CREATE INDEX idx_bookings_member ON bookings(member_id);
```

자세한 내용은 [성능 인덱스 가이드](./indexes/performance-indexes.md)를 참조하세요.

---

## 데이터베이스 테이블 요약

### 핵심 테이블 (Core Tables)
- `facilities`: 지점 정보
- `members`: 회원 프로필
- `membership_plans`: 요금제
- `memberships`: 회원권
- `coaches`: 코치 정보

### 운영 테이블 (Operations Tables)
- `sessions`: 수업 일정
- `session_coaches`: 수업-코치 매핑
- `bookings`: 예약 내역
- `checkins`: 체크인 로그

### 금융 테이블 (Finance Tables)
- `transactions`: 거래 내역
- `payments`: 결제 정보

### 커뮤니케이션 테이블 (Communication Tables)
- `notices`: 공지사항
- `notifications`: 알림
- `support_tickets`: 고객 문의

### 분석 테이블 (Analytics Tables)
- `session_feedback`: 수업 피드백 (Insights용)

각 테이블의 상세 컬럼 정의는 [스키마 파일](./schema/)을 참조하세요.

---

## 환경별 설정

### 개발 환경 (Development)
- **자동 마이그레이션**: 허용
- **RLS 테스트**: 필수
- **시드 데이터**: 자동 생성

### 스테이징 환경 (Staging)
- **수동 마이그레이션**: 검증 후 실행
- **프로덕션 데이터 복제**: 익명화 후 사용
- **RLS 검증**: 필수

### 프로덕션 환경 (Production)
- **백업 필수**: 마이그레이션 전 자동 백업
- **모니터링**: 실시간 성능 모니터링
- **롤백 계획**: 항상 준비

---

## 트러블슈팅

### Q: 데이터가 있는데 API 결과가 빈 배열([])로 나옵니다.
**원인**: RLS 정책이 없거나 잘못 설정됨  
**해결**: Supabase Dashboard → Authentication → Policies 에서 정책 확인 및 수정

### Q: 마이그레이션 실행 중 오류 발생
**원인**: 순서 문제 또는 의존성 누락  
**해결**: 마이그레이션 파일 순서 확인, 외래 키 제약 조건 검토

### Q: 성능 저하
**원인**: 인덱스 누락 또는 비효율적 쿼리  
**해결**: `EXPLAIN ANALYZE` 로 쿼리 분석, 필요한 인덱스 추가

---

## 관련 문서
- [프로젝트 블루프린트](../project-blueprint.md)
- [보안 가이드](../security/README.md)
- [API 명세서](../API_SPECIFICATION.md)
- [배포 가이드](../deployment-guide.md)

---

**문서 버전**: 1.0.0  
**최종 업데이트**: 2026년 2월 16일  
**다음 검토일**: 2026년 3월 16일
