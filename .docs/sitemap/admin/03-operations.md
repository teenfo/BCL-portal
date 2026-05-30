# Admin Portal - 클래스 및 현장 운영 (Operations)

본 모듈은 매일 반복되는 수업 스케줄링과 현장 인프라(QR, 키오스크)의 실시간 상태를 관리합니다.

---
> [!NOTE]
> 공통 기술 아키텍처 및 디자인 원칙은 [**Admin Index (README)**](./README.md)를 참고하십시오.


## 🖥️ 주요 화면 및 기능

### 1. 지능형 수업 캘린더 (`/admin/operations/schedule`)
- **드래그 앤 드롭**: 주간 캘린더 화면에서 원하는 시간을 클릭하여 세션 생성 및 시간 조정.
- **다중 코치 배정**: 세션별 여러 명의 담당 코치 선택 배정 가능 (메인/보조 코치 순차 배정 및 중복 방지 검증 포함).
- **지능형 WOD 연동 및 커스터마이징**: 데이터베이스에 등록된 벤치마크 WOD 템플릿 선택 기능 및 측정 방식(For Time, AMRAP, EMOM 등)에 따른 타임캡 설정 제공. 템플릿 외 동작 직접 수동 입력 및 세션 개별 오버라이드 지원.
- **정원 규칙**: 지점 규모에 따른 예약 최대 정원 및 대기(Waitlist) 수 설정.

### 2. 코치 관리 (`/admin/operations/coaches`) 🆕
- **탭 구조**: "코치 관리"(기본 탭)와 "성과 분석" 탭으로 구성.
- **[코치 관리 탭]**:
  - **코치 목록**: 전체 코치 조회 및 검색.
  - **코치 등록/수정**: 
    - **Step 1: 회원 선택**: `profiles` 테이블 검색을 통한 기존 회원 연결 (RBAC 권한 승격 연동)
    - **Step 2: 코치 정보**: 전화번호, 전문 분야, 바이오, 프로필 이미지
  - **계정 연결 상태**: 🔗 연결됨 (Auth 계정 있음) / ⚠️ 미연결 (레거시 또는 수동 등록용) 표시
  - **상태 필터**: 전체 / 활동중 / 비활성 / 휴직
- **[성과 분석 탭]** *(Insights에서 통합)*:
  - **KPI 카드**: 활성 코치 수, 평균 평점, 총 수업 수, 평균 유지율
  - **코치 랭킹**: 평점순 / 수업순 / 회원순 정렬 지원
  - **Top Performer**: 최고 성과 코치 하이라이트
  - **전문 분야 분포**: 전문 분야별 코치 수 시각화
- **급여/수당 관리**: 수업당 수당 설정 및 월간 정산 금액 계산.

### 3. 실시간 예약/대기 관리 (`/admin/operations/reservations`)
- **명단 조정**: 특정 세션의 예약 확정자 명단 확인 및 관리자에 의한 강제 대기열 우선순위 변경.
- **노쇼 통제**: 수업 시작 전까지 체크인하지 않은 인원에 대한 경고 또는 페널티(횟수 차감 등) 부여.

### 4. Race 관리 (`/admin/operations/race`) 🆕
- **Race 이벤트 생성**: 
  - 이벤트명, 날짜, 종목 (Rowing, Bike, SkiErg 등)
  - 거리 또는 시간 설정
- **PM5 기기 관리**: 
  - 기기 등록 (시리얼 번호, 지점)
  - 기기 상태 모니터링 (연결/오프라인)
  - 펌웨어 업데이트 관리
- **기록 통계**: 
  - 이벤트별 전체 참가자 기록
  - 연간 리더보드 (종목별, 성별)
  - 개인 PR (Personal Record) 조회

### 5. 락커 관리 (`/admin/operations/lockers`) 🆕
- **KPI 카드**: 전체 락커 수, 사용 중, 빈 락커, 만료 예정 (7일 이내)
- **락커 목록 테이블**:
  - 락커 번호, 크기 (S/M/L), 상태 (사용가능/사용중/고장/정비중)
  - 현재 배정 회원, 시작일, 종료일
  - 필터: 전체 / 사용가능 / 사용중 / 만료예정 / 고장
  - 검색: 락커 번호, 배정 회원명
- **락커 배정 (모달)**:
  - 회원 선택 (검색), 시작일/종료일 지정
  - 자동으로 `members` 테이블의 `locker_number`, `locker_end_date` 갱신
- **락커 해제**:
  - 배정 해제 시 해당 회원의 `locker_number`, `locker_end_date` 초기화
- **락커 등록/수정 (모달)**:
  - 락커 번호, 크기, 월별 이용료, 비고

### 6. 현장 인프라 제어 (`/admin/operations/infrastructure`)
- **고정 QR생성**: 센터 입구에 비치할 상시 체크인용 QR 코드 생성 및 다운로드.
- **키오스크 원격 제어**: 각 지점에 설치된 키오스크 기기 관리
  - **KPI 카드**:
    - 전체 기기 수
    - 활성 (Active) 기기 수
    - 오프라인 (Offline) 기기 수
    - 정비 중 (Maintenance) 기기 수
  - **키오스크 목록 테이블**:
    - 기기명, 지점, 상태, IP 주소, 최종 연결 시간
    - 상태 표시: Active (초록), Offline (빨강), Maintenance (노랑)
    - Last Heartbeat: "방금 전", "5분 전", "2일 전" 등 상대 시간 표시
  - **키오스크 등록/수정 모달**:
    - 기기명 (예: Kiosk-Main-01)
    - 지점 선택 (Facilities 연동)
    - IP 주소 (선택, 예: 192.168.1.10)
    - 상태 선택 (Active / Offline / Maintenance)
    - 대기 화면 메시지 설정
  - **원격 메시지 설정**:
    - 채팅 아이콘 버튼으로 별도 모달 오픈
    - 키오스크 대기 화면에 표시될 커스텀 메시지 설정
    - 예: "환영합니다! 화면을 터치하세요", "현재 점검 중입니다" 등
  - **액션 버튼**:
    - 메시지 설정 (IconChat): display_message 업데이트
    - 수정 (IconEdit): 기기 정보 수정
    - 삭제 (IconTrash): 기기 삭제 (확인 다이얼로그)
  - **DB 연동**:
    - `kiosk_devices` 테이블 실시간 조회
    - `facilities` JOIN으로 지점명 표시
    - CRUD 모두 DB 연동 완료

### 7. WOD Templates 관리 (`/admin/operations/wod-templates`) 🆕
- **스코프 필터**: Benchmark(글로벌) / Facility(지점별) / Shared(공유) 3종 스코프로 템플릿 분류 조회
- **템플릿 카드 목록**:
  - 제목, WOD 종류(Kind), 포맷 규격(Format), Time Cap, Rounds 표시
  - 카테고리별 color-coded 운동 칩셋 (최대 3개 + 나머지 수 표시)
  - BENCHMARK / SHARED 뱃지
  - 선택된 카드 오렌지 하이라이트 (마스터-디테일 패턴)
- **편집 패널 (480px 고정 우측)**:
  - 생성(Create) / 수정(Edit) 모드 자동 전환
  - **기본 정보**: 제목, WOD 종류, 포맷 규격, Time Cap, Rounds, 배정 시설
  - **공유 설정**: 타 지점 공유 허용 토글 (`is_shared`), 공식 벤치마크 WOD 토글 (`is_benchmark`)
  - **노트**: Public Notes(회원 공개), Coach Notes(코치 전용), WOD 상세 설명
  - **Movement Lines**: 운동 동작 라인 편집 (동작명, Target 값·단위, Rx Load ♂♀, RX/Scaling 노트 슬라이드 패널)
    - 라이브러리 연결 동작 또는 커스텀 텍스트 입력 지원
    - 순서 이동(위/아래) 및 삭제 액션 버튼
    - `station_circuit` 포맷 시 "Station N", 그 외 "Movement N" 라벨 자동 전환
  - **운동 라이브러리 검색기**: 검색어 + 카테고리 필터 → 클릭 시 Movement Line으로 추가
  - **저장/게시**: 임시 저장(draft) / WOD 게시(publish) 2단계 액션
  - **삭제**: 2단계 확인 인라인 UI (confirm 클릭 → 빨간 확인 버튼 활성화)
- **DB 연동**:
  - `fn_list_wod_templates(p_scope, p_facility_id)` — 목록 조회
  - `fn_upsert_wod_template(p_payload)` — 생성/수정
  - `fn_search_wod_movements(p_query, p_category)` — 라이브러리 검색
  - `wod_templates` 직접 삭제 (RLS 보호)
- **관련 테이블**: `wod_templates`, `wod_template_movements`, `movement_library`

### 8. 운영진 권한 관리 (RBAC) (`/admin/operations/roles`)
- **역할 정의**: 최고 관리자(Admin), 지점장(Manager), 데스크 스탭(Staff) 등 등급 설정.
- **접근 통제**: 역할에 따른 메뉴 노출 여부 및 쓰기/읽기 권한 차등 부여.

### 9. 운동 라이브러리 관리 (`/admin/operations/movement-library`) 🆕 P26
- **접근 권한**: `admin` + `coach` 모두 수정 가능
- **Stitch Screen ID**: `10474725662829453547` (sessionId)
- **KPI 요약**: 전체 운동 수 / 활성 수 / 비활성 수
- **카테고리 탭 필터**: 전체 + 카테고리 DB(`movement_categories`)에서 동적 렌더링
- **상태 필터**: 전체 / 활성 / 비활성
- **검색**: 동작명(KO/EN) 또는 slug 300ms debounce 검색
- **운동 목록 테이블**:
  - 썸네일 (이미지 또는 카테고리 약어 폴백)
  - 한국어명 / 영어명 / 카테고리 badge (color-coded) / 난이도 별점 / WOD 사용 수 / 활성 상태 dot
  - 비활성 행 opacity-50
  - 선택 행 오렌지 왼쪽 border
- **편집 패널 (480px 고정 우측)**:
  - ① 기본 정보: name_ko, name_en, slug (자동 생성 + 중복 검증), 카테고리, source_tag, 난이도(★1-5), 활성 토글
  - ② 미디어: thumbnail_url + 미리보기, video_url + 영상 열기 링크
  - ③ 상세 정보: equipment 다중 체크박스 (11개), primary_muscles 태그, coaching_points 텍스트에어리어
  - ④ 메타 (읽기 전용): WOD 사용 현황
- **삭제**:
  - WOD 사용 수 > 0 시 경고 배너 표시
  - 2단계 확인 (삭제 아이콘 → 취소/확인 삭제)
  - 삭제 대신 비활성화 권장
- **카테고리 인라인 추가**: 패널 내 "+ 카테고리 추가" 버튼 → 모달로 즉시 카테고리 생성
- **DB 연동**:
  - `fn_list_movement_library(p_query, p_category, p_is_active)` — 목록 조회
  - `movement_library` 직접 INSERT/UPDATE/DELETE (RLS 보호: admin+coach)
  - `movement_categories` 조회 + 카테고리 추가 (RLS 보호)
- **관련 테이블**: `movement_library`, `movement_categories`, `wod_template_movements`



