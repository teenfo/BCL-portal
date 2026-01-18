# 공지사항 (Notices)

## 1. 개요
- **경로**: `/admin/content/notices`
- **아이콘**: `fa-bullhorn`
- **설명**: 회원 앱 및 홈페이지에 노출될 중요한 공지사항을 작성하고 관리하는 화면입니다.

## 2. 주요 기능
- 공지사항 작성 및 예약 게시 설정
- 상단 고정(Pin) 공지 설정
- 중요도별 카주얼 분류 및 태그 관리

## 3. UI 컴포넌트
- 공지사항 목록 테이블
- WYSIWYG 에디터 (글쓰기 페이지)
- 조회수 및 게시 상태 통계

## 4. Database Requirements (DB Schema)

### 주요 테이블: `notices`
공지사항 데이터를 저장합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | 고유 식별자 (PK) |
| `title` | VARCHAR | 공지 제목 |
| `content` | TEXT | 공지 내용 (HTML/Markdown) |
| `author_id` | INT | 작성자 ID (users.id FK) |
| `is_pinned` | TINYINT | 상단 고정 여부 |
| `status` | VARCHAR | 게시 상태 (Draft, Published, Scheduled, Hidden) |
| `published_at` | DATETIME | 게시 시작 일시 |
| `view_count` | INT | 조회수 |
| `created_at` | DATETIME | 생성 일시 |
