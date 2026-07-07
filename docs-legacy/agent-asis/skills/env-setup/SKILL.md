---
name: env-setup
description: 새로운 환경에서 프로젝트 개발에 필요한 도구와 의존성을 자동으로 점검하고 설치하는 스킬입니다.
---

# Environment Setup Skill (env-setup)

이 스킬은 새로운 개발 환경이나 새 세션이 시작될 때 BCL Portal 프로젝트가 정상적으로 작동하기 위한 필수 도구들을 점검하고 초기화합니다.

> **⚠️ 이 스킬은 💻 Developer 관점에서 주로 수행하며, 시스템 변경이 필요한 경우 반드시 사용자 확인을 받습니다.**
> **권장 모델**: Claude Sonnet 4.6

---

## 🤖 관점별 역할

| 역할 | 관점 | 핵심 책임 |
|:-----|:-----|:---------|
| 환경 점검 & 설치 | 💻 **Developer** | 도구 점검, 의존성 설치, 빌드 확인 |
| 문제 에스컬레이션 | 🏛️ **Architect** | 해결 불가 환경 이슈 판단 |

---

## 언제 이 스킬을 사용하는가?

- 새로운 개발 환경(예: 신규 PC, 서버)에서 처음 작업을 시작할 때
- 장기간 작업이 중단되었다가 다시 재개하여 의존성 버전이 맞지 않을 때
- 환경 변수 설정 오류로 인해 시스템이 작동하지 않을 때
- 새로운 세션 시작 시 빠른 상태 확인이 필요할 때

---

## 스킬 실행 절차

### 1️⃣ 필수 도구 점검

각 도구의 설치 여부와 버전을 확인한다.

// turbo
```bash
echo "=== Node.js ===" && node --version && \
echo "=== npm ===" && npm --version && \
echo "=== Git ===" && git --version && \
echo "=== Docker ===" && docker --version 2>/dev/null || echo "Docker: NOT INSTALLED"
```

#### 필수 도구 기준

| 도구 | 최소 버전 | 필수 여부 | 용도 |
|------|-----------|-----------|------|
| **Node.js** | v18+ | ✅ 필수 | Next.js 런타임 |
| **npm** | v9+ | ✅ 필수 | 패키지 매니저 |
| **Git** | v2+ | ✅ 필수 | 버전 관리 |
| **Docker** | v24+ | 🔶 선택 | 배포 환경 (개발 시 불필요) |
| **Docker Compose** | v2+ | 🔶 선택 | 멀티 컨테이너 |

---

### 2️⃣ 패키지 의존성 설치

// turbo
```bash
npm install
```

> ⚠️ `package-lock.json`이 변경된 경우 사용자에게 보고한다.

---

### 3️⃣ 환경 변수 점검

// turbo
```bash
ls -la .env.local 2>/dev/null || echo ".env.local: NOT FOUND"
```

#### 필수 환경 변수

| 변수명 | 설명 | 확인 방법 |
|--------|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | Supabase 대시보드 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key (공개 가능) | Supabase 대시보드 |

> ⚠️ `.env.local` 파일이 없으면 사용자에게 `.env.example` 참조를 안내한다.
> ❌ `SUPABASE_SERVICE_ROLE_KEY`는 클라이언트 코드에 사용하지 않는다.

---

### 4️⃣ 빌드 검증

// turbo
```bash
npm run build
```

| 결과 | 액션 |
|------|------|
| ✅ 빌드 성공 | 환경 설정 완료 |
| ❌ 빌드 실패 | 에러 메시지 분석 후 수정 시도 → 해결 불가 시 사용자에게 보고 |

---

### 5️⃣ 상태 보고

모든 점검이 완료되면 결과를 보고한다.

```
🔧 환경 점검 결과:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Node.js:        ✅ v{버전}
  npm:            ✅ v{버전}
  Git:            ✅ v{버전}
  Docker:         {✅/⚠️} {버전 or NOT INSTALLED}
  .env.local:     {✅/❌} {존재 여부}
  npm install:    {✅/❌} {결과}
  npm run build:  {✅/❌} {결과}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  전체 상태: {✅ 준비 완료 / ⚠️ 일부 경고 / ❌ 조치 필요}
```

---

## ✅ 체크리스트

### 💻 Developer 관점 (권장: Claude Sonnet 4.6)
- [ ] Node.js v18+ 확인
- [ ] npm v9+ 확인
- [ ] Git 설치 확인
- [ ] `npm install` 실행 완료 (에러 없음)
- [ ] `.env.local` 존재 확인
- [ ] 필수 환경 변수 설정 확인
- [ ] `npm run build` 성공
- [ ] 상태 보고 완료

---

## ⚠️ 주의사항

- ❌ 시스템에 소프트웨어를 설치할 때 사용자 확인 없이 자동 설치하지 않는다
- ❌ `.env.local`의 내용을 로그에 출력하지 않는다 (보안)
- ❌ `service_role` 키의 존재 여부를 묻거나 확인하지 않는다
- ✅ 점검 결과를 사용자에게 명확히 보고한다
- ✅ 해결 불가 이슈는 Architect에게 에스컬레이션한다
- ✅ Docker는 선택 사항임을 명시한다 (개발 시 불필요)

---

## 🔗 관련 스킬/워크플로우

| 항목 | 용도 |
|------|------|
| `/develop` | 개발 시작 전 환경 확인 (Step 2)에서 이 스킬 참조 |
| `commit-bot` 스킬 | 배포 시 빌드 검증 연계 |
