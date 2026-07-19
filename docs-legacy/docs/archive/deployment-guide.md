# BCL Portal Deployment & Setup Guide

이 문서는 Ubuntu 24.04 서버에서 BCL Portal을 배포하고 관리하는 방법을 설명합니다.

---

## 1. Ubuntu Server 배포 (Docker) - 프로덕션 환경

### 사전 요구사항
- Ubuntu 24.04 LTS 서버
- Docker & Docker Compose 설치
- Git 설치
- 최소 2GB RAM, 10GB 디스크 공간

---

## 2. 초기 서버 설정

### Docker 설치
```bash
# 시스템 업데이트
sudo apt update
sudo apt upgrade -y

# Docker 설치
sudo apt install docker.io docker-compose -y

# Docker 서비스 시작 및 부팅시 자동 시작
sudo systemctl start docker
sudo systemctl enable docker

# 현재 사용자를 docker 그룹에 추가 (재로그인 필요)
sudo usermod -aG docker $USER
```

### Git 설치
```bash
sudo apt install git -y
```

---

## 3. 프로젝트 배포

### Step 1: 프로젝트 클론
```bash
# 프로젝트 디렉토리 생성
mkdir -p ~/apps
cd ~/apps

# 저장소 클론
git clone <repository-url> bcl-portal
cd bcl-portal
```

### Step 2: 환경 변수 설정
```bash
# 환경 변수 템플릿 복사
cp .env.example .env.production

# 프로덕션 환경 변수 편집
nano .env.production
```

**필수 환경 변수:**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_ENV=production

# Payment (선택)
NEXT_PUBLIC_TOSS_CLIENT_KEY=live_ck_xxxxx
TOSS_SECRET_KEY=live_sk_xxxxx
```

### Step 3: Docker 빌드 및 실행
```bash
# Docker 이미지 빌드
docker-compose build

# 컨테이너 시작 (백그라운드)
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

---

## 4. Nginx 리버스 프록시 설정 (권장)

### Nginx 설치
```bash
sudo apt install nginx -y
```

### SSL 인증서 (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

### Nginx 설정
```bash
sudo nano /etc/nginx/sites-available/bcl-portal
```

**설정 파일 내용:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # HTTP to HTTPS 리다이렉트
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL 인증서 (certbot이 자동 설정)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # 프록시 설정
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 정적 파일 캐싱
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=3600";
    }
}
```

### Nginx 활성화
```bash
# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/bcl-portal /etc/nginx/sites-enabled/

# 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

---

## 5. 방화벽 설정

```bash
# UFW 활성화
sudo ufw enable

# 필수 포트 허용
sudo ufw allow 22        # SSH
sudo ufw allow 80        # HTTP
sudo ufw allow 443       # HTTPS
sudo ufw allow 3000      # Node.js (Nginx 사용 시 선택)

# 상태 확인
sudo ufw status
```

---

## 6. 배포 자동화 (GitHub Actions 또는 수동)

### 수동 배포
```bash
cd ~/apps/bcl-portal

# 최신 코드 가져오기
git pull origin main

# 컨테이너 재시작
docker-compose down
docker-compose build
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

### GitHub Actions (webhook) 사용
**준비 중**

---

## 7. 유지보수

### 로그 확인
```bash
# 실시간 로그
docker-compose logs -f

# 최근 100줄
docker-compose logs --tail=100

# 특정 서비스 로그
docker-compose logs -f portal
```

### 컨테이너 상태 확인
```bash
# 실행 중인 컨테이너
docker-compose ps

# 리소스 사용량
docker stats
```

### 컨테이너 재시작
```bash
# 전체 재시작
docker-compose restart

# 특정 서비스만
docker-compose restart portal
```

### 백업
```bash
# 환경 변수 백업
cp .env.production .env.production.backup

# Docker 이미지 백업
docker save bcl-portal:latest | gzip > bcl-portal-backup.tar.gz
```

---

## 8. 트러블슈팅

### 포트 충돌
```bash
# 포트 사용 확인
sudo netstat -tulpn | grep :3000

# 프로세스 종료
sudo kill -9 <PID>
```

### Docker 디스크 정리
```bash
# 사용하지 않는 이미지/컨테이너 정리
docker system prune -a

# 볼륨 정리 (주의: 데이터 손실 가능)
docker volume prune
```

### 메모리 부족
```bash
# 스왑 메모리 추가 (2GB)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 영구 설정
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 9. 모니터링 (선택 사항)

### PM2를 사용한 프로세스 관리
```bash
npm install -g pm2

# Next.js 실행
pm2 start npm --name "bcl-portal" -- start

# 부팅 시 자동 시작
pm2 startup
pm2 save
```

---

## 10. 로컬 개발 환경 구성

1. `npm install`
2. `.env.local` 파일 생성 및 Supabase 키 입력
3. `npm run dev` 실행

---

## 공통 주의사항
- **빌드 타임 환경 변수**: Next.js 빌드 시점에 `NEXT_PUBLIC_` 변수가 주입되어야 하므로 배포 직전 환경 변수가 올바른지 반드시 확인하십시오.
- **보안**: 프로덕션 환경에서는 반드시 HTTPS를 사용하고, 환경 변수 파일을 Git에 커밋하지 마십시오.
- **백업**: 정기적으로 환경 변수와 Docker 이미지를 백업하십시오.

---

**문서 버전**: 2.0.0 (Ubuntu 자체 서버)  
**최종 업데이트**: 2026년 2월 16일
