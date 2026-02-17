# Supabase 설정 및 테스트 가이드

**일자**: 2026-02-17  
**목적**: Authentication 시스템 테스트 및 검증

---

## Step 1: Supabase 프로젝트 정보 확인

### Supabase Dashboard 접속
1. https://supabase.com/dashboard 접속
2. BCL Portal 프로젝트 선택

### API 정보 확인
**경로**: Project Settings → API

#### 필요한 정보:
```
1. Project URL: https://[your-project-id].supabase.co
2. anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 환경 변수 설정
`.env.local` 파일을 열고 다음과 같이 수정:

```bash
# 실제 값으로 교체
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Step 2: 데이터베이스 마이그레이션 적용

### Supabase SQL Editor
**경로**: Database → SQL Editor → New Query

### 2-1. RLS 정책 적용
```sql
-- 파일: .docs/database/schema/002_rls_policies.sql
-- 전체 내용을 복사하여 붙여넣기
-- 실행 버튼 클릭 (또는 Ctrl/Cmd + Enter)
```

**예상 결과**:
- ✅ 3개 함수 생성 완료
- ✅ 55개 정책 생성 완료
- ⏱️ 약 10-15초 소요

### 2-2. Auth 트리거 및 시드 데이터
```sql
-- 파일: .docs/database/schema/003_auth_integration_seed.sql
-- 전체 내용을 복사하여 붙여넣기
-- 실행 버튼 클릭
```

**예상 결과**:
- ✅ `handle_new_user()` 트리거 생성
- ✅ 지점 2개 생성
- ✅ 요금제 5개 생성
- ✅ 공지사항 2개 생성
- ⏱️ 약 3-5초 소요

### 2-3. 검증
```sql
-- 정책 수 확인
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
-- 예상 결과: 55

-- RLS 활성화 확인
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
-- 예상 결과: 14개 테이블 모두 rowsecurity = true

-- 시드 데이터 확인
SELECT * FROM facilities;
SELECT * FROM membership_plans;
SELECT * FROM notices;
```

---

## Step 3: 테스트 계정 생성

### Supabase Dashboard
**경로**: Authentication → Users → Add User

### 3-1. Admin 계정
```
Email: admin@bcl.com
Password: bcl123456!
Email Confirm: YES (체크)
Auto Confirm User: YES (체크)

User Metadata:
{
  "role": "admin",
  "name": "관리자"
}
```

**Create User 클릭**

### 3-2. Coach 계정
```
Email: coach@bcl.com
Password: bcl123456!
Email Confirm: YES
Auto Confirm User: YES

User Metadata:
{
  "role": "coach",
  "name": "김코치"
}
```

### 3-3. Member 계정
```
Email: member@bcl.com
Password: bcl123456!
Email Confirm: YES
Auto Confirm User: YES

User Metadata:
{
  "role": "member",
  "name": "홍길동"
}
```

### 3-4. 계정 확인
- Authentication → Users 목록에서 3개 계정 확인
- `handle_new_user()` 트리거가 자동으로 프로필 생성

**Database 확인**:
```sql
-- Admin은 members 테이블에
SELECT * FROM members WHERE email = 'admin@bcl.com';

-- Coach는 coaches 테이블에
SELECT * FROM coaches WHERE email = 'coach@bcl.com';

-- Member는 members 테이블에
SELECT * FROM members WHERE email = 'member@bcl.com';
```

---

## Step 4: 로컬 개발 서버 시작

### 터미널에서 실행
```bash
cd /Users/kimchoho/Antigravity/BCL-Repo/portal
npm run dev
```

**예상 출력**:
```
   ▲ Next.js 16.1.6
   - Local:        http://localhost:3000
   - ready in 2.1s
```

### 브라우저 접속
```
http://localhost:3000/auth/login
```

---

## Step 5: 로그인 플로우 테스트

### 5-1. Member 로그인 테스트
1. http://localhost:3000/auth/login 접속
2. Email: `member@bcl.com`
3. Password: `bcl123456!`
4. Sign In 클릭

**예상 결과**:
- ✅ 로그인 성공
- ✅ `/apps`로 리다이렉트
- ⚠️ `/apps` 페이지가 없으면 404 (정상)

### 5-2. Coach 로그인 테스트
1. 로그아웃 (또는 시크릿 모드)
2. Email: `coach@bcl.com`
3. Password: `bcl123456!`
4. Sign In 클릭

**예상 결과**:
- ✅ 로그인 성공
- ✅ `/coach`로 리다이렉트
- ⚠️ `/coach` 페이지가 없으면 404 (정상)

### 5-3. Admin 로그인 테스트
1. 로그아웃 (또는 시크릿 모드)
2. Email: `admin@bcl.com`
3. Password: `bcl123456!`
4. Sign In 클릭

**예상 결과**:
- ✅ 로그인 성공
- ✅ `/admin`으로 리다이렉트
- ⚠️ `/admin` 페이지가 없으면 404 (정상)

### 5-4. 로그인 실패 테스트
1. 잘못된 이메일/비밀번호 입력
2. Sign In 클릭

**예상 결과**:
- ✅ 에러 메시지 표시
- 예: "Invalid login credentials"

---

## Step 6: Signup 플로우 테스트

### 6-1. Signup 페이지 접속
```
http://localhost:3000/auth/signup
```

### 6-2. Step 1: Email & Password
```
Email: test@bcl.com
Password: test123456
Confirm Password: test123456
```
- Next 클릭

### 6-3. Step 2: Personal Info
```
Name: 테스트유저
Phone: 010-1234-5678
Birth Date: 1990-01-01
```
- Next 클릭

### 6-4. Step 3: Terms
- Terms of Service: 체크
- Privacy Policy: 체크
- Marketing: 선택
- Create Account 클릭

**예상 결과**:
- ✅ 회원가입 성공
- ✅ `/auth/email-verify`로 리다이렉트
- ✅ 3초 후 자동 리다이렉트

### 6-5. Database 확인
```sql
-- 새 유저 확인
SELECT * FROM auth.users WHERE email = 'test@bcl.com';

-- 프로필 자동 생성 확인
SELECT * FROM members WHERE email = 'test@bcl.com';
```

---

## Step 7: Password Reset 테스트

### 7-1. Reset 페이지
```
http://localhost:3000/auth/reset-password
```

### 7-2. 이메일 입력
```
Email: member@bcl.com
```
- Send Reset Link 클릭

**예상 결과**:
- ✅ Success 메시지 표시
- ✅ "Check Your Email!" 화면
- 📧 실제 이메일은 Supabase 이메일 설정에 따라 전송

### 7-3. 이메일 확인 (Supabase Dashboard)
**경로**: Authentication → Email Templates → Reset Password

실제 운영 시 SMTP 설정 필요.

---

## Step 8: 브라우저 DevTools 확인

### Console 에러 확인
1. F12 → Console 탭
2. 빨간색 에러 확인

**정상 상태**:
- ⚠️ 404 에러는 정상 (아직 페이지 없음)
- ❌ Auth 관련 에러는 없어야 함

### Network 탭 확인
1. Network 탭
2. 로그인 시도
3. Supabase API 요청 확인

**정상 요청**:
```
POST https://[your-project].supabase.co/auth/v1/token?grant_type=password
Status: 200 OK
```

### Application → Local Storage
```
Key: sb-[your-project-id]-auth-token
Value: {"access_token": "...", "refresh_token": "..."}
```

---

## ✅ 테스트 체크리스트

### 환경 설정
- [ ] `.env.local` 파일 설정
- [ ] Supabase URL 확인
- [ ] Supabase Anon Key 확인

### 데이터베이스
- [ ] RLS 정책 적용 (55개)
- [ ] Auth 트리거 적용
- [ ] 시드 데이터 확인 (지점, 요금제, 공지)

### 테스트 계정
- [ ] Admin 계정 생성
- [ ] Coach 계정 생성
- [ ] Member 계정 생성
- [ ] 프로필 자동 생성 확인

### 기능 테스트
- [ ] Member 로그인 → `/apps` 리다이렉트
- [ ] Coach 로그인 → `/coach` 리다이렉트
- [ ] Admin 로그인 → `/admin` 리다이렉트
- [ ] 로그인 실패 에러 메시지
- [ ] Signup 전체 플로우
- [ ] Password Reset 요청
- [ ] Email Verification 리다이렉트

### UI/UX 확인
- [ ] Login 페이지 Glassmorphism 스타일
- [ ] Signup Progress Indicator
- [ ] Reset Password Success 상태
- [ ] Email Verify 애니메이션
- [ ] 모바일 반응형

---

## 🐛 문제 해결

### 문제 1: "Invalid project URL or Key"
**원인**: `.env.local` 설정 오류

**해결**:
1. Supabase Dashboard 재확인
2. URL 끝에 `/` 제거
3. Key 전체 복사 확인

### 문제 2: 로그인 후 빈 배열 반환
**원인**: RLS 정책 미적용

**해결**:
```sql
-- RLS 정책 재확인
SELECT * FROM pg_policies WHERE tablename = 'members';
-- 7개 정책 확인 필요
```

### 문제 3: 프로필 자동 생성 안 됨
**원인**: `handle_new_user()` 트리거 미설치

**해결**:
```sql
-- 트리거 확인
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- 재설치
-- 003_auth_integration_seed.sql 재실행
```

### 문제 4: 404 에러
**원인**: `/apps`, `/coach`, `/admin` 페이지 미구현

**해결**:
- ✅ 정상 (다음 단계에서 구현 예정)
- 로그인 성공 여부는 Console 로그로 확인

---

## 📊 테스트 완료 기준

### 필수 (Must Pass)
- ✅ 로그인 성공
- ✅ 역할 기반 리다이렉트
- ✅ Signup 전체 플로우
- ✅ 에러 메시지 표시

### 선택 (Nice to Have)
- ⏳ Password Reset 이메일 수신
- ⏳ Social Login (추후)

---

**작성일**: 2026-02-17  
**다음 단계**: User App Core 화면 개발
