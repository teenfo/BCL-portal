# BCL Portal

> 오프라인 피트니스 지점 운영을 디지털화하는 통합 플랫폼

**프로젝트 초기화 완료** ✅ (2026-02-16)

---

## 🎯 프로젝트 개요

BCL Portal은 CrossFit 및 피트니스 센터를 위한 **통합 운영 관리 플랫폼**입니다.

### 핵심 모듈
- **Admin Portal** (`/admin/*`) - 센터 운영 관리 (데스크탑 최적화)
- **User App** (`/apps/*`) - 회원용 모바일 웹앱
- **Coach App** (`/coach/*`) - 코치 전용 앱
- **Class Portal** (`/class/*`) - 센터 내 대형 스크린용 인터페이스
- **Kiosk App** (`/kiosk/*`) - 무인 체크인 단말기

---

## 🛠️ 기술 스택

- **Frontend**: Next.js 14 (App Router, CSR)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Hosting**: Ubuntu 24.04 자체 서버 (Docker)
- **Styling**: Tailwind CSS (Vanilla CSS 혼용)
- **Language**: TypeScript

---

## 📁 프로젝트 구조

```
portal/
├── .docs/                     # 📚 프로젝트 문서 (기획, 기술, 보안)
│   ├── sitemap/              # 화면 설계 문서 (SSOT)
│   ├── database/             # DB 스키마, 마이그레이션, RLS 정책
│   ├── security/             # 보안 아키텍처
│   └── testing/              # 테스트 전략
├── .agent/                    # 🤖 Agent 자동화 (스킬, 워크플로우, 규칙)
├── src/
│   ├── app/                  # Next.js App Router
│   ├── components/           # 재사용 컴포넌트
│   ├── lib/                  # 유틸리티 함수
│   ├── hooks/                # 커스텀 훅
│   ├── contexts/             # React Context
│   └── utils/                # 헬퍼 함수
├── public/                    # 정적 파일
└── .env                      # 환경 변수
```

---

## 🚀 빠른 시작

### 1. 환경 변수 설정

```bash
# .env.example을 복사하여 .env.local 생성
cp .env.example .env.local
```

`.env.local` 파일을 열어 다음 필수 변수를 설정:

```bash
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application (필수)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_ENV=development

# Payment (선택, 나중에 설정 가능)
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_xxxxx
TOSS_SECRET_KEY=test_sk_xxxxx
```

**환경 변수 획득 방법:**
1. Supabase Dashboard → Project Settings → API
2. URL과 anon key 복사

> 💡 **상세 가이드**: [환경 변수 가이드](.docs/archive/ENVIRONMENT_VARIABLES_GUIDE.md)

### 2. 의존성 설치
```bash
npm install
```

### 3. Supabase 데이터베이스 초기화

#### Step 1: 기존 테이블 삭제 (초기화)
Supabase Dashboard → SQL Editor에서 다음 스크립트 실행:
```
.docs/database/schema/000_reset_database.sql
```

#### Step 2: 초기 스키마 생성
```
.docs/database/schema/001_initial_schema.sql
```

**참고**: [Database 가이드](.docs/database/README.md)

### 4. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

### 5. 배포 (Ubuntu 자체 서버)

**Docker를 사용한 프로덕션 배포:**

#### Step 1: 서버 환경 준비 (Ubuntu 24.04)
```bash
# Docker 설치 확인
docker --version
docker-compose --version

# 미설치 시
sudo apt update
sudo apt install docker.io docker-compose -y
```

#### Step 2: 프로젝트 클론
```bash
git clone <repository-url>
cd portal
```

#### Step 3: 환경 변수 설정
```bash
cp .env.example .env.production
# .env.production 편집하여 프로덕션 키 입력
```

#### Step 4: Docker 빌드 및 실행
```bash
# 빌드
docker-compose build

# 백그라운드 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

#### Step 5: 포트 및 방화벽 설정
```bash
# 기본 포트: 3000 (docker-compose.yml에서 변경 가능)
sudo ufw allow 3000
sudo ufw allow 80
sudo ufw allow 443
```

#### Step 6: Nginx 리버스 프록시 (선택 사항)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

> 💡 **상세 가이드**: [배포 가이드](.docs/archive/deployment-guide.md)

---

## 📚 문서 가이드

### 🎯 핵심 문서 (SSOT - Single Source of Truth)

**개발 시 반드시 참조해야 하는 문서:**

1. **[Sitemap](.docs/sitemap/README.md)** - 전체 화면 구조 및 설계 (SSOT)
   - [User App](.docs/sitemap/user-app.md) - 회원용 앱 화면
   - [Admin Portal](.docs/sitemap/admin/README.md) - 관리자 모듈
   - [Auth System](.docs/sitemap/auth-system.md) - 인증 흐름

2. **[Project Blueprint](.docs/project-blueprint.md)** - 프로젝트 개요 및 현재 상태

3. **[Database Reference](.docs/database-reference.md)** - DB 스키마 빠른 참조
   - [Database Architecture](.docs/database/README.md) - 전체 DB 아키텍처
   - [RLS Policies](.docs/database/rls-policies/README.md) - 보안 정책
   - [Migrations](.docs/database/migrations/versioning-strategy.md) - 마이그레이션 전략

4. **[Security Guide](.docs/security/README.md)** - 보안 아키텍처 및 체크리스트
5. **[Design System](.docs/design-system.md)** - 디자인 토큰 및 컴포넌트 스타일

### 📖 참조 문서

- **[Testing Strategy](.docs/testing/README.md)** - 테스트 전략

### 📦 아카이브 (필요시 참조)

과거 분석 리포트 및 상세 가이드는 [`.docs/archive/`](.docs/archive/README.md)에 보관되어 있습니다:
- API 명세서
- 환경 변수 상세 가이드
- 배포 가이드
- RACE 시스템 기술 문서
- 프로젝트 분석 리포트

> 💡 이 문서들은 Agent가 자동으로 참조하지 않지만, 필요시 명시적으로 요청하여 사용할 수 있습니다.

### 🤖 Agent 규칙

- **[BCL Portal Rules](.agent/rules/bcl-portal.rules.md)** - Agent 작업 규칙
- **[UI Rules](.agent/rules/ui.rules.md)** - UI/UX 작업 규칙

---

## 🏗️ 개발 원칙

### 1. CSR (Client Side Rendering) 기반
- 모든 화면은 클라이언트 렌더링
- SSR은 기본적으로 사용하지 않음

### 2. Sitemap = SSOT (Single Source of Truth)
- 모든 화면은 `.docs/sitemap/`에 먼저 정의
- 코드 작성 전 sitemap 업데이트 필수

### 3. RLS (Row Level Security) 필수
- 모든 테이블은 RLS 활성화
- 클라이언트는 `anon key`만 사용
- Service Role Key는 서버 사이드에서만

### 4. 문서-코드 동기화
- 기능 개발 후 문서 즉시 업데이트
- `/sync-docs` 워크플로우 활용

---

## 🔧 주요 명령어

```bash
# 개발 서버
npm run dev

# 빌드
npm run build

# 테스트
npm run test

# 린트
npm run lint

# DB 시딩 (로컬)
npm run db:seed
```

---

## 🤖 Agent 워크플로우

```bash
# 새로운 화면 추가
/add-page

# 문서 동기화
/sync-docs

# 작업 컨텍스트 업데이트
/update-context
```

---

## 📝 개발 체크리스트

### 새로운 화면 추가 시
- [ ] `.docs/sitemap/` 에 화면 설계 문서 작성
- [ ] RLS 정책 정의 (필요시)
- [ ] 화면 구현
- [ ] 테스트 작성
- [ ] 문서 업데이트 (`/sync-docs`)
- [ ] 커밋 (`/commit-bot` 스킬 활용)

### DB 스키마 변경 시
- [ ] 마이그레이션 파일 생성 (`00X_action_target.sql`)
- [ ] RLS 정책 업데이트
- [ ] 문서 업데이트
- [ ] 테스트 환경에서 검증
- [ ] 프로덕션 적용

---

## 🔐 보안

- **인증**: Supabase Auth (JWT)
- **인가**: Role-Based Access Control (RBAC)
- **데이터 보호**: Row Level Security (RLS)
- **전송 암호화**: HTTPS (TLS 1.3)
- **저장 암호화**: Supabase AES-256

자세한 내용: [보안 가이드](.docs/security/README.md)

---

## 📊 프로젝트 상태

### Phase 1: 파운데이션 (준비 완료)
- [x] 프로젝트 구조 설정
- [x] 문서 체계 구축
- [x] DB 스키마 설계
- [x] 보안 정책 수립
- [x] 테스트 전략 수립

### Phase 2: 핵심 기능 (시작 대기)
- [ ] Admin Portal 구현
- [ ] User App 구현
- [ ] Coach App 구현
- [ ] 인증/인가 시스템
- [ ] 결제 연동

### Phase 3: 특화 모듈 (예정)
- [ ] Class Portal (WOD 보드, 타이머)
- [ ] Kiosk App (QR 체크인)
- [ ] Race System (PM5 연동, 리더보드)
- [ ] 알림 시스템 (카카오 알림톡, 푸시)

---

## 📞 문의

프로젝트 관련 문의 또는 이슈는 GitHub Issues를 이용해주세요.

---

**마지막 업데이트**: 2026년 2월 16일  
**프로젝트 초기화**: 2026년 2월 16일
