# 데이터 내보내기/가져오기 (Data Import/Export)

## 1. 개요
- **경로**: `/admin/integrations/data`
- **아이콘**: `fa-file-csv`
- **설명**: 대량의 회원 정보, 수업 데이터 등을 CSV 파일 형태로 일괄 등록(Import)하거나 백업용으로 다운로드(Export)하는 화면입니다.

## 2. 주요 기능
- CSV/Excel 템플릿 제공 및 데이터 유효성 검사
- 수천 건 이상의 데이터 대량 등록 프로세스 (Progress Bar 제공)
- 특정 조건에 맞는 데이터 일괄 엑셀 다운로드

## 3. UI 컴포넌트
- 파일 업로드 드롭존 (Dropzone)
- 데이터 매핑 확인 테이블
- 처리 현황 프로그레스 바

## 4. Database Requirements (DB Schema)

### 로그 테이블: `data_jobs`
대량 데이터 처리 이력을 관리합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | 고유 식별자 (PK) |
| `job_type` | ENUM | 작업 유형 (Import, Export) |
| `entity_type` | VARCHAR | 대상 테이블 (Users, Payments, Sessions 등) |
| `file_path` | VARCHAR | 처리된 파일 경로 |
| `total_rows` | INT | 전체 행 수 |
| `processed_rows` | INT | 처리 완료 행 수 |
| `status` | ENUM | 상태 (Pending, Processing, Completed, Failed) |
| `errors` | TEXT | 실패한 행의 상세 사유 (JSON) |
| `created_by` | INT | 작업 관리자 ID |
