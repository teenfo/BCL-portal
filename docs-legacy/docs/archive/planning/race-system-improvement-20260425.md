# BCL Portal – Race System Improvements 기획서

> **Status**: Approved
> **Author**: Agent (Architect 관점)
> **Created**: 2026-04-25
> **Last Updated**: 2026-04-25
> **Related**: `.docs/archive/audit/audit-race-system-20260425.md`

---

## 1. 개요 및 배경
### 1.1 목적
본 기획서는 2026-04-25 기준 진행된 Race 시스템 감사 결과(`.docs/archive/audit/audit-race-system-20260425.md`)를 바탕으로, 실장비 운영 수용 전 확인된 Major 결함(7건) 및 Minor 결함(3건)을 해결하여 Race 시스템을 실운영 가능한 상태(Acceptance Ready)로 끌어올리는 것을 목적으로 한다.

### 1.2 현재 상태 (As-Is)
- Race 시스템의 핵심 아키텍처, 데이터 모델, Python BLE 브리지, UI 컴포넌트, 시뮬레이터는 구현 완료 상태.
- 하지만 운영 관점에서 결과 마감 자동화, snapshot 정합성, 장비 상태(enum) 동기화, BLE 어댑터 다중화 지원, 팀전 데이터 연동 등이 미완성 상태.

### 1.3 핵심 제약 조건
- 기존 CSR 기반 아키텍처(Next.js)와 Python BLE 서버 구조를 유지.
- DB 스키마 수정은 하위 호환성을 유지하거나, 명확한 마이그레이션 SQL을 통해 수행.
- 실장비 연결 없이도 시뮬레이터/Replay 경로가 정상 동작하도록 보장해야 함.

---

## 2. 현재 문제 진단 (As-Is)

감사 결과 도출된 주요 문제점은 다음과 같다:

1. **[M-1] 결과 적재 자동화 미연결**: Race 종료 시 `race_recordings`는 저장되나, `race_records` 적재 파이프라인이 자동 호출되지 않음.
2. **[M-2] `race_live_state` snapshot 복원 정합성**: 클라이언트는 `device_serial`을 요구하나 DB 스키마는 `device_id`만 존재.
3. **[M-3] 장비 상태(enum) 조회 불일치**: DB의 `status` enum은 `online`/`offline`/`maintenance`이나, 프론트는 `active`로 필터링 중.
4. **[M-4] BLE adapter 전달 누락**: 다중 동글 환경을 위한 `adapter` 값이 Coach 화면의 connect 요청에서 누락됨.
5. **[M-5] 팀전 DB 연동 미완성**: Coach 화면에서 `team_id`가 null 처리되며, Class 뷰에서도 팀 정보를 DB에서 읽어오지 않음.
6. **[M-6] 시뮬레이터 snapshot 충돌**: 시뮬레이터가 `device_id: None`을 반환하여 NOT NULL 제약조건과 충돌.
7. **[M-7] Recorder Lane 매핑 불안정**: `_meta.json`에 `lane_assignments` 전체 메타가 저장되지 않아 재처리 시 매핑 유실 위험.
8. **[m-1 ~ m-3] Minor**: lint warning 잔존, 훅 의존성 경고, 문서상 운영 문구 불일치.

---

## 3. 개선 설계 (To-Be)

### 3.1 핵심 설계 원칙
- **End-to-End 결과 보장**: `stop` 이벤트 하나로 레코딩 종료와 결과(`race_records`) 적재가 원자적으로(Atomically) 완료되도록 파이프라인 통합.
- **Identity Source 단일화**: Snapshot 복원 및 Simulator 가상 장비의 식별자를 DB 스키마(`device_id`) 기준으로 명확히 통일.
- **운영 안정성 확보**: 다중 BLE 어댑터 지원 및 장비 상태 열거형(enum) 정합성 완벽 동기화.

### 3.2 개선된 데이터 흐름
```text
[Coach Race Control]
  ├─ 1. 장비 스캔 (status: online 기준)
  ├─ 2. 장비 연결 (adapter 정보 포함 전달)
  ├─ 3. 팀 배정 (race_teams 테이블 참조)
  └─ 4. 레이스 시작/종료 제어

[Python BLE Server]
  ├─ 1. 스캔/연결 시 adapter 기준 다중 동글 분산 처리
  ├─ 2. 레이스 진행 중 snapshot(device_id 기준) broadcast
  ├─ 3. 레이스 종료 (stop)
      ├─ recorder.stop() 호출
      ├─ _meta.json에 lane_assignments 전체 매핑 저장
      └─ `/api/recordings/{event_id}/load-results` 자동 트리거 (M-1 해결)

[Class Live / Result View]
  ├─ Live: race_live_state 및 race_teams(팀 이름/색상) 실시간 반영
  └─ Result: 자동 적재된 race_records를 기반으로 실시간 결과 렌더링
```

---

## 4. 데이터베이스 변경 (필요 시)
### 4.1 마이그레이션 SQL
- **[M-2] 대응**: 필요 시 `race_live_state` 테이블에 `device_serial` 컬럼 추가 또는 클라이언트 로직을 `device_id` 기준으로 변경.
- **[M-6] 대응**: Simulator 용 `device_id` 전략 확정. (`pm5_devices` synthetic 레코드 매핑 또는 simulator 전용 snapshot write 경로로 처리 권장)

### 4.2 RLS 정책
- 기존 `race_records`, `race_teams`, `race_live_state`의 RLS 정책은 정상 작동하므로 변경 없음.

---

## 5. UI 변경 상세

- **Coach Control (`src/app/coach/race/control/page.tsx`)**:
  - 장비 목록 조회 시 `status === 'online'` 필터 적용.
  - BLE 스캔 결과의 `adapter`를 Connect/Setup 요청 Payload에 포함.
  - 팀 배정을 위해 `race_teams` 데이터를 불러오고 선택할 수 있는 UI 요소 추가.
- **Class Run/View (`src/app/class/race/run/page.tsx`)**:
  - 팀 색상 및 팀명을 하드코딩 대신 DB(`race_teams`)에서 동적으로 매핑하여 렌더링.

---

## 6. 영향 범위 분석
| 파일/모듈 | 변경 내용 | 변경 필요 여부 |
|:---|:---|:---:|
| `race/main.py` | `stop` 로직 내 자동 결과 적재, `adapter` 파라미터 수용 | O |
| `race/recorder.py` | `_meta.json`에 `lane_assignments` 전체 기록 | O |
| `race/simulator.py` | `device_id` 전략 적용 (`synthetic pm5_devices` 또는 simulator 전용 snapshot write) | O |
| `src/hooks/useRaceRealtime.ts` | snapshot 복원을 `device_id` 기준으로 수정, lint 정리 | O |
| `src/app/coach/race/control/page.tsx` | `status` 필터 수정, `adapter` 전달, `race_teams` 연동 | O |
| `src/app/class/race/run/page.tsx` | 하드코딩된 팀 정보 제거 및 DB 매핑 | O |

---

## 7. 보안 고려사항
- 결과 자동 적재 엔드포인트 호출 시, Python 서버가 Supabase Admin Key(Service Role)를 안전하게 사용하여 적재를 수행하도록 기존 로직 재확인.
- 클라이언트에는 철저히 `anon` 키 기반의 읽기(결과 조회) 권한만 부여.

---

## 8. 구현 단계 및 관점 배분

### Phase 1: DB 정합성 및 Backend 파이프라인 (M-1, M-6, M-7)
- **담당 관점**: 💎 Senior Dev
- **작업 내용**:
  1. `race/main.py`의 `stop` 액션에서 결과 자동 적재(`load-results`) 로직 트리거 연결.
  2. `race/recorder.py`에서 `_meta.json` 저장 시 `lane_assignments` 전체 메타데이터 포함.
  3. `race/simulator.py`에서 `device_id` NULL 문제를 해결할 수 있는 전략 확정. (`pm5_devices` synthetic 레코드 매핑 또는 simulator 전용 snapshot write)

### Phase 2: Frontend Data 정합성 및 팀전 연동 (M-2, M-3, M-4, M-5)
- **담당 관점**: 💻 Developer
- **작업 내용**:
  1. `Coach Race Control`에서 장비 조회 필터를 `status = 'active'`에서 `status = 'online'`으로 수정.
  2. BLE Connect 요청 시 프론트엔드에서 `adapter` 정보를 Payload에 포함시켜 전송.
  3. `useRaceRealtime.ts`의 snapshot 복원 기준을 `device_serial`에서 DB 기준인 `device_id`로 변경.
  4. Coach Control 및 Class UI에 `race_teams` (팀 이름, 색상) 연동 처리.

### Phase 3: 품질 최적화 및 문서 동기화 (m-1, m-2, m-3)
- **담당 관점**: 🏛️ Architect / 💻 Developer
- **작업 내용**:
  1. `src/hooks/useRaceRealtime.ts`, `useRaceAnimator.ts` 등 Race 도메인 내 lint warning(의존성, 초기화 경고) 해결.
  2. `README.md`, blueprint, sitemap 문서 내 Race 시스템 상태를 "코드 완료 / acceptance 미완료"로 통일.

### Phase 4: 운영 수용 재검증
- **담당 관점**: ⚡ Specialist
- **작업 내용**:
  1. `.docs/testing/race-acceptance-checklist.md` 기준 L1~L4 재실행
  2. 결과 적재, reconnect, simulator, team race, cleanup 시나리오 재검증

---

## 9. 블루프린트 등록용 체크리스트
- [ ] (P1) Race 종료(`stop`) 시 `race_records` 적재 자동화 로직 통합
- [ ] (P1) `pm5_devices` 상태 필터(`online`) 및 `adapter` 정보 전달 정합성 확보
- [ ] (P1) `race_live_state` snapshot 복원 식별자(`device_id`) 통일 및 시뮬레이터 `device_id` 전략 확정
- [ ] (P2) Coach/Class 화면 팀전 데이터(`race_teams`) 연동
- [ ] (P2) Recorder 메타데이터(`lane_assignments`) 완전 저장
- [ ] (P3) Race 관련 프론트엔드 훅 Lint 경고 해결 및 문서 상태 갱신
- [ ] (P3) Race acceptance checklist 기준 운영 수용 재검증

---

## 10. 테스트 시나리오
- **정상 흐름 1 (전체 사이클)**: Coach 화면에서 `online` 장비를 어댑터와 함께 스캔/연결하고, 레이스 시작 후 `stop` 시 결과 페이지에 자동으로 데이터가 표시되는지 확인.
- **정상 흐름 2 (팀전)**: 팀이 배정된 레이스에서 Class View 화면에 올바른 팀 이름과 색상이 표시되는지 확인.
- **정상 흐름 3 (시뮬레이터)**: 시뮬레이터 구동 시 가상 `device_id`로 snapshot 에러 없이 정상 진행 및 완료되는지 확인.
- **예외 흐름 1 (Snapshot 복원)**: 레이스 도중 브라우저를 새로고침해도 `device_id`를 통해 기존 레인 할당이 정상 복원되는지 확인.
- **예외 흐름 2**: DB 연동이 누락된 상태에서 팀 배정을 시도할 경우 우아한 실패(Graceful Degradation) 또는 오류 처리 작동 확인.

---

## 11. 리스크 및 완화
- **리스크**: Python 서버와 프론트엔드 간의 인터페이스 변경 시 일시적 통신 오류 발생 가능.
- **완화**: Python 서버(`race/`) 변경 사항을 먼저 반영 후 재기동(`run_simulator.sh`)한 뒤 프론트엔드 연동 테스트 수행.

---

## 12. Planning Log (기획 진행 기록)
### Session 1 — 2026-04-25
- **작성 범위**: 전체 섹션 작성 완료
- **상태**: Approved
- **TODO**: `/plan-to-blueprint` 워크플로우를 통해 블루프린트에 등록 후 개발 진행.

---
**문서 버전**: 1.0.0
**최종 업데이트**: 2026-04-25
