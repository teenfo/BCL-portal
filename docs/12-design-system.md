# 12. 클로드 단일 디자인 시스템 (to-be)

> 근거: `_source/contract.md` §6(토큰 스킴 — 절대 준수), `_source/nonfunctional-history.md`
> (UI 부채 이력·디자인 as-is), 현행 globals.css 3중 테마 혼재 실태 (2026-07-07).
>
> **원칙: 토큰은 `--bcl-*` 1세트만 존재한다.** 기존 `--app-*` / `--primary` / 수동 유틸리티
> 클래스 / 하드코딩 HEX는 전량 폐지(§5 매핑 표). 앱별 차이는 **테마(dark/light)와
> 밀도(admin/mobile/tv) 변수로만** 표현하고, 컴포넌트·시맨틱은 전 앱 동일하다.

상태 표기: ✅ 운영 · 🔄 to-be 변경 · ⏳ 신규

---

## 1. 아키텍처

```
:root                        ← 불변 토큰(스페이스·radius·타이포 스케일·폰트)
:root[data-theme="dark"]     ← 색 토큰 다크 값 (Admin·Class·Kiosk 기본)
:root[data-theme="light"]    ← 색 토큰 라이트 값 (User·Coach 기본)
:root[data-density="admin"]  ← 밀도 변수 (고밀도 데스크탑)
:root[data-density="mobile"] ← 밀도 변수 (터치 모바일)
:root[data-density="tv"]     ← 밀도 변수 (3m 시청거리 대형)
```

- 각 앱 layout이 `<html data-theme data-density>`를 1회 지정한다. 컴포넌트는 테마·밀도를
  **감지하지 않는다** — 토큰만 소비한다(분기 코드 금지).
- 파일 구조: `src/styles/tokens.css`(토큰 유일 정의처) + `reset.css`(§3) +
  컴포넌트는 `src/components/ui/`(12종, §4). 이 3곳 밖에서 색상 HEX 리터럴 등장 시 리뷰 반려.
- CI grep 가드: `#FF6A00|#FF6B00|#D2691E|--app-|--primary` 가 `src/` 내
  `tokens.css` 외 파일에서 검출되면 실패 (01-auth §5.1과 동일한 상수 단일화 원칙).

---

## 2. 토큰 정의 (계약 §6 전체 값)

### 2.1 색 — 테마 매핑 표

| 토큰 | dark | light | 용도 |
|---|---|---|---|
| `--bcl-bg` | `#161616` | `#F7F7F5` | 페이지 배경 |
| `--bcl-surface` | `#1F1F1F` | `#FFFFFF` | 카드·패널 기본면 |
| `--bcl-surface-raised` | `#2A2A2A` | `#FFFFFF` + `--bcl-shadow-md` | 모달·팝오버·띄운 면 |
| `--bcl-border` | `#3A3A3A` | `#E4E4E0` | 구분선·외곽선 |
| `--bcl-text` | `#F5F5F5` | `#1C1C1C` | 본문 텍스트 |
| `--bcl-text-muted` | `#9E9E9E` | `#6E6E6B` | 보조 텍스트·라벨 |
| `--bcl-accent` | `#FF6A00` | `#FF6A00` | 브랜드 액센트 **단일 값**(면·아이콘·게이지) |
| `--bcl-accent-ink` ⏳보조 | `#FF8A3D` | `#C24E00` | 액센트 **텍스트/링크 전용** — #FF6A00은 소형 텍스트 대비 미달(흰 배경 2.9:1)이므로 텍스트에는 이 파생 토큰만 사용. 브랜드 값은 accent 1개, ink는 접근성 파생 |
| `--bcl-accent-soft` | `rgba(255,106,0,.16)` | `rgba(255,106,0,.10)` | 액센트 연한 배경(선택 상태·soft 버튼) |
| `--bcl-accent-border` | `rgba(255,106,0,.40)` | `rgba(255,106,0,.35)` | 액센트 외곽선 |
| `--bcl-success` / `-soft` | `#34C759` / `rgba(52,199,89,.16)` | `#1E9E4A` / `rgba(30,158,74,.12)` | 성공·출석·활성 |
| `--bcl-warning` / `-soft` | `#F5A623` / `rgba(245,166,35,.16)` | `#B97508` / `rgba(185,117,8,.12)` | 주의·대기·만료 임박 |
| `--bcl-danger` / `-soft` | `#FF4D4F` / `rgba(255,77,79,.16)` | `#D6383A` / `rgba(214,56,58,.12)` | 위험·삭제·노쇼 |
| `--bcl-info` / `-soft` | `#4DA3FF` / `rgba(77,163,255,.16)` | `#1D6FD6` / `rgba(29,111,214,.12)` | 안내·정보 배지 |
| `--bcl-overlay` ⏳보조 | `rgba(0,0,0,.60)` | `rgba(20,20,20,.45)` | 모달/바텀시트 딤 |
| `--bcl-focus-ring` ⏳보조 | `rgba(255,138,61,.55)` | `rgba(194,78,0,.45)` | 포커스 링(전 컴포넌트 공통) |
| `--bcl-shadow-md` ⏳보조 | `0 4px 16px rgba(0,0,0,.45)` | `0 4px 16px rgba(28,28,28,.10)` | raised 면 그림자 |

규칙:
- 상태색 텍스트는 각 테마에서 배경 대비 4.5:1 이상이 되도록 위 값 고정(라이트는 어두운 톤 채택).
- as-is 그라디언트(`#ff6a00→#ff8533`) **폐지** — 단색 `--bcl-accent`만. 연출용 그라디언트는
  Race 에셋(15 문서 매니페스트)에서만 예외 허용.
- glassmorphism(`rgba(38,38,38,.8)+blur`)은 토큰화하지 않음 — Class/TV 배경 연출 유틸
  `.bcl-glass`(surface 기반) 1개로만 제한.

**Race 전용 확장 토큰** (15-race-system §5b 소비 — 이 파일이 등록 SSOT):
- `--bcl-race-team-1..8`: `#FF6A00`(accent)·`#3B82F6`·`#22C55E`·`#F59E0B`·`#8B5CF6`·`#EC4899`·`#14B8A6`·`#EF4444` — 팀/레인 컬러 8색 고정
- 테마 토큰 3종 `--bcl-race-surface` / `--bcl-race-trail` / `--bcl-race-bg-tint`:
  `data-race-theme=water|road|snow|track` 4테마별 값 매핑 🔄(R-11 — 연결 기기 타입에 따른 화면 테마 전환).
  water=심해 블루/포말 화이트, road=아스팔트 그레이/더스트 앰버, snow=설원 화이트-블루/스프레이 화이트, track=트랙 레드-브라운/더스트 앰버.
  Race 화면 컴포넌트는 이 3토큰만 참조하고 테마 하드코딩 금지

### 2.2 간격 — 4px 그리드

| 토큰 | 값 | | 토큰 | 값 |
|---|---|---|---|---|
| `--bcl-space-1` | 4px | | `--bcl-space-5` | 20px |
| `--bcl-space-2` | 8px | | `--bcl-space-6` | 24px |
| `--bcl-space-3` | 12px | | `--bcl-space-7` | 28px |
| `--bcl-space-4` | 16px | | `--bcl-space-8` | 32px |

- 모든 margin/padding/gap은 이 8단계만 사용(임의 px 금지). 32px 초과 레이아웃 여백은
  space 토큰 조합(calc) 또는 grid gap으로.

### 2.3 radius · 폰트

| 토큰 | 값 | 용도 |
|---|---|---|
| `--bcl-radius-sm` | 6px | 배지·인풋 내부 요소 |
| `--bcl-radius-md` | 10px | 버튼·인풋·카드 기본 |
| `--bcl-radius-lg` | 16px | 모달·바텀시트·히어로 카드 |
| `--bcl-font` | `'Lexend', 'Pretendard', system-ui, sans-serif` | 전 앱 단일 폰트 스택(한글 폴백 Pretendard) |

### 2.4 타이포 스케일 (root 8단계 × 밀도 배율)

| 토큰 | size/line-height | weight | 용도 |
|---|---|---|---|
| `--bcl-type-display` | 32/40 | 700 | 대시보드 히어로 숫자 |
| `--bcl-type-h1` | 24/32 | 700 | 페이지 제목 |
| `--bcl-type-h2` | 20/28 | 600 | 섹션 제목 |
| `--bcl-type-h3` | 17/24 | 600 | 카드 제목 |
| `--bcl-type-body` | 15/22 | 400 | 본문 |
| `--bcl-type-body-strong` | 15/22 | 600 | 강조 본문·버튼 라벨 |
| `--bcl-type-caption` | 13/18 | 400 | 보조 설명·메타 |
| `--bcl-type-micro` | 11/16 | 500 | 배지·타임스탬프 |

- 실제 렌더 크기 = 위 기준값 × `--bcl-font-scale`(밀도 변수, §2.5). line-height도 동일 배율.
- 숫자 데이터(KPI/타이머/기록)는 `font-variant-numeric: tabular-nums` 필수.

### 2.5 밀도 프로파일 (`data-density`)

| 변수 | `admin` (고밀도) | `mobile` (터치) | `tv` (3m 대형) |
|---|---|---|---|
| `--bcl-font-scale` | 0.93 (body≈14px) | 1.0 (body 15px) | 1.6 (body≈24px) |
| `--bcl-control-h` | 32px | 44px | 64px |
| `--bcl-control-h-sm` | 26px | 36px | 52px |
| `--bcl-pad-card` | space-4 (16) | space-4 (16) | space-6 (24) |
| `--bcl-pad-page` | space-6 (24) | space-4 (16) | space-8 (32) |
| `--bcl-row-h` (테이블/리스트) | 36px | 52px | 72px |
| `--bcl-hit-min` (최소 터치 타깃) | 24px | **44px** | 48px(리모컨 포커스) |
| 기본 테마 | dark | light | dark |

- 컴포넌트는 높이·패딩을 반드시 이 변수로 받는다 → 같은 `<Button>`이 Admin에선 32px,
  모바일에선 44px, TV에선 64px로 렌더. **밀도별 컴포넌트 포크 금지.**
- Kiosk는 `mobile` 밀도 + dark 테마 조합 사용(§6).

---

## 3. 기본 리셋 명세 (`reset.css`) — 필수 선행

> 사례(재발 차단 대상): 커스텀 배경을 지정하지 않은 `<button>`이 UA 기본 스타일
> (흰 배경 + 검정 테두리)로 렌더되어 다크 화면에 **흰 패널**로 떠 보이는 버그가 반복됨.
> 미정의 토큰(`--app-accent-bg`) 참조 시 속성이 통째로 무시되며 같은 증상 유발.

```css
/* 1. UA 폼 컨트롤 초기화 — 흰 패널 버그 원천 차단 */
button, input, select, textarea {
  font: inherit;                 /* UA 고유 폰트 제거 */
  color: inherit;
  background: transparent;       /* ← 핵심: UA 흰 배경 제거 */
  border: none;
  border-radius: 0;
  padding: 0;
  margin: 0;
  appearance: none;              /* select 화살표·iOS 스타일 제거 */
}
button { cursor: pointer; text-align: inherit; }
button:disabled { cursor: not-allowed; }

/* 2. 포커스: outline 제거 대신 토큰 링으로 교체 (제거만 하고 방치 금지) */
:focus-visible { outline: 2px solid var(--bcl-focus-ring); outline-offset: 2px; }

/* 3. 박스 모델·미디어 */
*, *::before, *::after { box-sizing: border-box; }
img, svg, video { display: block; max-width: 100%; }
body { margin: 0; font-family: var(--bcl-font); background: var(--bcl-bg); color: var(--bcl-text); }

/* 4. iOS 자동 확대 방지(모바일 밀도): input font-size ≥ 16px 보장 */
[data-density="mobile"] input, [data-density="mobile"] select { font-size: max(1em, 16px); }
```

**미정의 토큰 가드**: 토큰은 `tokens.css`에 전 항목이 두 테마 모두 정의돼야 하며,
`var(--bcl-x, fallback)` 형태의 인라인 fallback 사용 금지(누락을 은폐함).
CI에서 사용된 `--bcl-*` 목록과 정의 목록 diff 검사(스크립트) — 미정의 참조 0건.

---

## 4. 표준 컴포넌트 12종 (`src/components/ui/`)

> 공통 규칙: ① 아래 12종의 **인라인 재구현 금지**(이번 세션 버그의 근원 — 발견 시 반려)
> ② 모든 색·크기·간격은 토큰만 ③ 파괴적 행동(삭제/환불/거부)은 확인 단계 필수
> ④ 모든 인터랙티브 요소는 `--bcl-hit-min` 이상 + `:focus-visible` 링.

### 4.1 Button
| 항목 | 명세 |
|---|---|
| variant | `primary`(accent 면+흰 텍스트) / `soft`(accent-soft 면+accent-ink 텍스트) / `danger`(danger 면+흰 텍스트) / `ghost`(투명 면+text, hover 시 surface-raised) |
| size | `md`(=control-h) / `sm`(=control-h-sm) — 밀도 변수 자동 반영 |
| 상태 | default / hover(휘도 +6%) / active(scale .98) / focus-visible(공통 링) / disabled(opacity .45, 포인터 차단) / **loading(내장 스피너+라벨 유지, 이중 클릭 차단)** |
| 토큰 | accent, accent-soft, accent-ink, danger, radius-md, control-h, type-body-strong, space-2·3 |
| 접근성 | `<button type>` 명시(폼 내 암묵 submit 방지), loading 중 `aria-busy`, 아이콘 단독 버튼은 `aria-label` 필수 |
| 금지 | HEX 직접 지정, 새 variant 임의 추가, `<div onClick>` 버튼, admin 전용 유틸(.admin-action-btn 등) 재도입 |

### 4.2 Card
| 항목 | 명세 |
|---|---|
| variant | `default`(surface+border) / `raised`(surface-raised+shadow-md) / `accent`(좌측 3px accent 보더 — 알림·위험 강조는 상태색 보더) |
| 구조 | 슬롯: header(제목 h3+우측 액션) / body / footer. padding=`--bcl-pad-card` |
| 상태 | 클릭형 카드는 hover(보더→accent-border)+focus 링, 그 외 정적 |
| 토큰 | surface, border, radius-md~lg, pad-card |
| 접근성 | 클릭형은 `<a>`/`<button>` 래핑(카드 전체가 단일 타깃 — 내부 중첩 클릭 금지) |
| 금지 | 카드 내 카드 3중첩, 배경 HEX, 그림자 임의 지정 |

### 4.3 Modal
| 항목 | 명세 |
|---|---|
| variant | `sm`(400px)/`md`(560px)/`lg`(760px) — TV 밀도에서는 사용 금지(전체화면 패널로 대체) |
| 구조 | overlay(`--bcl-overlay`) + surface-raised 패널(radius-lg) + header(제목/닫기)/body(스크롤)/footer(버튼 우측 정렬, primary 1개 원칙) |
| 상태 | 열림(포커스 트랩+배경 스크롤 잠금) / 닫기(ESC·오버레이 클릭·닫기 버튼 — 파괴적 확인 모달은 오버레이 클릭 닫기 비활성) |
| 토큰 | overlay, surface-raised, radius-lg, shadow-md, pad-card |
| 접근성 | `role=dialog` `aria-modal` `aria-labelledby`, 닫힘 시 트리거로 포커스 복귀 |
| 금지 | 모달 위 모달(2중까지만·확인용 sm 한정), 모바일 밀도에서 md 이상(→BottomSheet 사용) |

### 4.4 BottomSheet (모바일 전용)
| 항목 | 명세 |
|---|---|
| variant | `auto`(내용 높이) / `full`(**92vh** 고정 — 계약 §6) |
| 구조 | 상단 그랩 핸들(36×4px, text-muted 40%) + header/body(스크롤)/고정 footer. radius-lg 상단만 |
| 상태 | 드래그 다운 닫기(120px 임계)+오버레이 탭 닫기, 키보드 오픈 시 footer가 키보드 위 고정 |
| 토큰 | overlay, surface(-raised), radius-lg, space-4, hit-min |
| 접근성 | Modal과 동일 dialog 규약, 핸들은 장식(`aria-hidden`) |
| 금지 | 데스크탑(admin 밀도) 사용, 92vh 초과, 시트 내 시트 |

### 4.5 Badge
| 항목 | 명세 |
|---|---|
| variant | `neutral`(surface-raised+muted) / `accent` / `success` / `warning` / `danger` / `info` — 전부 `-soft` 배경 + 상태색 텍스트 |
| size | md(20px)/sm(16px), type-micro, radius-sm(pill 옵션 999px) |
| 용도 매핑 | 출석=success, 대기=warning, 노쇼/거부=danger, 승인대기=warning, 코치상태·멤버십 D-Day 등 **상태→색 매핑 표를 컴포넌트에 상수화**(화면별 임의 매핑 금지) |
| 접근성 | 색만으로 구분 금지 — 라벨 텍스트 항상 동반 |
| 금지 | 배지에 클릭 핸들러(필터 칩은 Button soft/ghost 사용), 커스텀 색 조합 |

### 4.6 Input
| 항목 | 명세 |
|---|---|
| variant | `text`/`password`(표시 토글 내장)/`search`(아이콘+클리어)/`textarea`/`number` |
| 구조 | label(위, caption) + 필드(control-h, surface, border 1px, radius-md) + helper/error(아래 caption) |
| 상태 | default / focus(보더 accent-border+링) / **error(보더 danger+메시지 — 색+텍스트 병행)** / disabled / readonly |
| 토큰 | surface, border, danger, radius-md, control-h, type-body |
| 접근성 | label-input `htmlFor` 연결 필수, error는 `aria-invalid`+`aria-describedby`, placeholder를 label 대용 금지 |
| 금지 | UA appearance 의존(리셋 전제), 라벨 없는 필드, 인라인 스타일 보정 |

### 4.7 Select
| 항목 | 명세 |
|---|---|
| variant | `native`(모바일 기본 — OS 피커) / `custom`(admin — 검색·다중선택 지원 드롭다운) |
| 구조 | Input과 동일 셸 + 우측 셰브론(text-muted). custom 메뉴는 surface-raised+shadow-md, 옵션 행 높이=control-h-sm, 선택 항목 accent-soft |
| 상태 | Input과 동일 + open(셰브론 회전) |
| 접근성 | custom은 `role=listbox`/`aria-expanded`/키보드(↑↓·Enter·ESC·타이핑 점프) 완비 — 미완이면 native 강제 |
| 금지 | 모바일에서 custom 드롭다운(OS 피커 우선), div+onClick 유사 셀렉트 |

### 4.8 Tabs
| 항목 | 명세 |
|---|---|
| variant | `line`(하단 2px accent 인디케이터 — 페이지 상단) / `segmented`(surface-raised 트랙+선택 세그먼트 surface — 카드 내부 전환) |
| 상태 | 선택(text+accent 인디케이터)/비선택(text-muted)/disabled. 선택 상태는 URL 쿼리(`?tab=`)와 동기(계약 §5 통폐합 화면의 탭 딥링크 보장) |
| 토큰 | accent, text-muted, surface-raised, control-h-sm, type-body-strong |
| 접근성 | `role=tablist/tab/tabpanel`, 방향키 이동, 선택 `aria-selected` |
| 금지 | 탭 5개 초과(→Select 전환), 탭 내용 lazy 미처리로 인한 전체 리렌더 |

### 4.9 Toast
| 항목 | 명세 |
|---|---|
| variant | `success`/`error`/`info`/`warning` — surface-raised + 좌측 상태색 바 3px |
| 동작 | 상단 중앙(mobile)/우하단(admin) 스택 최대 3개, 자동 소멸 4s(error 6s), hover 시 일시정지, 액션 버튼 1개 옵션(실행취소 등) |
| 토큰 | surface-raised, shadow-md, 상태색, radius-md, type-body |
| 접근성 | `role=status`(success/info)·`role=alert`(error), 포커스 강탈 금지 |
| 금지 | **에러의 유일한 표면화 수단으로 사용 금지**(폼 에러는 Input error, 인증 에러는 에러 카드 — 01-auth §5.6), 4초 내 못 읽는 장문 |

### 4.10 EmptyState
| 항목 | 명세 |
|---|---|
| variant | `empty`(데이터 없음 — 아이콘+제목+설명+CTA 1개) / `error`(로드 실패 — danger 아이콘+[다시 시도]+보조 탈출구) / `no-result`(필터 결과 없음 — [필터 초기화]) |
| 규칙 | **리스트·테이블·위젯 등 모든 데이터 뷰에 필수**(공백 화면 금지 — as-is 규칙 승계). error variant는 01-auth 에러 표면화 3원칙의 표준 구현체 |
| 토큰 | text-muted, 상태색, space-6, type-h3/caption |
| 접근성 | 아이콘 `aria-hidden`, CTA는 Button 컴포넌트 |
| 금지 | "데이터가 없습니다" 무설명 단문(다음 행동 안내 필수), 스피너로 대체 |

### 4.11 Skeleton
| 항목 | 명세 |
|---|---|
| variant | `text`(줄) / `rect`(카드·이미지) / `circle`(아바타) / 조합 프리셋(list-row, stat-card) |
| 동작 | 배경 surface-raised, 1.4s 셔머(다크: 휘도 파동/라이트: 명도 파동). **표시 4s 초과 시 반드시 EmptyState(error)로 전이**(01-auth F-5 무한 스피너 금지와 동일 규약) |
| 토큰 | surface-raised, radius-sm~md |
| 접근성 | `aria-busy` 컨테이너, 스크린리더에 "불러오는 중" 1회 고지 |
| 금지 | 스피너 단독 사용(전면 로딩 지양 — 레이아웃 유지 스켈레톤 우선), 타임아웃 없는 스켈레톤 |

### 4.12 StatCard
| 항목 | 명세 |
|---|---|
| variant | `default`(라벨+값) / `trend`(전기 대비 ▲▼ — 증가=success·감소=danger, "감소가 좋은 지표"는 반전 prop) / `progress`(게이지 바 accent) |
| 구조 | 라벨(caption·muted) → 값(display·tabular-nums) → 보조(trend/게이지). Admin 대시보드·Coach KPI·User 퍼포먼스 허브 공용 |
| 상태 | loading(Skeleton stat-card 프리셋) / error(값 자리 "—"+재시도 아이콘) / 클릭형(상세 이동 — Card 클릭 규약) |
| 토큰 | surface, display 타이포, success/danger, accent |
| 접근성 | trend 화살표에 텍스트 대체("전주 대비 12% 증가"), 색+방향 병행 |
| 금지 | 값 HEX 강조색, 위젯별 자체 스탯 마크업(위젯 시스템도 이 컴포넌트 소비) |

---

## 5. as-is 3중 테마 → to-be 전환 매핑 표

| # | as-is (혼재 실태) | 사용처 | to-be | 비고 |
|---|---|---|---|---|
| 1 | `--app-accent: #D2691E` (.app-page 라이트 토큰) | apps/coach 전반 | `--bcl-accent`(#FF6A00) | 문서 표준(#ff6a00)과 코드가 달랐던 항목 — 브랜드 단일화 |
| 2 | `--primary: #FF6B00` (일부 라이트 화면) | apps 일부 | `--bcl-accent` | 1px 차이 오렌지 이형 제거 |
| 3 | `#FF6A00`/`#ff6a00` 하드코딩 | race 화면·차트·아이콘 | `var(--bcl-accent)` | HEX 리터럴 금지 + CI grep(§1) |
| 4 | 그라디언트 `#ff6a00→#ff8533` | 다크 히어로·버튼 | 폐지 → 단색 accent | 연출 예외는 Race 에셋만(15 문서) |
| 5 | `--app-accent-bg` **미정의 토큰 참조** | apps 선택 상태(버그) | `--bcl-accent-soft` | 미정의 참조 CI 가드(§3)로 재발 차단 |
| 6 | admin 수동 유틸리티(`.admin-filter-btn`/`.admin-search-input`/`.admin-action-btn`, globals.css 수제 클래스) | admin 전 화면 | Button(ghost/soft)·Input(search)·Button(primary) 컴포넌트 | 글로벌 클래스 강제 규약 자체를 폐지 — 컴포넌트가 규약 |
| 7 | admin 다크 배경 `#1a1a1a` 계열 직접 지정 | admin | `--bcl-bg`(dark=`#161616`) | 값은 토큰으로만 |
| 8 | glass `rgba(38,38,38,.8)+blur(10px)` 산재 | admin·class | `.bcl-glass` 유틸 1개(surface 기반) | TV 연출 한정 |
| 9 | `.app-page` 라이트 페이지 토큰 세트 | apps/coach | `data-theme="light"` 전환 | 페이지 클래스 → html 속성 |
| 10 | radius 8px 단일(문서) vs 화면별 임의값(실태) | 전 앱 | `--bcl-radius-sm/md/lg` 3단계 | |
| 11 | UA 기본 button 배경(흰 패널 버그) | 산발 | reset.css §3 | 구조적 차단 |
| 12 | Lexend + 폴백 불일치 | 전 앱 | `--bcl-font` 단일 스택 | 한글 폴백 Pretendard 명시 |
| 13 | 인라인 재구현 모달/시트/토스트 | 화면별 | §4 표준 12종만 | 재구현=반려 |

**이관 절차**: 재구축은 신규 작성이므로 "치환"이 아니라 **처음부터 to-be만 존재**한다.
위 표는 as-is 화면을 참고 구현할 때 옮겨오면 안 되는 패턴의 블랙리스트로 사용한다
(14-agent-workflow의 리뷰 에이전트 체크리스트 편입).

---

## 6. 앱별 적용 가이드 — 같은 토큰, 밀도만 변수

| 앱 | data-theme | data-density | 특기 사항 |
|---|---|---|---|
| Admin (`/admin`) | `dark` | `admin` | 고밀도: 테이블 row-h 36px, 페이지당 정보량 우선. 사이드바+상단 필터 바 패턴. 파괴적 행동(환불/삭제/거부) confirm Modal(sm) 의무. 커스텀 Select 허용 유일 영역 |
| User (`/apps`) | `light` | `mobile` | 하단탭 5. 모든 오버레이=BottomSheet(Modal 금지), 터치 타깃 44px, 1열 카드 흐름. iOS 확대 방지 리셋 적용 |
| Coach (`/coach`) | `light` | `mobile` | User와 동일 프로파일 — 현장 야외 사용 대비 대비(contrast) 상향: text-muted 대신 text 우선 사용 권장. 출결 액션 버튼은 size md 고정 |
| Class/TV (`/class`) | `dark` | `tv` | 3m 시청거리: font-scale 1.6, 최소 본문 24px. **인터랙션 없음 전제**(hover/focus 스타일 불필요, Modal·Toast 금지). Display-Safe(부상·메모·정산 비노출)는 데이터 규칙(04·05 문서), 여기선 대형 타이포·고대비만 담당. 60fps 연출은 rAF+DOM 직접(리렌더 우회) — 토큰은 CSS 변수로 그대로 소비 가능 |
| Kiosk (`/kiosk`) | `dark` | `mobile` | 입구 단말: mobile 밀도(터치)+다크(간판 성격). 단일 CTA 대형(Button md 스케일업 허용 — control-h×1.5 유틸), 5s 자동 복귀 화면은 EmptyState 변형 |
| Auth (`/auth`) | 진입 UA 선호 따름(`prefers-color-scheme`) | `mobile` | 단일 카드 중앙 정렬(max 420px), 어느 앱에서 와도 동일한 첫인상 — 브랜드 accent 1곳(로고+primary 버튼)만 |

**밀도 운영 규칙**
- 화면 코드에서 `data-density` 값을 읽어 분기하는 것 금지 — 필요한 차이는 전부 §2.5 변수
  추가로 해결(변수 추가는 이 문서 갱신 필수).
- 한 화면에 두 밀도 혼용 금지. 예외: Admin 내 TV 미리보기 iframe(격리 문서라 자연 격리).
- 다크/라이트 동시 지원 컴포넌트 검증: Storybook 대신 `/design/preview` 내부 라우트에
  12종 × 2테마 × 3밀도 매트릭스 페이지를 두고, 14-agent-workflow 리뷰 에이전트가
  스크린샷 대조(수동 QA 진입점 겸용) ⏳.

---

## 7. 준수 게이트 요약 (교차검수·CI)

1. 색 HEX·`--app-*`·`--primary` 리터럴: `tokens.css` 외 0건 (grep).
2. 사용된 `--bcl-*` 전부 두 테마에 정의 존재 (미정의 토큰 diff 스크립트).
3. `<button>`/`<input>` 원시 사용 화면 코드 0건 — ui/ 12종 경유만 (리뷰).
4. 신규 화면은 EmptyState(empty/error) 두 variant 구현 확인.
5. 스켈레톤·스피너에 4s 타임아웃+에러 전이 존재 (01-auth F-5 연동).
