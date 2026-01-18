# 지점/시설 정보 (Facility Info)

## 1. 개요
- **경로**: `/admin/settings/facility`
- **아이콘**: `fa-store`
- **설명**: 센터의 명칭, 주소, 연락처, 운영 시간 등 기본 사업장 정보를 설정하는 화면입니다.

## 2. 주요 기능
- 대표자 정보 및 사업자 등록 번호 관리
- 오프라인 운영 시간 및 휴무일 설정
- 주소 검색 및 자동 입력 (**Daum Postcode API** 연동, 즉시 폼 제출 저장)
- 지도 표시용 위치 정보(위경도) 및 시설 사진 관리

## 3. UI 컴포넌트
- 지점 정보 입력 폼
- 운영 시간 설정 그리드
- 위치 확인용 지도 위젯

## 4. Database Requirements (DB Schema)

### 주요 테이블: `facilities`
지점 정보를 저장합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | 고유 식별자 (PK) |
| `name` | VARCHAR | 지점명 |
| `business_number` | VARCHAR | 사업자 번호 |
| `phone` | VARCHAR | 대표 연락처 |
| `address` | VARCHAR | 주소 |
| `latitude` | DECIMAL | 위도 |
| `longitude` | DECIMAL | 경도 |
| `operating_hours` | TEXT | 운영 시간 정보 (JSON 형식) |

### 추가 정보
설정값은 `app/Config/AppConfig.php` 또는 별도의 `settings` 테이블에 Key-Value 형태로 저장될 수도 있습니다.
