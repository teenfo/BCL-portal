# BCL Portal Database Reference

이 문서는 데이터베이스 스키마, 초기 데이터 설정(Seeding) 및 트러블슈팅을 통합 관리하는 가이드입니다.

---

## 1. 테이블 정의 (Schema Definition)

### 핵심 테이블 요약
- `facilities`: 지점 정보 및 운영 시간.
- `members`: 회원 프로필 및 멤버십 상태/크레딧.
- `membership_plans`: 구매 가능한 수강권 종류.
- `memberships`: 회원의 실제 수강권 보유 데이터.
- `sessions`: 수업 일정 및 정원 정보.
- `session_coaches`: 세션별 담당 코치 매핑.
- `bookings`: 수업 예약 내역.
- `checkins`: 입장 로그 (실시간 타임라인).
- `transactions/payments`: 결제 및 금융 트랜잭션.
- `notices/notifications`: 공지 및 알림 내역.
- `support_tickets`: 고객 문의 데이터.

> *상세 컬럼 정보는 실제 소스 코드는 Supabase Dashboard와 동기화되어 있으며, 모든 테이블은 **RLS 필수**로 설정되어 클라이언트는 `anon key`만 사용합니다.*

---

## 2. 초기 데이터 가이드 (Seeding)

### 인증 계정 (Auth)
- **제한사항**: Auth 유저는 대시보드에서 수동 생성이 가장 안전합니다.
- **테이션 계정**:
  - 관리자: `admin@bcl.com` / `123456`
  - 일반 회원: `alice@bcl.com` / `123456`

### SQL 시딩 절차
새로운 환경 구성 시 다음 순서로 SQL을 실행합니다:
1. `facilities` -> `membership_plans` -> `coaches`
2. `sessions` (현재 시간 기반 상대 간격 사용 권장)
3. `notices` 및 `content`

---

## 3. 트러블슈팅 (Troubleshooting)

### Q: 데이터가 있는데 API 결과가 빈 배열([])로 나옵니다.
- **원인**: RLS (Row Level Security)가 활성화되어 있으나 정책(Policy)이 없습니다.
- **해결**: Supabase 정책 설정에서 `SELECT` 권한을 `true` 또는 `auth.uid() = user_id` 등으로 허용하세요.

### Q: 유저는 생성되는데 회원 테이블(`members`)에 데이터가 안 들어옵니다.
- **원인**: `auth.users` 신규 생성 시 실행되는 DB 트리거 함수가 누락되었거나 오류가 발생했습니다.
- **해결**: 트리거 함수(`on_auth_user_created`)가 정상적으로 작성되었는지 확인하세요.

### Q: 환경 변수 연결 오류
- **이슈**: `Supabase URL or Anon Key is missing`
- **해결**: `.env.local` 파일에 `NEXT_PUBLIC_SUPABASE_URL` 명칭이 정확한지, Next.js 빌드 시 정적으로 주입되었는지 확인하세요.
