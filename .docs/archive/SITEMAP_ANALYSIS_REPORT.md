# BCL Portal 사이트맵 분석 및 강화 보고서

> **분석 날짜**: 2026년 2월 16일  
> **분석 대상**: 전체 사이트맵 (Admin, User, Coach, Class, Kiosk)  
> **분석 목적**: 누락된 기능 파악 및 사이트맵 강화

---

## 📊 현재 사이트맵 구조 요약

### 1. Admin Portal (`/admin/*`)
```
📂 Insights (분석 및 리포트)
  ├─ Dashboard (종합 대시보드)
  ├─ Attendance Report (출석 리포트)
  ├─ Finance Report (매출 리포트)
  └─ Coaches Report (코치 성과 분석)

📂 Finance (회원 및 매출 관리)
  ├─ Members List (회원 목록 및 관리)
  ├─ Check-in Log (체크인 로그 모니터링)
  ├─ Membership Plans (요금제 및 멤버십 설계)
  └─ Transactions (결제 및 정산 관리)

📂 Operations (클래스 및 현장 운영)
  ├─ Schedule Calendar (지능형 수업 캘린더)
  ├─ Reservations (실시간 예약/대기 관리)
  ├─ Infrastructure (현장 인프라 제어)
  └─ RBAC (운영진 권한 관리)

📂 CRM (콘텐츠 및 고객 소통)
  ├─ Content Management (공지사항 및 콘텐츠)
  ├─ Notifications (스마트 알림 센터)
  └─ Support Tickets (CS 티켓 시스템)

📂 Infrastructure (시스템 설정 및 보안)
  ├─ Branch Settings (지점 및 정책 설정)
  ├─ System Integration (기술 및 시스템 연동)
  └─ Audit Log (보안 감사 및 로그)
```

### 2. User App (`/apps/*`)
```
Bottom Tab Navigation:
  ├─ Home (Dashboard)
  ├─ Schedule (수업 캘린더)
  ├─ Check-in (QR 체크인)
  ├─ Facilities (지점 안내)
  └─ Profile (내 정보)
```

### 3. Coach App (`/coach/*`)
```
Bottom Tab Navigation:
  ├─ Home (Dashboard)
  ├─ Schedule (내 전체 일정)
  ├─ Members (회원 검색 및 코칭 노트)
  ├─ Race (기기 제어 및 경기 운영)
  └─ Profile (코치 정보)
```

### 4. Class Portal (`/class/*`)
```
  ├─ WOD Board (오늘의 운동)
  ├─ Leaderboard (실시간 기록)
  ├─ Timer (클래스 타이머)
  └─ Live Hub (라이브 대시보드)
```

### 5. Kiosk App (`/kiosk/*`)
```
  ├─ Idle Screen (대기 화면)
  ├─ QR Scan (QR 스캔)
  └─ Success/Feedback (체크인 결과)
```

---

## ✅ 강점 (Well-Covered)

### 1. 핵심 운영 기능 완비
- ✅ 회원 관리 (CRUD)
- ✅ 수업 스케줄링
- ✅ 예약 시스템
- ✅ 체크인 시스템
- ✅ 결제 및 정산

### 2. 분석 및 리포트
- ✅ 출석 패턴 분석
- ✅ 매출 리포트
- ✅ 코치 성과 분석

### 3. 고객 소통
- ✅ 공지사항 관리
- ✅ 푸시 알림
- ✅ CS 티켓 시스템

---

## 🔴 누락된 주요 기능 (Critical Gaps)

### 1. Admin Portal

#### A. 코치 관리 기능 ❌
**문제**: DB에 `coaches` 테이블이 있으나 Admin에서 코치 관리 메뉴 누락
```
누락:
  - 코치 목록 및 CRUD
  - 코치 전문 분야 설정
  - 코치 일정 배정 현황
  - 코치 급여/수당 관리
```

**제안 위치**: `/admin/ops/coaches` 또는 `/admin/finance/coaches`

---

#### B. 회원권/멤버십 상세 관리 ❌
**문제**: DB에 `memberships` 테이블이 있으나 개별 회원권 관리 메뉴 부족
```
누락:
  - 회원별 보유 멤버십 목록
  - 멤버십 수동 연장/일시정지
  - 멤버십 양도 기능
  - 횟수권 잔여 크레딧 조정
```

**제안 위치**: `/admin/finance/memberships`

---

#### C. 피드백/리뷰 관리 ❌
**문제**: DB에 `session_feedback` 테이블이 있으나 Admin에서 관리 메뉴 없음
```
누락:
  - 수업별 피드백 조회
  - 저평가 수업 알림
  - 피드백 통계 대시보드
```

**제안 위치**: `/admin/insights/feedback`

---

#### D. Race 시스템 관리 ❌
**문제**: Race 기능이 Coach와 Class Portal에만 있음
```
누락:
  - Race 이벤트 생성 및 관리
  - PM5 기기 등록 및 관리
  - 전체 Race 기록 통계
  - Race 리더보드 연간 순위
```

**제안 위치**: `/admin/ops/race`

---

#### E. 재고 및 용품 관리 ⚠️
**문제**: 실제 센터 운영 시 필요한 기능
```
누락:
  - 운동 용품 재고 관리
  - 장비 유지보수 일정
  - 소모품 발주 관리
```

**제안 위치**: `/admin/ops/inventory` (선택사항)

---

### 2. User App

#### A. 결제/구매 기능 ❌
**문제**: 회원이 직접 멤버십을 구매하는 기능 없음
```
누락:
  - 요금제 목록 조회
  - 멤버십 구매/결제
  - 결제 내역 조회
  - 환불 신청
```

**제안 위치**: `/apps/purchase` 또는 `/apps/profile/purchase`

---

#### B. 피드백 제출 ❌
**문제**: DB 테이블은 있으나 회원이 피드백을 남기는 UI 없음
```
누락:
  - 수업 후 별점 및 리뷰 작성
  - 코치 평가
```

**제안 위치**: `/apps/schedule/feedback` 또는 수업 상세 페이지

---

#### C. 운동 기록 관리 ❌
**문제**: 회원이 자신의 운동 기록을 입력/관리하는 기능 없음
```
누락:
  - WOD 기록 입력
  - 개인 PR (Personal Record) 관리
  - 운동 히스토리
```

**제안 위치**: `/apps/records`

---

#### D. 소셜 기능 ⚠️
**문제**: 커뮤니티 느낌 부족
```
누락:
  - 회원 간 팔로우
  - 친구 초대
  - 운동 기록 공유
```

**제안 위치**: `/apps/community` (선택사항)

---

### 3. Coach App

#### A. 수업 준비 체크리스트 ⚠️
```
누락:
  - 수업 전 준비 사항 확인
  - 장비 체크리스트
```

**제안 위치**: `/coach/schedule/preparation`

---

#### B. 급여/수당 조회 ❌
```
누락:
  - 월간 수업 수당 계산
  - 급여 명세서 조회
```

**제안 위치**: `/coach/finance`

---

### 4. Class Portal

#### A. 출석 현황 ⚠️
```
누락:
  - 현재 수업 출석자 명단
  - 미출석자 표시
```

**제안 위치**: `/class/attendance`

---

### 5. Kiosk App

#### A. 비회원 체험 등록 ⚠️
```
누락:
  - 체험 회원 등록 플로우
  - 간편 정보 입력
```

**제안 위치**: `/kiosk/trial-register`

---

## 🟡 개선 필요 영역 (Enhancement Needed)

### 1. 공통 인증 (Auth)

**현재**: 간략하게만 언급됨
```
필요:
  - 로그인 화면 상세 설계
  - 비밀번호 재설정
  - 소셜 로그인 (Google, Kakao)
  - 이메일 인증
```

**제안 위치**:
- `/auth/login`
- `/auth/signup`
- `/auth/reset-password`
- `/auth/email-verify`

---

### 2. 설정 (Settings) 화면 강화

**User App**: Profile에 통합되어 있음
```
분리 제안:
  - 앱 설정 (다크모드, 알림)
  - 계정 설정 (비밀번호 변경)
  - 개인정보 수정
```

**제안 위치**: `/apps/settings`

---

### 3. 에러 및 예외 화면

**현재**: 사이트맵에 없음
```
필요:
  - 404 Not Found
  - 403 Forbidden (권한 없음)
  - 500 Server Error
  - Maintenance Mode
```

---

## 🗑️ 불필요하거나 중복되는 메뉴 (Redundancy)

### 1. Admin 중복 가능성

#### A. Insights vs Finance
- **Insights > Finance Report** vs **Finance > Transactions**
  - 매출 리포트와 거래 내역이 중복될 수 있음
  - **제안**: Insights는 분석/통계만, Finance는 실제 거래 관리로 명확히 구분

#### B. Operations > Infrastructure vs Infrastructure 모듈
- **Operations > 현장 인프라 제어** vs **Infrastructure > 시스템 설정**
  - 명칭이 혼동될 수 있음
  - **제안**: Operations에는 "현장 장비" 관리, Infrastructure에는 "시스템/서버" 설정

---

### 2. 실제 사용 빈도가 낮을 수 있는 기능

#### A. Class Portal > Live Hub
- **문제**: 심박수 연동은 고급 기능으로 초기 구현이 어려울 수 있음
- **제안**: Phase 3 이후로 연기하거나 선택사항으로 표시

#### B. Admin > RBAC
- **문제**: 소규모 센터에서는 복잡한 권한 관리가 불필요할 수 있음
- **제안**: 기본 3단계 권한(Admin/Manager/Staff)만 구현, 세밀한 권한은 Phase 2 이후

---

## 📋 DB 스키마와의 정합성 확인

### ✅ 잘 매핑된 테이블
- `facilities` → Admin > Branch Settings, User > Facilities
- `members` → Admin > Members List, User > Profile
- `sessions` → Admin > Schedule, User > Schedule
- `bookings` → Admin > Reservations, User > Schedule
- `checkins` → Admin > Check-in Log, User > Check-in
- `transactions` → Admin > Transactions
- `notices` → Admin > Content, User > Home

### ❌ 매핑되지 않은 테이블
- `coaches` → **Admin에 코치 관리 메뉴 필요**
- `memberships` → **Admin에 멤버십 상세 관리 필요**
- `session_coaches` → **Admin 수업 캘린더에 통합 가능**
- `session_feedback` → **Admin/User에 피드백 관리 필요**
- `notifications` → **구현 예정 (CRM > Notifications와 연계)**
- `support_tickets` → **Admin > CS Tickets와 연계**

---

## 🎯 우선순위별 개선 로드맵

### 🔴 Phase 1: Critical (필수)
1. **Admin > 코치 관리** (`/admin/ops/coaches`)
2. **Admin > 멤버십 관리** (`/admin/finance/memberships`)
3. **User > 멤버십 구매** (`/apps/purchase`)
4. **User > 피드백 제출** (`/apps/feedback`)
5. **공통 인증 화면** (`/auth/*`)

### 🟡 Phase 2: Important (중요)
1. **Admin > 피드백 관리** (`/admin/insights/feedback`)
2. **User > 운동 기록** (`/apps/records`)
3. **Coach > 급여 조회** (`/coach/finance`)
4. **Admin > Race 관리** (`/admin/ops/race`)

### 🟢 Phase 3: Nice to Have (선택)
1. **Admin > 재고 관리** (`/admin/ops/inventory`)
2. **User > 소셜 기능** (`/apps/community`)
3. **Kiosk > 체험 등록** (`/kiosk/trial-register`)
4. **Class > 출석 현황** (`/class/attendance`)

---

## 📝 권장 사항 (Recommendations)

### 1. 사이트맵 구조 재조정

#### AS-IS (현재)
```
Admin
  ├─ Insights
  ├─ Finance
  ├─ Operations
  ├─ CRM
  └─ Infrastructure
```

#### TO-BE (제안)
```
Admin
  ├─ Dashboard (Insights 통합)
  ├─ Members & Finance (회원/매출 통합)
  │   ├─ Members
  │   ├─ Memberships
  │   ├─ Transactions
  │   └─ Check-ins
  ├─ Operations (운영)
  │   ├─ Schedule
  │   ├─ Coaches
  │   ├─ Reservations
  │   └─ Race
  ├─ CRM (소통)
  │   ├─ Content
  │   ├─ Notifications
  │   ├─ Support
  │   └─ Feedback
  └─ Settings (설정)
      ├─ Branch
      ├─ System
      └─ Audit
```

---

### 2. 명칭 통일

| 현재 | 개선 | 이유 |
|------|------|------|
| "User & Finance" | "Members & Finance" | 더 명확함 |
| "Infrastructure" (Operations) | "Equipment" | 혼동 방지 |
| "Infrastructure" (모듈) | "Settings" | 더 직관적 |

---

### 3. 우선순위 시각화

```mermaid
초기 개발 (Phase 1)
  → 인증 시스템
  → Admin: 회원/코치/수업 관리
  → User: 예약/체크인
  → 결제 연동
  
확장 (Phase 2)
  → Admin: 분석/리포트
  → User: 피드백/기록
  → Coach: 전체 기능
  
고도화 (Phase 3)
  → Class Portal
  → Kiosk
  → Race 시스템
  → 소셜 기능
```

---

## 📊 요약 통계

| 항목 | 현재 | 추가 필요 | 총계 |
|------|------|-----------|------|
| **Admin 메뉴** | 18개 | +8개 | 26개 |
| **User 탭** | 5개 | +3개 | 8개 |
| **Coach 탭** | 5개 | +1개 | 6개 |
| **Class 화면** | 4개 | +1개 | 5개 |
| **Kiosk 화면** | 3개 | +1개 | 4개 |
| **공통 (Auth)** | 0개 | +5개 | 5개 |

---

## 🎯 즉시 조치 필요 항목

1. ✅ **코치 관리 모듈 추가** (DB 테이블과 불일치)
2. ✅ **멤버십 상세 관리 추가** (DB 테이블과 불일치)
3. ✅ **피드백 시스템 UI 추가** (DB 테이블과 불일치)
4. ✅ **인증 화면 상세 설계** (모든 앱의 기본)
5. ✅ **사용자 멤버십 구매 플로우** (매출 필수)

---

**다음 단계**: 이 분석을 기반으로 강화된 통합 사이트맵 파일 생성

---

**보고서 버전**: 1.0  
**작성일**: 2026년 2월 16일  
**작성자**: Antigravity Agent
