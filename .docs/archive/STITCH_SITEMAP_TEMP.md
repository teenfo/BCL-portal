# BCL Portal 통합 사이트맵 (Stitch AI 개발용)

> **⚠️ 임시 파일 (TEMP FILE)**  
> **용도**: Stitch AI에서 화면 개발 시 전체 메뉴 구조 참조  
> **사용 후**: 삭제 예정  
> **최종 버전**: 2026-02-16 (강화 완료)

---

## 📱 전체 애플리케이션 구조

```
BCL Portal
├─ /auth/*          [공통 인증]
├─ /admin/*         [관리자 포털] - 데스크탑
├─ /apps/*          [회원용 앱] - 모바일
├─ /coach/*         [코치용 앱] - 모바일
├─ /class/*         [클래스 포털] - TV/대형 스크린
└─ /kiosk/*         [체크인 키오스크] - 태블릿
```

---

## 🔐 공통 인증 시스템 (`/auth/*`)

### 화면 목록
| 경로 | 화면명 | 설명 | 디자인 키워드 |
|------|--------|------|--------------|
| `/auth/login` | 로그인 | 이메일/비밀번호 로그인 | Glassmorphism, Dark Mode, BCL Orange |
| `/auth/signup` | 회원가입 | 신규 회원 등록 | 폼 유효성, 단계별 진행 |
| `/auth/reset-password` | 비밀번호 재설정 | 이메일 인증 후 재설정 | 간결한 UX |
| `/auth/email-verify` | 이메일 인증 | 가입 후 이메일 인증 | 성공/실패 피드백 |
| `/auth/logout` | 로그아웃 | 세션 종료 후 리다이렉트 | - |

### 공통 기능
- Supabase Auth 연동
- JWT 토큰 관리
- 역할 기반 리다이렉트 (admin/coach/member)
- 소셜 로그인 (Google, Kakao) - Phase 2

---

## 👨‍💼 관리자 포털 (`/admin/*`)

### 레이아웃
- **네비게이션**: 왼쪽 Sidebar (Collapsible)
- **디자인**: Dark Mode, High-Density Data, Premium UI
- **권한**: `admin` role 필수

---

### 📊 1. Dashboard (`/admin/dashboard`)

#### KPI 카드 (4개)
- 총 회원 수 / 활성 회원 수
- 오늘 예약 수 / 출석률
- 이번 달 매출 / 전월 대비
- 미확인 알림 / 긴급 이슈

#### 주간 트렌드 차트
- 방문자 추이 (라인 차트)
- 매출 추이 (바 차트)

#### 위젯
- 멤버십 만료 임박자 (D-7 이내)
- 최근 CS 티켓 (미처리)
- 시스템 에러 로그

**디자인 키워드**: Dashboard, Dark Mode, KPI Cards, Charts, Widgets

---

### 👥 2. Members & Finance (회원 및 매출 관리)

#### 2.1 회원 목록 (`/admin/members`)
- **기능**:
  - 검색 (이름, 이메일, 전화번호)
  - 필터 (상태, 멤버십 종류, 등급)
  - 정렬 (가입일, 만료일, 출석률)
  - 회원 상세 보기 (프로필, 멤버십, 출결)
  - 수동 액션 (블랙리스트, 강제 연장)
  
**디자인 키워드**: Data Table, Search Bar, Filter Dropdown, Pagination

---

#### 2.2 멤버십 관리 (`/admin/memberships`) 🆕
- **기능**:
  - 회원별 보유 멤버십 목록
  - 멤버십 수동 생성/연장
  - 일시정지 (홀딩) 처리
  - 횟수권 잔여 크레딧 조정
  - 멤버십 양도 승인
  
**디자인 키워드**: List View, Modal Form, Status Badge

---

#### 2.3 요금제 관리 (`/admin/plans`)
- **기능**:
  - 요금제 생성 (기간제/횟수권)
  - 가격, 기간, 크레딧 설정
  - 환불 규정 설정
  - 홀딩 가능 횟수
  - 지점 공유 사용 여부
  
**디자인 키워드**: Form, Toggle Switch, Price Input

---

#### 2.4 거래 내역 (`/admin/transactions`)
- **기능**:
  - 전체 거래 내역 (결제/환불)
  - PG사 연동 상태 확인
  - 수동 환불 처리
  - 월간 정산 리포트
  - CSV/Excel 다운로드
  
**디자인 키워드**: Transaction Table, Status Filter, Export Button

---

#### 2.5 체크인 로그 (`/admin/checkins`)
- **기능**:
  - 실시간 체크인 로그 (초 단위)
  - 수동 출석 처리
  - 체크인 방법 필터 (QR/키오스크/수동)
  - 날짜별 조회
  
**디자인 키워드**: Real-time Log, Timeline, Manual Entry Button

---

### 🏋️ 3. Operations (클래스 및 현장 운영)

#### 3.1 수업 캘린더 (`/admin/operations/schedule`)
- **기능**:
  - 주간/월간 캘린더 뷰
  - 드래그 앤 드롭으로 수업 생성
  - 수업 시간 조정
  - 코치 배정 (드롭다운)
  - 정원 설정
  - 중복 배정 방지
  
**디자인 키워드**: Full Calendar, Drag & Drop, Modal Form, Coach Selector

---

#### 3.2 코치 관리 (`/admin/operations/coaches`) 🆕
- **기능**:
  - 코치 목록 및 CRUD
  - 전문 분야 (Specialty) 설정
  - 월간 수업 배정 현황
  - 코치 성과 통계
  - 급여/수당 설정
  
**디자인 키워드**: Profile Card, Stats Dashboard, Form Modal

---

#### 3.3 예약 관리 (`/admin/operations/reservations`)
- **기능**:
  - 수업별 예약자 명단
  - 대기열 (Waitlist) 우선순위 조정
  - 노쇼 (No-show) 페널티 부여
  - 수동 예약 추가/취소
  
**디자인 키워드**: Booking List, Drag & Drop Priority, Action Buttons

---

#### 3.4 Race 관리 (`/admin/operations/race`) 🆕
- **기능**:
  - Race 이벤트 생성
  - PM5 기기 등록 및 관리
  - 전체 Race 기록 통계
  - 연간 리더보드
  
**디자인 키워드**: Event List, Device Management, Leaderboard Table

---

#### 3.5 권한 관리 (RBAC) (`/admin/operations/roles`)
- **기능**:
  - 역할 정의 (Admin/Manager/Staff)
  - 메뉴별 접근 권한 설정
  - 운영진 계정 관리
  
**디자인 키워드**: Role Matrix, Permission Toggle, User List

---

### 💬 4. CRM (콘텐츠 및 고객 소통)

#### 4.1 콘텐츠 관리 (`/admin/crm/content`)
- **기능**:
  - 공지사항 작성/수정/삭제
  - 지점별/전사 공지 구분
  - 앱 배너 이미지 업로드
  - 링크 연결
  - 게시 기간 설정
  
**디자인 키워드**: WYSIWYG Editor, Image Upload, Date Picker

---

#### 4.2 알림 센터 (`/admin/crm/notifications`)
- **기능**:
  - 자동 발송 규칙 설정
  - 예약 발송 (날짜/시간 지정)
  - 푸시/SMS 선택
  - 발송 대상 필터링
  - 발송 내역 조회
  
**디자인 키워드**: Rule Builder, Schedule Form, Recipient Filter

---

#### 4.3 CS 티켓 (`/admin/crm/support`)
- **기능**:
  - 1:1 문의 목록
  - 상태별 필터 (대기/처리중/완료)
  - 답변 작성
  - FAQ 관리
  
**디자인 키워드**: Ticket List, Status Badge, Reply Form

---

#### 4.4 피드백 관리 (`/admin/crm/feedback`) 🆕
- **기능**:
  - 수업별 피드백 조회
  - 별점 통계
  - 저평가 수업 알림
  - 피드백 응답
  
**디자인 키워드**: Review List, Star Rating, Filter by Session

---

### ⚙️ 5. Settings (시스템 설정)

#### 5.1 지점 설정 (`/admin/settings/branch`)
- **기능**:
  - 지점 기본 정보 (이름, 주소, 전화번호)
  - 운영 시간 설정
  - 지도 연동 (좌표)
  - 시설 이미지 업로드
  - 이용 약관 관리
  
**디자인 키워드**: Form Layout, Image Gallery, Map Integration

---

#### 5.2 시스템 연동 (`/admin/settings/system`)
- **기능**:
  - PG사 설정 (Toss, NicePay)
  - SMS API 연동
  - Webhook 엔드포인트 관리
  - 환경 변수 설정
  
**디자인 키워드**: Integration List, API Key Input, Webhook URL

---

#### 5.3 보안 감사 (`/admin/settings/audit`)
- **기능**:
  - 관리자 액션 로그
  - IP 추적
  - 에러 모니터링
  - 의심스러운 활동 감지
  
**디자인 키워드**: Log Table, Timeline, Alert Badge

---

### 📈 6. Insights (분석 및 리포트)

#### 6.1 출석 리포트 (`/admin/insights/attendance`)
- **기능**:
  - 요일별/시간대별 히트맵
  - 기간별 출석 추이
  - CSV/Excel 다운로드
  
**디자인 키워드**: Heatmap, Line Chart, Export Button

---

#### 6.2 매출 리포트 (`/admin/insights/finance`)
- **기능**:
  - 요금제별 매출 비중
  - 결제 수단 통계
  - 월간 정산 예상
  - 전월 대비 성장률
  
**디자인 키워드**: Pie Chart, Bar Chart, KPI Cards

---

#### 6.3 코치 성과 (`/admin/insights/coaches`)
- **기능**:
  - 코치별 수업 점유율
  - 평균 예약률/출석률
  - 회원 피드백 통계
  
**디자인 키워드**: Performance Dashboard, Radar Chart, Score Card

---

## 📱 회원용 앱 (`/apps/*`)

### 레이아웃
- **네비게이션**: Bottom Tab (5개)
- **디자인**: Mobile-First, Glassmorphism, BCL Orange
- **권한**: `member` role 필수

---

### Bottom Tab Navigation

#### 1. Home (`/apps/dashboard`)
- **위젯**:
  - 오늘 예약 상태
  - 다음 수업 카운트다운
  - 멤버십 잔여 정보 (D-Day)
  - 최근 공지사항
  - 개인 알림 피드
  
**디자인 키워드**: Mobile Dashboard, Widget Cards, Countdown Timer

---

#### 2. Schedule (`/apps/schedule`)
- **기능**:
  - 주간 수업 캘린더
  - 코치/난이도 필터
  - 예약하기 (원클릭)
  - 대기열 등록
  - 예약 취소
  - 내 일정 보기
  
**디자인 키워드**: Mobile Calendar, Filter Chips, Action Button, Swipe Gesture

---

#### 3. Check-in (`/apps/checkin`)
- **기능**:
  - 동적 QR 코드 생성 (실시간)
  - 월간 출석 캘린더
  - 출석 통계 (이번 달/지난달)
  - 출석 스트릭 (연속 출석)
  
**디자인 키워드**: QR Code Display, Monthly Calendar, Stats Card

---

#### 4. Facilities (`/apps/facilities`)
- **기능**:
  - 전체 지점 목록
  - 지점 상세 (주소, 전화, 운영시간)
  - 지도 보기
  - 편의시설 안내
  
**디자인 키워드**: Card List, Map View, Tab Navigation

---

#### 5. Profile (`/apps/profile`)
- **섹션**:
  - 내 정보 (이름, 이메일, 전화번호)
  - 멤버십 현황
  - 결제 내역
  - 앱 설정 (다크모드, 알림)
  - 고객센터
  - 로그아웃
  
**디자인 키워드**: Profile Header, List Menu, Settings Toggle

---

### 추가 화면

#### 6. Purchase (`/apps/purchase`) 🆕
- **기능**:
  - 요금제 목록 (카드 형태)
  - 요금제 상세 보기
  - 결제하기 (PG 연동)
  - 결제 완료/실패 피드백
  
**디자인 키워드**: Pricing Cards, Payment Form, Success Animation

---

#### 7. Feedback (`/apps/feedback`) 🆕
- **기능**:
  - 수업 후 별점 매기기
  - 리뷰 작성
  - 코치 평가
  - 내가 남긴 피드백 조회
  
**디자인 키워드**: Star Rating, Textarea, Submit Button

---

#### 8. Records (`/apps/records`) 🆕
- **기능**:
  - WOD 기록 입력
  - 개인 PR 관리
  - 운동 히스토리
  - 진행 그래프
  
**디자인 키워드**: Input Form, PR List, Progress Chart

---

## 🏃 코치용 앱 (`/coach/*`)

### 레이아웃
- **네비게이션**: Bottom Tab (5개)
- **디자인**: Field-Optimized, Quick Actions
- **권한**: `coach` role 필수

---

### Bottom Tab Navigation

#### 1. Home (`/coach/dashboard`)
- **위젯**:
  - 오늘의 수업 목록
  - 현재 세션 예약 인원
  - 출석 대기 현황
  - 코치 전용 공지
  
**디자인 키워드**: Mobile Dashboard, Session Cards, Real-time Badge

---

#### 2. Schedule (`/coach/schedule`)
- **기능**:
  - 주간/월간 내 일정
  - 수업 상세 (장소, 정원, 명단)
  - WOD 작성/수정
  
**디자인 키워드**: Coach Calendar, Session Detail, WYSIWYG Editor

---

#### 3. Members (`/coach/members`)
- **기능**:
  - 회원 검색
  - 회원 프로필 조회
  - 코칭 노트 작성
  - 부상/특이사항 기록
  - 참여 히스토리
  
**디자인 키워드**: Search Bar, Profile Card, Note Editor

---

#### 4. Race (`/coach/race`)
- **기능**:
  - PM5 기기 연결 모니터링
  - 경기 시작/종료 제어
  - 실시간 리더보드
  - 레인 배정
  
**디자인 키워드**: Device Status Panel, Control Button, Leaderboard

---

#### 5. Profile (`/coach/profile`)
- **섹션**:
  - 내 정보 (바이오, 전문 분야)
  - 월간 수업 통계
  - 급여/수당 조회 🆕
  - 설정
  
**디자인 키워드**: Coach Profile, Stats Card, Salary View

---

## 🖥️ 클래스 포털 (`/class/*`)

### 레이아웃
- **디자인**: Full Screen, Large Font, High Contrast
- **디바이스**: TV/대형 모니터
- **권한**: 공용 or 지점 계정

---

### 화면 목록

#### 1. WOD Board (`/class/wod`)
- **요소**:
  - WOD 제목
  - 라운드/동작 목록
  - 시간 제한 (Time Cap)
  
**디자인 키워드**: Large Typography, Dark Background, WOD Layout

---

#### 2. Leaderboard (`/class/leaderboard`)
- **요소**:
  - 실시간 운동 기록 순위
  - 성별/연령대 필터
  - 상위 10명 강조
  
**디자인 키워드**: Ranking Table, Real-time Update, Highlight Top 3

---

#### 3. Timer (`/class/timer`)
- **타입**:
  - Count Down
  - Count Up
  - EMOM
  - Tabata
- **제어**: 코치 앱에서 원격 조작
  
**디자인 키워드**: Large Timer, Start/Pause Button, Progress Bar

---

#### 4. Live Hub (`/class/live`)
- **요소**:
  - 현재 수업 회원 목록
  - 심박수 모니터링 (Phase 3)
  - Race 기록 중계
  
**디자인 키워드**: Grid Layout, Real-time Data, Heart Rate Monitor

---

#### 5. Attendance (`/class/attendance`) 🆕
- **요소**:
  - 현재 수업 출석자 명단
  - 미출석자 표시
  - 출석 카운트 (현재/총원)
  
**디자인 키워드**: Name List, Status Indicator, Counter

---

## 📲 키오스크 (`/kiosk/*`)

### 레이아웃
- **디자인**: PWA Full Screen, Touch-Optimized
- **디바이스**: 태블릿
- **모드**: 무인 운영

---

### 화면 흐름

#### 1. Idle (`/kiosk`)
- **요소**:
  - 디지털 사이니지 (배너 순환)
  - 시설 홍보 영상
  - "터치하여 시작" 버튼
  
**디자인 키워드**: Fullscreen Banner, Auto-rotate, Touch Prompt

---

#### 2. QR Scan (`/kiosk/scan`)
- **요소**:
  - 카메라 스트림 (실시간)
  - QR 인식 가이드 영역
  - "QR을 스캔하세요" 안내
  
**디자인 키워드**: Camera Stream, Guide Box, Instruction Text

---

#### 3. Success (`/kiosk/success`)
- **요소**:
  - 체크인 성공 메시지
  - 회원 이름
  - 예약 정보
  - 잔여 횟수
- **피드백**: 초록색 배경, 성공 사운드
- **자동 복귀**: 3초 후 Idle로
  
**디자인 키워드**: Success Screen, Large Text, Green Background, Beep Sound

---

#### 4. Trial Register (`/kiosk/trial-register`) 🆕
- **요소**:
  - 이름/전화번호 입력
  - 체험 수업 선택
  - 간편 등록
  
**디자인 키워드**: Simple Form, Numeric Keypad, Submit Button

---

## 🎨 공통 디자인 시스템

### 컬러 팔레트
```css
--bcl-orange: #FF6B00;        /* Primary */
--bcl-dark: #0F172A;          /* Background */
--bcl-gray: #1E293B;          /* Surface */
--bcl-light: #F8FAFC;         /* Text */
--success: #10B981;
--error: #EF4444;
--warning: #F59E0B;
```

### 타이포그래피
- **Primary Font**: Inter (Google Fonts)
- **Heading**: Bold, 32px-48px
- **Body**: Regular, 14px-16px
- **Caption**: Regular, 12px-14px

### UI 컴포넌트
- **Button**: Glassmorphism, Orange Gradient
- **Card**: Dark Mode, Subtle Shadow, Rounded corners
- **Input**: Floating Label, Bottom Border
- **Table**: Striped, Hover Effect, Pagination

---

## 📊 화면 개수 요약

| 모듈 | 화면 수 | 비고 |
|------|---------|------|
| **Auth** | 5 | 로그인, 가입, 재설정, 인증, 로그아웃 |
| **Admin** | 26 | Dashboard + 5개 모듈 × 4-6 화면 |
| **User** | 8 | 5개 탭 + 추가 3화면 |
| **Coach** | 6 | 5개 탭 + 추가 1화면 |
| **Class** | 5 | WOD, 리더보드, 타이머, Live, 출석 |
| **Kiosk** | 4 | Idle, Scan, Success, Trial |
| **총계** | **54 화면** | |

---

## 🚀 Phase별 개발 우선순위

### Phase 1 (MVP - 4주)
```
✅ Auth (전체)
✅ Admin Dashboard
✅ Admin Members & Finance
✅ Admin Operations (Schedule, Reservations)
✅ User (Home, Schedule, Check-in, Profile)
```

### Phase 2 (확장 - 4주)
```
✅ Admin CRM (Content, Notifications, Support)
✅ Admin Insights (전체)
✅ Admin Coaches 관리
✅ User (Purchase, Feedback)
✅ Coach (전체)
```

### Phase 3 (고도화 - 4주)
```
✅ Admin Race 관리
✅ User Records
✅ Class Portal (전체)
✅ Kiosk (전체)
✅ Community 기능
```

---

## 📝 Stitch AI 프롬프트 예시

### Admin Dashboard
```
"BCL Portal Admin Dashboard
- Dark mode, premium UI
- Left sidebar navigation
- 4 KPI cards: total members, today bookings, monthly revenue, notifications
- Weekly trend charts (line chart for visitors, bar chart for revenue)
- Widgets: expiring memberships (D-7), unresolved tickets, error logs
- Responsive design for desktop
- Glassmorphism style with BCL orange (#FF6B00) accents"
```

### User Schedule
```
"BCL Portal User Schedule Screen
- Mobile-first design
- Weekly calendar view
- Session cards with: time, coach name, capacity (e.g. 12/15), difficulty level
- 'Book' button on each card
- Filter chips: coach, difficulty
- Bottom tab navigation highlighted
- Glassmorphism cards, dark mode
- BCL orange (#FF6B00) primary color"
```

---

**파일 용도**: Stitch AI 화면 개발 참조  
**최종 작성일**: 2026년 2월 16일  
**삭제 예정**: 개발 완료 후
