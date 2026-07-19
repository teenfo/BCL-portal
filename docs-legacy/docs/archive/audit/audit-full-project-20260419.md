# Audit Report: BCL Portal 전체 프로젝트 감사

**Status**: 🟡 CONDITIONAL
**Date**: 2026-04-19
**Target**: 전체 프로젝트 (Priority 6~19 완료 분)
**Auditor**: Claude Sonnet 4.6 (Thinking) — 개발에 참여하지 않은 독립 모델
**Developer**: 혼합 (Gemini Pro / Claude Sonnet)

---

## 1. 감사 범위

- **기준 문서**: `.docs/sitemap/**/*.md`, `.docs/database-reference.md`, `.agent/rules/bcl-portal.rules.md`, `.agent/skills/ui-gen/SKILL.md`
- **코드 범위**: `src/app/` 전체 — admin, apps, auth, class, coach, kiosk
- **빌드**: `npm run build` 실행 결과
- **보안**: `service_role` 키 클라이언트 사용 여부, `as any` 패턴, `console.log` 잔존 여부

---

## 2. 영역별 평가

| 영역 | 상태 | 핵심 소견 |
|:---|:---:|:---|
| **기획 준수 (Sitemap↔Code)** | 🟢 | 모든 sitemap 정의 화면 구현 완료, 라우트 일치 |
| **UI/UX 표준** | 🟡 | Admin은 전반적으로 준수, class/race 영역 인라인 스타일 과다 |
| **보안 (RLS/권한)** | 🟢 | service_role 클라이언트 미사용, anon key 원칙 준수 |
| **코드 품질** | 🟡 | 빌드 성공, as any 잔존 43건+, console.log 8건, Mock 데이터 1건 |

---

## 3. 발견 사항

### 🔴 Critical (즉시 수정 필요)
_해당 없음 (보안/데이터 무결성 위협 요소 발견 없음)_

---

### 🟡 Major (기획 불일치 / 기능 결함)

#### [M-1] Admin 코치 성과 탭 — avgRating Mock 데이터 미제거
- **파일**: `src/app/admin/operations/coaches/page.tsx:384`
- **현상**: `avgRating: Number((4 + Math.random()).toFixed(1)), // Mock rating for now`
- **영향**: 코치 성과 분석 탭의 평균 평점이 매 렌더링마다 무작위로 변함. 신뢰할 수 없는 데이터 표시.
- **방안**: `session_feedback` 테이블에서 실제 평균 평점을 `fn_get_coach_performance_stats` RPC에 포함하거나, 별도 쿼리로 평균 `rating`을 가져와 교체.

#### [M-2] `as any` 패턴 43건+ 잔존 — 타입 안전성 부분 미해결
- **파일**: `src/hooks/useWidgetRegistry.ts`, `src/hooks/usePushSubscription.ts`, `src/app/admin/operations/race/page.tsx` 외 다수
- **현상**: Priority 17 Phase 3에서 58개 파일 전환 완료라고 기록되었으나, 현재 `as any` 43건 이상 잔존 확인
  - `useWidgetRegistry.ts` — `(supabase as any).from(...)` 2건
  - `usePushSubscription.ts` — `(supabase as any).from(...)` 3건
  - `WidgetSettingsManager.tsx` — `(supabase as any)` 4건
  - admin 다수 페이지 — `data as any` 패턴
- **영향**: 타입 오류가 런타임까지 감지되지 않을 수 있음. 특히 `supabase as any`는 `query()` 헬퍼 미사용.
- **방안**: `useWidgetRegistry.ts`, `usePushSubscription.ts`, `WidgetSettingsManager.tsx`의 `supabase as any` → `query()` 헬퍼로 전환 우선 처리.

#### [M-3] TypeScript 버전 하위 호환 경고
- **현상**: 빌드 시 `⚠ Minimum recommended TypeScript version is v5.1.0, older versions can potentially be incompatible with Next.js. Detected: 4.9.5`
- **영향**: Next.js 16과의 잠재적 비호환 (빌드는 현재 성공 중이나 특정 타입 기능 제한)
- **방안**: `package.json`에 TypeScript를 v5.x로 업그레이드, `tsconfig.json` 검토 후 반영.

---

### 🟢 Minor (권장 개선 / 참고 사항)

#### [m-1] `console.log` 8건 잔존
- **파일**: 
  - `src/hooks/useRaceRealtime.ts` (2건) — 실시간 디버그 로그
  - `src/app/apps/notifications/page.tsx`, `src/app/apps/layout.tsx` — SW 등록 실패 로그
  - `src/contexts/AuthContext.tsx` — 세션 복원 성공 로그
  - `src/app/admin/members/[id]/page.tsx` (3건) — 인라인 편집 디버그 로그
- **영향**: 프로덕션 배포 시 불필요한 로그 노출, 보안 정보 유출 위험 낮음
- **방안**: 프로덕션 빌드 전 전량 제거 또는 `process.env.NODE_ENV === 'development'` 조건부 처리

#### [m-2] Class/Race 페이지 — 인라인 스타일 과다
- **파일**: `src/app/class/race/result/page.tsx`, `src/app/class/race/run/page.tsx`, `src/app/class/race/view/page.tsx`
- **현상**: `style={{ ... }}` 인라인 스타일 다수 사용, 글로벌 CSS 변수/클래스 미사용
- **영향**: 디자인 시스템 일관성 약화, 향후 테마 변경 시 개별 수정 필요
- **참고**: Class Portal은 TV 전용 화면으로 독립적 스타일이 허용되는 특수 케이스이므로 Minor 분류

#### [m-3] `bookings` 쿼리 — `user_id` vs `member_id` 정합성 확인 필요
- **파일**: `src/app/apps/schedule/page.tsx:68-74`
- **현상**: `query('bookings').select('session_id').eq('user_id', user.id)` — `user_id` 컬럼 직접 사용
- **참고**: Priority 17에서 member_id 혼용 수정 완료했으나, `bookings` 테이블의 컬럼명이 `user_id`인지 `member_id`인지 DB 스키마 기준 재확인 권장 (DB 설계 기준 `member_id`가 표준)

#### [m-4] `race/result` 페이지 — 'calories' SortMetric 정의되어 있으나 실 데이터 없음
- **파일**: `src/app/class/race/result/page.tsx:42, 94`
- **현상**: `type SortMetric = 'distance' | 'watts' | 'spm' | 'hr' | 'calories'` 정의되어 있으나, `calories` 케이스에서는 실제 데이터 없이 default로 fallback (정렬 로직 93-95행)
- **영향**: UI의 칼로리 탭이 실제로 동작하지 않음 (UI 탭에는 HR까지만 표시되어 현재는 숨겨진 상태)

#### [m-5] Admin 코치 페이지 `createClient()` 직접 호출 잔존
- **파일**: `src/app/admin/operations/coaches/page.tsx:490`
- **현상**: `supabase.from('coach_settlements').update(...)` — `query()` 헬퍼 원칙 미사용 (auth 목적 외 사용)
- **방안**: `query('coach_settlements').update(...)` 헬퍼로 교체

#### [m-6] `database-reference.md` 최종 업데이트 날짜 미갱신
- **현상**: 문서 하단 "최종 업데이트: 2026년 2월 16일" — Race 시스템(Phase A–B) 추가 후 미갱신
- **영향**: 문서 신뢰도 저하

---

## 4. 긍정 평가 (Well Done)

- ✅ **빌드 완전 성공**: 0 errors, warnings 1건(TS 버전)만 존재
- ✅ **전체 83개 라우트 정상 빌드** (admin 21 + apps 15 + class 5 + coach 6 + kiosk 3 + auth 7 + api 7 + root 1)
- ✅ **Sitemap ↔ 코드 정합성 완벽**: sitemap에 정의된 모든 화면 구현 완료
- ✅ **service_role 키 클라이언트 미노출**: API 서버 Route Handler에서만 참조, 클라이언트 코드에서 zero
- ✅ **인증 가드(AuthGuard) 정상 작동**: admin/coach/apps/kiosk 분리 접근 제어
- ✅ **글로벌 CSS 클래스 활용**: Admin 페이지 대다수에서 `.admin-filter-btn`, `.admin-search-input`, `.admin-action-btn` 올바르게 사용
- ✅ **공통 컴포넌트 확립**: `AppSkeleton`, `AppEmptyState`, `SessionDetailModal` 등 User App 공통 컴포넌트 체계
- ✅ **RPC 헬퍼 전환**: `query()` / `rpc()` 패턴 대부분 적용
- ✅ **Race 시스템 전 Phase 완료**: DB → Python BLE → Realtime 훅 → 2.5D 렌더링 → 결과 저장 파이프라인 구축

---

## 5. 조치 요약

| 심각도 | 건수 | 처리 방법 |
|:---|:---:|:---|
| 🔴 Critical | 0건 | — |
| 🟡 Major | 3건 | `/develop`로 우선 수정 착수 권장 |
| 🟢 Minor | 6건 | 다음 개발 시 순차 처리 |

### 즉시 처리 권장 순서 (Major)
1. **[M-1]** 코치 성과 탭 Mock 평점 → 실 DB 평균 교체
2. **[M-3]** TypeScript 5.x 업그레이드 (`npm install typescript@latest --save-dev`)
3. **[M-2]** `useWidgetRegistry.ts`, `usePushSubscription.ts`, `WidgetSettingsManager.tsx` 잔여 `supabase as any` 전환

---

## ✅ 감사 완료 체크리스트

- [x] Sitemap 전체 구조 파악 및 코드 라우트 대조
- [x] 기준 문서 (bcl-portal.rules.md, ui-gen/SKILL.md) 검토
- [x] `npm run build` 실행 및 결과 확인
- [x] service_role 클라이언트 사용 여부 grep 검증
- [x] `as any` 패턴 전수 조사
- [x] `console.log` 잔존 여부 확인
- [x] Sitemap-코드 정합성 체크
- [x] UI/UX 표준 준수 체크 (Admin 글로벌 클래스, apps 컴포넌트)
- [x] database-reference.md 최신화 여부 확인
- [x] ⛔ 코드/DB/인프라 일체 수정하지 않음 (발견과 보고만 수행)
- [x] 감사 보고서 `.docs/audit/`에 작성 완료
