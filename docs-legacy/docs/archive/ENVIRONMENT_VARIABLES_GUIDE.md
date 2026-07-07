# BCL Portal 환경 변수 관리 가이드

> Version: 1.0.0  
> Last Updated: 2026-02-16

---

## 📋 목차
- [개요](#개요)
- [환경별 설정](#환경별-설정)
- [필수 환경 변수](#필수-환경-변수)
- [선택 환경 변수](#선택-환경-변수)
- [보안 관리](#보안-관리)

---

## 개요

BCL Portal은 Next.js의 환경 변수 시스템을 사용합니다.

### 파일 구조
```
.env.local            # 로컬 개발 (Git 무시)
.env.development      # 개발 환경 (Git 무시)
.env.staging          # 스테이징 환경 (Git 무시)
.env.production       # 프로덕션 환경 (Git 무시)
.env.example          # 템플릿 (Git 추적)
```

### 우선순위
1. `.env.local` (최우선, 모든 환경)
2. `.env.development`, `.env.production`, `.env.staging` (환경별)
3. `.env` (기본값)

---

## 환경별 설정

### Development (.env.local)
```bash
# ============================================
# Supabase Configuration
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Admin용 Service Role Key (서버 사이드만 사용)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================
# Application Configuration
# ============================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=BCL Portal
NEXT_PUBLIC_APP_ENV=development

# ============================================
# Authentication
# ============================================
NEXT_PUBLIC_AUTH_REDIRECT_URL=http://localhost:3000/auth/callback

# ============================================
# Payment Gateway (Toss Payments)
# ============================================
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq
TOSS_SECRET_KEY=test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R

# ============================================
# Notification Services
# ============================================
# Kakao Talk
KAKAO_REST_API_KEY=your_kakao_rest_api_key
KAKAO_ADMIN_KEY=your_kakao_admin_key

# SMS (예: Aligo)
SMS_API_KEY=your_sms_api_key
SMS_USER_ID=your_user_id
SMS_SENDER=01012345678

# ============================================
# File Storage
# ============================================
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=bcl-portal-files

# ============================================
# Analytics & Monitoring
# ============================================
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# ============================================
# Feature Flags
# ============================================
NEXT_PUBLIC_ENABLE_RACE_SYSTEM=false
NEXT_PUBLIC_ENABLE_PAYMENT=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true

# ============================================
# Development Tools
# ============================================
NEXT_PUBLIC_ENABLE_DEBUG_MODE=true
NEXT_PUBLIC_ENABLE_MOCK_DATA=false
```

### Staging (.env.staging)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application
NEXT_PUBLIC_APP_URL=https://staging.bcl-portal.com
NEXT_PUBLIC_APP_ENV=staging

# Payments (테스트 모드)
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq
TOSS_SECRET_KEY=test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R

# Feature Flags
NEXT_PUBLIC_ENABLE_DEBUG_MODE=true
NEXT_PUBLIC_ENABLE_MOCK_DATA=false
```

### Production (.env.production)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application
NEXT_PUBLIC_APP_URL=https://bcl-portal.com
NEXT_PUBLIC_APP_ENV=production

# Payments (실제 운영)
NEXT_PUBLIC_TOSS_CLIENT_KEY=live_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq
TOSS_SECRET_KEY=live_sk_zXLkKEypNArWmo50nX3lmeaxYG5R

# Feature Flags
NEXT_PUBLIC_ENABLE_DEBUG_MODE=false
NEXT_PUBLIC_ENABLE_MOCK_DATA=false

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

---

## 필수 환경 변수

### 1. Supabase (필수)
```bash
# 공개 URL - 클라이언트에서 사용
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co

# Anon Key - 클라이언트에서 사용 (RLS 적용)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Role Key - 서버 사이드만 사용 (RLS 우회 가능)
# ⚠️ 절대 클라이언트에 노출하지 말 것
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**획득 방법:**
1. Supabase Dashboard → Project Settings → API
2. URL, anon key, service_role key 복사

### 2. Application URL (필수)
```bash
# 애플리케이션 기본 URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OAuth 콜백 URL
NEXT_PUBLIC_AUTH_REDIRECT_URL=http://localhost:3000/auth/callback
```

---

## 선택 환경 변수

### 1. 결제 (Toss Payments)
```bash
# 클라이언트 키 (공개)
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_xxxxx

# 시크릿 키 (비공개, 서버 사이드만)
TOSS_SECRET_KEY=test_sk_xxxxx

# Webhook Secret
TOSS_WEBHOOK_SECRET=your_webhook_secret
```

**획득 방법:**
1. [Toss Payments 개발자 센터](https://developers.tosspayments.com/)
2. 애플리케이션 생성 후 API 키 발급

### 2. 카카오톡 알림
```bash
# REST API Key
KAKAO_REST_API_KEY=your_rest_api_key

# Admin Key (비공개)
KAKAO_ADMIN_KEY=your_admin_key

# 템플릿 ID
KAKAO_BOOKING_CONFIRM_TEMPLATE=template_id_1
KAKAO_BOOKING_REMINDER_TEMPLATE=template_id_2
```

### 3. SMS 발송
```bash
# API Key
SMS_API_KEY=your_api_key

# User ID
SMS_USER_ID=your_user_id

# 발신 번호
SMS_SENDER=01012345678
```

### 4. 파일 스토리지
```bash
# Supabase Storage 버킷 이름
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=bcl-portal-files

# 최대 업로드 크기 (MB)
MAX_FILE_UPLOAD_SIZE=10

# 허용 파일 타입
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf
```

### 5. Analytics & Monitoring
```bash
# Google Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Sentry (에러 추적)
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ORG=your-org
SENTRY_PROJECT=bcl-portal

# LogRocket (세션 리플레이)
NEXT_PUBLIC_LOGROCKET_APP_ID=your_app_id
```

### 6. Feature Flags
```bash
# 레이스 시스템 활성화
NEXT_PUBLIC_ENABLE_RACE_SYSTEM=false

# 결제 기능 활성화
NEXT_PUBLIC_ENABLE_PAYMENT=true

# 알림 기능 활성화
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true

# 디버그 모드
NEXT_PUBLIC_ENABLE_DEBUG_MODE=false

# 모의 데이터 사용
NEXT_PUBLIC_ENABLE_MOCK_DATA=false
```

---

## 보안 관리

### 1. 환경 변수 네이밍 규칙

#### ✅ Public (클라이언트 노출 가능)
```bash
NEXT_PUBLIC_*    # Next.js가 자동으로 클라이언트 번들에 포함
```

**예시:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_APP_NAME=BCL Portal
```

#### ⚠️ Private (서버 사이드만)
```bash
# NEXT_PUBLIC_ 접두사 없는 변수
# 절대 클라이언트에 노출되지 않음
```

**예시:**
```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
TOSS_SECRET_KEY=live_sk_xxxxx
KAKAO_ADMIN_KEY=your_admin_key
```

### 2. .gitignore 설정
```gitignore
# Environment Variables
.env.local
.env.development
.env.staging
.env.production
.env*.local

# Keep example file
!.env.example
```

### 3. .env.example 작성
```bash
# ============================================
# Supabase Configuration (필수)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# ============================================
# Application Configuration (필수)
# ============================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=BCL Portal
NEXT_PUBLIC_APP_ENV=development

# ============================================
# Payment Gateway (선택)
# ============================================
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_xxxxx
TOSS_SECRET_KEY=test_sk_xxxxx

# ... (나머지 변수들)
```

### 4. Cloudflare Pages 환경 변수 설정

**Dashboard 경로:**
1. Cloudflare Dashboard
2. Pages → 프로젝트 선택
3. Settings → Environment variables

**설정 방법:**
- Production: 프로덕션 환경 변수 입력
- Preview: 스테이징/프리뷰 환경 변수 입력

### 5. 환경 변수 검증

**lib/env.ts:**
```typescript
import { z } from 'zod';

const envSchema = z.object({
  // Supabase (필수)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Application (필수)
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'staging', 'production']),

  // Payment (선택)
  NEXT_PUBLIC_TOSS_CLIENT_KEY: z.string().optional(),
  TOSS_SECRET_KEY: z.string().optional(),

  // Feature Flags (선택)
  NEXT_PUBLIC_ENABLE_PAYMENT: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  // ... 나머지 변수들
});

// 사용 예시:
// import { env } from '@/lib/env';
// console.log(env.NEXT_PUBLIC_SUPABASE_URL);
```

---

## 트러블슈팅

### 문제: 환경 변수가 undefined
```bash
# 1. 변수 이름 확인
# 클라이언트에서 사용하려면 NEXT_PUBLIC_ 필요

# 2. 서버 재시작
npm run dev  # 환경 변수 변경 후 재시작 필수

# 3. 빌드 캐시 삭제
rm -rf .next
npm run build
```

### 문제: Cloudflare Pages에서 환경 변수 안 읽힘
```bash
# 1. Cloudflare Dashboard에서 변수 설정 확인
# 2. Production vs Preview 환경 확인
# 3. 재배포 (환경 변수 변경 후 재배포 필요)
```

### 문제: 환경 변수 유출 우려
```bash
# 1. .env.local이 .gitignore에 있는지 확인
git check-ignore .env.local  # 출력되면 정상

# 2. 실수로 커밋했다면
git rm --cached .env.local
git commit -m "Remove .env.local"

# 3. 유출된 키는 즉시 재발급
```

---

## 체크리스트

### 초기 설정
- [ ] .env.example 파일 생성
- [ ] .env.local 파일 생성 (로컬 개발용)
- [ ] .gitignore에 .env.* 추가
- [ ] 필수 환경 변수 설정 (Supabase)
- [ ] 환경 변수 검증 로직 추가

### Cloudflare Pages 배포
- [ ] Production 환경 변수 설정
- [ ] Preview 환경 변수 설정
- [ ] 빌드 성공 확인
- [ ] 런타임에서 변수 접근 확인

### 보안
- [ ] Service Role Key는 서버 사이드만 사용
- [ ] Public 변수에 민감 정보 없음 확인
- [ ] .env.local이 Git에 커밋되지 않음 확인
- [ ] 프로덕션 키는 별도 관리

---

**문서 버전:** 1.0.0  
**최종 업데이트:** 2026년 2월 16일
