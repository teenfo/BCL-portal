# 회원 프로필 (Member Profile)

## 1. 개요
- **경로**: `/admin/members/{memberId}`
- **아이콘**: `fa-user`
- **설명**: 특정 회원의 상세 정보, 이용권 현황, 결제 내역 등을 관리하는 상세 화면입니다.

## 2. 주요 기능
- 회원 기본 정보 수정 (연락처, 사진, 메모 등)
- 보유 이용권/회원권 현황 조회 및 수동 조정
- 개인별 결제 내역 및 출석 이력 타임라인
- 블랙리스트 설정 및 회원 삭제/탈퇴 처리

## 3. UI 컴포넌트
- 프로필 요약 헤더 (회원 사진, 이름, 등급)
- 탭 메뉴 (개요, 이용권, 결제 로그, 출석 로그)
- 수정 폼 및 액션 버튼

[📄 회원 정보 항목 정의서 (Table Columns)](pages/members/member-list-table-columns.md)

## 5. 수정 가능 회원 정보 (Inline Editing)
> **💡 특징**: 별도 수정 모달 없이 텍스트를 클릭하면 즉시 입력 모드로 전환(`Inline Edit`)되며, 포커스 아웃 시 자동 저장(`AJAX`)됩니다.

1.  **기본 정보**
    *   **이름 (Username)**: 텍스트 입력
    *   **연락처 (Phone)**: 텍스트 입력
    *   **생년월일 (Birthdate)**: 날짜 선택기 (Date Picker)
    *   **성별 (Gender)**: 드롭다운 선택 (남성/여성/기타)
    *   **마케팅 수신 동의**: 토글 스위치 (ON/OFF)
3.  **주소 정보**
    *   **우편번호 (Zipcode)**: **[주소 찾기]** 버튼 클릭 시 Daum 우편번호 팝업 호출
    *   **주소 (Address)**: 팝업에서 선택 시 자동 입력 및 즉시 서버 저장
    *   **상세주소 (Detail Address)**: 텍스트 입력 (수동 업데이트 권장)
3.  **관리자 메모 (Memo)**
    *   클릭 시 Textarea로 확장되어 줄바꿈 포함 내용 입력 가능
4.  **프로필 사진 (Avatar)**
    *   프로필 이미지 우측 하단 **(+) 버튼** 클릭 시 업로드 모달 호출
    *   이미지 선택 즉시 비동기 업로드 및 미리보기 갱신

## 6. 추가된 데이터 필드 (DB Schema)
| 필드명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `avatar` | VARCHAR(255) | 프로필 이미지 경로 |
| `phone` | VARCHAR(20) | 연락처 |
| `gender` | VARCHAR(10) | 성별 (male, female, other) |
| `birthdate` | DATE | 생년월일 |
| `zipcode` | VARCHAR(20) | 우편번호 |
| `address` | VARCHAR(255) | 기본 주소 |
| `detail_address` | VARCHAR(255) | 상세 주소 |
| `memo` | TEXT | 관리자 메모 |
| `marketing_consent` | TINYINT(1) | 마케팅 정보 수신 동의 여부 |
| `join_source` | VARCHAR(100) | 가입 경로 (유입 경로) |
| `plan_name` | VARCHAR(100) | 현재 이용권 명칭 (회원 테이블에 요약 저장) |
| `remaining_count` | INT | 잔여 이용 횟수 |
| `membership_end_date` | DATE | 이용권 만료일 |

## 7. 구현 내역 (CI4)
*   **Controller**: `MembersController`
    *   `updateField($id)`: 개별 필드 비동기 업데이트 (JSON 응답)
    *   `uploadAvatar($id)`: 이미지 유효성 검사 및 업로드 처리
*   **View**: `admin/members/show.php`
    *   `jQuery` 기반의 Click-to-Edit 이벤트 핸들러 구현
    *   **Daum Postcode API** 연동 (팝업 선택 시 자동 닫기 및 즉시 저장 지원)
    *   CSRF 토큰 자동 갱신 로직 포함 (보안 강화)
## 5. 수정 가능 회원 정보
- 이름
- 연락처
- 생년월일
- 성별
- 주소
- 이메일
- 사진
- 메모
- 블랙리스트 설정
- 회원 삭제/탈퇴 처리

## 6. CI4 구현  
- [ ] 