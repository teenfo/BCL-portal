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
| `facilities` | 지점 정보 | name, address, operating_hours, latitude, longitude, photos(TEXT[]) |
| `members` | 회원 프로필 | user_id, name, email, status, phone, birthday, emergency_contact, avatar_url, preferences(JSONB) |
| `coaches` | 코치 정보 | user_id, name, specialties, linked_at, linked_by |
| `coaching_notes` | 회원별 코칭 노트 이력 🆕 | coach_id, member_id, note_type, content |

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
| `transactions` | 거래 내역 | member_id, amount, status, order_id, payment_key, source, toss_status |
| `pg_settings` | PG사 설정 (Toss) | facility_id, test_client_key, live_client_key, payment_mode |
| `refunds` | 환불 이력 | transaction_id, amount, reason, status, processed_by |
| `coach_settlements` | 코치 정산 내역 🆕 | coach_id, year_month, base_salary, session_allowance, total_amount, status |

#### 커뮤니케이션 (Communication)
| 테이블 | 설명 | 주요 컬럼 |
|--------|------|-----------|
| `notices` | 공지사항 | title, content, category, is_pinned |
| `notifications` | 알림 | user_id, title, message, is_read |
| `support_tickets` | 고객 문의 | member_id, subject, status, priority |

#### 분석 (Analytics)
| 테이블 | 설명 | 주요 컬럼 |
|--------|------|-----------|
| `session_feedback` | 수업 피드백 | session_id, member_id, coach_id, rating, comments, admin_response |

#### 락커 관리 (Locker Management)
| 테이블 | 설명 | 주요 컬럼 |
|--------|------|-----------|
| `lockers` | 개별 락커 정보 | locker_number, size(S/M/L), status, monthly_fee, assigned_member_id |
| `locker_assignments` | 배정 이력 | locker_id, member_id, start_date, end_date, status |

#### Race 시스템 (Race Management) 🆕
| 테이블 | 설명 | 주요 컬럼 |
|--------|------|-----------|
| `race_events` | Race 이벤트 | name, event_type, distance_meters, status, race_format, lobby_status |
| `race_records` | Race 최종 결과 | event_id, member_id, result_distance, max_watts, avg_spm, is_pr |
| `pm5_devices` | PM5 기기 | serial_number, mac_address, ble_name, current_mode, status |
| `race_live_state` | Race 실시간 상태 | event_id, device_id, distance_m, power_w, connection_status |
| `race_recordings` | 원시 레코딩 정보 | event_id, device_serial, file_path, file_size_bytes |
| `race_teams` | 팀전 정보 (임시/지속) | event_id, team_name, team_color, total_distance_m |

#### RBAC (역할 기반 접근 제어) 🆕
| 테이블 | 설명 | 주요 컬럼 |
|--------|------|-----------|
| `admin_roles` | 역할 정의 | name, display_name, permissions(JSONB), is_system_role |
| `admin_user_roles` | 사용자-역할 매핑 | user_id, role_id, facility_id, assigned_by |

#### 멤버십 이력 (Membership History) 🆕
| 테이블 | 설명 | 주요 컬럼 |
|--------|------|-----------|
| `membership_history` | 변경 이력 | membership_id, action_type, old_values, new_values, changed_by |

#### 알림 시스템 (Notification)
| 테이블 | 설명 | 주요 컬럼 |
|--------|------|-----------|
| `notifications` | 알림 통합 테이블 | user_id, title, content, category, type, channel, action_url, metadata |
| `notification_rules` | 자동 알림 규칙 | name, trigger_type, trigger_config, channels, is_active |
| `notification_logs` | 발송 로그 | rule_id, notification_id, channel, status, sent_at, read_at |
| `notification_preferences` | 수신 설정 | user_id, class_reminder, push_enabled, kakao_enabled, sms_enabled |
| `push_subscriptions` | 웹 푸시 구독 | user_id, endpoint, p256dh_key, auth_key, device_type |

#### 자동화 트리거 및 함수 (Automation) 🆕
| 명칭 | 유형 | 대상 | 설명 |
|------|------|------|------|
| `fn_handle_notification_side_effects` | Trigger Function | `notifications` | 알림 생성 시 푸시/외부 채널 발송 및 로그 기록 |
| `fn_send_class_reminders` | Cron Function | `sessions` | 수업 시작 1시간 전 예약자에게 알림 발송 |
| `fn_notify_waitlist_on_vacancy` | Trigger Function | `bookings` | 예약 취소 시 대기열 상위 인원에게 알림 발송 |
| `fn_send_membership_expiry_reminders` | Cron Function | `memberships` | 멤버십 만료 전 d-7, d-3, d-1 알림 발송 |
| `fn_book_with_credit` | RPC Function | `bookings`, `memberships` | 예약 생성 + 크레딧 차감 + 정원 초과 시 Waitlist 자동 분기 |
| `fn_cancel_booking_with_credit` | RPC Function | `bookings`, `memberships` | 예약 취소 + 크레딧 환원 |
| `fn_get_coach_dashboard` | RPC Function | `sessions`, `checkins` | 코치 로그인 시 대시보드 데이터 조회 (당일 수업, 출결 등) 🆕 |
| `fn_get_session_attendees` | RPC Function | `bookings`, `checkins` | 수업 참석자 목록 및 출석 상태 조회 🆕 |
| `fn_coach_mark_attendance` | RPC Function | `checkins` | 코치가 특정 회원의 출석을 수동으로 체킹 🆕 |
| `fn_get_coach_performance_stats`| RPC Function | `session_coaches`, `session_feedback` | Admin 화면용 코치별 성과/수업통계/평점 집계 🆕 |
| `fn_calculate_monthly_settlement`| RPC Function | `coach_settlements` | Admin의 월간 코치 정산 내역 생성 및 갱신 🆕 |

#### 보조 시스템 (Supplementary) 🆕
| 테이블 | 설명 | 주요 컬럼 |
|--------|------|-----------|
| `qr_codes` | QR 코드 관리 | code, qr_type, facility_id, expires_at, is_active |
| `kiosk_devices` | 키오스크 기기 | device_name, device_ip, status, last_heartbeat |
| `audit_logs` | 감사 로그 | user_id, action, table_name, old_values, new_values |
| `system_config` | 시스템 설정 | config_key, config_value, category, is_secret | 🆕

### 상세 스키마
- **마이그레이션 파일**: `supabase/migrations/` 디렉토리
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
supabase/migrations/
├── 20260125105614_initial_schema_setup.sql
├── 20260125153612_initial_schema_v0.6.sql
├── 20260207020501_fix_auth_users_email_change_null.sql
├── 20260208xxxxxx_*.sql (Auth/Members 개선 7개)
├── 20260217102xxx_*.sql (Widget/의정 시스템 5개)
├── 20260217104530_notification_system_schema.sql
├── 20260217105553_notification_automation_cron.sql
├── 20260217111257_add_lockers_table.sql
├── 20260217203600_enhance_session_feedback.sql      🆕
├── 20260217203700_create_race_system.sql             🆕
├── 20260217203800_create_admin_rbac.sql              🆕
├── 20260217203900_create_notification_logs.sql       🆕
├── 20260217204000_create_membership_history.sql      🆕
├── 20260217204100_enhance_existing_tables_columns.sql 🆕
├── 20260217204200_create_supplementary_tables.sql    🆕
└── 20260217204300_fix_rls_security_issues.sql        🆕
├── 20260218100000_coach_account_linking.sql (Coach Account Architecture)
├── 20260218230000_payment_system_phase1.sql (Payment Phase 1 Infrastructure)
├── 20260218230100_payment_rpc_helpers.sql (Payment RPC Helpers)
├── 20260218231500_create_system_config_table.sql (System Config Table) 🆕
├── 20260219165300_user_app_enhancement_phase1.sql (User App Enhancement Phase 1) 🆕
└── 20260221000000_coach_feature_enhancement.sql (Coach Feature Enhancement) 🆕
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
