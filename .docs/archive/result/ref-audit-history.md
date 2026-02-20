# 프로젝트 감사 이력 통합 리포트
(Project Audit History)

이 문서는 BCL Portal 프로젝트 진행 과정에서 수행된 각 모듈 및 시스템 단계별 점검(Audit) 내역을 압축 및 정리한 문서입니다.

---

## 1. Admin 기능 구현 점검 이력
**원본**: `ADMIN_FEATURE_AUDIT_2026-02-17.md` & `ADMIN_FEATURE_REAUDIT_2026-02-17.md`
**점검일**: 2026-02-17
**상태**: 100/100 (모든 미흡사항 재검증 완료)

### 주요 페이지별 점검 사항 및 이슈

| 업무 영역 | 라우트 | 상태 | 주요 구현 기능 점검 리스트 | ⚠️ 이슈 및 해결 내역 |
|:---|:---|:---:|:---|:---|
| **Insights** | `/admin/dashboard` | ✅ | 실시간 KPI 위젯, 트렌드 그래프, 위젯 관리 퀵 액션 카드 시스템 | 초기 AI 위젯 미구현 → Settings 분리로 해결됨 |
| | `/admin/insights/attendance` | ✅ | 기간별 조회(7/30/90일), 24시간 히트맵, 체크인 방식 분포 표시 | — |
| | `/admin/insights/finance` | ✅ | 월별 매출/환불 SVG Bar 차트, 카테고리별 분석, 성장률 | — |
| **User & Finance** | `/admin/members` | ✅ | 회원 통합 검색, 등급 필터, 프로필 상세 페이지 라우팅 적용 | 인터페이스-DB 구조 불일치(Memberships 조인) 해결됨 |
| | `/admin/memberships` | ✅ | 다중 멤버십 지원, 수동 생성/연장, 횟수권 크레딧 조정 등 | — |
| | `/admin/checkins` | ✅ | 실시간 로그 (최신순), 수동 출석 생성 기능, 방식별 분류 | — |
| | `/admin/plans` | ✅ | 플랜 타입 지원, 환급 규정/홀딩 정책, 가격 할인 적용 폼 | — |
| | `/admin/transactions` | ✅ | 트랜잭션 추적/상태 필터, 환불 위약금 로직 준비, 수단 표시 | — |
| **Operations** | `/admin/operations/schedule` | ✅ | 7일 주간 캘린더 그리드, 일/주간 뷰 토글, 코치 중복 제한 | 초기 일간 뷰만 존재 → 재검사에서 완벽 구현됨 |
| | `/admin/operations/coaches` | ✅ | 탭 구조 (관리/성과), 자격/전문분야 태그, 성과 KPI 집계 | — |
| | `/admin/operations/reservations`| ✅ | 세션별 예약 목록, 대기열 UI, 노쇼/수동 출석 관리 기능 | — |
| | `/admin/operations/race` | ✅ | 레이스 이벤트 생성, 리더보드 순위/필터 관리, PM5 기기 통제 | — |
| | `/admin/operations/infrastructure`| ✅ | 체크인 생성용 QR 생성, 키오스크 화면 원격 제어 토글 준비 | — |
| | `/admin/operations/roles` | ✅ | RBAC 역할(Admin/Manager/Staff), 읽기/쓰기 권한 제어 UI | 프론트 가드는 RLS 적용 후 추가하기로 함 |
| **CRM** | `/admin/crm/content` | ✅ | 공지 작성 및 권한 제어, 우선순위 색상. 배너 관리 탭 CRUD | 초기 플레이스홀더였으나 재검사 시 완벽 구현 확인 |
| | `/admin/crm/notifications` | ✅ | 발송 트리거 조건 UI, 예약/당일 발송 설정, 그룹 대상 필터 | — |
| | `/admin/crm/support` | ✅ | 1:1 CS 문의 목록 관리 (대기/처리/완료), FAQ 카테고리 템플릿| — |
| | `/admin/crm/feedback` | ✅ | 수업별 피드백, 1~5 별점 분포, 저평가 알림, 관리자 답변 작성 | — |
| **Infrastructure** | `/admin/setup/branch` | ✅ | 센터 지점 기본 정보, 이용약관, 요일별 운영시간 지정 폼 | — |
| | `/admin/setup/system` | ✅ | PG사 (토스, 나이스) 연동 키 정보, Webhook URL | — |
| | `/admin/setup/settings` | ✅ | 이미지 스토리지, 서버 .env 셋업, 설정 JSON 스냅샷 내보내기 | — |
| | `/admin/setup/audit` | ✅ | 액션 로그, 런타임 에러 시스템 | — |

---

## 2. DB Schema 및 보안, 연동 Audit 이력
**원본**: `DATABASE_SCHEMA_AUDIT_2026-02-17.md` & `admin-production-readiness-audit.md`
**점검일**: 2026-02-17
**마이그레이션**: 001~026 적용 + 보안 (027) 적용 완료

### 누락 스키마 추가 생성 완료 데이터 (Critical & Important)
- `session_feedback`, `race_events`, `race_records`, `pm5_devices`
- `admin_roles`, `admin_user_roles`, `notification_logs`, `membership_history`
- `kiosk_devices`, `qr_codes`, `audit_logs` 추가됨
- 컬럼 강화: 공지사항(`priority`, `is_published`), 플랜(`refund_policy`, `max_pauses` 등)

### RLS 보안 조치 및 성능 최적화 내역
| 이슈 내역 | 해결 방법 및 조치 내용 | 상태 |
|:---|:---|:---:|
| `lockers`, `notification_rules` 테이블 | `USING(true)`이던 과도 권한을 Admin 역할로 제한 처리 | ✅ 완 |
| `member_notes` 테이블 권한 오류 | user_metadata 참조를 버리고 profiles.role 기반 참조로 교체 | ✅ 완 |
| `auth_rls_initplan` 문제 | `auth.uid()` → `(select auth.uid())`로 RLS InitPlan 성능 패치 | ✅ 완 |
| Multiple Permissive Policies | Admin/User 환경 차이에 따른 구조적 불가피로 판단하고 룰 허용 | ℹ️ 유지 |

---

## 3. 사용자 앱 (User App) Production Audit 이력 점검표
**원본**: `user-app-production-audit.md`
**점검 대상**: 앱 내 전체 12개 페이지

### 페이지별 주요 평가 내역

| 앱 환경 라우트 경로 | 상태 | 구현 완료된 핵심 UI/기능 | ⚠️ 발생 문제 및 필요 조치 점검 로그 |
|:---|:---:|:---|:---|
| `/apps/dashboard` | 🔴 | 탑헤더, 퀵 링크 6종, 공지 UI | 로고 깨짐(svg 읽기 오류), Supabase RLS 406 에러(회원 정보 불가) |
| `/apps/schedule` | 🟡 | 날짜 캘린더, 필터칩, 세션 디자인 | 데이터 연동 안됨. 난이도/코치 필터 로직이 실제 반영 안됨 |
| `/apps/checkin` | 🟡 | QR 틀 제공, 30초 타이머, 진척도 | QR `qrcode.react` 미연동. 데이터 바인딩 추가 필요 |
| `/apps/facilities`| ✅ | 시설 카드 그리드 매핑 오픈 시간 | 100% 정상 작동 |
| `/apps/profile` | 🔴 | 로그아웃 버튼, 설정 리스트 메뉴 | `members` 테이블 RLS 권한 거부로 인해 사용자 이름 출력 불가 |
| `/apps/notifications`| ✅ | 상태 뱃지 아이콘, 목록 스크롤 | 데이터 호출 정상 작동 |
| `/apps/purchase` | 🟡 | 디자인 탭 기반 플랜 결제 플로우 | 결제 버튼 Mock → `tossPayments` 연동 실제 연계 모듈 필요 |
| `/apps/feedback` | ✅ | 글쓰기 기능, 별점 5점 기록 UI | 정상 작동 |
| `/apps/records` | ✅ | WOD 입력 스탯 지원 폼 및 차트 | 정상 작동 |
| `/apps/leaderboard` | ✅ | 3인 포디움 시각화, 리스트 목록 | 정상 작동 |
| `/apps/badges` | ✅ | 파이 기반 성취율, 배지 모달 디자인| 정상 작동 |
| `/apps/coaches` | 🔴 | 전문 분야 코치 설명 시트 화면 | `members` 테이블 내 `role='coach'` 데이터 누락 및 400 에러 |

> **종합 감사 판정**: UI 완성도는 매우 뛰어나나 (`81/100`), 회원 테이블을 비롯한 기반 DB 권한(`RLS`) 정책 문제 때문에 페이지 여러 곳에서 에러가 산발적으로 터지고 있으므로 긴급 데이터 접근 정책 수정이 요구됩니다.
