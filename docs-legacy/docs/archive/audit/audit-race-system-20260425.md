# Audit Report: BCL Portal Race System (Concept2/PM5 BLE)

**Status**: 🟡 CONDITIONAL  
**Date**: 2026-04-25  
**Target**: Race 시스템 전체 파이프라인  
**Auditor**: Codex (GPT-5) — 저장소 정적 점검 및 명령 검증  

---

## 1. 감사 개요

본 감사는 `Concept2/PM5 BLE 기반 ERG Race 시스템`의 현재 구현 상태와 운영 투입 준비도를 점검하기 위해 수행되었다. 대상 범위는 단순 UI 존재 여부가 아니라, 아래 전체 파이프라인의 연결 상태를 기준으로 평가했다.

`PM5 BLE → Python Race Server → Supabase Snapshot/Broadcast → Coach Race Control → Class Live/2.5D View → Result 적재`

이번 점검 결과, Race 시스템은 이미 프로토타입 단계를 넘어선 **중후반 구현 상태**이며, 데이터 모델, Python BLE 브리지, 코치 제어 화면, 클래스 관전 화면, 시뮬레이터까지 폭넓게 구현되어 있다. 다만 **종료 후 결과 적재 자동화**, **snapshot 복원 정합성**, **실장비 BLE 운영 수용 기준**, **팀전 실제 연동**이 아직 완결되지 않아, 현재 상태를 곧바로 실운영 준비 완료로 판단하기는 어렵다.

한 줄 결론은 다음과 같다.

> **Race 시스템은 코드 완료에 가까우나, 현장 수용과 운영 기준선 정비 전 단계다.**

---

## 2. 점검 범위 및 방법

### 점검 범위

- **문서 기준선**
  - `README.md`
  - `.docs/project-blueprint.md`
  - `.docs/archive/planning/race-system.md`
  - `.docs/archive/audit/*.md`
- **코드 범위**
  - `race/*`
  - `src/app/coach/race/*`
  - `src/app/class/race/*`
  - `src/hooks/useRaceRealtime.ts`
  - `src/hooks/useRaceAnimator.ts`
  - `supabase/migrations/20260217203700_create_race_system.sql`
  - `supabase/migrations/20260221084721_race_system_enhancement.sql`

### 점검 방법

- 문서와 코드의 상태 표기 일치 여부 확인
- Race 파이프라인의 단계별 연결 여부 정적 분석
- DB 스키마와 클라이언트/서버 응답 shape 정합성 대조
- Race 관련 검증 명령 실행
  - `npm run typecheck`
  - `npm run build`
  - `python3 -m compileall race`
  - `npm run lint`

### 한계

- 본 감사는 **저장소와 로컬 검증 결과 기반의 정적 감사**다.
- 실제 `Concept2 PM5` 장비를 연결한 현장 BLE 수용 테스트는 수행하지 않았다.
- 따라서 본 문서의 운영 준비도 평가는 **실장비 acceptance 미완료**를 전제로 한다.

---

## 3. 종합 판단

| 항목 | 판단 |
|:---|:---|
| 저장소 기준 구현 완성도 | **75~85%** |
| 실장비 운영 준비도 | **50~60%** |
| 현재 단계 정의 | **코드 완료에 가까우나 현장 수용 전** |

### 종합 해석

- Race 시스템은 DB, Python 서버, 프론트엔드 3개 축이 모두 존재한다.
- `Coach Race Control`, `Class Race Run`, `Class Race View`, `Class Race Result`, `Simulator/Replay`까지 구현 범위는 충분하다.
- `npm run typecheck`, `npm run build`, `python3 -m compileall race`가 모두 통과하므로, 저장소는 기본적인 빌드 가능 상태를 유지하고 있다.
- 반면, 실제 운영 관점에서는 `결과 적재 자동화`, `reconnect/snapshot 정합성`, `status enum 일치`, `BLE adapter 경로`, `팀전 DB 연동`이 아직 미완결이다.
- 따라서 현재 상태는 **demo/simulator 운용은 가능하지만, 실장비 운영 투입 전 acceptance checklist가 반드시 필요한 상태**로 판단한다.

---

## 4. 서브시스템별 구현 현황

| 서브시스템 | 상태 | 구현 수준 | 핵심 소견 |
|:---|:---:|:---:|:---|
| DB 스키마 | 🟢 | 높음 | `pm5_devices`, `race_live_state`, `race_recordings`, `race_teams`, `race_events/race_records` 확장까지 반영됨 |
| Python BLE 서버 | 🟢 | 높음 | PM5 스캔, 연결, 알림 구독, JSONL 레코딩, Supabase snapshot/broadcast까지 구현됨 |
| Coach Race Control | 🟡 | 중상 | 이벤트 선택, BLE 스캔/연결, 레인 배정, countdown/start/stop/reset UI 존재. 다만 status enum과 adapter 전달 경로 불일치 |
| Class Live / 2.5D View | 🟢 | 중상 | `run`과 `view` 화면 모두 구현됨. `useRaceRealtime`, `useRaceAnimator` 기반 실시간 렌더링 구조 존재 |
| Result 적재 파이프라인 | 🟡 | 중간 | `race_recordings` 저장은 구현됐으나 `race_records` 자동 적재가 파이프라인에 연결되지 않음 |
| Simulator / Replay | 🟡 | 중상 | 개발/데모용으로 충분히 유용하나 `device_id` NULL과 snapshot 스키마 정합성 이슈 존재 |
| 품질 게이트 | 🟡 | 중간 | `typecheck/build/compileall`은 통과. `lint`는 93 warnings로 유지보수 경고 잔존 |

### 구현 확인 근거

- **DB 스키마**: `supabase/migrations/20260217203700_create_race_system.sql`, `supabase/migrations/20260221084721_race_system_enhancement.sql`
- **Python BLE 서버**: `race/main.py`, `race/pm5_manager.py`, `race/pm5_parsers.py`, `race/recorder.py`, `race/pm5_spec.py`
- **Coach UI**: `src/app/coach/race/control/page.tsx`
- **Class UI**: `src/app/class/race/run/page.tsx`, `src/app/class/race/view/page.tsx`, `src/app/class/race/result/page.tsx`
- **Realtime/HUD**: `src/hooks/useRaceRealtime.ts`, `src/hooks/useRaceAnimator.ts`
- **Simulator/Replay**: `race/simulator.py`, `race/main.py`

---

## 5. 발견 사항

### 🔴 Critical

**발견 사항 없음**

보안 또는 데이터 무결성을 즉시 훼손하는 수준의 치명적 결함은 이번 범위에서 확인되지 않았다. 다만 아래 Major 항목들은 운영 투입 전 해소되어야 한다.

---

### 🟡 Major

#### [M-1] 결과 적재 자동화 미연결

- **현상**
  - 레이스 종료 시 `race_recordings` 메타데이터는 저장되지만, 최종 결과 테이블인 `race_records` 적재는 자동으로 이어지지 않는다.
  - 결과 적재 endpoint는 별도로 존재하지만, 저장소 내부에서 이 endpoint를 호출하는 흐름이 연결되어 있지 않다.
  - 결과 화면은 `race_records`만 읽기 때문에 종료 직후 결과가 비어 있을 수 있다.
- **영향**
  - 운영자가 Race를 정상 종료해도 결과 보드가 자동으로 채워지지 않을 수 있다.
  - 실운영 시 “경기는 끝났는데 결과가 안 보이는” 현장 혼선이 발생할 수 있다.
- **근거 파일**
  - `race/main.py:417`
  - `race/main.py:546`
  - `src/app/class/race/result/page.tsx:70`
- **권고 조치**
  - `stop` 처리 직후 `load-results`에 해당하는 결과 적재 로직을 자동으로 호출하도록 파이프라인을 연결한다.
  - 또는 `stop` 자체가 recording 종료와 summary 적재까지 책임지도록 서버 책임을 일원화한다.

#### [M-2] `race_live_state` snapshot 복원 필드 불일치

- **현상**
  - `useRaceRealtime`의 snapshot 복원 로직은 `row.device_serial`을 기대하지만, `race_live_state` 테이블에는 해당 컬럼이 없다.
  - 현재 스키마는 `device_id`만 보장한다.
- **영향**
  - 재접속 복원 시 lane identity가 비어 있거나, 복원 데이터가 정확히 매핑되지 않을 수 있다.
  - Race 중 브라우저 새로고침/재진입 상황에서 복원 신뢰도가 떨어진다.
- **근거 파일**
  - `src/hooks/useRaceRealtime.ts:225`
  - `src/hooks/useRaceRealtime.ts:233`
  - `supabase/migrations/20260221084721_race_system_enhancement.sql:41`
- **권고 조치**
  - snapshot 복원 로직을 `device_id` 기준으로 바꾸거나, 필요한 경우 `device_serial`을 snapshot 테이블에 추가한다.
  - 클라이언트와 스키마 중 하나를 기준으로 identity source를 단일화해야 한다.

#### [M-3] Coach 제어 화면의 `pm5_devices.status = 'active'` 조회 불일치

- **현상**
  - Coach Race Control은 장비 로딩 시 `pm5_devices.status = 'active'`만 조회한다.
  - 그러나 `pm5_devices` 스키마의 허용 status는 `online`, `offline`, `maintenance`다.
- **영향**
  - 실제 등록된 장비가 Coach 화면에 표시되지 않을 수 있다.
  - 레이스 운영 준비 단계에서 장비가 “없는 것처럼” 보이는 UI 장애가 발생할 수 있다.
- **근거 파일**
  - `src/app/coach/race/control/page.tsx:108`
  - `supabase/migrations/20260217203700_create_race_system.sql:47`
- **권고 조치**
  - 조회 조건을 실제 enum과 일치시키고, 운영 기준상 사용 가능한 장비 조건을 `online` 중심으로 재정의한다.
  - Admin/Coach에서 같은 status vocabulary를 사용하도록 통일한다.

#### [M-4] BLE adapter 전달 경로 미완성

- **현상**
  - Python 서버의 API 모델은 `adapter`를 받을 수 있고, BLE 스캔 결과도 `adapter`를 반환한다.
  - 하지만 Coach Race Control의 실제 connect 요청은 `address`, `serial`만 보내며 `adapter`를 전달하지 않는다.
- **영향**
  - 다중 동글 환경에서 의도한 adapter 분산 연결 정책이 프론트에서 끝까지 이어지지 않는다.
  - 1개 이상 BLE adapter를 사용하는 실장비 운영 시 확장성과 안정성이 약해질 수 있다.
- **근거 파일**
  - `race/main.py:247`
  - `race/pm5_manager.py:113`
  - `src/app/coach/race/control/page.tsx:153`
- **권고 조치**
  - 프론트가 scan 결과의 `adapter`를 그대로 connect 요청에 전달하도록 수정한다.
  - 또는 서버가 connect 시 자동 adapter selection을 책임지는 정책으로 정리하고 프론트는 adapter 개념을 숨긴다.

#### [M-5] 팀전 DB 연동 미완성

- **현상**
  - 팀전 테이블과 타입은 존재하지만, 실제 Coach 제어 화면에서 `team_id`는 기본적으로 `null`로만 들어간다.
  - 실시간 팀 보드도 `race_teams`를 조회하지 않고 `team_id`를 팀 이름처럼 사용하며 색상도 하드코딩한다.
- **영향**
  - 팀전 UI는 표면상 존재하지만 실데이터 기반 운영 기능으로 보기 어렵다.
  - 팀 이름, 팀 색상, 팀 구성원 관리가 운영자 관점에서 완성되지 않았다.
- **근거 파일**
  - `src/app/coach/race/control/page.tsx:165`
  - `src/hooks/useRaceRealtime.ts:188`
  - `src/app/class/race/run/page.tsx:110`
  - `supabase/migrations/20260221084721_race_system_enhancement.sql:26`
- **권고 조치**
  - Coach 제어 화면에 팀 생성/배정 UI를 추가하고 `race_teams`와 실제 연동한다.
  - Class 뷰는 `race_teams`의 `team_name`, `team_color`를 읽도록 데이터 enrichment를 추가한다.

#### [M-6] 시뮬레이터의 `device_id` NULL과 snapshot 스키마 충돌

- **현상**
  - 시뮬레이터가 생성하는 lane assignment에는 `device_id: None`이 들어간다.
  - 그런데 `race_live_state.device_id`는 NOT NULL이며, snapshot UPSERT는 `lane_info.device_id`를 그대로 사용한다.
- **영향**
  - simulator/replay 모드에서 snapshot 적재가 실패하거나, 복원 경로가 불안정해질 수 있다.
  - 즉, 시뮬레이터는 존재하지만 snapshot 기반 운영 검증까지 완전하게 커버하지 못한다.
- **근거 파일**
  - `race/simulator.py:214`
  - `race/main.py:147`
  - `supabase/migrations/20260221084721_race_system_enhancement.sql:41`
- **권고 조치**
  - simulator 전용 synthetic `pm5_devices` 레코드를 생성하거나, simulator 모드에서 snapshot write를 별도 처리한다.
  - 실장비 경로와 simulator 경로의 identity 전략을 분리 정리할 필요가 있다.

#### [M-7] recorder meta와 결과 적재 시점의 lane/member 매핑 불안정

- **현상**
  - Race setup 시 recorder는 `req.meta`만 받고 lane assignment 전체를 저장하지 않는다.
  - 결과 적재 로직은 `_meta.json`에 lane meta가 있다고 가정하는 주석이 있으나, 실제로는 저장된 흔적이 없다.
  - 이후 결과 적재는 `race_session.lane_assignments`에 의존하는데, 세션 reset 이후에는 매핑이 유실될 수 있다.
- **영향**
  - 레이스 종료 후 즉시가 아닌 나중에 결과 적재를 수행할 경우, member/lane/team 매핑 정확도가 떨어질 수 있다.
  - 장기적으로 recording 재처리와 사후 분석 기능의 신뢰성을 해친다.
- **근거 파일**
  - `race/main.py:336`
  - `race/recorder.py:100`
  - `race/main.py:561`
- **권고 조치**
  - recorder `_meta.json`에 lane assignment 전체를 저장한다.
  - 결과 적재 로직은 런타임 세션 상태가 아닌 recording 메타를 단일 source of truth로 사용하도록 바꾼다.

---

### 🟢 Minor

#### [m-1] Race 관련 lint warning 잔존

- **현상**
  - `npm run lint`는 에러 없이 종료되지만 전체 93건의 warning이 남아 있다.
  - 이 중 Race 관련 경고가 일부 포함되어 있다.
- **영향**
  - 기능 자체를 막지는 않지만, 코드베이스 유지보수성과 품질 기준선 신뢰도를 낮춘다.
- **근거 파일**
  - `src/hooks/useRaceRealtime.ts`
  - `src/hooks/useRaceAnimator.ts`
  - `src/app/coach/race/control/page.tsx`
- **권고 조치**
  - Race 도메인 우선으로 warning을 줄여 품질 기준선을 정리한다.

#### [m-2] Race 훅/애니메이션 유지보수 경고

- **현상**
  - `useRaceRealtime`에는 effect 내 state 갱신 관련 경고가 남아 있다.
  - `useRaceAnimator`에는 선언 전 참조 경고가 남아 있다.
  - `CoachRaceControlPage`에는 ref cleanup 관련 경고가 있다.
- **영향**
  - 현재 동작과 별개로, 장기적으로 Race 로직 디버깅과 리팩터링 비용을 키운다.
- **근거 파일**
  - `src/hooks/useRaceRealtime.ts`
  - `src/hooks/useRaceAnimator.ts`
  - `src/app/coach/race/control/page.tsx`
- **권고 조치**
  - 실시간 훅과 애니메이션 훅을 우선 정리해 Race 영역을 안정화한다.

#### [m-3] 문서와 구현 간 운영 문구 차이

- **현상**
  - README는 Race를 `코드 완료, 현장 검증 필요`로 설명한다.
  - 블루프린트에는 별도로 Race 운영 수용 기준 수립이 미완료 항목으로 남아 있다.
- **영향**
  - 기술팀과 운영팀이 Race 상태를 다르게 해석할 수 있다.
  - “개발 완료”와 “운영 수용 완료”를 혼동할 여지가 있다.
- **근거 파일**
  - `README.md:21`
  - `.docs/project-blueprint.md:430`
- **권고 조치**
  - Race 상태를 문서 전반에서 `코드 완료 / acceptance 미완료`로 동일하게 표현한다.
  - 운영 체크리스트 완료 전에는 release note에서도 동일 문구를 유지한다.

---

## 6. 검증 결과

| 검증 항목 | 실행 명령 | 결과 | 비고 |
|:---|:---|:---:|:---|
| TypeScript 타입 검증 | `npm run typecheck` | ✅ PASS | Race 포함 전체 TS 타입 체크 통과 |
| Next.js 프로덕션 빌드 | `npm run build` | ✅ PASS | Race 관련 `/coach/race/*`, `/class/race/*` 라우트 포함 빌드 성공 |
| Python 문법 컴파일 | `python3 -m compileall race` | ✅ PASS | `race` 하위 Python 모듈 전체 컴파일 성공 |
| ESLint 점검 | `npm run lint` | ⚠️ PASS with warnings | 총 `93 warnings`, `0 errors` |

### 검증 해석

- 현재 저장소는 **빌드 가능한 상태**다.
- 다만 lint warning이 적지 않기 때문에, Race를 포함한 실시간 영역은 **운영 안정화 스프린트**가 남아 있다고 보는 편이 적절하다.
- 실장비 BLE 연결 검증은 이번 감사 범위에 포함되지 않았으므로, 최종 운영 승인 근거로는 부족하다.

---

## 7. 우선 조치 권고안

### P0

- 종료 후 `race_records` 적재를 자동화해 결과 화면까지 즉시 이어지게 만든다.
- `pm5_devices.status` 조회 조건을 실제 enum 값과 정합하게 수정한다.
- `race_live_state` snapshot 복원 로직을 실제 스키마 기준으로 정리한다.

### P1

- BLE adapter 전달/선택 정책을 명확히 정해 프론트-서버 간 경로를 완결한다.
- 팀전 UI와 `race_teams` 실제 연동을 구현한다.
- simulator/replay 모드와 snapshot 스키마의 `device_id` 정합성을 정리한다.

### P2

- Race 관련 lint warning을 우선 정리한다.
- 실장비 acceptance checklist를 문서화한다.
- 문서 전반의 Race 운영 문구를 `코드 완료 / acceptance 미완료`로 통일한다.

---

## 8. 결론

2026-04-25 기준 BCL Portal의 Race 시스템은 이미 **핵심 아키텍처와 화면, 데이터 모델, Python BLE 브리지, 시뮬레이터**까지 구축된 상태다. 즉, “개발 시작 전”도 아니고 “일부 UI만 존재하는 상태”도 아니다. 저장소 기준으로는 충분히 진척된 구현이 맞다.

그러나 운영 관점에서는 **결과 마감 처리, reconnect/snapshot 정합성, 실장비 BLE acceptance, 팀전 완성도**가 아직 미완결이다. 따라서 현재 Race 시스템은 **simulator/demo 용도로는 유의미하게 활용 가능하지만, 실장비 운영 투입 전 추가 acceptance가 필요한 상태**로 판단한다.

**Release Recommendation**: `Conditional release readiness — simulator/demo 가능, 실장비 운영 투입 전 acceptance 필요`
