# 결제 연동 설정 (Payment Integrations)

## 1. 개요
- **경로**: `/admin/integrations/payments`
- **아이콘**: `fa-plug`
- **설명**: 외부 결제 PG사(전자결제대행사)와의 연동 정보 및 결제 수단 활성화 여부를 설정하는 화면입니다.

## 2. 주요 기능
- PG사 API Key, 상점 아이디(MID) 관리
- 사용 가능한 결제 수단(간편결제, 계좌이체 등) 선택 및 설정
- 테스트/실결제 모드 전환

## 3. UI 컴포넌트
- PG사 로고 리스트 및 연결 상태 배지
- API 자격 증명 입력 폼
- 결제 수단 활성화 토글 그룹

## 4. Database Requirements (DB Schema)

### 주요 테이블: `payment_configs`
PG사 연동 정보를 저장하며, 보안을 위해 민감 정보는 암호화됩니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | 고유 식별자 (PK) |
| `pg_provider` | VARCHAR | PG사 명칭 (Toss, KG_Inicis, Iamport 등) |
| `merchant_id` | VARCHAR | 상점 아이디 |
| `api_key` | TEXT | PG사 시크릿 키 (암호화) |
| `test_mode` | TINYINT | 테스트 모드 여부 |
| `is_active` | TINYINT | 활성 여부 |

### 연관 테이블: `payment_methods`
선택된 PG사에서 지원하는 개별 결제 수단 활성화 상태를 관리합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `config_id` | INT | payment_configs FK |
| `method_code` | VARCHAR | 수단 코드 (Card, VirtualAccount, Transfer 등) |
| `is_enabled` | TINYINT | 사용 가능 여부 |
