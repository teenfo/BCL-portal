---
name: commit-bot
description: 표준화된 커밋 메시지 생성 및 자동 커밋을 관리하는 스킬입니다.
---

# Commit Bot Skill (commit-bot)

이 스킬은 프로젝트의 변경 사항을 일관된 형식으로 기록하여 코드 히스토리를 체계적으로 관리합니다.

## 1. 커밋 메시지 구조
메시지는 다음 형식을 따릅니다:
`[Type] Subject (#issue_number)`

### 주요 Type:
- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 수정 (sitemap, docs 등)
- `style`: 코드 포맷팅, UI 스타일 변경 (로직 변경 없음)
- `refactor`: 코드 리팩토링
- `chore`: 빌드 업무 수정, 패키지 매니저 설정 등

## 2. 자동 생성 규칙
1. **변경 사항 분석**: 수정한 파일의 목록과 주요 변경 내용을 요약합니다.
2. **한글 사용**: 특별한 요청이 없는 한 커밋 메시지는 **한글**로 작성하여 팀원 간의 가독성을 높입니다.
3. **본문 작성**: 변경 이유가 복잡한 경우 본문에 상세 내용을 추가합니다 (최대 72자 줄바꿈).

## 3. 커밋 프로세스 (GitHub 동기화)
0. **컨텍스트 업데이트 (필수)**:
   - 커밋 실행 전, 반드시 **[`/update-context`](../workflows/update-context.md)** 워크플로우를 먼저 실행하여 `project-blueprint.md`를 최신화합니다.
   - **이 선행 워크플로우가 수행되지 않은 경우 커밋을 진행하지 않습니다.**

1. **변경 사항 분석**: `git status`를 확인하고 수정한 파일의 목록을 요약합니다.
2. **스테이징**: `git add .`를 통해 모든 변경 사항을 스테이징합니다.
3. **커밋 실행**: 본 스킬의 형식에 맞춰 `git commit -m "[type] 제목"`을 실행합니다.
4. **GIT PUSH**: `git push origin main`을 실행하여 원격 저장소에 변경 사항을 반영합니다.

> **⚠️ 참고**: 커밋은 GitHub에 파일을 동기화하는 작업까지만 수행합니다.
> 빌드 검증, GitHub Actions, 배포는 사용자가 **명시적으로 "배포"를 요청한 경우에만** 수행합니다.

## 4. 배포 프로세스 (사용자 요청 시에만)
> 이 섹션은 사용자가 "배포해줘", "deploy" 등 **명시적으로 배포를 요청한 경우에만** 수행합니다.

1. **빌드 검증**:
   - **방법 1 (Docker)**: `docker-compose build`를 실행하여 Docker 이미지 생성 확인
   - **방법 2 (npm)**: `npm run build`를 실행하여 Next.js 빌드 확인
2. **GitHub Actions 확인**: push 후 GitHub Actions 실행 결과를 확인하고, 에러가 있으면 수정 후 재커밋합니다.

## 5. 커맨드 예시
- 커밋: `git commit -m "feat: 메인 대시보드 통계 위젯 구현"`
- GIT PUSH: `git push origin main`
- 빌드 검증 (배포 시만): `sh .agent/skills/commit-bot/scripts/build-verify.sh`

## 6. 커밋 메시지 예시
- `docs: 관리자 사이트맵 5대 그룹 체계 반영 및 상세 설계 업데이트`
- `feat: 대시보드 실시간 체크인 알림 피드 기능 추가`
- `style: 사이드바 글래스모피즘 효과 및 다크모드 색상 보정`
- `chore: 도커 빌드 검증 스크립트 추가 및 환경 설정 보완`
