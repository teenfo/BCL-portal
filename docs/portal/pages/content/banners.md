# 운영 공지/배너 (Banners)

## 1. 개요
- **경로**: `/admin/content/banners`
- **아이콘**: `fa-image`
- **설명**: 앱 메인 화면의 슬라이드 배너나 팝업 공지 등을 시각적으로 관리하는 화면입니다.

## 2. 주요 기능
- 배너 이미지 업로드 및 랜딩 페이지(URL) 연결
- 배너 노출 순서 자동/수동 조정
- 특정 기간(이벤트 기간 등)에만 노출되도록 하는 스케줄링

## 3. UI 컴포넌트
- 배너 카드 그리드 (DND 순서 변경 지원)
- 이미지 미리보기 컴포넌트
- 노출 기간 설정 달력

## 4. Database Requirements (DB Schema)

### 주요 테이블: `banners`
배너 및 팝업 설정 정보를 저장합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | 고유 식별자 (PK) |
| `title` | VARCHAR | 배너 관리 명칭 |
| `image_url` | VARCHAR | 이미지 파일 경로 |
| `link_url` | VARCHAR | 클릭 시 이동할 URL |
| `sort_order` | INT | 노출 순서 |
| `start_date` | DATETIME | 노출 시작 일시 |
| `end_date` | DATETIME | 노출 종료 일시 |
| `is_active` | TINYINT | 활성화 여부 |
| `position` | VARCHAR | 노출 위치 (MainTop, Popup, Side) |
