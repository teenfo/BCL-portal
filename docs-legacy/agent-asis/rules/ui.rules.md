---
trigger: always_on
---

# BCL Portal – UI Rules (Agent)

이 문서는 Agent가 UI/UX를 설계하거나 제안할 때 반드시 지켜야 할 규칙이다.

---

## 1) 사용자 화면 (apps)
- 모바일 퍼스트
- 네비게이션: **Bottom Tab**
  - Home
  - Schedule
  - Check-in
  - Facilities
  - Profile
- 한 화면에 너무 많은 정보 금지
- 행동 중심 CTA 우선:
  - 예약
  - 체크인
  - 결제 확인

**핵심**: UI 구현 시 반드시 `.agent/skills/ui-gen/SKILL.md` 의 Glassmorphism 가이드를 준수할 것.
---

## 2) 관리자 화면 (admin)
- 데스크탑 중심
- 네비게이션: **Sidebar**
- Sitemap과 1:1 매핑
- 정보 밀도가 높아도 됨 (필터/테이블/차트 허용)
- 파괴적 행동(Delete/Refund)은 반드시 확인 단계 포함

---

## 3) 공통 UX 규칙
- 상태 표현 명확히:
  - 예약됨 / 대기 / 취소
  - 활성 / 만료
- Empty State 필수:
  - 데이터 없음
  - 권한 없음
- 로딩 상태 표시 필수(Skeleton 권장)

---

## 4) 금지 패턴
- 사용자 화면에 관리자용 테이블 UI 사용
- 사용자 화면에서 데이터 수정 권한 노출
- 팝업 남용
- 기술 중심 UI 설명(사용자는 기능만 본다)

---

## 5) 아이콘/색상 사용 원칙
- 기능 의미가 직관적으로 드러나야 함
- 경고/삭제는 시각적으로 명확히 구분
- 장식 목적 아이콘 남용 금지

---

## 6) Admin 글로벌 컴포넌트 규칙 (필수)

Admin 페이지의 필터/검색/액션 영역은 **반드시 글로벌 CSS 클래스를 사용**한다.
인라인 스타일로 동일한 디자인을 재구현하면 안 된다.

### 필수 사용 클래스 (globals.css 정의)
| 클래스 | 용도 | 높이 기준 |
|---|---|---|
| `.admin-filter-btn` | 필터/토글 버튼 (전체/활성/만료 등) | `py-2 px-4` (~34px) |
| `.admin-search-input` | 검색 인풋, 날짜 피커 | `py-2 px-4` (~34px, 필터와 동일) |
| `.admin-action-btn` | CTA 버튼 (+ 추가, 생성 등) | `py-3 px-6` (~42px) |

### 활성 상태
- 필터 버튼 활성: `className="admin-filter-btn active"`
- 날짜 피커 아이콘: 글로벌 CSS에서 자동 흰색 처리 (`invert(1)`)

### Agent 금지 사항
- ❌ 필터 버튼/검색 인풋/액션 버튼의 padding, font-size, border 등을 인라인으로 재정의
- ❌ `input[type="date"]`의 캘린더 아이콘 별도 처리 (글로벌에서 처리됨)
- ❌ 새 Admin 페이지에서 위 클래스 없이 비슷한 스타일 직접 작성

### 참조
- 상세 가이드: `.agent/skills/ui-gen/SKILL.md` Section 3 참조
