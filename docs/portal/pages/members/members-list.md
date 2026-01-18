# 회원 목록 (Members List)

## 1. 개요
- **경로**: `/admin/members`
- **아이콘**: `fa-users`
- **설명**: 등록된 전체 회원을 조회하고 관리하는 리스트 화면입니다.

## 2. 주요 기능
- 회원 검색 및 필터링 (이름, 상태, 플랜 등)
- 회원 등록 버튼 (생성 폼 이동)
- 회원 리스트 페이징 및 정렬
- 회원 상세 프로필로 이동
- 회원 블랙리스트 버튼 (블랙리스트 추가)

## 3. UI 컴포넌트
- 상단 검색바 및 필터 그룹
- 회원 목록 테이블 (Data Table)
- 회원 상태 배지 (Active, Expired 등)

## 4. CI4 구현 컨텍스트
- Controller: `app/Controllers/Admin/MembersController.php`
- View: `app/Views/admin/members/index.php`
- Route: `app/Config/Routes.php`에 `/admin/members` 라우트 추가
- Model: `app/Models/UserModel.php` (CI4 Shield 기본 모델 사용)

## 5. 버튼별 주요 액션
 - 회원 등록 버튼: 회원 등록 폼을 모달로 표시, 저장 버튼을 모달에 표시 하고, 저장 버튼을 클릭시  `app/Controllers/Admin/MembersController.php`의 `create()` 메서드 호출
 - 회원 상세 버튼: 회원의 상세 페이지로 이동, `app/Controllers/Admin/MembersController.php`의 `show($id)` 메서드 호출
 - 회원 수정 버튼: 회원의 수정 폼을 모달로 표시, 저장 버튼을 모달에 표시 하고, 저장 버튼을 클릭시  `app/Controllers/Admin/MembersController.php`의 `edit($id)` 메서드 호출
 - 회원 삭제 버튼: 회원의 삭제 버튼을 클릭시 확인 모달을 표시 하고, 확인 버튼을 클릭시 `app/Controllers/Admin/MembersController.php`의 `delete($id)` 메서드 호출
 - 회원 상태 변경 버튼: 회원의 상태 변경 버튼을 클릭시 확인 모달을 표시 하고, 확인 버튼을 클릭시 `app/Controllers/Admin/MembersController.php`의 `updateStatus($id)` 메서드 호출
 - 회원 검색 버튼: 회원의 검색 버튼을 클릭시  `app/Controllers/Admin/MembersController.php`의 `search()` 메서드 호출   
 - 회원 필터 버튼: 회원의 필터 버튼을 클릭시 확인 모달을 표시 하고, 확인 버튼을 클릭시 `app/Controllers/Admin/MembersController.php`의 `filter()` 메서드 호출
 - 회원 페이징 버튼: 회원의 페이징 버튼을 클릭시  `app/Controllers/Admin/MembersController.php`의 `paginate()` 메서드 호출
 - 회원 정렬 버튼: 회원의 정렬 버튼을 클릭시  `app/Controllers/Admin/MembersController.php`의 `sort()` 메서드 호출
 - 회원 권한 변경 버튼: 회원의 권한 변경 버튼을 클릭시 확인 모달을 표시 하고, 확인 버튼을 클릭시 `app/Controllers/Admin/MembersController.php`의 `updateRole($id)` 메서드 호출
 - 회원 블랙리스트 버튼: 회원의 블랙리스트 버튼을 클릭시 확인 모달을 표시 하고, 확인

## 6. 회원 정보 항목
[📄 회원 정보 항목 정의서 (Table Columns)](pages/members/member-list-table-columns.md)