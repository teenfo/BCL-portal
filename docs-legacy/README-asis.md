# BCL Portal

> 오프라인 피트니스 지점 운영을 디지털화하는 통합 플랫폼

**현재 버전**: v0.7.0 | **최종 업데이트**: 2026-04-25

---

## 🎯 프로젝트 개요

BCL Portal은 CrossFit 및 피트니스 센터를 위한 **통합 운영 관리 플랫폼**입니다.

### 핵심 모듈
| 모듈 | URL | 대상 | 상태 |
|------|-----|------|------|
| **Admin Portal** | `/admin/*` | 센터 운영자 (데스크탑) | ✅ 운영 가능 |
| **User App** | `/apps/*` | 회원 (모바일 웹) | ✅ 운영 가능 |
| **Coach App** | `/coach/*` | 코치 전용 | ✅ 운영 가능 |
| **Class Portal** | `/class/*` | 센터 내 대형 스크린 | ✅ 운영 가능 |
| **Kiosk App** | `/kiosk/*` | 무인 체크인 단말기 | ✅ 운영 가능 |
| **Race System** | `/class/race/*`, `/coach/race/*` | ERG 레이스 (코드 완료, 결과 자동 적재) | ⚠️ 운영 수용 검증 진행 중 |

> **알림 시스템 상태**: In-app 알림은 운영 가능. 외부 채널(카카오 비즈메시지, SMS)은 **미연동 상태** (v1 제외). Push 알림은 코드 완료, 현장 검증 필요.

---

## 🛠️ 기술 스택

| 항목 | 버전/내용 |
|------|----------|
| **Frontend** | Next.js 16.1.6 (App Router, CSR 기반) |
| **React** | 19.2.3 |
| **Backend** | Supabase (PostgreSQL + Auth) |
| **Hosting** | Ubuntu 24.04 자체 서버 (Docker + Nginx) |
| **Styling** | Vanilla CSS (Glassmorphism 다크 테마) |
| **Language** | TypeScript (strict mode) |
| **CI/CD** | GitHub Actions (품질 게이트 + SSH 배포) |

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
├── .github/workflows/        # CI/CD (quality.yml + deploy.yml)
├── supabase/migrations/      # DB 마이그레이션 파일
├── src/
│   ├── app/                  # Next.js App Router (pages)
│   ├── components/           # 재사용 컴포넌트
│   ├── lib/                  # Supabase 클라이언트, 버전 관리
│   ├── hooks/                # 커스텀 훅
│   ├── contexts/             # React Context (Auth 등)
│   └── utils/                # 헬퍼 함수
├── public/                    # 정적 파일 (아이콘, 이미지)
└── .env.local                # 환경 변수 (로컬)
```

---

## 🚀 빠른 시작

### 1. 환경 변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 파일에 다음 변수를 설정:

```bash
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application (필수)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_ENV=development

# Payment (Toss Payments - 결제 기능 사용 시)
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_xxxxx
TOSS_SECRET_KEY=test_sk_xxxxx
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

### 4. Supabase DB 초기화 (첫 설치 시)

Supabase Dashboard → SQL Editor에서 `supabase/migrations/` 내 파일들을 순서대로 실행.

---

## 🔧 주요 명령어

```bash
# 개발 서버
npm run dev

# 빌드 (프로덕션 번들 생성)
npm run build

# ESLint 검사 (에러 0건 목표)
npm run lint

# TypeScript 타입 체크
npm run typecheck

# Agent CLI (워크플로우 실행)
npm run agent -- --role=dev --task="..."
```

---

## 🏗️ 개발 원칙

### 1. CSR (Client Side Rendering) 기반
- 모든 화면은 클라이언트 렌더링 (`'use client'`)
- SSR은 기본적으로 사용하지 않음

### 2. Sitemap = SSOT (Single Source of Truth)
- 모든 화면은 `.docs/sitemap/`에 먼저 정의
- 코드 작성 전 sitemap 업데이트 필수

### 3. RLS (Row Level Security) 필수
- 모든 테이블은 RLS 활성화
- 클라이언트는 `anon key`만 사용
- Service Role Key는 서버 사이드(Python 서버, Edge Function)에서만

### 4. Supabase 데이터 접근 패턴
```typescript
// 올바른 방법 — query() / rpc() 헬퍼 사용
import { query, rpc } from '@/lib/supabase/query';
const { data, error } = await query('table_name').select('...');

// 잘못된 방법 — createClient() as any 직접 사용 금지
```

---

## 📊 프로젝트 현황 (v0.7.0)

| 영역 | 완료 여부 | 비고 |
|------|----------|------|
| Auth 시스템 | ✅ 완료 | Login/Signup/Reset/OAuth |
| Admin Portal | ✅ 완료 | 6대 그룹 20+ 화면 |
| User App | ✅ 완료 | 5대 탭 고도화 완료 |
| Coach App | ✅ 완료 | 5화면 + 코칭 노트/정산 |
| Class Portal | ✅ 완료 | WOD/타이머/리더보드/레이스 |
| Kiosk (QR 체크인) | ✅ 완료 | JSON 페이로드 + 타임스탬프 검증 |
| 배지 시스템 | ✅ 완료 | DB 트리거 기반 자동 달성 |
| Race 시스템 | ✅ 코드 완료 / 🟡 운영 수용 진행 | 결과 자동 적재 + 팀전 + simulator 정합성 (Priority 21) — L3/L4 현장 재검증 필요 |
| 외부 알림 | ⚠️ Mock 상태 | 카카오/SMS v1 미포함 |
| 품질 게이트 | ✅ 구축 | lint 0 errors, typecheck 통과 |

---

## 📚 문서 가이드

### 🎯 핵심 문서 (반드시 참조)

1. **[Sitemap](.docs/sitemap/README.md)** — 전체 화면 구조 (SSOT)
2. **[Project Blueprint](.docs/project-blueprint.md)** — 현재 상태 및 미구현 목록
3. **[Database Reference](.docs/database-reference.md)** — DB 스키마 빠른 참조
4. **[Security Guide](.docs/security/README.md)** — 보안 아키텍처

### 🤖 Agent 규칙
- **[BCL Portal Rules](.agent/rules/bcl-portal.rules.md)** — Agent 작업 규칙
- **[UI Rules](.agent/rules/ui.rules.md)** — UI/UX 작업 규칙

### 📦 아카이브 (필요시만 참조)
과거 분석 리포트 및 상세 가이드는 [`.docs/archive/`](.docs/archive/)에 보관.
> Agent는 아카이브를 자동으로 참조하지 않습니다.

---

## 🔐 보안

| 항목 | 상태 |
|------|------|
| Supabase 세션 갱신 + 인증 리다이렉트 | ✅ 적용 |
| 경로별 접근 제어 (Middleware) | ✅ 적용 |
| RLS (Row Level Security) | ✅ 전체 테이블 |
| Nginx 보안 헤더 | ✅ 적용 |
| CSP (Content Security Policy) | ⚠️ 부분 적용 (Nginx 설정 수준) |
| Rate Limiting | ⚠️ Supabase 자체 제한 의존 |

자세한 내용: [보안 가이드](.docs/security/README.md)

---

## 🚀 배포 (Ubuntu 자체 서버)

```bash
# GitHub Actions로 main 브랜치 push 시 자동 배포
# 수동 배포: GitHub Actions → Deploy to Test Server → Run workflow
```

**CI/CD 흐름**:
1. `quality.yml` — lint + typecheck (모든 push/PR)
2. `deploy.yml` — SSH 배포 (main 브랜치 push 시)

자세한 내용: `.docs/deployment/server-setup-guide.md`

---

**마지막 업데이트**: 2026년 4월 25일  
**버전**: v0.7.0
