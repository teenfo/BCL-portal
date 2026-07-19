# Kiosk Application Stitch 생성 프롬프트

## 메타데이터
- **Screen IDs**:
  - Idle Screen: `3c3bec37638c4fc4aa6d322837c41c31`
  - QR Scan Screen: `c72c51f6e6b54b9e9fee77192d2b6f5a`
  - Success Screen: `c57595dbc36b4023b1dcf518c40d192e`
- **생성일**: 2026-02-18
- **Device Type**: TABLET
- **경로**: `/kiosk`, `/kiosk/scan`, `/kiosk/success`
- **Sitemap 참조**: `.docs/sitemap/kiosk-app.md`

---

## 디자인 테마 (고정)
- Color Mode: DARK
- Font: Lexend
- Roundness: 8px (ROUND_EIGHT)
- Primary Color: #ff6a00
- Saturation: 2

---

## 1. Idle Screen (대기 화면) 프롬프트

```
Tablet 기반 키오스크 대기 화면(Idle Screen)을 생성해주세요.

**화면 정보**:
- 화면명: Kiosk Idle Screen (대기 화면)
- 경로: `/kiosk`
- Device: TABLET (10-12인치, 가로 모드)
- 목적: 지점 입구에 비치된 무인 체크인 단말기의 대기 화면

**레이아웃 및 주요 기능**:
1. 전체 화면 (Navigation 없음, Full Screen)
   - 배경: Dark gradient (블랙 → 다크 그레이)
2. 상단: BCL 로고 (좌측), 현재 시각 (우측, HH:MM)
3. 메인: 터치 아이콘 (Pulse 애니메이션) + 메인 메시지 + 서브 메시지
4. 하단: 영업시간 안내 + 공지사항 슬라이드

**디자인 세부사항**:
- 터치 애니메이션 아이콘: 맥동 효과 (Pulse)
- Glassmorphism 메시지 영역
- 큰 터치 가능 영역 (전체 화면)
```

---

## 2. QR Scan Screen (스캔 화면) 프롬프트

```
Tablet 기반 키오스크 QR 스캔 화면을 생성해주세요.

**화면 정보**:
- 화면명: Kiosk QR Scan Screen
- 경로: `/kiosk/scan`
- Device: TABLET (10-12인치, 가로 모드)
- 목적: 회원 QR 코드 카메라 스캔으로 체크인

**레이아웃**:
1. 상단 헤더: ← 취소 버튼 (Glassmorphism) + "QR 체크인" 타이틀 + 시각
2. 카메라 프리뷰 (70%): QR 가이드 박스 (Primary 컬러 모서리 브라켓)
3. 하단 안내: 사용법 안내 + 스캔 상태 표시

**디자인 세부사항**:
- QR 가이드 박스: Primary 컬러 코너 브라켓, 스캔 라인 애니메이션
- 에러/프로세싱 오버레이 상태
- 수동 입력 모드 폴백
```

---

## 3. Success Screen (성공 화면) 프롬프트

```
Tablet 기반 키오스크 체크인 성공 화면을 생성해주세요.

**화면 정보**:
- 화면명: Kiosk Success Screen
- 경로: `/kiosk/success`
- Device: TABLET (10-12인치, 가로 모드)
- 목적: 체크인 완료 후 회원 정보 및 성공 메시지 표시

**레이아웃**:
1. 성공 아이콘: 대형 체크 아이콘 (✓, 초록 원형, 페이드인+스케일업)
2. 메인 메시지: "체크인 완료!" + 회원 이름 (Primary 컬러) + 환영 메시지
3. 정보 카드: 오늘 예약 (캘린더 아이콘) + 남은 횟수 (체크 아이콘)
4. 카운트다운: "5초 후 자동 복귀..." + 프로그레스 바

**디자인 세부사항**:
- 초록 그라데이션 배경 (성공 느낌)
- Glassmorphism 카드 스타일
- 카운트다운 프로그레스 바
```

---

## 생성 결과
- **상태**: 성공
- **수정 횟수**: 0 (초기 생성)
- **최종 확정일**: 2026-02-18

---

## 참조 화면
- Leaderboard (`/class/leaderboard`) - 독립 전체 화면 패턴 참조
- Admin Infrastructure (`/admin/operations/infrastructure`) - 키오스크 관리 데이터 참조
