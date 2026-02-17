# 🎯 개발 진행 계획 - Authentication 화면 구현

**일자**: 2026-02-17  
**현재 상태**: Database Schema 완료 → Auth 화면 구현 시작  
**담당**: Developer (Sonnet 4.5)

---

## ✅ 확인 사항

### 1. Database Schema 완료 ✅
- [x] RLS 정책 구현 (55개)
- [x] Auth 트리거 (handle_new_user)
- [x] 초기 시드 데이터

**상태**: 🟢 Supabase 적용 대기

---

### 2. Stitch 디자인 완료 ✅
**파일**: `screen_mapping.md.resolved`

#### Authentication 화면 (4개) - 모두 생성됨!

| # | 화면 | Screen ID | Route | 상태 |
|:--|:-----|:----------|:------|:----:|
| 1 | Login | `4c4c1bcb99ac41708d5c75102877a10a` | `/auth/login` | ✅ |
| 2 | Signup | `6d5abb0ded48484083244a7221d3c2f5` | `/auth/signup` | ✅ |
| 3 | Reset Password | `07d3a84f6858440b9111e87789b6b623` | `/auth/reset-password` | ✅ |
| 4 | Email Verify | `5566548752d14a9180fad20e4f37d306` | `/auth/email-verify` | ✅ |

**디자인 특징**:
- BCL 로고 with 오렌지 glow
- Glassmorphism 스타일
- Social login (Google, Kakao)
- Progress indicator (Signup)
- Auto-redirect (Email Verify)

---

## 🚀 구현 계획

### Phase 1: 환경 설정 및 기본 구조
**예상 시간**: 2-3시간

#### Task 1.1: Supabase Client 설정
```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

#### Task 1.2: Auth Context 생성
```typescript
// src/contexts/AuthContext.tsx
- useAuth hook
- AuthProvider 컴포넌트
- 현재 사용자 상태 관리
```

#### Task 1.3: AuthGuard 컴포넌트
```typescript
// src/components/AuthGuard.tsx
- 인증 필요 페이지 보호
- 역할 기반 라우팅
- 리다이렉트 로직
```

---

### Phase 2: Login 화면 구현
**예상 시간**: 4-5시간  
**Screen ID**: `4c4c1bcb99ac41708d5c75102877a10a`

#### Task 2.1: UI 구현
```tsx
// src/app/auth/login/page.tsx
- BCL 로고 (오렌지 glow)
- Email/Password 입력 필드 (Floating label)
- Remember Me 체크박스
- Social login 버튼 (Google, Kakao)
- "Forgot Password?" 링크
- "Sign Up" 링크
- Glassmorphism 스타일
```

#### Task 2.2: Supabase Auth 연동
```typescript
const handleLogin = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) {
    // 에러 처리
  } else {
    // 성공 → 역할 기반 리다이렉트
    // admin, coach, member
  }
}
```

#### Task 2.3: Social Login 연동
```typescript
const handleGoogleLogin = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })
}

const handleKakaoLogin = async () => {
  // 카카오 OAuth (Phase 2)
}
```

---

### Phase 3: Signup 화면 구현
**예상 시간**: 5-6시간  
**Screen ID**: `6d5abb0ded48484083244a7221d3c2f5`

#### Task 3.1: Multi-step Form 구현
```tsx
// src/app/auth/signup/page.tsx
- Step 1: Email & Password
- Step 2: Personal Info (name, phone, birth_date)
- Step 3: Terms \u0026 Conditions
- Progress Indicator (1/3, 2/3, 3/3)
- Validation (Zod)
```

#### Task 3.2: Supabase Sign Up 연동
```typescript
const handleSignup = async (formData) => {
  const { data, error } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
    options: {
      data: {
        name: formData.name,
        role: 'member' // 기본값
      },
      emailRedirectTo: `${window.location.origin}/auth/email-verify`
    }
  })
  
  // handle_new_user() 트리거 자동 실행 → members 테이블에 프로필 생성
}
```

---

### Phase 4: Password Reset 화면 구현
**예상 시간**: 2-3시간  
**Screen ID**: `07d3a84f6858440b9111e87789b6b623`

#### Task 4.1: UI 구현
```tsx
// src/app/auth/reset-password/page.tsx
- "We'll send you a reset link" 설명
- Email 입력 필드
- "Send Reset Link" 버튼
- "Back to Login" 링크
- Success/Error 피드백
```

#### Task 4.2: Password Reset 연동
```typescript
const handleResetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/update-password`
  })
  
  if (!error) {
    // "Check your email!" 메시지
  }
}
```

---

### Phase 5: Email Verification 화면 구현
**예상 시간**: 2-3시간  
**Screen ID**: `5566548752d14a9180fad20e4f37d306`

#### Task 5.1: UI 구현
```tsx
// src/app/auth/email-verify/page.tsx
- Large green checkmark with glow
- "Email Verified!" 메시지
- Auto-redirect countdown (3초)
- Success animation (Framer Motion)
```

#### Task 5.2: Auto Redirect 로직
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    // 역할 기반 리다이렉트
    if (role === 'admin') router.push('/admin')
    else if (role === 'coach') router.push('/coach')
    else router.push('/apps')
  }, 3000)
  
  return () => clearTimeout(timer)
}, [])
```

---

### Phase 6: OAuth Callback 처리
**예상 시간**: 1-2시간

#### Task 6.1: Callback 페이지
```tsx
// src/app/auth/callback/page.tsx
- URL에서 인증 토큰 추출
- Supabase Session 설정
- 역할 기반 리다이렉트
```

---

## 📋 체크리스트

### 기본 설정
- [ ] Supabase 환경 변수 설정 (.env.local)
- [ ] @supabase/ssr 설치
- [ ] Auth Context 생성
- [ ] AuthGuard 컴포넌트

### Login
- [ ] UI 구현 (Glassmorphism)
- [ ] Email/Password 로그인
- [ ] Remember Me 기능
- [ ] Social Login (Google)
- [ ] 에러 처리
- [ ] 역할 기반 리다이렉트

### Signup
- [ ] Multi-step Form (3 steps)
- [ ] Progress Indicator
- [ ] Validation (Zod)
- [ ] Supabase Sign Up
- [ ] Email 인증 안내

### Password Reset
- [ ] UI 구현
- [ ] Reset Email 전송
- [ ] Success 피드백

### Email Verification
- [ ] Success UI
- [ ] Auto-redirect (3초)
- [ ] Animation

### OAuth
- [ ] Callback 처리
- [ ] Session 설정
- [ ] Redirect

---

## 🎯 우선순위

### High Priority (Phase 1)
1. ✅ Database Schema (완료)
2. 🔄 **Login** (현재 작업)
3. 🔄 **Signup**
4. 🔄 **AuthGuard**

### Medium Priority (Phase 2)
5. ⏳ Password Reset
6. ⏳ Email Verification
7. ⏳ OAuth Callback

### Low Priority (Phase 3)
8. ⏳ Social Login (Kakao)
9. ⏳ 2FA (추후)

---

## 🚀 즉시 시작 가능한 작업

### Option 1: 순차 개발 (권장)
```
1. Supabase Client 설정 (30분)
2. Auth Context (1시간)
3. AuthGuard (1시간)
4. Login UI (2시간)
5. Login 로직 (2시간)
6. Signup UI (3시간)
7. Signup 로직 (2시간)
```

### Option 2: 병렬 개발
```
Developer A: Login 화면 전체
Developer B: Signup 화면 전체
Developer C: Reset + Verify
```

---

## 📊 예상 타임라인

### Day 1 (8시간)
- [x] Database Schema (완료)
- [ ] Supabase Client 설정
- [ ] Auth Context
- [ ] AuthGuard
- [ ] Login UI 50%

### Day 2 (8시간)
- [ ] Login 완성
- [ ] Signup UI
- [ ] Signup 로직 50%

### Day 3 (8시간)
- [ ] Signup 완성
- [ ] Password Reset
- [ ] Email Verification
- [ ] OAuth Callback
- [ ] 통합 테스트

**총 예상 시간**: 24시간 (3일)

---

## 🎉 다음 단계

**지금 시작할 것**:
1. Supabase 환경 변수 확인
2. @supabase/ssr 설치
3. Supabase Client 생성
4. Login 화면 구현 시작

**어떻게 진행할까요?**
- A) 제가 즉시 Login 화면 구현 시작
- B) 먼저 기본 설정부터 (Supabase Client, Auth Context)
- C) 전체 파일 구조 먼저 생성 후 순차 구현

---

**작성자**: Architect (Opus 4.6) → Developer (Sonnet 4.5)  
**상태**: 🟢 준비 완료 - 구현 시작 대기 중
