# 댓글/신고 관리 (Moderation)

## 1. 개요
- **경로**: `/admin/content/moderation`
- **아이콘**: `fa-flag`
- **설명**: 게시글에 달린 댓글을 모니터링하고, 회원들이 신고한 부적절한 콘텐츠를 처리하는 화면입니다.

## 2. 주요 기능
- 민원/신고가 접수된 콘텐츠 우선 순위 노출
- 댓글 일괄 삭제 및 작성자 경고/차단 조치 연동
- 금지 단어/스팸 필터링 규칙 설정

## 3. UI 컴포넌트
- 신고 접수 리스트 (Status: Pending, Resolved)
- 콘텐츠 대조 확인 뷰
- 처리 사유 입력 폼

## 4. Database Requirements (DB Schema)

### 주요 테이블: `post_reports`
콘텐츠 신고 내역을 저장합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | 고유 식별자 (PK) |
| `target_type` | VARCHAR | 대상 유형 (Post, Comment) |
| `target_id` | INT | 대상 콘텐츠 ID |
| `reporter_id` | INT | 신고 회원 ID |
| `reason` | VARCHAR | 신고 사유 |
| `status` | ENUM | 처리 상태 (Pending, Resolved, Ignored) |
| `processed_by` | INT | 처리 관리자 ID |
| `created_at` | DATETIME | 신고 일시 |

### 연관 테이블: `post_comments`
게시글 댓글 정보를 저장합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | PK |
| `post_id` | INT | 게시글 FK |
| `user_id` | INT | 작성자 FK |
| `content` | TEXT | 댓글 내용 |
| `is_hidden` | TINYINT | 숨김 여부 |
