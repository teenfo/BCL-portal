# Admin Portal Design Module Index (`/admin/*`)

이 문서는 관리자 포털의 업무 그룹별 상세 기획서를 연결하고, 플랫폼 전체의 기술적/운영적 공통 원칙을 정의합니다.

---

## 📂 업무 그룹별 기획서 (Sitemap)

관리자 기능은 다음 5대 논리 그룹으로 분할되어 관리됩니다.

1. **[운영 현황 및 리포트 (Insights)](./01-insights.md)**: 대시보드, 출석/매출 분석, 코치 성과 리포트.
2. **[회원 및 매출 관리 (User & Finance)](./02-finance.md)**: 회원 DB, 체크인 로그, 요금제 설계, 결제/정산 처리.
3. **[클래스 및 현장 운영 (Operations)](./03-operations.md)**: 수업 캘린더, 예약/대기열 제어, QR 인프라, 권한(RBAC) 관리.
4. **[콘텐츠 및 고객 소통 (CRM)](./04-crm.md)**: 공지사항, 스마트 알림 자동화, CS 문의 티켓 처리.
5. **[시스템 설정 및 보안 (Infrastructure)](./05-infrastructure.md)**: 지점 정보 설정, PG 연동, 보안 감사 로그 및 에러 모니터링.

---

## 🛠️ 기술 아키텍처 및 UI/UX 원칙 (Common)

### 기술 스택
- **Architecture**: Next.js CSR(Client Side Rendering) 기반 고밀도 데이터 인터페이스.
- **Data Layer**: Supabase SDK와 `admin` role 권한을 통한 실시간 데이터 동기화.
- **Security**: 모든 페이지는 `AuthGuard`를 통해 세션 유효성 및 관리자 권한을 상시 검증합니다.

### 디자인 원칙
- **High-Density Data**: 복잡한 행정 업무를 위해 화면당 정보 밀도를 높인 데이터 그리드 및 테이블 최적화.
- **Premium Dark Mode**: 장시간 작업 시 눈의 피로를 최소화하는 다크 그레이 팔레트 적용.

---

## 🚀 운영자 사용 가이드 요약 (Usage Guide)
- **일과 시작**: `Insights > 대시보드`에서 오늘의 주요 지표를 확인하세요.
- **긴급 대응**: 회원 앱의 예약 오류는 `Operations > 예약 관리`에서 수동 조정 가능합니다.
- **매출 확인**: 전일 정산 결과는 `Finance > 결제 내역`에서 트랜잭션 단위로 추적하세요.
 village
 village
