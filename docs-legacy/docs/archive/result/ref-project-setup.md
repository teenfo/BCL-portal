# 프로젝트 설정 및 로드맵 통합 리포트
(Project Setup & Roadmap)

이 문서는 BCL Portal 프로젝트의 멀티에이전트 협업 체계, 기능 개발 로드맵 및 초기 인프라(Supabase) 셋업 가이드를 압축하여 정리한 문서입니다.

---

## 1. 멀티에이전트 시스템(Multi-Agent System) 구성 및 역할
**기원**: `REVIEW_REPORT_v2.md`, `AGENT_RESTRUCTURE_2026-02-17.md`
**업데이트일**: 2026-02-17

BCL Portal 개발을 수행하는 Agent 팀은 효율적인 병렬 작업과 품질 확립을 위해 3-Agent에서 **5-Agent 시스템 (v2.0)**으로 재편되었습니다.

### 1-1. 5-Agent 역할 분담
1. **Architect (Claude Opus 4.6 Thinking)**
   - 전체 시스템 아키텍처 설계, 보안 검증, 최종 리뷰 및 승인
2. **Senior Developer (Claude Opus 4.5 Thinking)**
   - 결제/재무(`admin/finance`), 복잡한 DB 스키마 로직 및 RLS/보안 구현 전담
3. **Backend Developer (Claude Sonnet 4.5 Thinking)**
   - API 개발, 비즈니스 로직, 데이터 통합 등 백엔드/서버 일반 구현 집중 (`/api/routes`)
4. **UI Developer (Gemini 3.0 Flash)**
   - **(신규)** 프론트엔드 전담. Stitch 모듈에 연결되어 User, Admin, Coach, Class 포털의 최적화된 UI/UX 렌더링
   - 퍼포먼스 스페셜리스트 역할 겸임 (실시간 최적화, WebSocket, 하드웨어 연동 등)
5. **QA (GPT OSS)**
   - 테스트 작성, 품질 검증, 코드 정합성 보장

### 1-2. 워크플로우 특징
- **UI 기능 개발**: Architect 설계/검토 → UI Developer (Gemini) 구현 → QA 검증
- **통합 기능 개발**: Architect 설계 → Backend Dev (Sonnet) API 구현 → UI Dev (Gemini) 프론트 연동 → QA
- 역할 구분을 통해 API 간 인터페이스만 정확히 맞추고, 각 전문 모델이 병렬 작업을 수행하여 개발 속도 향상.

---

## 2. 기능 개발 로드맵 (Feature Roadmap & App Upgrade)
**기원**: `FEATURE_ROADMAP.md`, `USER_APP_DEVELOPMENT_ROADMAP.md`, `USER_APP_UPGRADE_PLAN.md`
**업데이트일**: 2026-02-17

현재 개발 전체 진행률은 Foundation 설정을 마친 **약 15% 수준 (Phase 2 초기)**입니다.

### 2-1. 진행 상태 현황
| 모듈 | 진행 상태 | 설명 |
|:---|:---:|:---|
| **Authentication** | ✅ 완료 | Email Auth, 소셜 Mock 연동 및 UI 테스트 100% 완료 |
| **User App (회원)** | 🚧 10% 진행 | Dashboard, Schedule 등 기본 뷰만 구성 |
| **Admin Portal** | 📋 5% 기본 | 라우트와 기본 구조 생성 단계 |
| **Coach, Class, Kiosk**| 📋 계획 단계| - |

### 2-2. 단계별 마스터플랜 (Phases)
- **Phase 1 (Foundation ~ Week 2)**: Database Schema 구성 및 Auth System 개발 (완료)
- **Phase 2 (Core Features ~ Week 5)**: User App 핵심 화면 5종 (Dashboard, Schedule, Check-in, Facilities, Profile) 완성 및 Admin 기초 회원 관리 로직 구현 (진행 중)
- **Phase 3 (Community & Advanced ~ Week 8)**: User App 고도화 (WOD 리더보드, 코치/지점 커뮤니티), Admin 매출 분석
- **Phase 4 (Operations ~ Week 10)**: Coach App 론칭, Kiosk 기능 및 Class Live 현장 보드 연동
- **Phase 5 (Polish ~ Week 12)**: 결제 PG 연동, 외부 푸시(카카오 알림톡), PM5 레이스 하드웨어 모듈 통합 및 성능 최적화(React Query 도입 등).

### 2-3. User App 개선 플랜 (App Upgrade Plan)
- **과제 1**: 앱 전역에 적용되는 `UserTopHeader` 추가. 지점 식별 정보 유지, 알림 배지 확보로 레이아웃 파편화 근절.
- **과제 2**: 토스/나이스 PG 결제망 구축 및 멤버십 구매 기능 연계.
- **과제 3**: 푸시 알림 권한 활성화를 위한 PWA Service Worker 최적화.
- **과제 4**: 피드백/구매/결과 페이지들의 Light / Glassmorphism 스타일 일관화 (기존 다크모드 잔재 삭제).

---

## 3. 초기 인프라 셋업 점검: Supabase 환경
**기원**: `SUPABASE_SETUP_GUIDE.md`
**업데이트일**: 2026-02-17

초기 코드베이스와 DB 연동을 위한 Supabase 환경 가이드입니다.

### 3-1. 환경 변수 등록
- 로컬 Root 디렉토리 `.env.local` 파일 생성
- `NEXT_PUBLIC_SUPABASE_URL`와 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 입력 필수

### 3-2. 중요 스크립트 실행
Supabase Dashboard의 SQL Editor에서 다음 기초 스크립트들을 실행하여 시드를 적용해야 합니다.
1. `schema/002_rls_policies.sql`: 안전한 데이터 접근을 위한 55개 RLS 정책 일괄 생성. (실행 시간 ~15초)
2. `schema/003_auth_integration_seed.sql`: `handle_new_user()` 트리거를 활성화시켜 인증과 동시에 `members`, `coaches` 기본 프로필 생성 보장 및 Foundation Seed 데이터 삽입.

### 3-3. Auth 권한 테스트 프로토콜
- Member 로그인 시도 및 리다이렉트 (`/apps`)
- Coach 로그인 시도 및 리다이렉트 (`/coach`)
- Admin 로그인 시도 및 리다이렉트 (`/admin`)
- Signup Flow를 통한 이메일 승인 절차 활성화 여부 점검
