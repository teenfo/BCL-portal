# BCL Portal 프로젝트 개선 계획서

> 분석 날짜: 2026년 2월 16일  
> 분석 대상: BCL Portal 전체 문서 패키지

---

## 📊 종합 분석 요약

### 전반적 평가: **B+ (85/100)**

**강점:**
- ✅ 명확한 아키텍처 정의 (CSR/Supabase/Cloudflare)
- ✅ 상세한 Sitemap 및 기획 문서
- ✅ Agent 자동화 규칙 체계화
- ✅ Race 시스템 기술 문서 완비

**개선 필요:**
- ⚠️ API 명세 부재
- ⚠️ 데이터베이스 마이그레이션 전략 미흡
- ⚠️ 보안 정책 상세화 필요
- ⚠️ 테스트 전략 부재
- ⚠️ 에러 핸들링 가이드 부족

---

## 🔴 Critical Issues (즉시 해결 필요)

### 1. API 명세서 부재

**현재 상태:**
- 각 기능별 API 엔드포인트가 Sitemap에 암시되어 있으나, 명시적인 API 문서 없음
- Request/Response 스키마 정의 부족

**문제점:**
- 프론트엔드-백엔드 계약 불명확
- 에러 핸들링 표준화 어려움
- API 버전 관리 전략 부재

**해결 방안:**
```markdown
.docs/api/
├── README.md                    # API 개요
├── authentication.md            # 인증/인가 API
├── admin/
│   ├── members.md              # 회원 관리 API
│   ├── sessions.md             # 수업 관리 API
│   ├── billing.md              # 결제 API
│   └── reports.md              # 리포트 API
├── user/
│   ├── profile.md              # 프로필 API
│   ├── bookings.md             # 예약 API
│   └── checkin.md              # 체크인 API
└── schemas/
    ├── common.md               # 공통 스키마
    └── error-codes.md          # 에러 코드 정의
```

**우선순위:** 🔴 High (Week 1)

---

### 2. 데이터베이스 마이그레이션 전략 미흡

**현재 상태:**
- `database-reference.md`에 테이블 요약만 존재
- 실제 SQL 스키마 정의 부족
- 마이그레이션 버전 관리 전략 없음

**문제점:**
- 환경별(dev/staging/prod) 스키마 동기화 어려움
- 롤백 전략 부재
- 데이터 손실 위험

**해결 방안:**
```markdown
.docs/database/
├── README.md                    # DB 아키텍처 개요
├── schema/
│   ├── 001_initial_schema.sql  # 초기 스키마
│   ├── 002_add_notifications.sql
│   └── 003_add_race_tables.sql
├── migrations/
│   ├── versioning-strategy.md  # 버전 관리 전략
│   └── rollback-guide.md       # 롤백 가이드
├── rls-policies/
│   ├── members.md              # 회원 테이블 RLS
│   ├── sessions.md             # 수업 테이블 RLS
│   └── transactions.md         # 결제 테이블 RLS
└── indexes/
    └── performance-indexes.md  # 성능 인덱스 정의
```

**구체적 개선 사항:**

#### A. 초기 스키마 정의 (001_initial_schema.sql)
```sql
-- ============================================
-- BCL Portal - Initial Database Schema
-- Version: 1.0.0
-- Date: 2026-02-16
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Core Tables
-- ============================================

-- Facilities (지점)
CREATE TABLE public.facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    operating_hours JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Members (회원)
CREATE TABLE public.members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    birth_date DATE,
    gender VARCHAR(10),
    profile_image_url TEXT,
    emergency_contact VARCHAR(20),
    medical_notes TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Membership Plans (요금제)
CREATE TABLE public.membership_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'period' or 'count'
    duration_days INT, -- for period type
    credit_count INT, -- for count type
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Memberships (회원권)
CREATE TABLE public.memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.membership_plans(id),
    start_date DATE NOT NULL,
    end_date DATE,
    remaining_credits INT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Coaches (코치)
CREATE TABLE public.coaches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    specialties TEXT[],
    bio TEXT,
    profile_image_url TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sessions (수업)
CREATE TABLE public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID REFERENCES public.facilities(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INT NOT NULL DEFAULT 15,
    intensity_level VARCHAR(20), -- 'beginner', 'intermediate', 'advanced'
    wod_description TEXT,
    status VARCHAR(20) DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Session Coaches (수업-코치 매핑)
CREATE TABLE public.session_coaches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES public.coaches(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'primary', -- 'primary' or 'assistant'
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(session_id, coach_id)
);

-- Bookings (예약)
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES public.memberships(id),
    status VARCHAR(20) DEFAULT 'confirmed', -- 'confirmed', 'waitlist', 'cancelled'
    booking_type VARCHAR(20) DEFAULT 'regular', -- 'regular', 'trial'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(session_id, member_id)
);

-- Check-ins (출석)
CREATE TABLE public.checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings(id),
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.sessions(id),
    facility_id UUID REFERENCES public.facilities(id),
    checkin_time TIMESTAMPTZ DEFAULT now(),
    checkin_method VARCHAR(20) DEFAULT 'qr', -- 'qr', 'manual', 'kiosk'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Transactions (거래)
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES public.memberships(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'pending',
    transaction_type VARCHAR(20) DEFAULT 'purchase', -- 'purchase', 'refund'
    category VARCHAR(50) DEFAULT 'membership', -- 'membership', 'pt', 'goods'
    pg_transaction_id VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Notices (공지사항)
CREATE TABLE public.notices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID REFERENCES public.facilities(id),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    is_pinned BOOLEAN DEFAULT false,
    is_urgent BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications (알림)
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Support Tickets (고객 문의)
CREATE TABLE public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    subject VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50),
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    priority VARCHAR(20) DEFAULT 'normal',
    assigned_to UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Indexes for Performance
-- ============================================

CREATE INDEX idx_members_user_id ON public.members(user_id);
CREATE INDEX idx_members_status ON public.members(status);
CREATE INDEX idx_memberships_member_id ON public.memberships(member_id);
CREATE INDEX idx_memberships_status ON public.memberships(status);
CREATE INDEX idx_sessions_date ON public.sessions(session_date);
CREATE INDEX idx_sessions_facility ON public.sessions(facility_id);
CREATE INDEX idx_bookings_session ON public.bookings(session_id);
CREATE INDEX idx_bookings_member ON public.bookings(member_id);
CREATE INDEX idx_checkins_member ON public.checkins(member_id);
CREATE INDEX idx_checkins_session ON public.checkins(session_id);
CREATE INDEX idx_transactions_member ON public.transactions(member_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Updated_at Trigger Function
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_facilities_updated_at
    BEFORE UPDATE ON public.facilities
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON public.members
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_membership_plans_updated_at
    BEFORE UPDATE ON public.membership_plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_memberships_updated_at
    BEFORE UPDATE ON public.memberships
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coaches_updated_at
    BEFORE UPDATE ON public.coaches
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON public.sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notices_updated_at
    BEFORE UPDATE ON public.notices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

**우선순위:** 🔴 High (Week 1)

---

### 3. 보안 정책 상세화 부족

**현재 상태:**
- `design-security.md`에 일반적인 보안 원칙만 명시
- RLS 정책의 구체적인 구현 가이드 부족
- 민감 데이터 처리 규칙 미흡

**문제점:**
- 개발자마다 다른 보안 수준 적용 가능
- 데이터 유출 위험
- GDPR/개인정보보호법 준수 어려움

**해결 방안:**
```markdown
.docs/security/
├── README.md                    # 보안 개요
├── authentication.md            # 인증 전략
├── authorization.md             # 인가 및 RBAC
├── data-protection.md           # 데이터 보호
├── rls-implementation.md        # RLS 구현 가이드
├── api-security.md              # API 보안
├── sensitive-data-handling.md   # 민감 데이터 처리
└── compliance/
    ├── gdpr.md                  # GDPR 준수
    └── korean-privacy-law.md    # 한국 개인정보보호법
```

**구체적 RLS 정책 예시:**

```sql
-- ============================================
-- Members Table RLS Policies
-- ============================================

-- 1. Members can read their own data
CREATE POLICY "Members can view own profile"
    ON public.members
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- 2. Admins can read all members
CREATE POLICY "Admins can view all members"
    ON public.members
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- 3. Members can update their own profile (limited fields)
CREATE POLICY "Members can update own profile"
    ON public.members
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid()
        AND status = OLD.status  -- Cannot change status
    );

-- 4. Only admins can create members
CREATE POLICY "Admins can create members"
    ON public.members
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- ============================================
-- Bookings Table RLS Policies
-- ============================================

-- 1. Members can view their own bookings
CREATE POLICY "Members can view own bookings"
    ON public.bookings
    FOR SELECT
    TO authenticated
    USING (
        member_id IN (
            SELECT id FROM public.members
            WHERE user_id = auth.uid()
        )
    );

-- 2. Coaches can view bookings for their sessions
CREATE POLICY "Coaches can view session bookings"
    ON public.bookings
    FOR SELECT
    TO authenticated
    USING (
        session_id IN (
            SELECT session_id FROM public.session_coaches sc
            JOIN public.coaches c ON sc.coach_id = c.id
            WHERE c.user_id = auth.uid()
        )
    );

-- 3. Members can create bookings for themselves
CREATE POLICY "Members can create own bookings"
    ON public.bookings
    FOR INSERT
    TO authenticated
    WITH CHECK (
        member_id IN (
            SELECT id FROM public.members
            WHERE user_id = auth.uid()
        )
    );

-- 4. Members can cancel their own bookings
CREATE POLICY "Members can cancel own bookings"
    ON public.bookings
    FOR UPDATE
    TO authenticated
    USING (
        member_id IN (
            SELECT id FROM public.members
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (status = 'cancelled');
```

**우선순위:** 🔴 High (Week 2)

---

## 🟡 Important Issues (조속히 해결 필요)

### 4. 테스트 전략 부재

**현재 상태:**
- 테스트 관련 문서 전무
- CI/CD 파이프라인 미정의

**해결 방안:**
```markdown
.docs/testing/
├── README.md                    # 테스트 전략 개요
├── unit-testing.md              # 단위 테스트 가이드
├── integration-testing.md       # 통합 테스트
├── e2e-testing.md               # E2E 테스트
├── performance-testing.md       # 성능 테스트
└── test-data.md                 # 테스트 데이터 관리
```

**테스트 파일 구조:**
```
tests/
├── unit/
│   ├── utils/
│   ├── hooks/
│   └── components/
├── integration/
│   ├── api/
│   └── database/
├── e2e/
│   ├── user-flows/
│   └── admin-flows/
└── fixtures/
    └── test-data.json
```

**우선순위:** 🟡 Medium (Week 3)

---

### 5. 에러 핸들링 가이드 부족

**현재 상태:**
- 일관된 에러 처리 규칙 없음
- 사용자 친화적 에러 메시지 전략 부재

**해결 방안:**

#### A. 에러 코드 체계 정의
```typescript
// lib/errors/error-codes.ts

export const ERROR_CODES = {
  // Authentication Errors (1000-1099)
  AUTH_INVALID_CREDENTIALS: { code: 1001, message: '이메일 또는 비밀번호가 올바르지 않습니다.' },
  AUTH_SESSION_EXPIRED: { code: 1002, message: '세션이 만료되었습니다. 다시 로그인해주세요.' },
  AUTH_UNAUTHORIZED: { code: 1003, message: '접근 권한이 없습니다.' },
  
  // Booking Errors (2000-2099)
  BOOKING_SESSION_FULL: { code: 2001, message: '수업 정원이 마감되었습니다.' },
  BOOKING_DUPLICATE: { code: 2002, message: '이미 예약한 수업입니다.' },
  BOOKING_INSUFFICIENT_CREDITS: { code: 2003, message: '잔여 횟수가 부족합니다.' },
  BOOKING_TIME_CONFLICT: { code: 2004, message: '동일 시간에 다른 예약이 있습니다.' },
  
  // Membership Errors (3000-3099)
  MEMBERSHIP_EXPIRED: { code: 3001, message: '이용권이 만료되었습니다.' },
  MEMBERSHIP_NOT_FOUND: { code: 3002, message: '유효한 이용권이 없습니다.' },
  
  // Payment Errors (4000-4099)
  PAYMENT_FAILED: { code: 4001, message: '결제에 실패했습니다.' },
  PAYMENT_CANCELLED: { code: 4002, message: '결제가 취소되었습니다.' },
  
  // Validation Errors (5000-5099)
  VALIDATION_INVALID_INPUT: { code: 5001, message: '입력값이 올바르지 않습니다.' },
  VALIDATION_REQUIRED_FIELD: { code: 5002, message: '필수 입력 항목입니다.' },
  
  // System Errors (9000-9099)
  SYSTEM_INTERNAL_ERROR: { code: 9001, message: '일시적인 오류가 발생했습니다.' },
  SYSTEM_MAINTENANCE: { code: 9002, message: '시스템 점검 중입니다.' },
} as const;
```

#### B. 에러 핸들러 유틸리티
```typescript
// lib/errors/error-handler.ts

import { ERROR_CODES } from './error-codes';

export class AppError extends Error {
  constructor(
    public code: number,
    message: string,
    public userMessage?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleSupabaseError(error: any): AppError {
  // Supabase specific error mapping
  if (error.code === 'PGRST116') {
    return new AppError(
      ERROR_CODES.AUTH_UNAUTHORIZED.code,
      'RLS policy violation',
      ERROR_CODES.AUTH_UNAUTHORIZED.message
    );
  }
  
  if (error.code === '23505') {
    return new AppError(
      ERROR_CODES.BOOKING_DUPLICATE.code,
      'Unique constraint violation',
      ERROR_CODES.BOOKING_DUPLICATE.message
    );
  }
  
  return new AppError(
    ERROR_CODES.SYSTEM_INTERNAL_ERROR.code,
    error.message,
    ERROR_CODES.SYSTEM_INTERNAL_ERROR.message
  );
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.userMessage || error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return ERROR_CODES.SYSTEM_INTERNAL_ERROR.message;
}
```

**우선순위:** 🟡 Medium (Week 3)

---

### 6. 성능 최적화 가이드 부족

**현재 상태:**
- 성능 지표 및 모니터링 전략 부재
- 캐싱 전략 미정의

**해결 방안:**
```markdown
.docs/performance/
├── README.md                    # 성능 전략 개요
├── caching-strategy.md          # 캐싱 전략
├── database-optimization.md     # DB 쿼리 최적화
├── frontend-optimization.md     # 프론트엔드 최적화
├── image-optimization.md        # 이미지 최적화
└── monitoring.md                # 모니터링 및 알림
```

**성능 목표 정의:**
```typescript
// performance-targets.md

## 성능 목표 (Performance Targets)

### 페이지 로드 시간
- **목표:** First Contentful Paint (FCP) < 1.5초
- **대시보드:** < 2초
- **리스트 페이지:** < 1.5초
- **상세 페이지:** < 1초

### API 응답 시간
- **GET 요청:** < 200ms (P95)
- **POST 요청:** < 500ms (P95)
- **복잡한 쿼리:** < 1초 (P95)

### 데이터베이스
- **쿼리 실행 시간:** < 100ms (P95)
- **인덱스 커버리지:** > 95%
- **Connection Pool:** 최소 10, 최대 50

### 캐싱
- **Cache Hit Rate:** > 80%
- **Cache TTL:**
  - 정적 데이터: 1시간
  - 동적 데이터: 5분
  - 사용자 세션: 24시간
```

**우선순위:** 🟡 Medium (Week 4)

---

## 🟢 Nice to Have (추후 개선)

### 7. 국제화(i18n) 전략

**해결 방안:**
```markdown
.docs/i18n/
├── README.md                    # 국제화 전략
├── translation-guide.md         # 번역 가이드
└── supported-locales.md         # 지원 언어
```

**우선순위:** 🟢 Low (Phase 2)

---

### 8. 접근성(a11y) 가이드

**해결 방안:**
```markdown
.docs/accessibility/
├── README.md                    # 접근성 개요
├── wcag-compliance.md           # WCAG 준수
├── keyboard-navigation.md       # 키보드 네비게이션
└── screen-reader-support.md     # 스크린 리더 지원
```

**우선순위:** 🟢 Low (Phase 2)

---

### 9. 분석 및 모니터링 전략

**해결 방안:**
```markdown
.docs/analytics/
├── README.md                    # 분석 전략 개요
├── user-behavior.md             # 사용자 행동 분석
├── business-metrics.md          # 비즈니스 지표
└── error-tracking.md            # 에러 추적
```

**우선순위:** 🟢 Low (Phase 2)

---

## 📅 개선 로드맵

### Week 1 (Critical)
- [ ] API 명세서 작성 (3일)
- [ ] 데이터베이스 스키마 완성 (2일)

### Week 2 (Critical)
- [ ] RLS 정책 상세화 (2일)
- [ ] 보안 가이드 작성 (3일)

### Week 3 (Important)
- [ ] 테스트 전략 수립 (2일)
- [ ] 에러 핸들링 가이드 (2일)
- [ ] CI/CD 파이프라인 구성 (1일)

### Week 4 (Important)
- [ ] 성능 최적화 가이드 (3일)
- [ ] 모니터링 설정 (2일)

### Phase 2 (Nice to Have)
- [ ] 국제화 전략
- [ ] 접근성 가이드
- [ ] 분석 전략

---

## 🎯 즉시 행동 항목 (Next Actions)

1. **API 명세서 템플릿 생성**
   ```bash
   mkdir -p .docs/api/{admin,user,coach,schemas}
   touch .docs/api/README.md
   ```

2. **데이터베이스 마이그레이션 디렉토리 생성**
   ```bash
   mkdir -p .docs/database/{schema,migrations,rls-policies,indexes}
   touch .docs/database/README.md
   ```

3. **보안 문서 디렉토리 생성**
   ```bash
   mkdir -p .docs/security/compliance
   touch .docs/security/README.md
   ```

4. **테스트 구조 생성**
   ```bash
   mkdir -p tests/{unit,integration,e2e,fixtures}
   touch .docs/testing/README.md
   ```

---

## 💡 추가 권장 사항

### 개발 환경 표준화
```markdown
.docs/development/
├── setup-guide.md               # 개발 환경 설정
├── coding-standards.md          # 코딩 표준
├── git-workflow.md              # Git 워크플로우
├── code-review-checklist.md    # 코드 리뷰 체크리스트
└── troubleshooting.md           # 문제 해결 가이드
```

### 문서화 자동화
- TypeDoc for TypeScript
- Swagger/OpenAPI for API
- Docusaurus for documentation site

### 협업 도구
- Linear/Jira for issue tracking
- Notion/Confluence for team wiki
- Slack for communication

---

## ✅ 체크리스트

### 문서 완성도
- [x] 프로젝트 개요 및 아키텍처
- [x] Sitemap 및 기획서
- [ ] **API 명세서** ⚠️
- [ ] **데이터베이스 스키마** ⚠️
- [ ] **보안 정책** ⚠️
- [ ] **테스트 전략** ⚠️
- [x] UI/UX 가이드
- [x] 배포 가이드

### 개발 준비도
- [x] 기술 스택 정의
- [x] 폴더 구조
- [ ] **환경 변수 관리** ⚠️
- [ ] **에러 핸들링** ⚠️
- [ ] **로깅 전략** ⚠️
- [ ] **모니터링 설정** ⚠️

---

**분석 완료일:** 2026년 2월 16일  
**다음 리뷰:** 2026년 3월 16일
