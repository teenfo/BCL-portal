# BCL Portal RLS (Row Level Security) Policies

이 문서는 BCL Portal의 Row Level Security 정책 구현 가이드입니다.

---

## 📋 목차
- [RLS 개요](#rls-개요)
- [정책 설계 원칙](#정책-설계-원칙)
- [역할 기반 접근 제어](#역할-기반-접근-제어)
- [테이블별 정책](#테이블별-정책)
- [정책 테스트](#정책-테스트)

---

## RLS 개요

### RLS란?
Row Level Security (RLS)는 PostgreSQL의 보안 기능으로, **테이블의 각 행(row)에 대한 접근 권한을 세밀하게 제어**할 수 있습니다.

### BCL Portal에서의 RLS
- ✅ **모든 테이블은 RLS 필수**
- ✅ 클라이언트는 `anon key` 사용
- ✅ Service Role Key는 서버 사이드에서만 사용
- ✅ 사용자 역할 기반 접근 제어 (RBAC)

---

## 정책 설계 원칙

### 1. 최소 권한 원칙 (Principle of Least Privilege)
- 사용자는 **필요한 최소한의 데이터만** 접근 가능
- 기본적으로 모든 접근 차단, 필요한 경우만 허용

### 2. 역할 기반 접근 제어 (RBAC)
- **Admin**: 모든 데이터 접근 가능
- **Coach**: 자신의 수업 관련 데이터만 접근
- **Member**: 자신의 데이터만 접근

### 3. 명시적 정책
- 각 작업(SELECT, INSERT, UPDATE, DELETE)마다 명시적 정책 정의
- 암묵적 허용 금지

---

## 역할 기반 접근 제어

### 사용자 역할 확인 함수
```sql
-- 현재 사용자의 역할 확인
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT raw_user_meta_data->>'role'
        FROM auth.users
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin 여부 확인
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        (SELECT raw_user_meta_data->>'role' = 'admin' FROM auth.users WHERE id = auth.uid()),
        false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Coach 여부 확인
CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        (SELECT raw_user_meta_data->>'role' = 'coach' FROM auth.users WHERE id = auth.uid()),
        false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 테이블별 정책

### 1. Members (회원)

#### SELECT 정책
```sql
-- 1. 회원 본인은 자신의 데이터 조회 가능
CREATE POLICY "Members can view own profile"
    ON public.members
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- 2. Admin은 모든 회원 데이터 조회 가능
CREATE POLICY "Admins can view all members"
    ON public.members
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- 3. Coach는 자신의 수업에 예약한 회원 정보 조회 가능
CREATE POLICY "Coaches can view session members"
    ON public.members
    FOR SELECT
    TO authenticated
    USING (
        public.is_coach() AND
        id IN (
            SELECT DISTINCT b.member_id
            FROM bookings b
            JOIN sessions s ON b.session_id = s.id
            JOIN session_coaches sc ON s.id = sc.session_id
            JOIN coaches c ON sc.coach_id = c.id
            WHERE c.user_id = auth.uid()
        )
    );
```

#### INSERT 정책
```sql
-- Admin만 회원 생성 가능
CREATE POLICY "Admins can create members"
    ON public.members
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());
```

#### UPDATE 정책
```sql
-- 1. 회원은 자신의 프로필 수정 가능 (단, status는 수정 불가)
CREATE POLICY "Members can update own profile"
    ON public.members
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid() AND
        status = (SELECT status FROM members WHERE id = members.id)
    );

-- 2. Admin은 모든 회원 정보 수정 가능
CREATE POLICY "Admins can update all members"
    ON public.members
    FOR UPDATE
    TO authenticated
    USING (public.is_admin());
```

#### DELETE 정책
```sql
-- Admin만 회원 삭제 가능
CREATE POLICY "Admins can delete members"
    ON public.members
    FOR DELETE
    TO authenticated
    USING (public.is_admin());
```

---

### 2. Sessions (수업)

#### SELECT 정책
```sql
-- 모든 인증된 사용자는 수업 목록 조회 가능
CREATE POLICY "Authenticated users can view sessions"
    ON public.sessions
    FOR SELECT
    TO authenticated
    USING (true);
```

#### INSERT 정책
```sql
-- Admin만 수업 생성 가능
CREATE POLICY "Admins can create sessions"
    ON public.sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());
```

#### UPDATE 정책
```sql
-- 1. Admin은 모든 수업 수정 가능
CREATE POLICY "Admins can update sessions"
    ON public.sessions
    FOR UPDATE
    TO authenticated
    USING (public.is_admin());

-- 2. 담당 Coach는 자신의 수업 수정 가능 (제한적)
CREATE POLICY "Coaches can update own sessions"
    ON public.sessions
    FOR UPDATE
    TO authenticated
    USING (
        public.is_coach() AND
        id IN (
            SELECT sc.session_id
            FROM session_coaches sc
            JOIN coaches c ON sc.coach_id = c.id
            WHERE c.user_id = auth.uid()
        )
    )
    WITH CHECK (
        -- WOD 설명만 수정 가능
        session_date = (SELECT session_date FROM sessions WHERE id = sessions.id) AND
        start_time = (SELECT start_time FROM sessions WHERE id = sessions.id) AND
        capacity = (SELECT capacity FROM sessions WHERE id = sessions.id)
    );
```

---

### 3. Bookings (예약)

#### SELECT 정책
```sql
-- 1. 회원은 자신의 예약 조회 가능
CREATE POLICY "Members can view own bookings"
    ON public.bookings
    FOR SELECT
    TO authenticated
    USING (
        member_id IN (
            SELECT id FROM members WHERE user_id = auth.uid()
        )
    );

-- 2. Admin은 모든 예약 조회 가능
CREATE POLICY "Admins can view all bookings"
    ON public.bookings
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- 3. Coach는 자신의 수업 예약 내역 조회 가능
CREATE POLICY "Coaches can view session bookings"
    ON public.bookings
    FOR SELECT
    TO authenticated
    USING (
        public.is_coach() AND
        session_id IN (
            SELECT sc.session_id
            FROM session_coaches sc
            JOIN coaches c ON sc.coach_id = c.id
            WHERE c.user_id = auth.uid()
        )
    );
```

#### INSERT 정책
```sql
-- 1. 회원은 자신의 예약 생성 가능
CREATE POLICY "Members can create own bookings"
    ON public.bookings
    FOR INSERT
    TO authenticated
    WITH CHECK (
        member_id IN (
            SELECT id FROM members WHERE user_id = auth.uid()
        )
    );

-- 2. Admin은 모든 예약 생성 가능
CREATE POLICY "Admins can create any booking"
    ON public.bookings
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());
```

#### UPDATE 정책
```sql
-- 1. 회원은 자신의 예약 취소만 가능
CREATE POLICY "Members can cancel own bookings"
    ON public.bookings
    FOR UPDATE
    TO authenticated
    USING (
        member_id IN (
            SELECT id FROM members WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (status = 'cancelled');

-- 2. Admin은 모든 예약 수정 가능
CREATE POLICY "Admins can update all bookings"
    ON public.bookings
    FOR UPDATE
    TO authenticated
    USING (public.is_admin());
```

---

### 4. Transactions (거래)

#### SELECT 정책
```sql
-- 1. 회원은 자신의 거래 내역 조회 가능
CREATE POLICY "Members can view own transactions"
    ON public.transactions
    FOR SELECT
    TO authenticated
    USING (
        member_id IN (
            SELECT id FROM members WHERE user_id = auth.uid()
        )
    );

-- 2. Admin은 모든 거래 조회 가능
CREATE POLICY "Admins can view all transactions"
    ON public.transactions
    FOR SELECT
    TO authenticated
    USING (public.is_admin());
```

#### INSERT 정책
```sql
-- Admin만 거래 생성 가능
CREATE POLICY "Admins can create transactions"
    ON public.transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());
```

#### UPDATE 정책
```sql
-- Admin만 거래 수정 가능
CREATE POLICY "Admins can update transactions"
    ON public.transactions
    FOR UPDATE
    TO authenticated
    USING (public.is_admin());
```

---

### 5. 기타 테이블 정책

자세한 정책은 다음 문서를 참조하세요:
- [Members 정책](./members.md)
- [Sessions 정책](./sessions.md)
- [Bookings 정책](./bookings.md)
- [Transactions 정책](./transactions.md)

---

## 정책 테스트

### 테스트 시나리오

#### 1. 회원 데이터 접근 테스트
```sql
-- 회원 A로 로그인 후
-- 자신의 데이터는 조회 가능
SELECT * FROM members WHERE user_id = auth.uid();  -- ✅ 성공

-- 다른 회원 데이터는 조회 불가
SELECT * FROM members WHERE user_id != auth.uid(); -- ❌ 빈 결과
```

#### 2. Admin 권한 테스트
```sql
-- Admin으로 로그인 후
-- 모든 회원 데이터 조회 가능
SELECT * FROM members; -- ✅ 모든 데이터 반환

-- 회원 생성 가능
INSERT INTO members (...) VALUES (...); -- ✅ 성공
```

#### 3. Coach 권한 테스트
```sql
-- Coach로 로그인 후
-- 자신의 수업 예약자 조회 가능
SELECT m.*
FROM members m
JOIN bookings b ON m.id = b.member_id
JOIN session_coaches sc ON b.session_id = sc.session_id
JOIN coaches c ON sc.coach_id = c.id
WHERE c.user_id = auth.uid(); -- ✅ 성공

-- 다른 수업 예약자는 조회 불가
SELECT * FROM members WHERE id NOT IN (...); -- ❌ 빈 결과
```

---

## 정책 디버깅

### RLS 정책 확인
```sql
-- 테이블의 RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'members';

-- RLS 활성화 여부 확인
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'members';
```

### 정책 적용 테스트
```sql
-- 특정 사용자로 정책 테스트
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-uuid-here';

SELECT * FROM members;

RESET ROLE;
```

---

## 주의사항

### 1. Service Role Key 사용 금지
- ❌ 클라이언트 코드에서 Service Role Key 절대 사용 금지
- ✅ `anon key` 또는 사용자 JWT만 사용

### 2. RLS 우회 방지
- ❌ `SECURITY DEFINER` 함수에서 RLS 우회 금지
- ✅ 함수 내에서도 RLS 정책 준수

### 3. 성능 고려
- 복잡한 정책은 성능 저하 가능
- 필요시 인덱스 추가
- `EXPLAIN ANALYZE`로 쿼리 성능 확인

---

## 관련 문서
- [데이터베이스 README](../README.md)
- [보안 가이드](../../security/README.md)
- [API 명세서](../../API_SPECIFICATION.md)

---

**문서 버전**: 1.0.0  
**최종 업데이트**: 2026년 2월 16일
