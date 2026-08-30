# 05. Class 포털 — TV 대형 스크린 앱

> **성격**: 체육관 현장의 TV/프로젝터에 상시 표출되는 무인 디스플레이 앱. 조작 주체는 화면 앞 사람이 아니라 **코치 패드(원격)** 이거나 "없음(자동 순환)"이다.
> **근거 원자료**: `_source/contract.md`(IA·RPC·토큰), `_source/screens-inventory.md`(as-is 9화면), `_source/nonfunctional-history.md`(Display-Safe·성능 원칙), 실코드 `src/app/class/**`(9 page.tsx).
> **Race 3화면의 정밀 명세는 `15-race-system.md`가 SSOT** — 본 문서는 포털 관점 요약만 담는다.
> **상태 표기**: ✅ 운영 · 🟡 코드완료(검증 대기) · 🧪 mock · ⏳ 미구현(신규 설계) · 🔄 to-be 변경/통합

---

## 1. as-is → to-be 메뉴 대조표 (통폐합 근거)

| as-is (9화면 + 인덱스) | 상태 | to-be | 통폐합 근거 |
|---|---|---|---|
| `/class` (→timer 리다이렉트) | ✅ | `/class` → **screen-console 리다이렉트** 🔄 | 진입점을 통합 콘솔로 |
| `/class/wod` (WOD 보드) | ✅ | **`/class/screen-console` 의 `wod` 모드** 🔄 | 4화면 모두 "TV 1대에 무엇을 띄울까"의 배타적 선택지 — 별도 URL 4개는 TV에서 전환 불가능(입력장치 없음). 단일 앱 + 모드 전환(원격/자동)으로 통합 |
| `/class/live` (수업 현황) | ✅ | 〃 `live` 모드 🔄 | 〃 |
| `/class/timer` (4모드 타이머) | ✅ | 〃 `timer` 모드 🔄 (원격제어 ⏳→**설계 §4**) | 〃 |
| `/class/screen` (공개 보드, P24) | ✅ | 〃 `screen` 모드 🔄 | 〃 |
| `/class/race/view` (2.5D) | 🟡 | **유지** → 15 문서 ⑤-b 카트레이싱 재설계 🔄 | 레이스 이벤트 전용 — 상시 콘솔과 수명주기가 다름(이벤트 단위 진입/종료) |
| `/class/race/run` (ERG 그리드) | 🟡 | 유지 | 〃 |
| `/class/race/result` (결과) | 🟡 | 유지 | 〃 |
| `/class/rotation-hud` (서킷 HUD) | ✅ | 유지 | 세션 단위 진입(`?session=`), 코치 리모컨과 1:1 결합 — 독립 유지 |
| `/class/leaderboard` | ✅ | 유지 + **일일 WOD 화이트보드 표시 모드** ⏳(G-1, 16 문서) | 상시 콘솔과 달리 "이벤트 후 여운" 화면. 콘솔 `screen` 모드의 PR 티커와 역할 분담 |

**to-be 라우트 5개**: `screen-console`(4모드) / `race/view` / `race/run` / `race/result` / `rotation-hud` / `leaderboard`

---

## 2. TV 환경 공통 요구 (전 화면 강제)

| 항목 | 규칙 |
|---|---|
| **화면비** | 16:9 고정 설계(1920×1080 기준, 4K 스케일 대응 rem 기반). 세로/모바일 대응 불필요 — 반응형 분기 최소화 |
| **타이포** | 3m 시청거리 기준: 보조 텍스트 최소 32px, 핵심 수치 64px+, 타이머/시계 120px+. `tabular-nums` 필수(숫자 폭 고정). 폰트 `--bcl-font`(Lexend) |
| **성능** | CSR 강제. 시계·타이머·애니메이션은 **rAF + DOM 직접 조작**(React 리렌더 우회 — 현행 timer/screen의 ref 패턴 승계). 60fps 유지, `setInterval` 리렌더 금지. 20레인 Race 뷰 포함(15 문서 ⑤-b 성능 게이트) |
| **무인 내구성** | 24시간 연속 구동 전제: 메모리 누적 금지(구독 정리), 데이터 로드 실패 시 **직전 데이터 유지 + 우상단 소형 배지**(전체 화면 에러/무한 스피너 금지 — 인증 계약 §7 준용), 자동 재시도 백오프 |
| **번인 방지** | 상시 요소(시계 등) 60s 주기 1~2px 시프트, `screen` 모드 유휴 시 콘텐츠 로테이션 |
| **테마** | 다크 고정(`data-theme=dark`) + 밀도 프로파일 `data-density=tv`(12-design-system). 토큰 `--bcl-*`만 사용 |
| **미인증 접근** | §6 공개 접근 모델 — 로그인 없이 표출 가능해야 함(TV는 세션 유지 불가 전제) |
| **Display-Safe** | §5 — 민감 정보 비노출은 화면 코드가 아닌 **데이터 계층(RPC 화이트리스트)에서 강제** |

---

## 3. `/class/screen-console` — 통합 스크린 콘솔 🔄 (핵심 신규 설계)

### 3.1 구조
wod / live / timer / screen 4개 as-is 화면을 **모드 전환 단일 앱**으로 통합. URL 쿼리로 초기 모드 지정(`?mode=wod`), 이후 전환은 ① 원격 명령(§4) ② 로컬 숨김 컨트롤(모서리 롱탭 → 모드 시트, 설치 시에만 사용) ③ 자동 스케줄(옵션: 수업 중=live, 수업 없음=screen).

```
/class/screen-console?mode={wod|live|timer|screen}&facility={id}
  ├─ ConsoleShell: 공통 시계·상태 배지·모드 전환기·Realtime 명령 수신(§4)
  ├─ WodMode | LiveMode | TimerMode | ScreenMode  (전환 시 크로스페이드 400ms)
  └─ 데이터 계층: 모드별 로더 공유(같은 RPC 재사용 — wod 데이터는 wod/screen 모드 공용)
```

### 3.2 모드별 명세

#### `wod` 모드 — 오늘의 WOD 보드 (as-is `/class/wod` ✅ 승계)
| 항목 | 내용 |
|---|---|
| 목적 | 수업 전·중 회원이 벽면에서 오늘 WOD를 확인 |
| 기능 | 포맷 라벨(FOR TIME/AMRAP/EMOM/TABATA/CHIPPER/STRENGTH/CUSTOM/STATION CIRCUIT), 무브먼트 리스트(타겟·RX 중량 남/여), time cap·rounds, 코치 노트(공개 지정분만) |
| 데이터 | **`fn_get_class_display_wod(p_facility_id, p_date)`** — 표준 RPC 단일 소스(`session_wods.movements_snapshot` published만). `wods`/`sessions.wod_description` 폐지 경로 사용 금지 |
| 갱신 주기 | 60s 폴링(현행 승계) + 원격 `refresh` 명령 즉시 |
| Display-Safe | WOD 스냅샷은 본질적으로 공개 데이터 — 회원 개인정보 미포함. draft 상태 비노출(published만) |
| 상태 | ✅ → 🔄 콘솔 편입 |

#### `live` 모드 — 실시간 수업 현황 (as-is `/class/live` ✅ 승계)
| 항목 | 내용 |
|---|---|
| 목적 | 현재/다음 수업의 진행 정보와 출석 현황판 |
| 기능 | 현재 수업(제목·시간·담당 코치·정원 대비 체크인 수), 다음 수업 예고, 진행 경과 바 |
| 데이터 | 🔄 as-is의 `sessions`+`checkins` 직접 query를 **`fn_get_class_live_board(p_facility_id)`** 신설 RPC로 대체 — 공개 표면을 RPC 1점으로 좁힘(§6). 반환: 현재/다음 세션 + 집계 수치 + 체크인 회원 **이름만**(연락처·메모 등 원천 미포함) |
| 갱신 주기 | 30s 폴링(현행 승계) + `checkins` INSERT Realtime 구독 시 즉시 반영(체크인 순간 환영 토스트 연출) |
| Display-Safe | 회원 표시=이름(또는 닉네임 설정 시 닉네임)만. 예약자 명단 중 노쇼·위험 플래그 등 판정 정보 비노출 |
| 상태 | ✅ → 🔄 콘솔 편입 + RPC화 |

#### `timer` 모드 — 수업 타이머 (as-is `/class/timer` ✅ 승계 + 원격 ⏳→설계)
| 항목 | 내용 |
|---|---|
| 목적 | 코치가 원격으로 조작하는 초대형 수업 타이머 |
| 기능 | 4모드 승계: `countdown`(분 지정) / `countup` / `emom`(인터벌 초×라운드, 라운드 표시) / `tabata`(work/rest 페이즈 컬러 — work=success/rest=danger 토큰, 배경 전환). 3-2-1 비프음(WebAudio), 종료 알림음 |
| 데이터 | 로컬 상태 + **원격 명령(§4)이 유일한 외부 입력**. DB 불필요 |
| 갱신 주기 | rAF(초 단위 DOM 직접 갱신 — 현행 ref 패턴 승계) |
| Display-Safe | 해당 없음(개인 데이터 없음) |
| 상태 | 타이머 ✅ / **원격제어 ⏳ → 본 설계로 정식화(§4)**. as-is는 TV 앞에서 직접 클릭해야 했음(운영 불가 지점) — 콘솔 통합의 1차 동기 |

#### `flow` 모드 — 수업 진행 세그먼트 타임라인 ✅ (1차 스프린트 신설)
| 항목 | 내용 |
|---|---|
| 목적 | 수업 50분을 TV가 이끈다 — 세그먼트 체인(브리핑→웜업→본운동→쿨다운)을 코치 리모컨 "다음" 한 버튼으로 진행 |
| 기능 | 상단 세그먼트 스트립(진행 상태 칩+체크인 수) · 좌측 WOD 보드 · 우측 타이머(세그먼트 진입 시 바인딩 타이머 자동 configure+start, `preSeconds` READY 카운트다운) · 기록 세그먼트(`showBoard`)에서 좌측 하단 **라이브 화이트보드 스트립**(top 6, 20s 폴링) |
| 데이터 | 세그먼트 플랜 = **Broadcast `flow` 명령 수신만**(코치가 매 전환마다 전체 플랜+인덱스 재전송 — 멱등, TV 무상태). 플랜 영속 = `session_wods.segments` JSONB(코치 WodPanel 작성, 미설정 시 포맷 기반 자동 제안 `deriveFlowSegments`). 화이트보드 = 기존 `fn_get_class_wod_board`(anon) 재사용 — **신규 공개 표면 없음** |
| 갱신 주기 | WOD/체크인 60s 폴링 + 화이트보드 20s(showBoard 세그먼트만) + flow 명령 즉시 |
| Display-Safe | 화이트보드는 이름+점수+rx 배지만(기존 RPC 보장). 세그먼트 플랜은 타이머 구성만 |
| 제약 | TV 새로고침 시 flow 상태는 다음 코치 명령까지 유실(Broadcast 무상태) — 코치 패널 "다음/이전"이 전체 재전송이므로 즉시 복구 |

#### `screen` 모드 — 현장 공개 보드 (as-is `/class/screen` ✅ P24 승계)
| 항목 | 내용 |
|---|---|
| 목적 | 수업 외 시간·로비의 기본 화면(디폴트 모드). 시계+수업+WOD+PR 축하의 종합 대시보드 |
| 기능 | 대형 시계(rAF), 현재/다음 수업 카드, 오늘 WOD 요약, **PR 축하 티커**(최근 달성 순환 롤링), 공지 배너(옵션) |
| 데이터 | `fn_get_class_display_wod` + `fn_get_class_live_board`(live 모드와 공유) + 🔄 **`fn_get_class_screen_prs(p_facility_id, p_days)`** 신설(최근 PR: 회원 이름+달성 항목만 반환) |
| 갱신 주기 | 시계 rAF / 데이터 60s / PR 티커 8s 로테이션 |
| Display-Safe | **P24 규칙의 원형**: 부상·상담 메모·재등록 위험·정산·연락처 절대 비노출. PR 축하는 회원의 공개 동의 설정(`notification_preferences` 내 celebrate_opt_in 🔄) 존중 |
| 상태 | ✅ → 🔄 콘솔 편입 |

### 3.3 콘솔 공통 셸
- 우상단 상태 스트립: 현재 시각, 연결 상태(Realtime 구독 상태 도트), 시설명
- 모드 전환 크로스페이드 400ms — 전환 중에도 시계 연속성 유지
- 콘솔 인스턴스 식별: 최초 구동 시 `console_id`(UUID) 생성·localStorage 보존 → 원격제어 대상 지정에 사용(§4)

---

## 4. Broadcast 원격제어 프로토콜 🔄 (⏳ → 정식 설계)

> as-is에서 유일하게 원격제어가 구현된 rotation-hud의 `hud-sync:{session_id}` 패턴(✅ 검증됨)을 **콘솔 전체로 일반화**한다. DB 미경유 Supabase Realtime **Broadcast 전용**(상태 저장 불필요, Race 경로1과 동일 원칙).

### 4.1 채널·메시지 계약
- **채널**: `class-console:{facility_id}` — 시설 내 모든 콘솔이 구독. 특정 TV만 제어할 때는 메시지에 `target_console_id` 지정(생략=전체)
- **송신 주체**: 코치 앱(`/coach/schedule` 세션 보드 내 "스크린 제어" 시트 🔄) 및 Admin. 송신은 **인증 클라이언트만**(coach/admin role 검증 후 UI 노출) — 수신(TV)은 anon 구독
- **메시지 스키마** (정본 = `src/features/class-broadcast/contract.ts`):
```jsonc
{ "event": "console_cmd",
  "payload": {
    "cmd": "set_mode" | "timer" | "flow" | "refresh" | "identify" | "open_race",
    "target_console_id": null,               // null = 시설 전체
    "mode": "wod|live|timer|screen|split|flow", // cmd=set_mode
    "timer": {                               // cmd=timer (v2)
      "action": "configure|start|pause|reset",
      "mode": "countdown|countup|emom|tabata|interval",
      "seconds": 600, "capSeconds": 720,     // countup 자동 종료 캡
      "intervalSeconds": 60, "totalRounds": 10,
      "workSeconds": 20, "restSeconds": 10, "totalSets": 8,
      "preSeconds": 10                       // READY 3-2-1-GO 프리 카운트다운
    },
    "flow": {                                // cmd=flow — 수업 세그먼트 타임라인
      "action": "start|set|stop",
      "segments": [{ "name": "웜업", "timer": { /* TimerCommand */ }, "showBoard": false }],
      "index": 0, "session_id": "..."        // 화이트보드 조회 대상
    },
    "ts": 1780000000000, "sender": "coach"
  } }
```
- **동작 규칙**: `identify`=화면에 콘솔 ID 오버레이 5s(설치·페어링용) / 명령은 멱등(같은 configure 재수신 무해) / `ts` 기준 5s 초과 스테일 명령 무시(재접속 시 과거 명령 재생 방지)
- **보안 한계 명시**: Broadcast는 anon 발행이 기술적으로 가능 — 위험 표면은 "화면 모드가 바뀜" 수준(데이터 접근 아님)으로 수용. 단 채널명에 facility_id 포함 + 코치 UI에서만 발행 + 향후 Realtime Authorization(private channel) 도입 여지를 확장점으로 기록 ⏳

### 4.2 코치 측 제어 UI (04-coach-app 연동)
- 세션 보드 헤더 `[스크린]` 버튼 → BottomSheet: 모드 4버튼 + 타이머 프리셋(WOD의 format_type·time_cap에서 **자동 제안** — 예: AMRAP 12 → countdown 12:00, EMOM 10×60s → emom 설정) + `[화면 새로고침]` + `[화면 식별]`
- rotation-hud 리모컨(기존 `/coach/schedule/rotation`)은 그대로 유지 — 채널만 콘솔 프로토콜과 명칭 규약 통일(`hud-sync:{session_id}` 유지)

---

## 5. 유지 화면 명세

### 5.1 `/class/race/view` · `/class/race/run` · `/class/race/result` 🟡→🔄
> **정밀 명세 SSOT = `15-race-system.md` ⑤·⑤-b.** 포털 관점 요약:

| 화면 | 목적 | 데이터 | 갱신 | Display-Safe | 상태 |
|---|---|---|---|---|---|
| `race/view` | 2.5D 카트레이싱 관전(TV 메인) | Broadcast `race:{event_id}` 0.3s + `race_live_state` 복원 + `/api/race/live` 폴백 | rAF 60fps(LERP) | 이름·기록만(심박은 이벤트 설정으로 숨김 옵션 🔄) | 🟡→🔄 15⑤-b 재설계 |
| `race/run` | ERG 데이터 그리드(서브 스크린) | 〃 + `race_teams` 동적 매핑 | 〃 | 〃 | 🟡 |
| `race/result` | 종료 후 다각도 리더보드·포디움 | `race_records`(자동 적재) | 정적 + 정렬 축 전환 | PR 배지·기록만 | 🟡 |

- 진입: 코치 Control이 시작 시 표출 URL(`?event={id}`)을 안내(QR)하거나, 콘솔 원격 명령에 `open_race` 확장 ⏳(후순위 — Race 화면은 이벤트 수명 동안만 존재하므로 수동 진입 허용)

### 5.2 `/class/rotation-hud` ✅ 유지
| 항목 | 내용 |
|---|---|
| 목적 | 스테이션 서킷 수업의 6분할 HUD(스테이션별 과제·라운드·타이머) |
| 기능 | 팀/스테이션 배치 표시, 라운드·전환 카운트다운, 코치 리모컨 실시간 연동(시작/일시정지/라운드 전환) |
| 데이터 | `session_rotation_states`(초기 로드·복원 — **SELECT anon 의도적 공개**, 현행 유지) + Realtime `hud-sync:{session_id}` 명령 수신 |
| 갱신 주기 | 타이머 rAF(로컬 진행) + 명령 즉시 |
| Display-Safe | 팀 배정 이름만. 회원 판정·메모 없음 |
| 상태 | ✅ (원격제어가 이미 정식 동작하는 준거 구현 — §4의 원형) |

### 5.3 `/class/leaderboard` ✅ 유지 + 일일 WOD 화이트보드 모드 ⏳ (G-1·G-2, 16 문서)
| 항목 | 내용 |
|---|---|
| 목적 | 최근 Race/벤치마크 기록 랭킹 + **당일 WOD 디지털 화이트보드**의 상시 표출(이벤트 후 여운·동기부여) |
| 기능 | ① 최근 완료 이벤트 자동 선택, 기록 랭킹 ② 🔄 벤치마크 리더보드 탭 추가(`member_benchmark_results` 상위 — User 앱 퍼포먼스 허브와 동일 데이터의 TV 뷰) ③ ⏳ **일일 WOD 화이트보드 모드(G-1·G-2, 16 문서)**: 당일 세션 WOD의 전원 기록을 **Rx+ → Rx → Scaled 계층 정렬**(계층 내 score_type=time 오름차순/그 외 내림차순 — contract §4 단일 정렬 정의)로 표시, 각 행에 **rx 배지**(Rx+/Rx/Scaled) 표기. 당일 세션이 복수면 세션별 로테이션 |
| 데이터 | `race_events`(completed 최근) + `race_records`, 🔄 `fn_get_class_leaderboard(p_facility_id, p_scope)` 신설로 직접 query 대체(§6). ⏳ 화이트보드는 **동일 RPC의 `p_scope='daily_wod'` 확장**으로 조회 — 내부 소스는 `session_wod_results`(published 세션 WOD만)이며 정렬 규칙은 코치용 `fn_get_session_wod_whiteboard`(04 §3.2 (b-2))와 단일 정의를 공유. **anon 표면에 `fn_get_session_wod_whiteboard`를 직접 개방하지 않는다** — §6 화이트리스트 원칙상 공개용은 Display-Safe 필드만 SELECT하는 Class 공개 RPC(`fn_get_class_leaderboard` 확장)로만 표출 |
| 갱신 주기 | 5분 폴링(저빈도 충분). ⏳ 화이트보드 모드는 60s(수업 직후 기록 유입 반영) |
| Display-Safe | 이름·기록·PR/rx 배지만. 심박 등 생체 지표는 집계 랭킹에서 제외(개인 화면에서만). ⏳ 화이트보드: `session_wod_results.note`·부상 플래그·회원 메모·판정 정보는 **원천 미SELECT**(응답 필터링 방식 금지 — §6.2) |
| 상태 | ✅ → 🔄 RPC화 + ⏳ 일일 WOD 화이트보드 모드(G-1·G-2, 16 문서) |

---

## 6. 접근·보안 모델 — 미인증 공개 표면 (RLS 예외 화이트리스트)

> TV는 로그인 세션을 유지할 수 없다(무인·재부팅·키보드 없음). 따라서 Class 포털은 **비로그인(anon) 구동을 정식 경로**로 설계하되, 노출 표면을 아래 화이트리스트로 못박는다. **이 목록 외 anon 접근은 전면 차단이 기본값**(as-is `fix_anon_rls_exposure` 원칙 승계).

### 6.1 anon 허용 화이트리스트 (07-data-model·sql에 동일 반영)
| 표면 | 종류 | 허용 범위 | 근거 |
|---|---|---|---|
| `fn_get_class_display_wod` | RPC EXECUTE | published WOD 스냅샷만 | 현행 의도적 공개 승계 ✅ |
| `fn_get_class_live_board` 🔄 | RPC EXECUTE | 세션 메타+집계+체크인 이름만 | as-is의 `sessions`/`checkins` 테이블 직접 SELECT를 **회수**하고 RPC로 좁힘 |
| `fn_get_class_screen_prs` 🔄 | RPC EXECUTE | 공개 동의 회원의 이름+달성 항목 | screen 모드 PR 티커 |
| `fn_get_class_leaderboard` 🔄 | RPC EXECUTE | 이름+기록 랭킹. ⏳ `p_scope='daily_wod'` 확장: 이름+점수+rx_status 배지만 반환(`note`·플래그 미SELECT — G-1·G-2, 16 문서) | leaderboard(벤치마크·일일 WOD 화이트보드) |
| `session_rotation_states` | 테이블 SELECT | 전행(서킷 상태 — 민감정보 없음) | 현행 의도적 공개 승계 ✅ |
| `race_events`·`race_teams`·`race_live_state`·`race_records` | 테이블 SELECT | 🔄 anon SELECT 허용(이름·기록 수준) — Race TV 화면 미인증 구동 | as-is는 authenticated 한정이라 TV에 로그인 필요했음(운영 결함) → 공개로 전환. 쓰기는 종전대로 coach/admin/SRK |
| Realtime Broadcast 구독 | `race:{event_id}`, `class-console:{facility_id}`, `hud-sync:{session_id}` | 수신만 | Broadcast는 DB 비경유 |
| 시설 컨텍스트 | URL `?facility={id}` + localStorage 고정 | — | 콘솔 설치 시 1회 지정 |

### 6.2 강제 규칙
- **쓰기 0**: Class 포털은 어떤 테이블에도 INSERT/UPDATE/DELETE 하지 않는다(체크인 축하 등 모두 수신 전용)
- **Display-Safe는 데이터 계층에서**: 위 RPC들은 SECURITY DEFINER 내부에서 민감 컬럼을 SELECT 자체를 하지 않는다 — 화면 코드의 실수로 유출 불가능한 구조
- 신규 공개 표면 추가 시 본 표 갱신 + 보안 리뷰 필수(릴리즈 게이트 연동, 09-nonfunctional)

---

## 7. 수용 기준 (Class 포털 게이트 — 재구축 Phase 4)

| # | 시나리오 | 기준 |
|---|---|---|
| C-1 | 비로그인 TV에서 `screen-console` 4모드 전부 표출 | 로그인 화면·에러 없이 구동, 화이트리스트 외 데이터 요청 0건(네트워크 탭 검증) |
| C-2 | 코치 앱에서 모드 전환·타이머 원격 조작 | 명령→화면 반영 < 1s, 타 시설 콘솔 무반응 |
| C-3 | 타이머 4모드(EMOM 라운드·타바타 페이즈 컬러 포함) 정상 동작 | 비프음·페이즈 전환 정확, 60fps |
| C-4 | 네트워크 단절 30s → 복구 | 직전 데이터 유지+배지 표시, 복구 후 자동 재동기(스피너·크래시 없음) |
| C-5 | 24h 연속 구동 | 메모리 증가 없음(구독 누수 0), 번인 시프트 동작 |
| C-6 | Display-Safe 감사 | screen/live/leaderboard(일일 WOD 화이트보드 포함 ⏳) 표출 전 항목에 부상·메모(`session_wod_results.note` 포함)·위험·정산·연락처 부재 확인 |
| C-7 | Race 3화면 | 15-race-system §8 게이트(L1 항목 중 화면 관련: 2-4, 3-2, 3-5, 4-6)로 위임 |
| C-8 | rotation-hud 리모컨 연동 | 코치 조작→HUD 반영 < 1s, 새로고침 복원(`session_rotation_states`) |

---

## 부록 A. as-is 파일 맵
| to-be | as-is 소스 (승계 기반) |
|---|---|
| screen-console | `src/app/class/{wod,live,timer,screen}/page.tsx` 4파일 → 모드 컴포넌트로 재편, `src/app/class/page.tsx`(리다이렉트 대상 변경) |
| race 3화면 | `src/app/class/race/{view,run,result}/page.tsx` + `src/hooks/useRaceRealtime.ts`·`useRaceAnimator.ts` (15 문서) |
| rotation-hud | `src/app/class/rotation-hud/page.tsx` (거의 그대로 승계) |
| leaderboard | `src/app/class/leaderboard/page.tsx` (RPC화 리팩터) |
