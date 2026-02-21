# Class Portal Design Module (`/class/*`)

이 문서는 센터 내 대형 스크린(TV/모니터)에 실시간 운동 정보를 송출하는 클래스 포털의 화면 구조와 기술 설계를 관리합니다.

---
> [!NOTE]
> 전체 서비스 구조 및 공통 라우팅 규칙은 [**Global Sitemap Index**](./README.md)를 참고하십시오.


## 1. 🖥️ 주요 화면 구조

### 1) WOD Board (`/class/wod`) ✅ 구현 완료
- **구현 파일**: `src/app/class/wod/page.tsx`
- **실시간 게시판**: 오늘 진행되는 WOD(Workout of the Day) 정보를 대형 텍스트로 노출.
- **운동 구성**: 라운드수, 동작 목록, 시간 제한(Time Cap) 등을 시각화.

### 2) Leaderboard (`/class/leaderboard`) ✅ 구현 완료 (DB 연동)
- **구현 파일**: `src/app/class/leaderboard/page.tsx`
- **실시간 기록**: race_events + race_records 기반 실 DB 연동.
- **순위 정렬**: For Time / AMRAP / Weight 타입별 필터 지원.

### 3) Timer (`/class/timer`) ✅ 구현 완료
- **구현 파일**: `src/app/class/timer/page.tsx`
- **클래스 타이머**: Countdown, Count Up, EMOM, Tabata 4가지 모드.
- **오디오 비프**: Web Audio API 기반 3-2-1 카운트다운, 라운드 전환 비프 지원.
- **원격 제어**: 코치 앱에서 타이머 시작/종료를 실시간으로 조작 가능 (향후 Supabase Broadcast 연동).

### 4) Live Hub (`/class/live`) ✅ 구현 완료
- **구현 파일**: `src/app/class/live/page.tsx`
- **라이브 대시보드**: 현재 진행 중인 세션 감지, 체크인 회원 실시간 표시.

### 5) 2.5D Race View (`/class/race/view`) ✅ 구현 완료
- **구현 파일**: `src/app/class/race/view/page.tsx`
- **Stitch Screen ID**: `972e51977bcb42b198f7f9fb70b96ef2`
- **Device Type**: Desktop (TV/대형 모니터)
- **CSS 3D perspective 트랙**: LERP 기반 60fps 보간, 로잉 스프라이트, 워터 파티클.
- **HUD**: 실시간 리더보드, 타이머, 연결 상태 표시.
- **에지 케이스**: 1위 글로우 이펙트, 오프라인 Grayscale, 완주 시 🏆 포디움 오버레이.
- **상세 설계**: [Race 시스템 기획서](../archive/planning/race-system.md) 참조.

### 6) ERG 실시간 그리드 (`/class/race/run`) ✅ 구현 완료
- **구현 파일**: `src/app/class/race/run/page.tsx`
- **Device Type**: Desktop (TV/대형 모니터)
- **useRaceRealtime 훅**: Supabase Broadcast + Polling 하이브리드.
- **데이터 그리드**: 참가자별 거리, 파워, SPM, 심박수 실시간 표시 + 자동 순위.
- **팀 스코어보드**: 팀전 시 팀별 총 거리 합산 표시.

### 7) Race 결과 리더보드 (`/class/race/result`) ✅ 구현 완료
- **구현 파일**: `src/app/class/race/result/page.tsx`
- **Device Type**: Desktop (TV/대형 모니터)
- **포디움 뷰**: 1/2/3위 메달 카드 + 전체 순위 테이블.
- **다각도 컴피티션**: 거리/Max Watts/SPM/HR 탭 전환으로 다각도 스코어링.
- **PR 배지**: Personal Record 판정 시 🏆 PR 뱃지 표시.

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
