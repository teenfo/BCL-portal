---
name: commit-bot
description: 표준화된 커밋 메시지 생성 및 자동 커밋을 관리하는 스킬입니다.
---

# Commit Bot Skill (commit-bot)

이 스킬은 프로젝트의 변경 사항을 일관된 형식으로 기록하여 코드 히스토리를 체계적으로 관리합니다.

> **⚠️ 이 스킬은 역할에 상관없이 누구나 사용할 수 있으나, 최종 반영 전 🏛️ Architect 관점의 승인이 필요합니다.**
> 권장 모델: 작업 성격에 맞게 선택 (예: 일반 구현은 Sonnet, 아키텍처/설계는 Gemini Pro)

---

## 🤖 관점별 역할

| 역할 | 관점 | 비고 |
|:-----|:-----|:-----|
| 커밋 실행 요청 | **전체 관점** | 작업 완료 후 커밋 실행 가능 |
| 최종 승인 | 🏛️ **Architect** | 대규모 변경 시 최종 검토 |

---

## 선행 조건 (필수)

> ⚠️ 커밋 실행 전, **반드시 다음 조건을 충족**해야 합니다.

1. **`/update-context` 워크플로우 수행 완료**
   - `project-blueprint.md`의 Active Context 갱신
   - 완료 항목 → `.docs/archive/complete/project-complete-YYYYMMDD.md` 이동
   - **이 선행 워크플로우가 수행되지 않은 경우 커밋을 진행하지 않습니다.**

2. **빌드 정상 확인** (코드 변경이 있는 경우)
   - `npm run build` 에러 없음

---

## 1. 커밋 메시지 구조

메시지는 다음 형식을 따릅니다:
```
[Type] Subject
```

### 주요 Type

| Type | 설명 | 예시 |
|------|------|------|
| `feat` | 새로운 기능 추가 | `feat: 메인 대시보드 통계 위젯 구현` |
| `fix` | 버그 수정 | `fix: 로그인 후 리다이렉트 오류 수정` |
| `docs` | 문서 수정 (sitemap, docs 등) | `docs: 관리자 사이트맵 상세 설계 업데이트` |
| `style` | UI 스타일 변경 (로직 변경 없음) | `style: 사이드바 글래스모피즘 색상 보정` |
| `refactor` | 코드 리팩토링 | `refactor: Supabase 쿼리 헬퍼 통합` |
| `chore` | 빌드/패키지 설정 변경 | `chore: 도커 빌드 검증 스크립트 추가` |
| `perf` | 성능 개선 | `perf: 대시보드 데이터 로딩 최적화` |

### 메시지 작성 규칙
- **한글 사용**: 특별한 요청이 없는 한 커밋 메시지는 **한글**로 작성
- **버전 포함** (Priority 완료 시): `feat(v0.2.0): Priority 13 배지 시스템 고도화`
- **WIP 접두사** (세션 중단 시): `WIP: Priority 14 Phase 2 진행 중`
- **본문**: 변경 이유가 복잡한 경우 본문에 상세 내용 추가 (최대 72자 줄바꿈)

---

## 2. 커밋 프로세스 (단계별)

### 2-1. 변경 사항 분석

// turbo
```bash
git status
```

- 수정된 파일 목록 확인
- 코드 변경 vs 문서 변경 구분
- 기본 기능(로그인, 화면 표시, 링크 이동)에 영향을 준 변경 사항 확인

### 2-2. 스테이징

```bash
git add .
```

> ⚠️ 불필요한 파일이 포함되지 않았는지 확인 (`.env`, `node_modules` 등은 `.gitignore`로 제외)

### 2-3. 커밋 실행

```bash
git commit -m "[type] 제목"
```

### 2-4. Git Push

```bash
git push origin main
```

> **⚠️ 참고**: 커밋은 GitHub에 파일을 동기화하는 작업까지만 수행합니다.
> 빌드 검증, GitHub Actions, 배포는 사용자가 **명시적으로 "배포"를 요청한 경우에만** 수행합니다.

---

## 3. 배포 프로세스 (사용자 요청 시에만)

> 이 섹션은 사용자가 "배포해줘", "deploy" 등 **명시적으로 배포를 요청한 경우에만** 수행합니다.

1. **빌드 검증**:
   - **방법 1 (Docker)**: `docker-compose build`를 실행하여 Docker 이미지 생성 확인
   - **방법 2 (npm)**: `npm run build`를 실행하여 Next.js 빌드 확인
   - **방법 3 (스크립트)**: `sh .agent/skills/commit-bot/scripts/build-verify.sh`
2. **GitHub Actions 확인**: push 후 GitHub Actions 실행 결과를 확인하고, 에러가 있으면 수정 후 재커밋합니다.

---

## ✅ 체크리스트

### 커밋 전
- [ ] `/update-context` 워크플로우 수행 완료
- [ ] `project-blueprint.md` Active Context 갱신 완료
- [ ] 완료 항목 archive 이동 완료
- [ ] 코드 변경 시 `npm run build` 정상 확인

### 커밋 실행
- [ ] 커밋 메시지 형식 준수 (`[type] 한글 제목`)
- [ ] `git push origin main` 실행 완료

### 배포 시 (선택)
- [ ] 빌드 검증 통과
- [ ] GitHub Actions 정상 확인

---

## 🔗 관련 워크플로우 & 문서
- `/update-context` — 커밋 전 필수 수행 (선행 조건)
- `/develop` — 개발 워크플로우 (최종 커밋 단계에서 이 스킬 사용)
- `/audit` — 감사 후 커밋 시 이 스킬 사용

---

## 주의사항

- ❌ `/update-context` 수행 없이 커밋하지 않는다
- ❌ 빌드 실패 상태에서 코드 변경을 커밋하지 않는다
- ❌ 배포를 사용자가 요청하지 않았는데 자동 수행하지 않는다
- ✅ 문서만 변경된 경우 빌드 검증 없이 커밋 가능
- ✅ WIP 커밋 시 버전 갱신하지 않는다
- ✅ 커밋 메시지는 한글로 작성한다
