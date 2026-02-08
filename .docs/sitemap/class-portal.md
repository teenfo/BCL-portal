# Class Portal Design Module (`/class/*`)

이 문서는 센터 내 대형 스크린(TV/모니터)에 실시간 운동 정보를 송출하는 클래스 포털의 화면 구조와 기술 설계를 관리합니다.

---
> [!NOTE]
> 전체 서비스 구조 및 공통 라우팅 규칙은 [**Global Sitemap Index**](./README.md)를 참고하십시오.


## 1. 🖥️ 주요 화면 구조

### 1) WOD Board (`/class/wod`)
- **실시간 게시판**: 오늘 진행되는 WOD(Workout of the Day) 정보를 대형 텍스트로 노출.
- **운동 구성**: 라운드수, 동작 목록, 시간 제한(Time Cap) 등을 시각화.

### 2) Leaderboard (`/class/leaderboard`)
- **실시간 기록**: 회원들이 모바일 앱으로 입력한 운동 기록을 즉시 정렬하여 표시.
- **순위 정렬**: 성별, 연령대, 기록 타입(For Time, AMRAP)에 따른 자동 랭킹 시스템.

### 3) Timer (`/class/timer`)
- **클래스 타이머**: 카운트다운(Count Down), 카운트업(Count Up), 에이팹(EMOM/Tabata) 타이머 기능.
- **원격 제어**: 코치 앱에서 타이머 시작/종료를 실시간으로 조작 가능.

### 4) Live Hub (`/class/live`)
- **라이브 대시보드**: 수업 중인 회원들의 실시간 심박수 또는 레이스 기록을 통합하여 중계.

---

## 2. 🛠️ 기술 아키텍처 및 UI 원칙

### 기술 스택
- **Architecture**: Next.js CSR 기반의 고정 화면 인터페이스.
- **Real-time**: Supabase 브로드캐스트 또는 Realtime Subscription을 통한 초저지연 데이터 업데이트.
- **Display**: TV/대형 모니터 시청 거리(3~5m)를 고려한 초대형 폰트 및 고대비(High Contrast) 디자인.

### 디자인 원칙
- **Visibility First**: 멀리서도 한눈에 들어오는 가독성 중심의 레이아웃.
- **Dark Background**: 눈의 피로도를 낮추고 텍스트 집중도를 높이기 위한 블랙 배경 지향.

---

## 🚀 3. 운영자 가이드 요약 (Class Guide)
- **화면 전환**: 코치 앱이나 관리자 페이지에서 현재 TV에 띄울 모드(WOD/타이머/리더보드)를 원격으로 전환할 수 있습니다.
- **안정성**: 장시간 구동 시 브라우저 절전 모드가 활성화되지 않도록 단말기 설정을 확인하세요.
