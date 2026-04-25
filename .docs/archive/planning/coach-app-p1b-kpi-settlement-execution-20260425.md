# BCL Portal – 코치앱 P1-B KPI/예상 정산 실행 명세서

> **Status**: Draft  
> **Author**: Codex (Execution Spec)  
> **Created**: 2026-04-25  
> **Last Updated**: 2026-04-25  
> **Superseded By**: `.docs/archive/planning/coach-app-master-plan-20260425.md`
> **Related**:
> - `.docs/archive/planning/coach-app-benchmark-and-improvement-20260425.md`
> - `.docs/archive/planning/coach-app-p0-execution-20260425.md`
> - `.docs/archive/planning/coach-feature-enhancement.md`
> - `.docs/project-blueprint.md`
> - `src/app/admin/operations/coaches/page.tsx`
> - `src/app/coach/profile/page.tsx`
> - `supabase/migrations/20260221000000_coach_feature_enhancement.sql`

---

## 1. 목적

본 문서는 `Priority 24: 코치앱 P1-B KPI/정산/스크린 모드` 중에서
가장 먼저 고정되어야 하는 **예상 정산 / 확정 정산 / KPI 집계 구조**를 실행 명세 수준으로 정의한다.

핵심 목표는 3가지다.

1. Admin과 Coach가 **같은 계산 원천**을 사용하게 만든다.
2. `예상 정산`과 `확정 정산`의 의미를 분리한다.
3. Coach 화면이 Admin 정산 운영 기능과 중복되지 않도록 한다.

이 문서는 Screen Mode 전체 설계가 아니라, `Priority 24`의 데이터 계약과 역할 분리를 먼저 고정하는 문서다.

---

## 2. 현재 상태 요약

현재 정산 기능은 아래처럼 동작한다.

- Admin은 `coaches.base_salary`, `coaches.session_allowance`를 관리한다.
- Admin은 `fn_calculate_monthly_settlement`를 실행해 `coach_settlements`를 생성/업데이트한다.
- Admin은 `coach_settlements.status`를 `pending / confirmed / paid`로 변경한다.
- Coach는 `coach_settlements`를 본인 기준으로 조회만 한다.

즉, 현재 구조는 이미 `확정 정산 스냅샷` 중심으로는 돌아간다.  
하지만 `예상 정산`과 `월간 KPI`는 아직 정의가 부족하다.

특히 아래가 문제다.

1. Coach 앱에서 보여줄 `예상 정산`의 계산 기준이 아직 문서화되어 있지 않다.
2. Admin/Coach가 다른 계산식을 쓰면 숫자가 달라질 수 있다.
3. 현재 `fn_calculate_monthly_settlement`는 월 범위만 보고 수업 수를 계산하므로,
   향후 `cancelled` 세션이나 예외 규칙이 들어오면 Admin/Coach가 같이 깨질 수 있다.

---

## 3. 핵심 원칙

### 3.1 `coach_settlements`는 확정 정산 스냅샷이다

`coach_settlements`는 아래 용도로만 쓴다.

- 특정 월의 확정/운영용 정산 이력 저장
- Admin 상태 관리
- Coach의 과거 확정 정산 조회

따라서 `예상 정산`을 직접 여기서 계산하거나, 이 테이블을 projection 용으로 재해석하지 않는다.

### 3.2 `예상 정산`은 실시간 집계다

Coach 앱의 `예상 정산`은 **서버 집계 함수 또는 view 기반 계산 결과**다.

즉:

- 확정 정산 = snapshot
- 예상 정산 = projection

### 3.3 Admin과 Coach는 같은 계산 원천을 공유한다

숫자를 다르게 계산하지 않기 위해,
정산 기초 수치(`payable session count`, `base salary`, `allowance`)는
하나의 공통 함수에서 계산하고, Admin/Coach가 이를 재사용한다.

### 3.4 Coach 화면은 read-only다

Coach는 아래만 가능하다.

- 본인 예상 정산 조회
- 본인 확정 정산 이력 조회
- 계산식 이해

Coach는 아래를 할 수 없다.

- 단가 수정
- 월 정산 실행
- 정산 상태 변경
- CSV 다운로드

---

## 4. 용어 정의

### 4.1 Target Month

- 형식: `YYYY-MM`
- 예: `2026-04`

### 4.2 Confirmed Settlement

- 데이터 소스: `coach_settlements`
- 의미: 해당 월에 대해 Admin이 생성한 정산 스냅샷

### 4.3 Expected Settlement

- 데이터 소스: 서버 집계 함수
- 의미: 현재 시점 기준으로 동일한 계산식으로 다시 계산한 예상 값

### 4.4 Payable Session Count

정산 계산에 들어가는 수업 수.  
이 수치는 Admin/Coach 모두 동일한 규칙을 사용해야 한다.

---

## 5. 정산 책임 분리

| 기능 | Admin | Coach |
|---|---|---|
| 기본급/수업당 수당 설정 | 가능 | 불가 |
| 월 정산 실행 | 가능 | 불가 |
| 정산 상태 변경 | 가능 | 불가 |
| 월별 전체 코치 조회 | 가능 | 불가 |
| CSV 다운로드 | 가능 | 불가 |
| 본인 확정 정산 조회 | 가능 | 가능 |
| 본인 예상 정산 조회 | 참고 가능 | 가능 |
| 계산식 보기 | 가능 | 가능 |

### 제품 해석

- Admin Settlements = 운영/회계 처리 화면
- Coach KPI/정산 = 개인 조회 화면

이 역할 분리가 무너지면,
Coach 앱이 Admin 정산 화면의 축소판이 되면서 중복만 늘고 책임은 흐려진다.

---

## 6. 공통 계산 계층 설계

## 6.1 권장 구조

정산 계산은 아래 3단으로 나누는 것이 가장 안전하다.

1. **Basis Layer**
   - 공통 기초 집계
2. **Snapshot Layer**
   - 월 정산 실행 시 스냅샷 저장
3. **Read Layer**
   - Coach/Admin UI용 조회

### 권장 함수 구성

| 계층 | 이름 | 역할 |
|---|---|---|
| Basis | `fn_get_coach_monthly_settlement_basis(p_coach_id, p_year_month)` | 정산에 필요한 기초 수치 계산 |
| Snapshot | `fn_calculate_monthly_settlement(p_year_month)` | Basis를 사용해 `coach_settlements` upsert |
| Read | `fn_get_coach_monthly_kpis(p_year_month)` | Coach UI용 KPI + 예상/확정 정산 조회 |

### 핵심 이유

현재 `fn_calculate_monthly_settlement` 안에 직접 계산 로직이 들어가 있으면,
Coach UI가 같은 계산을 다시 구현할 가능성이 높다.  
이를 막기 위해 Basis Layer를 분리한다.

---

## 6.2 `fn_get_coach_monthly_settlement_basis(p_coach_id, p_year_month)`

### 목적

특정 코치, 특정 월의 정산 기초 수치를 서버에서 단일 기준으로 계산한다.

### 입력

- `p_coach_id UUID`
- `p_year_month TEXT`

### 출력 권장 필드

| 필드 | 설명 |
|---|---|
| `coach_id` | 코치 ID |
| `year_month` | 대상 월 |
| `month_start` | 월 시작일 |
| `month_end` | 월 종료일 |
| `base_salary` | 현재 기준 기본급 |
| `session_allowance` | 현재 기준 수업당 수당 |
| `payable_session_count` | 정산 대상 수업 수 |
| `completed_session_count` | 이미 완료된 수업 수 |
| `remaining_session_count` | 아직 남은 수업 수 |
| `expected_total_amount` | `base_salary + payable_session_count * session_allowance` |

### Payable Session Count 규칙

P1-B 기준 권장 규칙:

1. `session_coaches`로 배정된 세션만 집계
2. `sessions.session_date`가 대상 월 범위 안에 있어야 함
3. `sessions.status = 'cancelled'`인 세션은 제외
4. 동일 세션 중복 배정이 있어도 `DISTINCT session_id` 기준으로 계산

### Completed Session Count 규칙

권장 규칙:

- `sessions.status IN ('completed', 'in_progress')` 또는
- 최소한 `session_date < CURRENT_DATE` 조건으로 참고 수치 제공

주의:

이 값은 **진행률 참고 지표**이지, 금액 계산을 위한 기준은 아니다.

### 중요한 제약

`base_salary`, `session_allowance`는 현재 `coaches` 테이블의 현재값이다.  
따라서 **과거 월에 대한 projection 용도로 쓰면 안 된다.**

권장:

- `예상 정산`은 `현재 월` 전용 지표로 제한
- 과거 월은 `coach_settlements`만 신뢰

---

## 6.3 `fn_calculate_monthly_settlement(p_year_month)`

### 역할

Admin이 월 정산을 실행할 때 사용하는 snapshot 생성 함수

### 변경 권장 사항

현재 구현은 자체적으로 `session_count`를 계산한다.  
P1-B에서는 아래 방식으로 변경하는 것을 권장한다.

1. 내부에서 `fn_get_coach_monthly_settlement_basis(...)` 호출
2. 반환된 `payable_session_count`, `base_salary`, `session_allowance`, `expected_total_amount`를 사용
3. 이를 `coach_settlements`에 upsert

### 이유

- Admin/Coach 계산식 통일
- 취소 세션 제외 규칙 일관성 확보
- 향후 예외 규칙 추가 시 한 곳만 수정하면 됨

### 보안 권장 사항

현재 또는 향후 구현에서 월 정산 실행 권한은
반드시 함수 내부에서 `auth.uid()` 기준으로 admin role을 검증해야 한다.

즉:

- `p_admin_user_id` 같은 클라이언트 전달 파라미터에 의존하지 않는다.

---

## 6.4 `fn_get_coach_monthly_kpis(p_year_month)`

### 목적

Coach 앱에서 월간 KPI와 정산 정보를 한 번에 조회한다.

### 호출 주체

- Coach 앱의 `Dashboard`
- Coach 앱의 `Profile`

### 입력

- `p_year_month TEXT`

### 인증 규칙

- `auth.uid()`로 코치 컨텍스트 확인
- 본인 코치 레코드만 조회 가능

### 반환 권장 구조

```json
{
  "success": true,
  "status": "ok",
  "data": {
    "year_month": "2026-04",
    "coach_id": "uuid",
    "expected_settlement": {
      "base_salary": 1000000,
      "session_allowance": 30000,
      "payable_session_count": 42,
      "expected_total_amount": 2260000
    },
    "confirmed_settlement": {
      "exists": true,
      "status": "confirmed",
      "total_amount": 2260000,
      "session_count": 42
    },
    "kpis": {
      "this_month_sessions": 42,
      "attendance_rate": 0.91,
      "fill_rate": 0.84,
      "avg_rating": 4.8
    }
  },
  "error": null
}
```

### 필수 포함 필드

#### Settlement

- `expected_settlement.base_salary`
- `expected_settlement.session_allowance`
- `expected_settlement.payable_session_count`
- `expected_settlement.expected_total_amount`
- `confirmed_settlement.exists`
- `confirmed_settlement.status`
- `confirmed_settlement.total_amount`

#### KPI

- `this_month_sessions`
- `attendance_rate`
- `fill_rate`
- `avg_rating`

### Coach 화면 표기 규칙

#### 현재 월

- `예상 정산` 표시
- `확정 정산`이 있으면 함께 비교 표시

#### 과거 월

- `확정 정산`만 표시
- `예상 정산`은 표시하지 않거나 비활성화

---

## 7. 예상 정산 공식

### 7.1 기본 공식

```text
expected_total_amount = base_salary + (payable_session_count * session_allowance)
```

### 7.2 수업 수 기준

`payable_session_count`는 아래 조건을 만족하는 세션 수다.

- `session_coaches.coach_id = target coach`
- `sessions.session_date`가 대상 월 안에 존재
- `sessions.status != 'cancelled'`

### 7.3 현재 월 projection 규칙

현재 월의 `예상 정산`은 다음 의미로 해석한다.

- 지금 등록된 단가 기준
- 지금 등록된 월간 배정 세션 기준
- 따라서 이후 스케줄 변경/취소/단가 변경이 있으면 바뀔 수 있음

즉, Coach 화면에서 이 값은 항상 **예상치**다.

---

## 8. 확정 정산 규칙

### 8.1 확정 정산의 원천

과거 월 또는 실행된 월의 확정값은 아래가 유일한 원천이다.

- `coach_settlements.total_amount`
- `coach_settlements.status`

### 8.2 상태 해석

| 상태 | 의미 |
|---|---|
| `pending` | 정산 스냅샷 생성은 되었으나 운영상 확정 전 |
| `confirmed` | 운영상 확정 완료 |
| `paid` | 지급 완료 |

### 8.3 Coach 화면 우선순위

1. 과거 월: `coach_settlements` 우선
2. 현재 월:
   - `예상 정산`을 기본 노출
   - `coach_settlements`가 존재하면 `확정 정산`을 보조/비교 정보로 노출

---

## 9. Admin / Coach 화면 반영 기준

## 9.1 Admin Settlements

유지해야 할 기능:

- 기준 단가 설정
- 월 정산 실행
- 상태 변경
- CSV 다운로드
- 월별 전체 코치 조회

### 추가 권장 사항

- 집계 테이블과 KPI가 `fn_get_coach_monthly_settlement_basis`와 같은 기준을 쓰는지 검증
- 취소 세션 제외 규칙 일치 확인

## 9.2 Coach Profile / Dashboard

반영해야 할 기능:

- 이번 달 예상 정산
- 최근 확정 정산 상태
- 계산식 보기
- KPI Snapshot

반영하면 안 되는 기능:

- 월 정산 실행 버튼
- 상태 변경 드롭다운
- 운영용 CSV 다운로드
- 전체 코치 비교 표

---

## 10. 화면별 표시 제안

## 10.1 Dashboard

표시 우선순위:

1. 이번 달 수업 수
2. 예상 정산
3. 확정 정산 상태
4. 재등록/운영 위험

표현 예시:

- `이번 달 예상 정산 2,260,000원`
- `확정 상태: 대기`

## 10.2 Profile

표시 우선순위:

1. 예상 정산 카드
2. 확정 정산 카드
3. 계산식 설명
4. 최근 월별 정산 이력

계산식 예시:

```text
기본급 1,000,000원 + 42회 × 30,000원 = 예상 2,260,000원
```

---

## 11. 구현 권장 순서

### Step 1. Basis Layer 도입

- `fn_get_coach_monthly_settlement_basis`

### Step 2. Admin 계산 함수 재사용화

- `fn_calculate_monthly_settlement`가 Basis Layer를 쓰도록 리팩터

### Step 3. Coach KPI Read RPC

- `fn_get_coach_monthly_kpis`

### Step 4. Coach UI 반영

- `Dashboard`
- `Profile`

### Step 5. Admin/Coach 숫자 비교 테스트

- 동일 월 기준 숫자 일치 검증

---

## 12. 테스트 체크리스트

### 계산식 테스트

- [ ] 동일 월에 대해 Admin 실행 결과와 Coach 예상 정산 기준이 일치한다
- [ ] `sessions.status='cancelled'`인 세션이 정산 대상에서 제외된다
- [ ] 동일 세션 중복 매핑이 있어도 중복 계산되지 않는다

### 권한 테스트

- [ ] Coach는 본인 정산만 조회 가능하다
- [ ] Coach는 정산 실행/상태 변경/CSV 기능을 볼 수 없다
- [ ] Admin은 전체 코치 정산을 조회/운영할 수 있다

### UI 테스트

- [ ] 현재 월에는 `예상 정산`이 표시된다
- [ ] 과거 월은 `확정 정산`만 신뢰한다
- [ ] Coach Profile의 계산식과 Admin 정산 테이블 수치가 어긋나지 않는다

---

## 13. 리스크 및 대응

| 리스크 | 설명 | 대응 |
|---|---|---|
| 계산식 중복 구현 | Admin/Coach가 각자 계산하면 금액이 달라짐 | Basis Layer 단일화 |
| 과거 단가 변경에 따른 혼선 | 현재 `coaches` 단가로 과거 예상치를 계산하면 왜곡 | 과거 월은 snapshot만 사용 |
| 취소 세션 반영 불일치 | Admin/Coach가 cancelled 처리 규칙을 다르게 쓰면 금액 차이 발생 | `sessions.status != 'cancelled'` 공통 규칙 채택 |
| 권한 혼선 | Coach에 운영 버튼이 노출될 수 있음 | read-only 원칙 문서/화면 양쪽 고정 |

---

## 14. 최종 권고

Priority 24에서 가장 먼저 고정해야 하는 것은 UI가 아니라 **정산 계산 원천**이다.

정리하면 아래 순서가 맞다.

1. `Basis Layer` 분리
2. Admin 정산 함수가 그 Basis를 재사용하도록 정리
3. Coach KPI/예상 정산 RPC 구현
4. Coach Profile/Dashboard에 read-only 반영

이 순서를 지키면
`Admin은 운영`, `Coach는 조회`라는 역할 분리가 유지되면서도
숫자는 한 서버 계산식으로 일치하게 된다.

---

## 15. Planning Log

- 2026-04-25: Priority 24 중 예상 정산/확정 정산/KPI 집계 구조, 공통 계산 계층, Admin/Coach 역할 분리 실행 명세 초안 작성
