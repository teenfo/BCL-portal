# 게시글 관리 (Posts Management)

## 1. 개요
- **경로**: `/admin/content/posts`
- **아이콘**: `fa-edit`
- **설명**: 회원 커뮤니티나 공식 블로그 성격의 게시글들을 통합 관리하는 화면입니다.

## 2. 주요 기능
- 전체 게시글 조회 및 카테고리별 필터링
- 부적절한 게시글의 숨김/삭제 처리
- 게시글별 첨부파일 및 미디어 관리

## 3. UI 컴포넌트
- 게시글 목록 테이블
- 게시글 상세 보기 팝업
- 검색/필터 그룹

## 4. Database Requirements (DB Schema)

### 주요 테이블: `posts`
커뮤니티 또는 블로그 게시글 정보를 저장합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | 고유 식별자 (PK) |
| `category_id` | INT | 카테고리 ID |
| `user_id` | INT | 작성자 회원 ID (users.id FK) |
| `title` | VARCHAR | 게시글 제목 |
| `content` | TEXT | 게시글 내용 |
| `status` | ENUM | 상태 (Active, Hidden, Deleted) |
| `comment_count` | INT | 댓글 수 (Denormalized) |
| `created_at` | DATETIME | 작성 일시 |

### 연관 테이블
- `post_categories`: 게시판 카테고리 정의
- `post_attachments`: 게시글 관련 이미지/파일 첨부 정보
