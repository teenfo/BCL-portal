# BCL Portal Deployment & Setup Guide

이 문서는 다양한 환경(Cloudflare, Ubuntu Server)에서 BCL Portal을 배포하고 관리하는 방법을 통합하여 설명합니다.

---

## 1. Cloudflare Pages 배포 (권장)

### 빌드 설정
- **Framework Preset**: `Next.js`
- **Build Command**: `npm run pages:build` (@cloudflare/next-on-pages 사용)
- **Build Output Directory**: `.cloudflare_build`
- **Root Directory**: `portal`

### 환경 변수 설정
Cloudflare 대시보드에서 다음 변수를 반드시 추가해야 합니다:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NODE_VERSION`: `20` 이상

---

## 2. Ubuntu Server 배포 (Docker)

도커를 사용하여 독립된 서버 환경에서 서비스를 실행합니다.

### 실행 방법
```bash
git clone <repo_url>
cd portal
cp .env.local.example .env.local  # 환경 변수 설정
docker-compose up --build -d      # 빌드 및 백그라운드 실행
```

### 유지보수
- **로그 확인**: `docker-compose logs -f portal`
- **방화벽 설정**: `sudo ufw allow 8080` (기본 포트)

---

## 3. 로컬 개발 환경 구성
1. `npm install`
2. `.env.local` 파일 생성 및 Supabase 키 입력
3. `npm run dev` 실행

---

## 4. 공통 주의사항
- **빌드 타임 환경 변수**: Next.js 빌드 시점에 `NEXT_PUBLIC_` 변수가 주입되어야 하므로 배포 직전 환경 변수가 올바른지 반드시 확인하십시오.
