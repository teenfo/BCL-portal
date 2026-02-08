# Kiosk System Architecture

이 문서는 태블릿 전면 카메라를 활용한 무인 체크인 단말기(Kiosk)의 기술 설계 및 QR 연동 방식을 정의합니다.

---

## 1. QR 체크인 메커니즘 (User App ↔ Kiosk)

사용자 앱과 키오스크는 다음과 같은 프로세스로 실시간 체크인을 수행합니다.

### A) 데이터 공유 및 암호화
- **포맷**: `BCL_CHK:{user_id}:{expiry_timestamp}`
- **생성 (User App)**: 회원 본인의 ID와 5분 이내의 만료 시간을 담은 QR 코드를 동적으로 생성합니다.
- **검증 (Kiosk)**: QR 데이터에서 `user_id`를 추출하고, 만료 시간이 지나지 않았는지 확인 후 Supabase API를 통해 체크인 완료 처리.

---

## 2. 기술 스택 및 하드웨어 연동

### A) 카메라 제어 (Front Camera)
- **Web API**: `navigator.mediaDevices.getUserMedia`를 사용하여 브라우저에서 직접 카메라 스트림을 획득합니다.
- **QR 스캔 라이브러리**: `html5-qrcode` 또는 `react-qr-reader`를 사용하여 실시간 비디오 프레임 분석 및 디코딩을 수행합니다.

### B) 키오스크 전용 레이아웃
- **UI 모드**: 브라우저의 전체화면(Full-screen) 모드에 최적화된 1:1 비율의 스캔 영역 및 대형 가이드 UI.
- **피드백**: 스캔 성공 시 녹색 화면 전환 및 비프음(Audio Feedback), 실패 시 사운드 및 경고 텍스트 노출.

---

## 3. 라우팅 및 보안 정책

### A) 접근 경로
- `GET /kiosk`: 메인 대기 화면 (홍보/안내)
- `GET /kiosk/scan`: QR 스캔 화면 (카메라 구동)
- `GET /kiosk/success`: 체크인 성공 안내 및 회원 정보(이름, 남은 횟수) 요약 표시

### B) 보안
- **Kiosk 전용 권한**: 포털 관리자가 특정 관리자 계정으로 키오스크 모드를 최초 실행하며, 이후에는 일반 메뉴 접근이 불가능한 'Kiosk 전용 Layout'만 랜더링되도록 처리합니다.

---
> [!TIP]
> 태블릿을 키오스크로 활용할 경우, 브라우저의 '홈 화면에 추가'를 통해 PWA(Progressive Web App) 형태로 설치하면 주소창 없이 전체 화면을 활용할 수 있습니다.
