# 회원 정보 항목 (Member Information Columns)

| 항목명 (Korean) | 컬럼명 (English) | 설명 (Description) |
| :--- | :--- | :--- |
| 회원번호 | `id` | 고유 회원 ID |
| 이름 | `username` | 로그인 및 표시용 이름 |
| 연락처 | `phone` | 휴대전화 번호 |
| 이메일 | `email` | 로그인 이메일 계정 |
| 상태 | `active` | 활성 여부 (TINYINT: 1=Active, 0=Inactive) |
| 플랜 | `plan_name` | 현재 이용 중인 멤버십 플랜 명 |
| 잔여횟수 | `remaining_count` | 남은 이용 횟수 (횟수제인 경우) |
| 가입일 | `created_at` | 회원 가입 일시 |
| 마지막 방문 | `last_visit_at` | 최근 체크인 또는 로그인 일시 |
| 메모 | `memo` | 관리자용 메모 |
| 회원권 시작일 | `membership_start_date` | 현재 멤버십 시작일 |
| 회원권 종료일 | `membership_end_date` | 현재 멤버십 만료일 |
| 회원권 타입 | `membership_type` | 멤버십 유형 (기간제, 횟수제 등) |
| 성별 | `gender` | 성별 (Male, Female, Other) |
| 생년월일 | `birthdate` | 생년월일 (YYYY-MM-DD) |
| 우편번호 | `zipcode` | 우편번호 |
| 주소 | `address` | 기본 주소 |
| 상세 주소 | `detail_address` | 상세 주소 |
| 마케팅 동의 | `marketing_consent` | 마케팅 수신 동의 여부 |
| 가입 경로 | `join_source` | 회원 가입 채널 |
| 사진 | `avatar` | 프로필 사진 경로 |
