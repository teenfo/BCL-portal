# BCL Portal – Agent Context

이 문서는 Agent가 BCL Portal 프로젝트를 이해하기 위한 **배경/의도 설명 문서**다.
구현 규칙은 `.agent/rules/*`를 따른다.

---

## 1) 프로젝트 개요
- 프로젝트명: **BCL Portal**
- 도메인: Fitness / Gym / Facility Management
- 대상 사용자:
  - 일반 사용자(Member)
  - 관리자(Admin / Manager / Coach / Staff)

---

## 2) 기술적 방향성
- Rendering: **CSR (Client Side Rendering)**
- Frontend: **Next.js**
- Hosting / Edge: **Cloudflare Pages / Workers**
- Backend:
  - DB / Auth / Storage: **Supabase**
- 서버 프레임워크(CI4)는 더 이상 기준이 아니다.

---

## 3) 화면 구조 철학
- 사용자 화면과 관리자 화면을 **명확히 분리**
  - 사용자: `apps/*`
  - 관리자: `admin/*`
- 사용자 화면은 **모바일 퍼스트**
- 관리자 화면은 **데스크탑 중심 + 반응형**

---

## 4) 데이터 흐름 기본 원칙
- 모든 핵심 데이터는 **Admin에서 생성/관리**
- User(apps)는 Admin 데이터의 **Read-only 소비자**
- 보안은 UI가 아니라 **Supabase RLS**에서 보장

---

## 5) 설계에서 중요한 키워드
- Single Source of Truth (Sitemap)
- CSR + Supabase RLS
- 서버 없는 자동화(Cron / Edge Functions)
- 명확한 역할 분리(User vs Admin)
- Supabase Auth Password : 3206#@KimCHO

---

## 6) Agent에게 기대하는 역할
- 기능을 “추가”하기 전에 항상:
  1. Sitemap 확인
  2. 제외 범위 확인
- 구현보다 **구조/일관성/확장성**을 우선 고려
