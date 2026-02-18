# BCL Portal – 잔여 개선 항목 통합 기획서

> **Status**: Approved
> **Author**: Architect (Opus)
> **Created**: 2026-02-18
> **Last Updated**: 2026-02-19
> **Related**: 
>   - `.docs/project-blueprint.md` 잔여 개선 항목 6건
>   - `.docs/planning/race-system.md` (PM5/Race 분리 기획서)

---

## 1. 개요 및 배경

### 1.1 목적
블루프린트에 등록된 6개 잔여 개선 항목을 체계적으로 분석하고, 우선순위별로 정리하여 개발 실행 가능한 Phase 단위로 배분한다. 개별 항목이 독립적이므로 **하나의 통합 기획서**로 작성하되, 각 항목을 Phase로 분리하여 병렬/순차 실행이 가능하도록 설계한다.

### 1.2 현재 상태 (As-Is)

| # | 항목 | 현재 상태 | 심각도 |
|---|------|-----------|--------|
| 1 | Class 포털 성능 최적화 | Timer/Live/WOD/Leaderboard: `setInterval` 기반, CSS 인라인 스타일, requestAnimationFrame 미사용 | 🟡 Medium |
| 2 | Check-in QR 표준 라이브러리 교체 | `checkin/page.tsx`: 커스텀 grid 기반 QR 시뮬레이션 (`Array(121)` + `charCodeAt` 해싱) — **실제 QR 코드가 아님** | 🟠 High |
| 3 | User Check-in QR 비표준 렌더링 개선 | 항목 2와 동일 파일. QR 이미지가 스캐너로 읽히지 않음 | 🟠 High |
| 4 | 대시보드 위젯 실 데이터 완성 | Widget Registry 아키텍처 구축 완료. `heroMetric`, `contextItems` 등 DB 쿼리 키 매핑은 존재하나, 일부 위젯의 실 데이터 바인딩 미검증 | 🟡 Medium |
| 5 | 레이스 PM5 기기 데이터 연동 | **별도 기획서로 분리** → `.docs/planning/race-system.md` 참조 | 🟠 High |
| 6 | Coach 앱 브라우저 통합 테스트 | Coach App 전 5개 화면 구현 완료. 브라우저 기반 E2E 검증 미실시 | 🟡 Medium |

### 1.3 핵심 제약 조건

| 항목 | 내용 |
|------|------|
| CSR 전용 | 모든 개선은 Client-Side Rendering 기반 |
| RLS 유지 | DB 변경 시 기존 RLS 정책 유지/확장 |
| 기존 패턴 | 프로젝트 Glassmorphism UI 시스템, `admin-filter-btn` 등 글로벌 클래스 활용 |
| 빌드 안정성 | 각 Phase 완료 시 `npm run build` 성공 보장 |
| 코드 변경 최소화 | 기능 추가보다 기존 코드의 **품질 개선**에 집중 |

---

## 2. 현재 문제 진단 (As-Is)

### 2.1 Check-in QR 문제 (항목 2, 3)

```
현재 QR 렌더링 흐름:
┌──────────────────┐
│ generateToken()  │ → "BCL-{random20}-{timestamp36}"
│                  │
│ ┌──────────┐     │
│ │ 11x11    │     │ → Array(121).fill().map(charCodeAt % 3)
│ │ grid div │     │ → 0: white, 1-2: black → 시각적 패턴
│ └──────────┘     │
│                  │
│ 문제: 이것은     │ → 실제 QR 코드가 아님
│ QR 시뮬레이션    │ → 키오스크 html5-qrcode 라이브러리로 읽을 수 없음
└──────────────────┘
```

**문제점**:
1. `qrToken`을 `charCodeAt % 3`으로 시각화 — 이것은 QR 규격을 따르지 않음
2. 키오스크의 `html5-qrcode` 스캐너는 ISO/IEC 18004 규격 QR만 디코딩 가능
3. **현재 체크인 흐름이 근본적으로 작동하지 않음** (QR 생성 → 스캔 연결 불가)

### 2.2 Class 포털 성능 문제 (항목 1)

```
현재 Timer 페이지:
┌────────────────────────────┐
│ setInterval(1000ms)        │ → 1초마다 state 갱신
│ ├── setTimeLeft(prev - 1)  │ → 불필요한 전체 리렌더
│ └── CSS inline styles      │ → 매 렌더마다 스타일 객체 재생성
│                            │
│ 영향: 60fps 미달           │ → 대형 모니터에서 프레임 드롭
│ (특히 Live + Leaderboard)  │
└────────────────────────────┘
```

### 2.3 대시보드 위젯 데이터 문제 (항목 4)

```
현재 위젯 아키텍처:
┌─────────────────────┐    ┌──────────────────┐
│ widget-registry.ts  │────│ useWidgetRegistry│
│ (정의: 쿼리 키 매핑)│    │ (DB+코드 합치기) │
└────────┬────────────┘    └──────┬───────────┘
         │                        │
         ▼                        ▼
┌─────────────────────┐    ┌──────────────────┐
│ WidgetCardContent   │    │ WidgetSection    │
│ (Hero + Context)    │    │ (레이아웃)       │
└─────────────────────┘    └──────────────────┘
         │
         ▼ 데이터 바인딩
┌─────────────────────┐
│ ❓ 실제 쿼리 실행    │ → 일부 쿼리 키가 실제 테이블 컬럼과 미매핑
│    여부 미검증       │ → data[heroMetric.queryKey] = undefined 가능
└─────────────────────┘
```

### 2.4 PM5/Race 시스템 (항목 5)

> **⚠️ 이 항목은 별도 기획서로 분리됨**: `.docs/planning/race-system.md`
> 규모와 난이도가 높아 독립 기획서로 관리합니다.

---

## 3. 개선 설계 (To-Be)

### 3.1 핵심 설계 원칙
1. **실용성 우선**: 현재 동작하지 않는 기능(QR)을 최우선 수정
2. **점진적 개선**: 성능 최적화는 측정 가능한 지표 기반
3. **실현 가능성**: PM5 BLE 연동은 하드웨어 의존, 시뮬레이션 완성도 우선

### 3.2 QR 개선 설계

```
개선된 QR 흐름:
┌──────────────────────────┐
│ generateToken()          │ → "BCL-{random20}-{timestamp36}"
│                          │
│ ┌─────────────────────┐  │
│ │ qrcode.react        │  │ → <QRCodeSVG value={qrToken} />
│ │ (ISO/IEC 18004)     │  │ → 실제 스캐너로 읽히는 QR 코드 생성
│ └─────────────────────┘  │
│                          │
│ ┌─────────────────────┐  │
│ │ 키오스크 스캔        │  │ → html5-qrcode 라이브러리로 디코딩 성공
│ │ → DB 체크인 기록     │  │ → "BCL-..." 토큰 → 사용자 검증 → checkins INSERT
│ └─────────────────────┘  │
└──────────────────────────┘
```

**라이브러리 선택**: `qrcode.react` (npm weekly 1.7M downloads, React 18+ 호환)
- SVG 렌더링 (canvas 대비 고해상도)
- 크기/색상/에러 정정 레벨 커스터마이즈 가능

### 3.3 성능 최적화 설계

```
개선된 Timer:
┌─────────────────────────────┐
│ requestAnimationFrame 기반  │
│ ├── useRef (DOM 직접 조작)  │ → state 리렌더 최소화
│ ├── CSS Module / static     │ → 스타일 객체 1회 생성
│ └── will-change: transform  │ → GPU 레이어 힌트
│                             │
│ 목표: 60fps 안정            │ → 대형 모니터 프레임 드롭 해소
└─────────────────────────────┘
```

### 3.4 위젯 데이터 완성 설계

```
개선된 흐름:
┌─────────────────────┐
│ widget-registry.ts  │ → 각 위젯의 queryKey가 실제 DB 쿼리와 1:1 매핑
│                     │
│ queryRunner 추가:   │ → switch(widget.id) 기반 Supabase 쿼리 실행
│   members_overview  │ → SELECT count(*) FROM members ...
│   revenue_summary   │ → SELECT sum(amount) FROM transactions ...
│   checkin_today     │ → SELECT count(*) FROM checkins WHERE date=today
│   sessions_today    │ → SELECT count(*) FROM sessions WHERE date=today
└─────────────────────┘
```

---

## 4. 데이터베이스 변경 (필요 시)

### 4.1 마이그레이션 SQL
**이번 기획에서는 DB 변경 없음.**
- QR: 기존 `checkins` 테이블 그대로 사용
- 위젯: `widget_definitions` 테이블 이미 존재
- PM5: `pm5_devices` 테이블 이미 존재

### 4.2 RLS 정책
**변경 없음** — 기존 RLS 정책 유지.

---

## 5. UI 변경 상세

### 5.1 Check-in QR 화면 (`apps/checkin/page.tsx`)

```
┌─────────────────────────────┐
│        SECURE ENTRY          │
│   ID: BCL-XXXXX              │
│                              │
│   ┌───────────────────┐     │
│   │                   │     │ ← qrcode.react <QRCodeSVG>
│   │   실제 QR 코드     │     │    value={qrToken}
│   │   (qrcode.react)  │     │    size={200}
│   │                   │     │    level="M"
│   └───────────────────┘     │
│                              │
│   Refreshes in 30s           │
│   ▓▓▓▓▓▓▓▓░░░░ DYNAMIC TOKEN│
└─────────────────────────────┘
```

**변경 범위**: `qr-image-area` div 내부만 교체 (11x11 grid → QRCodeSVG 컴포넌트)

### 5.2 Class Timer 최적화

변경 없음 (UI 동일, 내부 렌더링 최적화만)

### 5.3 대시보드 위젯

변경 없음 (쿼리 바인딩 로직만 보강)

---

## 6. 영향 범위 분석

| 파일/모듈 | 변경 내용 | 변경 필요 여부 |
|-----------|-----------|:---:|
| `src/app/apps/checkin/page.tsx` | QR 렌더링 → `qrcode.react` 교체 | ✅ |
| `src/app/class/timer/page.tsx` | `requestAnimationFrame` 리팩토링 | ✅ |
| `src/app/class/live/page.tsx` | `setInterval` → rAF, 인라인 스타일 최적화 | ✅ |
| `src/app/class/leaderboard/page.tsx` | 렌더링 최적화 | ✅ |
| `src/app/class/wod/page.tsx` | 렌더링 최적화 (경미) | ✅ |
| `src/config/widget-registry.ts` | 위젯 쿼리 키 검증/보정 | ✅ |
| `src/hooks/useWidgetRegistry.ts` | 실 데이터 쿼리 실행기 보강 | ✅ |
| `src/app/admin/operations/race/page.tsx` | 별도 기획서 범위 (`race-system.md`) | ⬜ 별도 |
| `src/app/coach/**/*.tsx` | 통합 테스트 (코드 변경 최소) | ⬜ 테스트만 |
| `package.json` | `qrcode.react` 의존성 추가 | ✅ |

---

## 7. 보안 고려사항

- **QR 토큰 안전성**: 기존 `BCL-{random20}-{timestamp36}` 토큰 구조 유지 → 30초 만료
- **체크인 검증**: 키오스크에서 QR 스캔 → 토큰 디코딩 → DB 검증 흐름 유지
- **위젯 데이터**: RLS가 적용된 테이블만 조회 (admin 역할 필수)
- **PM5 BLE**: Web Bluetooth는 HTTPS + 사용자 인터랙션 필수 (보안 내장)

---

## 8. 구현 단계 및 에이전트 배분

### Phase 1: QR 표준 라이브러리 교체 (🟠 High — 핵심 기능 수정)
> **담당**: ⚡ **Specialist (Gemini)** | **공수**: 0.5일

| # | 작업 | 상세 |
|---|------|------|
| 1-1 | `qrcode.react` 패키지 설치 | `npm install qrcode.react` |
| 1-2 | Check-in QR 렌더링 교체 | `apps/checkin/page.tsx`의 `qr-image-area` 내부를 `<QRCodeSVG value={qrToken} size={200} level="M" bgColor="transparent" fgColor="#1A1A1A" />` 로 교체 |
| 1-3 | 키오스크 스캔 검증 | `kiosk/scan/page.tsx`의 `html5-qrcode`가 새 QR을 올바르게 디코딩하는지 확인 |
| 1-4 | 빌드 검증 | `npm run build` 성공 확인 |

### Phase 2: Class 포털 성능 최적화 (🟡 Medium)
> **담당**: ⚡ **Specialist (Gemini)** | **공수**: 1일

| # | 작업 | 상세 |
|---|------|------|
| 2-1 | Timer: `requestAnimationFrame` 도입 | `setInterval` → rAF 기반 타이머. `useRef`로 DOM 직접 갱신. state 리렌더 최소화 |
| 2-2 | Live: 인라인 스타일 → CSS Module/static | 스타일 객체 상수화, `will-change` 힌트, 불필요 리렌더 차단 |
| 2-3 | Leaderboard/WOD: 렌더링 최적화 | `React.memo` 적용, 정적 요소 분리, key 최적화 |
| 2-4 | 빌드 검증 | `npm run build` 성공 확인 |

### Phase 3: 대시보드 위젯 실 데이터 완성 (🟡 Medium)
> **담당**: 💻 **Developer (Sonnet)** | **공수**: 1일

| # | 작업 | 상세 |
|---|------|------|
| 3-1 | widget-registry 쿼리 키 감사 | 모든 위젯의 `heroMetric.queryKey`, `contextItems[].queryKey`가 실행 가능한 Supabase 쿼리와 매핑되는지 검증 |
| 3-2 | 누락된 쿼리 바인딩 보강 | `WidgetSection` 또는 `useWidgetData` 훅에서 실제 DB 쿼리 실행 → `data` 객체에 결과 매핑 |
| 3-3 | Empty State / Error 처리 | 데이터 없음/에러 시 위젯 내 적절한 표시 (이미 구현된 `WidgetCardContent` 활용) |
| 3-4 | 브라우저 검증 | Admin 대시보드에서 모든 위젯이 실 데이터를 표시하는지 확인 |
| 3-5 | 빌드 검증 | `npm run build` 성공 확인 |

### Phase 4: Coach 앱 브라우저 통합 테스트 (🟡 Medium)
> **담당**: 💻 **Developer (Sonnet)** | **공수**: 0.5일

| # | 작업 | 상세 |
|---|------|------|
| 4-1 | Coach Dashboard 통합 테스트 | `/coach/dashboard` 접근 → 오늘 세션/공지/최근 체크인 로딩 확인 |
| 4-2 | Coach Schedule 통합 테스트 | `/coach/schedule` → 주간 스케줄 표시, 세션 상세 확인 |
| 4-3 | Coach Members 통합 테스트 | `/coach/members` → 회원 목록 로딩, 검색, 상세 프로필 확인 |
| 4-4 | Coach Race 통합 테스트 | `/coach/race` → 레이스 이벤트 목록, 전적 확인 |
| 4-5 | Coach Profile 통합 테스트 | `/coach/profile` → 프로필 정보 표시, 수정 기능 확인 |
| 4-6 | 발견된 버그 수정 | 테스트 중 발견된 이슈 즉시 수정 |

### Phase 5: 문서 동기화
> **담당**: 🏛️ **Architect (Opus)** | **공수**: 0.5일

| # | 작업 | 상세 |
|---|------|------|
| 5-1 | sitemap 갱신 | 변경된 기능/컴포넌트 반영 |
| 5-2 | blueprint 반영 | 잔여 개선 항목 완료 상태 갱신 (Race는 별도 추적) |
| 5-3 | database-reference 갱신 | 변경 없음 확인 또는 갱신 |
| 5-4 | complete 히스토리 기록 | `.docs/archive/complete/` 에 완료 기록 |

---

## 9. 블루프린트 등록용 체크리스트

```markdown
- [ ] Phase 1: QR 표준 라이브러리 교체 → ⚡ **Specialist (Gemini)**
  - [ ] qrcode.react 패키지 설치
  - [ ] Check-in QR 렌더링 교체 (QRCodeSVG)
  - [ ] 키오스크 스캔 연동 검증
- [ ] Phase 2: Class 포털 성능 최적화 → ⚡ **Specialist (Gemini)**
  - [ ] Timer requestAnimationFrame 전환
  - [ ] Live 인라인 스타일 정적화
  - [ ] Leaderboard/WOD React.memo 최적화
- [ ] Phase 3: 대시보드 위젯 실 데이터 완성 → 💻 **Developer (Sonnet)**
  - [ ] widget-registry 쿼리 키 감사
  - [ ] 누락된 쿼리 바인딩 보강
  - [ ] 브라우저 검증
- [ ] Phase 4: Coach 앱 브라우저 통합 테스트 → 💻 **Developer (Sonnet)**
  - [ ] Coach 전 5개 화면 통합 테스트
  - [ ] 발견 버그 수정
- [ ] Phase 5: 문서 동기화 → 🏛️ **Architect (Opus)**
  - [ ] sitemap/blueprint/complete 갱신
- ※ **PM5/Race 시스템**: `.docs/planning/race-system.md`에서 별도 추적
```

---

## 10. 테스트 시나리오

### 정상 흐름
1. **QR 체크인 E2E**: User Check-in → QR 생성 → 키오스크 스캔 → 체크인 성공 → 기록 DB 저장
2. **Timer 60fps**: Class Timer 페이지 → Tabata 10R 실행 → Chrome DevTools Performance 탭 → 60fps 유지 확인
3. **위젯 데이터**: Admin 대시보드 로딩 → 모든 위젯에 실 데이터 표시 → 0 또는 실제 숫자 (undefined/NaN 없음)
4. **Coach 앱 전체 흐름**: Coach 로그인 → Dashboard → Schedule → Members → Race → Profile → 모든 데이터 정상 로딩

### 예외 흐름
1. **QR 만료 후 스캔**: 30초 경과 후 이전 QR 스캔 시도 → 키오스크에서 "만료된 토큰" 안내
2. **위젯 DB 에러**: Supabase 연결 실패 시 → 위젯에 "Error" 상태 표시 (빈 화면 아님)
3. **Coach 미연결 계정**: user_id=NULL인 코치 로그인 시 → "관리자에게 연결 요청" 안내 배너

---

## 11. 리스크 및 완화

| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| `qrcode.react` 번들 크기 증가 | 모바일 성능 | SVG 모드 사용 (canvas 대비 경량), dynamic import 고려 |
| rAF 기반 타이머 정확도 | 타이머 오차 | `Date.now()` 기반 절대 시각 계산 (drift 보정) |
| Coach 계정 미연결 상태 | 일부 테스트 불가 | 테스트용 coach 계정 수동 연결 후 테스트 |
| 위젯 쿼리 성능 | 대시보드 로딩 지연 | 각 위젯 독립 로딩, Skeleton UI 이미 구현됨 |

---

## 12. Planning Log (기획 진행 기록)

### Session 1 — 2026-02-18
- **작성 범위**: 섹션 1~11 전체
- **완성된 섹션**: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
- **미완성 섹션**: 없음
- **TODO (다음 세션)**: `/plan-to-blueprint` 실행하여 블루프린트에 등록
- **메모**: 
  - 6개 항목이 모두 독립적이므로 하나의 통합 기획서로 작성
  - QR 교체(Phase 1)가 **가장 높은 우선순위** — 현재 체크인 기능이 사실상 동작하지 않음
  - PM5 BLE 연동은 하드웨어 의존적이므로 인터페이스 설계만 수행 (Phase 4)
  - Phase 1+2는 동일 에이전트(Specialist)가 순차 실행 가능
  - Phase 3+5는 동일 에이전트(Developer)가 순차 실행 가능

---
**문서 버전**: 1.0.0
**최종 업데이트**: 2026-02-18
