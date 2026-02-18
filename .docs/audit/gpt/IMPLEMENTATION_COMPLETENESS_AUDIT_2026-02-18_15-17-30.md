# BCL Portal 구현 완성도 분석 보고서 (GPT)

- 작성 시각: 2026-02-18 15:17:30 (로컬)
- 분석 기준 문서(SSOT): `.docs/sitemap/*`, `.docs/project-blueprint.md`
- 분석 범위: `src/app`, `src/components`, `src/hooks`, `src/types`, `supabase/migrations`
- 제약: 코드 수정 없음, 정적 코드 분석 중심

## 1) 요약 결론

- **전체 SSOT 대비 구현 완성도(추정)**: **64%**
- **현재 착수 모듈(Auth/Admin/User/Kiosk) 기준 완성도**: **82%**
- **핵심 병목**: `coach` 모듈 미구현, `class` 모듈 부분 미구현, 키오스크 스캔/DB 스키마 정합성 리스크

## 2) 평가 방법

- 문서 요구 화면 대비 실제 라우트 존재 여부 확인
- 페이지 단위로 DB 연동/실동작 코드 여부 확인
- TODO/Mock/임시 로직, 스키마 불일치, 권한/리다이렉트 흐름 점검
- 점수는 정적 분석 기반 추정치(정량 지표 + 정성 판단)

## 3) 모듈별 완성도

| 모듈 | 문서 기준 | 라우트 커버리지 | 기능 완성도(추정) | 비고 |
|---|---:|---:|---:|---|
| Auth (`/auth`) | 5개 핵심 화면 | 4/5 (80%) | 80% | `/auth/logout` 미구현, 코치 리다이렉트 불일치 |
| Admin (`/admin`) | 24개 화면 | 24/24 (100%) | 88% | 대부분 구현, 일부 설정/위젯 지표는 정적/미완 |
| User (`/apps`) | 9개 핵심 화면 | 9/9 (100%) | 76% | 화면 다수 구현, 일부 핵심 플로우는 임시/간소화 |
| Coach (`/coach`) | 5개 화면 | 0/5 (0%) | 0% | 디렉토리/페이지 부재 |
| Class (`/class`) | 4개 화면 | 1/4 (25%) | 20% | `leaderboard`만 존재, 그것도 Mock 데이터 |
| Kiosk (`/kiosk`) | 3개 화면 | 3/3 (100%) | 65% | UI 완료, QR decode/테이블 정합성 리스크 |
| DB/연동 정합성 | - | - | 70% | 문서/코드 스키마 드리프트 존재 |

## 4) 주요 발견사항

### A. Critical

1. **Coach 앱 미구현**
- 문서상 `src/app/coach/*` 필수 (`.docs/sitemap/README.md:24`, `.docs/sitemap/coach-app.md:14`)이나 실제 디렉토리 없음.

2. **Class 포털 핵심 화면 미구현 + Mock 사용**
- 문서 요구: `/class/wod`, `/class/leaderboard`, `/class/timer`, `/class/live` (`.docs/sitemap/class-portal.md:12`)
- 실제: `src/app/class/leaderboard/page.tsx`만 존재, 그리고 Mock 데이터 사용 (`src/app/class/leaderboard/page.tsx:18`).

3. **키오스크 스캔 엔진 실구현 미완**
- QR decode 함수가 항상 `null` 반환 (`src/app/kiosk/scan/page.tsx:10`, `src/app/kiosk/scan/page.tsx:14`).
- 따라서 카메라 실스캔 경로는 사실상 동작 불가, 수동 입력 중심.

4. **키오스크 DB 스키마 정합성 리스크**
- 스캔 저장: `check_ins` 사용 (`src/app/kiosk/scan/page.tsx:139`)
- 성공화면: `reservations`, `plans(name)`, `remaining_sessions` 사용 (`src/app/kiosk/success/page.tsx:55`, `src/app/kiosk/success/page.tsx:71`)
- 반면 현재 타입/다수 코드 경향은 `checkins`, `bookings`, `membership_plans`, `remaining_credits` 축이라 운영 환경별 실패 가능성 높음.

### B. High

1. **공통 인증 흐름 일부 불일치**
- 문서의 공용 로그아웃 경로 `/auth/logout` 명시 (`.docs/sitemap/auth-system.md:40`, `.docs/sitemap/README.md:49`)이나 페이지 미구현.
- `AuthGuard`에서 coach 오권한 시 `/apps/dashboard`로 리다이렉트 (`src/components/AuthGuard.tsx:70`)되어 coach 전용 플로우와 불일치.

2. **프로필 로그아웃 후 잘못된 경로 이동**
- `/apps/auth/login`으로 push (`src/app/apps/profile/page.tsx:76`), 실제 로그인 경로는 `/auth/login`.

3. **블루프린트 상태와 실제 구현 간 괴리**
- 블루프린트는 클래스 포털 완료로 표시 (`.docs/project-blueprint.md:85`)하지만 실제는 미완 상태.

### C. Medium

1. **User Check-in QR 시각화는 실제 QR 라이브러리 아님**
- 토큰 기반 격자 UI 렌더링 (`src/app/apps/checkin/page.tsx:177`)으로 실 스캐너 호환 보장 어려움.

2. **User Schedule 필터 UI만 존재**
- 필터 상태는 있으나 실제 쿼리/리스트 필터링 로직 미반영 (`src/app/apps/schedule/page.tsx:26`, `src/app/apps/schedule/page.tsx:35`).

3. **User Purchase 결제 플로우 단순화**
- PG 승인 없이 `transactions` insert 후 `memberships` 즉시 활성화 (`src/app/apps/purchase/page.tsx:94`, `src/app/apps/purchase/page.tsx:110`).

4. **User Settings 페이지 영속화 없음**
- 로컬 state 토글/저장 메시지만 있고 DB 저장 로직 없음 (`src/app/apps/profile/settings/page.tsx:7`, `src/app/apps/profile/settings/page.tsx:29`).

5. **대시보드 위젯 데이터 일부 TODO 상태**
- 알림/코치/지원 지표 일부 `0` 또는 `-` 반환 (`src/hooks/useWidgetData.ts:148`, `src/hooks/useWidgetData.ts:167`, `src/hooks/useWidgetData.ts:176`, `src/hooks/useWidgetData.ts:182`).

6. **루트 랜딩 페이지는 초기화 상태**
- 제품 홈/진입 라우팅이 아닌 초기화 문구 페이지 (`src/app/page.tsx:9`).

## 5) 문서-코드 동기화 상태

- **동기화 양호**: Admin 라우트 구조, User 주요 라우트, Kiosk 3화면 존재
- **동기화 불일치**:
  - Coach/Class 구현 상태
  - Auth logout 경로
  - 블루프린트 완료 체크(클래스 포털) vs 실제 코드
  - DB 엔티티 네이밍 축(예: `check_ins` vs `checkins`, `reservations` vs `bookings`)

## 6) 라우트 커버리지(화면 존재 기준)

- Auth: 4/5
- Admin: 24/24
- User: 9/9
- Coach: 0/5
- Class: 1/4
- Kiosk: 3/3
- **총합: 41/50 = 82%**

## 7) 빌드/검증 상태

- `npm run lint` 실행 시 `eslint: command not found`
- `npm run build` 실행 시 `next: command not found`
- 현재 환경에서는 정적 코드 분석만 가능했고, 빌드 기반 완성도 검증은 미수행

## 8) 최종 판단

- 이 프로젝트는 **Admin/User 중심으로는 높은 진척도**를 보이지만,
- **전체 SSOT 기준**으로는 Coach/Class 미구현과 Kiosk 실동작/스키마 정합성 리스크 때문에 **완전한 구현 완료 단계는 아님**.
- 따라서 현재 단계 평가는 **“부분 프로덕션 가능(모듈 제한적)”**이 적절.

