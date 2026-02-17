# BCL Portal 개발 현황 및 다음 단계

**작성일**: 2026-02-17  
**작성자**: Antigravity AI (Gemini 3.0 Flash)  
**목적**: 현재 상태 분석 및 개발 시작 계획 수립

---

## 📊 현재 상태 분석

### 1. Stitch MCP 디자인 현황

#### 기존 화면 (11개 - 템플릿만)
✅ 템플릿 화면들만 존재:
- `59fa62844a9449459c2678c734be4d1a` - BCL Admin Portal Dark Template
- `a51e1c4e97af41a6ad3aa664a9102d49` - BCL Light Fullscreen Template  
- `f135d9e6a7c346a69bb25aac647f67f8` - BCL Auth Layout Dark Template
- `a524634378564466874b668ad75385a2` - BCL Portal Light App Template
- `4d1547c666494965bdac8b3a144e24a5` - BCL Portal Light Tokens Guide
- `a5902b8e809644f08fcb79e62d4157e5` - BCL Fullscreen Display Template
- `d97f6e555b434791906bb1203c9b48f6` - BCL Portal Mobile App Template
- `1c7255e315ad4ee4a29e6b2113ca47f1` - BCL Admin Portal Light Template
- `99ebe63934c34d8cb4973f9547bf8de7` - BCL Auth Layout Light Template
- `b2ddc51f0287441e9b1fda66e40d038e` - BCL Portal Design Tokens Guide
- `074f55a78a1642cc9959e1cf4d2c4701` - BCL Auth Layout Dark Template

**상태**: ⚠️  **실제 기능 화면 없음** (템플릿만 존재)

#### 프롬프트 저장소 현황
```
.docs/stitch-prompts/
├── README.md (가이드 문서만)
├── apps/ (비어 있음)
└── admin/ (비어 있음)
```

**상태**: ⚠️  **저장된 프롬프트 없음**

---

### 2. 소스 코드 구현 현황

#### 현재 폴더 구조
```
src/app/
├── class/ (클래스 포털 - 일부 구현)
├── globals.css
├── layout.tsx
└── page.tsx
```

**상태**: ⚠️  **대부분 미구현**

#### 미구현 모듈
- ❌ `/auth/*` - 인증 시스템
- ❌ `/admin/*` - 관리자 포털 (전체)
- ❌ `/apps/*` - 회원용 앱 (전체)
- ❌ `/coach/*` - 코치용 앱
- ⚠️  `/class/*` - 클래스 포털 (일부만)
- ❌ `/kiosk/*` - 키오스크 앱

---

### 3. 로드맵 현황

#### Phase 1: Foundation (Weeks 1-2) - 현재 단계
- [ ] Database schema finalization
- [ ] RLS policies implementation
- [ ] Authentication system setup
- [ ] Core API structure

**상태**: 🚧 **진행 중**

#### Phase 2: Core Features (Weeks 3-6)
- [ ] Admin portal basic features
- [ ] Member app basic features
- [ ] Coach app basic features
- [ ] Core Booking system

**상태**: ⏸️ **대기 중**

---

## 🎯 개발 시작 전략

### 전략 A: Foundation First (권장) ✅

**이유**: Phase 1이 완료되지 않음

**순서**:
```
1. Database Schema + RLS (Week 1-2)
   └─> Architect (Opus 4.6) 주도
   
2. Authentication System (Week 2)
   └─> Stitch Design → Senior Dev 구현
   
3. Core Features (Week 3-6)
   └─> 각 모듈별 Stitch Design → 구현
```

**장점**:
- 체계적 개발
- 기초 탄탄
- 에러 최소화

**단점**:
- 초기 가시적 결과 느림

---

### 전략 B: Quick Wins First (대안)

**이유**: 빠른 데모 필요 시

**순서**:
```
1. 회원 앱 핵심 화면 (Week 1)
   - Home Dashboard
   - Profile
   - Schedule
   └─> Stitch Design → Developer 구현
   
2. Admin 대시보드 (Week 2)
   - Main Dashboard
   - Member List
   └─> Stitch Design → Developer 구현

3. Database + Auth (병행)
   └─> Architect + Senior Dev
```

**장점**:
- 빠른 가시적 결과
- 데모 가능

**단점**:
- 기초 불안정
- 재작업 가능성

---

## 🚀 추천: Phase 1 완료 후 순차 개발

### Week 1-2: Foundation (Architect 주도)

#### 1. Database Schema (Day 1-3)
**담당**: Architect (Opus 4.6) + Senior Dev (Opus 4.5)

```
[Architect]
- 전체 스키마 설계
- 테이블 관계 정의
- 인덱스 최적화

[Senior Dev]
- Supabase 마이그레이션 작성
- RLS 정책 구현
- 테스트 데이터 생성
```

**예상 테이블**:
- `profiles` - 사용자 프로필
- `facilities` - 지점 정보
- `coaches` - 코치 정보
- `classes` - 수업 정보
- `reservations` - 예약
- `memberships` - 멤버십
- `payments` - 결제
- `check_ins` - 체크인

**산출물**:
- `.docs/database/schema/002_tables_v1.sql`
- `.docs/database/rls-policies/001_base_policies.sql`

---

#### 2. Authentication System (Day 4-7)
**담당**: Senior Dev (Opus 4.5) → Developer (Sonnet 4.5)

**Stitch 디자인 필요 화면**:
1. `/auth/login` - 로그인
2. `/auth/signup` - 회원가입  
3. `/auth/reset-password` - 비밀번호 재설정
4. `/auth/callback` - OAuth 콜백

**구현 순서**:
```
Day 4:
[Senior Dev]
- Stitch 디자인 생성 (4개 화면)
- Sitemap 업데이트
- 프롬프트 저장

Day 5-6:
[Developer]
- 로그인/회원가입 UI 구현
- Supabase Auth 연동
- AuthGuard 컴포넌트

Day 7:
[QA]
- 인증 플로우 테스트
- 접근 권한 검증
```

**산출물**:
- `src/app/auth/*` 전체
- `src/lib/auth.ts` - 인증 유틸리티
- `src/components/AuthGuard.tsx`
- `.docs/stitch-prompts/auth/*.md` (4개)

---

### Week 3-4: 회원 앱 Core (Developer 주도)

#### 우선순위 화면 (8개)

**Phase 1: 필수 화면 (4개)**
1. `/apps/dashboard` - 홈 대시보드 ⭐ (최우선)
2. `/apps/profile` - 프로필 ⭐
3. `/apps/schedule` - 수업 스케줄 ⭐
4. `/apps/checkin` - QR 체크인 ⭐

**Phase 2: 주요 화면 (4개)**
5. `/apps/facilities` - 지점 안내
6. `/apps/purchase` - 멤버십 구매 (결제는 Phase 3)
7. `/apps/feedback` - 피드백 제출
8. `/apps/records` - 운동 기록

**개발 순서**:
```
Day 1-2 (각 화면):
[Developer]
- Stitch 디자인 생성
- Sitemap 업데이트
- 프롬프트 저장

Day 3-10:
[Developer]
- UI 구현 (Glassmorphism)
- Supabase 데이터 연동
- Bottom Tab 네비게이션

Day 11-12:
[QA]
- 기능 테스트
- UI/UX 검증
- 디자인 일관성 체크
```

---

### Week 5-6: Admin 포털 Core (Developer + Senior Dev)

#### 우선순위 화면 (5개)

**Phase 1: 필수 화면 (3개)**
1. `/admin/insights/dashboard` - 메인 대시보드 ⭐
2. `/admin/finance/members` - 회원 관리 ⭐
3. `/admin/operations/reservations` - 예약 관리 ⭐

**Phase 2: 주요 화면 (2개)**
4. `/admin/finance/payments` - 결제 내역 (Senior Dev)
5. `/admin/crm/notices` - 공지사항 관리

**개발 순서**:
```
Day 1-3:
[Developer + Senior Dev]
- Stitch 디자인 생성 (5개)
- Admin 전용 Sidebar 디자인
- 프롬프트 저장

Day 4-9:
[Developer]
- 일반 CRUD 화면 (1, 3, 5)
- Sidebar 네비게이션
- 데이터 테이블 컴포넌트

[Senior Dev]
- 복잡한 화면 (2, 4)
- 결제 내역 트랜잭션 처리
- 회원 관리 로직

Day 10-12:
[QA]
- 관리자 권한 테스트
- 데이터 조작 검증
- 성능 테스트
```

---

## 📋 즉시 시작 가능한 Task

### Task 1: Database Schema (최우선) 🔴

**담당**: Architect (Opus 4.6)  
**기간**: 2-3일  
**산출물**:
- `.docs/database/schema/002_core_tables.sql`
- `.docs/database/rls-policies/001_core_rls.sql`

**내용**:
```sql
-- 핵심 테이블
CREATE TABLE profiles (...);
CREATE TABLE facilities (...);
CREATE TABLE coaches (...);
CREATE TABLE classes (...);
CREATE TABLE reservations (...);
CREATE TABLE memberships (...);

-- RLS 정책
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ...
```

---

### Task 2: Auth 화면 Design (Stitch) 🟡

**담당**: Senior Dev (Opus 4.5)  
**기간**: 1일  
**산출물**:
- 4개 Stitch 화면 (login, signup, reset-password, callback)
- `.docs/stitch-prompts/auth/*.md` (4개 프롬프트)
- `.docs/sitemap/auth-system.md` 업데이트

**프롬프트 예시**:
```markdown
# /auth/login - 로그인 화면

Mobile-first 로그인 화면을 디자인해줘:
- BCL Portal Dark 테마
- Lexend 폰트, 8px roundness
- Primary color: #ff6a00
- Glassmorphism 스타일

레이아웃:
1. 상단: BCL 로고
2. 중앙: 
   - 이메일 입력 필드
   - 비밀번호 입력 필드
   - "로그인" 버튼 (Primary)
3. 하단:
   - "비밀번호를 잊으셨나요?" 링크
   - "회원가입" 링크

추가 요구사항:
- 입력 필드는 반투명 배경
- 버튼은 Glassmorphism + #ff6a00
- 모바일 최적화 (390px)
```

---

### Task 3: Auth 구현 🟡

**담당**: Developer (Sonnet 4.5)  
**기간**: 2-3일  
**산출물**:
- `src/app/auth/*` 전체 구현
- `src/lib/auth.ts`
- `src/components/AuthGuard.tsx`

---

## 🎯 결론 및 추천 사항

### 즉시 시작 (오늘부터)

#### 옵션 1: 체계적 접근 (권장) ✅
```
Step 1: Database Schema 설계 (Architect)
        ↓
Step 2: Auth 화면 Stitch 디자인 (Senior Dev)
        ↓
Step 3: Auth 구현 (Developer)
        ↓
Step 4: 회원 앱 Core 화면 Stitch 디자인
        ↓
Step 5: 회원 앱 Core 구현
        ↓
Step 6: Admin 포털 Stitch 디자인
        ↓
Step 7: Admin 포털 구현
```

#### 옵션 2: 빠른 프로토타입 (대안)
```
Step 1: Auth + 회원 홈 Stitch 디자인 (병행)
        ↓
Step 2: Auth + 회원 홈 구현 (병행)
        ↓
Step 3: Database Schema (병행 진행)
        ↓
Step 4: 나머지 화면 순차 진행
```

---

### 다음 단계 제안

**제가 지금 시작할 수 있는 작업**:

1. ✅ **Database Schema 설계** (Architect 역할)
   - 핵심 테이블 설계
   - RLS 정책 정의
   - 마이그레이션 파일 작성

2. ✅ **Auth 화면 Stitch 디자인** (Senior Dev 역할)
   - 4개 인증 화면 디자인 생성
   - 프롬프트 저장
   - Sitemap 업데이트

3. ✅ **회원 앱 홈 Stitch 디자인** (Developer 역할)
   - Dashboard 화면 디자인
   - Bottom Tab 네비게이션
   - 프롬프트 저장

**어떤 것부터 시작할까요?**

---

**작성자**: Antigravity AI (Gemini 3.0 Flash)  
**작성일**: 2026-02-17  
**상태**: 실행 대기 중
