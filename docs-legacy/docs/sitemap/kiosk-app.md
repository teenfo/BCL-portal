# Kiosk Application Design Module (`/kiosk/*`)

이 문서는 시설 입구에 비치되어 무인 체크인을 관리하는 전용 단말기(Kiosk)의 화면 구조, 주요 기능 및 기술적 설계를 통합 관리하는 정본(SSOT) 기획서입니다.

---
> [!NOTE]
> 전체 서비스 구조 및 공통 라우팅 규칙은 [**Global Sitemap Index**](./README.md)를 참고하십시오.

## 📌 구현 상태

| 화면 | 경로 | Stitch Screen ID | 구현 상태 |
|---|---|---|---|
| Idle Screen | `/kiosk` | `3c3bec37638c4fc4aa6d322837c41c31` | ✅ 완료 |
| QR Scan | `/kiosk/scan` | `c72c51f6e6b54b9e9fee77192d2b6f5a` | ✅ 완료 |
| Success/Feedback | `/kiosk/success` | `c57595dbc36b4023b1dcf518c40d192e` | ✅ 완료 |

### Stitch 프롬프트 참조
- `.docs/stitch-prompts/apps/kiosk.md`

---

## 1. 🖥️ 화면 흐름 및 구조 (Flow)

키오스크는 사용자와의 상호작용이 없는 상태에서 대기 모드를 유지하다가, 접근 시 즉시 체크인 프로세스를 시작합니다.

### 1) Idle Screen (`/kiosk`)
- **Stitch Screen ID**: `3c3bec37638c4fc4aa6d322837c41c31`
- **파일**: `src/app/kiosk/page.tsx`
- **디자인**:
  - 전체 화면 Dark gradient 배경
  - 상단: BCL 로고 (좌측) + 현재 시각 (우측, HH:MM 대형)
  - 중앙: Pulse 애니메이션 터치 아이콘 + 대기 메시지 (DB 연동) + 서브 메시지
  - 하단: 영업시간 안내 + 공지사항 자동 슬라이드 (4초 간격)
- **기능**:
  - DB에서 `display_message` 로드 (Admin에서 설정 가능)
  - `notices` 테이블에서 공지사항 로드
  - Heartbeat: 30초 간격으로 `kiosk_devices.last_heartbeat` 업데이트
  - 화면 어디든 터치 → `/kiosk/scan` 이동

### 2) QR Scan (`/kiosk/scan`)
- **Stitch Screen ID**: `c72c51f6e6b54b9e9fee77192d2b6f5a`
- **파일**: `src/app/kiosk/scan/page.tsx`
- **디자인**:
  - 상단 헤더: Glassmorphism ← 취소 버튼 + "QR 체크인" + 시각
  - 중앙: 카메라 프리뷰 (500x500) + QR 가이드 코너 브라켓 (Primary 컬러)
  - 스캔 라인 애니메이션 (위아래 왕복)
  - 하단: 안내 메시지 + "스캔 중..." 상태 표시
- **기능**:
  - `getUserMedia` API로 카메라 접근 (후면 카메라 우선)
  - 카메라 불가 시 수동 코드 입력 모드 자동 전환
  - QR 코드 인식 → `qr_codes` 테이블 조회 → `check_ins` 테이블에 기록
  - 에러 시: 3초간 에러 오버레이 표시 후 재스캔
  - 30초 무동작 시 `/kiosk` 자동 복귀
- **상태 관리**:
  - `scanning`: 카메라 스캔 중
  - `processing`: QR 코드 검증 중 (스피너)
  - `error`: 인식 실패 (에러 메시지 + 자동 재시도)

### 3) Success/Feedback (`/kiosk/success`)
- **Stitch Screen ID**: `c57595dbc36b4023b1dcf518c40d192e`
- **파일**: `src/app/kiosk/success/page.tsx`
- **디자인**:
  - 배경: Dark + 은은한 초록 그라데이션
  - 대형 체크 아이콘 (초록, 페이드인+스케일업)
  - "체크인 완료!" (52px, 굵게) + 회원 이름 (Primary 컬러)
  - Glassmorphism 정보 카드 2장: 오늘 예약 + 남은 횟수
  - 하단: 카운트다운 텍스트 + 프로그레스 바
- **기능**:
  - URL 파라미터 `?member={id}`로 회원 정보 로드
  - `members` 테이블: 이름
  - `reservations` 테이블: 오늘 예약 (confirmed)
  - `memberships` + `plans` 테이블: 남은 횟수 + 플랜명
  - 5초 카운트다운 후 `/kiosk` 자동 복귀

---

## 2. 🛠️ 기술 아키텍처 및 보안

### 기술 설계
- **Camera Access**: 브라우저 `getUserMedia` API를 활용한 저지연 비디오 스트림 획득.
- **QR Decoding**: 클라이언트 측 자바스크립트 엔진을 통한 고속 데이터 파싱.
  - 현재: 데모용 수동 입력 모드 포함
  - 향후: `jsQR` 또는 `@aspect/qrcode-reader` 등 라이브러리 통합
- **Network**: Supabase 실시간 이벤트를 통해 출결 성공 즉시 관리자 포털에 로그 전송.
- **DB 연동**:
  - `kiosk_devices`: 대기 메시지, Heartbeat
  - `qr_codes`: QR 코드 검증 (code, member_id, facility_id)
  - `check_ins`: 체크인 기록 (method: 'kiosk')
  - `members`: 회원 정보
  - `reservations`: 오늘 예약
  - `memberships` + `plans`: 남은 횟수

### 보안 및 운영
- **PWA Mode**: 주소창과 네비게이션바가 없는 전체 화면 전용 모드로 구동.
- **단말기 보안**: 원격 메뉴 접근이 불가능하도록 키오스크 전용 경로 및 레이아웃 강제.
- **자동 복귀**: 모든 화면에서 일정 시간 경과 후 Idle 화면으로 자동 복귀

---

## 🚀 3. 키오스크 운영 가이드 (Kiosk Guide)
- **설치 위치**: 태블릿 전면 카메라가 가려지지 않도록 조명이 밝은 안내 데스크 전면에 배치하세요.
- **최초 실행**: 브라우저 접속 시 반드시 '카메라 접근 허용' 및 '홈 화면에 추가'를 실행하여 앱 모드(PWA)로 운영하세요.
- **관리 요령**: 인식률 저하를 방지하기 위해 주기적으로 카메라 렌즈 표면을 청결하게 유지하세요.

---

## 4. Admin 키오스크 관리 (연계)

Admin에서 키오스크를 관리하는 기능은 `/admin/operations/infrastructure`에서 제공합니다.
- 키오스크 기기 등록/수정/삭제
- 대기 화면 메시지 원격 설정
- 상태 모니터링 (Active/Offline/Maintenance)
- Heartbeat 모니터링

상세 내용: [Operations 모듈](./admin/03-operations.md) 참조
