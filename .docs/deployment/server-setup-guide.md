# BCL Portal — Ubuntu 24.04 서버 배포 가이드

> **최종 업데이트**: 2026-02-19
> **대상 서버**: Ubuntu 24.04 LTS (깨끗한 설치 상태)

---

## 목차

1. [기본 시스템 세팅](#1-기본-시스템-세팅)
2. [Docker 설치](#2-docker-설치)
3. [Git 설치 & 리포지토리 클론](#3-git-설치--리포지토리-클론)
4. [환경 변수 설정](#4-환경-변수-설정)
5. [Docker Compose로 빌드 & 실행](#5-docker-compose로-빌드--실행)
6. [Nginx 리버스 프록시 (호스트)](#6-nginx-리버스-프록시-호스트)
7. [SSL 인증서 (Let's Encrypt)](#7-ssl-인증서-lets-encrypt)
8. [방화벽 설정](#8-방화벽-설정)
9. [자동 배포 스크립트](#9-자동-배포-스크립트)
10. [GitHub Actions CI/CD](#10-github-actions-cicd)
11. [운영 체크리스트](#11-운영-체크리스트)

---

## 1. 기본 시스템 세팅

```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 기본 패키지 설치
sudo apt install -y \
  curl \
  wget \
  git \
  unzip \
  htop \
  ufw \
  ca-certificates \
  gnupg \
  lsb-release \
  software-properties-common

# 시간대 설정 (한국)
sudo timedatectl set-timezone Asia/Seoul

# Swap 설정 (RAM 2GB 이하인 경우 권장)
# sudo fallocate -l 2G /swapfile
# sudo chmod 600 /swapfile
# sudo mkswap /swapfile
# sudo swapon /swapfile
# echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 2. Docker 설치

```bash
# Docker 공식 GPG 키 추가
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Docker 리포지토리 추가
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker 설치
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 현재 사용자를 docker 그룹에 추가 (sudo 없이 docker 사용)
sudo usermod -aG docker $USER
newgrp docker

# 설치 확인
docker --version
docker compose version
```

---

## 3. Git 설치 & 리포지토리 클론

```bash
# 프로젝트 디렉토리 생성
sudo mkdir -p /opt/bcl-portal
sudo chown $USER:$USER /opt/bcl-portal

# Git 리포지토리 클론
cd /opt/bcl-portal
git clone https://github.com/<YOUR_ORG>/BCL-portal.git .

# (SSH 방식인 경우)
# git clone git@github.com:<YOUR_ORG>/BCL-portal.git .
```

### SSH 키 설정 (GitHub 접근용)

```bash
# SSH 키 생성
ssh-keygen -t ed25519 -C "bcl-test-server" -f ~/.ssh/github_deploy

# 공개키 확인 → GitHub Deploy Keys에 등록
cat ~/.ssh/github_deploy.pub

# SSH config 설정
cat >> ~/.ssh/config << 'EOF'
Host github.com
  IdentityFile ~/.ssh/github_deploy
  IdentitiesOnly yes
EOF

chmod 600 ~/.ssh/config
```

---

## 4. 환경 변수 설정

```bash
cd /opt/bcl-portal

# .env.local 파일 생성
cat > .env.local << 'EOF'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# (선택) 추가 환경 변수
# NEXT_PUBLIC_SITE_URL=https://test.bcl-portal.com
EOF

chmod 600 .env.local
```

---

## 5. Docker Compose로 빌드 & 실행

```bash
cd /opt/bcl-portal

# 빌드 & 실행 (백그라운드)
docker compose up -d --build

# 상태 확인
docker compose ps

# 로그 확인
docker compose logs -f portal
docker compose logs -f race-service

# 중지
# docker compose down

# 재빌드 & 재시작
# docker compose up -d --build --force-recreate
```

### 빌드 확인

```bash
# 포털이 잘 뜨는지 확인 (내부 8080 포트)
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080
# 200이 나오면 성공
```

---

## 6. Nginx 리버스 프록시 (호스트)

Docker 컨테이너 내부의 Nginx(포트 8080)를 외부에 노출하기 위해 **호스트 Nginx**를 리버스 프록시로 사용합니다.

```bash
# Nginx 설치
sudo apt install -y nginx

# 설정 파일 생성
sudo tee /etc/nginx/sites-available/bcl-portal << 'NGINX_CONF'
server {
    listen 80;
    server_name your-domain.com;  # 또는 서버 IP

    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # 클라이언트 업로드 크기 제한 (프로필 사진 등)
    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 지원 (Race 기능)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 타임아웃 설정
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Health Check 엔드포인트
    location /health {
        access_log off;
        return 200 "OK";
        add_header Content-Type text/plain;
    }
}
NGINX_CONF

# 사이트 활성화 & 기본 설정 제거
sudo ln -sf /etc/nginx/sites-available/bcl-portal /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 설정 검증 & 재시작
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## 7. SSL 인증서 (Let's Encrypt)

> ⚠️ 도메인이 서버 IP를 가리키고 있어야 합니다.

```bash
# Certbot 설치
sudo apt install -y certbot python3-certbot-nginx

# SSL 인증서 발급 (자동으로 Nginx 설정 수정)
sudo certbot --nginx -d your-domain.com

# 자동 갱신 테스트
sudo certbot renew --dry-run

# 자동 갱신 크론은 Certbot이 자동 등록 (systemd timer)
sudo systemctl status certbot.timer
```

---

## 8. 방화벽 설정

```bash
# UFW 활성화
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH 허용
sudo ufw allow ssh           # 22번 포트

# HTTP/HTTPS 허용
sudo ufw allow 'Nginx Full'  # 80, 443번 포트

# (선택) 특정 IP에서만 SSH 허용
# sudo ufw delete allow ssh
# sudo ufw allow from YOUR_IP to any port 22

# 방화벽 활성화
sudo ufw enable

# 상태 확인
sudo ufw status verbose
```

---

## 9. 자동 배포 스크립트

서버에 배포 스크립트를 만들어 `git pull` → 재빌드 → 재시작을 자동화합니다.

```bash
# 배포 스크립트 생성
sudo tee /opt/bcl-portal/deploy.sh << 'DEPLOY'
#!/bin/bash
set -e

echo "========================================="
echo "  BCL Portal 배포 시작"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="

cd /opt/bcl-portal

# 1. 최신 코드 받기
echo "[1/4] Git Pull..."
git pull origin main

# 2. Docker 이미지 빌드
echo "[2/4] Docker Build..."
docker compose build --no-cache

# 3. 컨테이너 재시작
echo "[3/4] Container Restart..."
docker compose up -d --force-recreate

# 4. 이전 이미지 정리
echo "[4/4] Cleanup..."
docker image prune -f

echo "========================================="
echo "  배포 완료!"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="

# 상태 확인
docker compose ps
DEPLOY

chmod +x /opt/bcl-portal/deploy.sh
```

### 배포 실행

```bash
/opt/bcl-portal/deploy.sh
```

---

## 10. GitHub Actions CI/CD

> 자동 배포를 위한 GitHub Actions 워크플로우 설정

### 10.1 서버에 Webhook 수신기 설치 (선택 A: Webhook 방식)

```bash
# webhook 패키지 설치
sudo apt install -y webhook

# Webhook 설정 파일 생성
sudo tee /etc/webhook.conf << 'WEBHOOK'
[
  {
    "id": "bcl-deploy",
    "execute-command": "/opt/bcl-portal/deploy.sh",
    "command-working-directory": "/opt/bcl-portal",
    "response-message": "Deploying BCL Portal...",
    "trigger-rule": {
      "and": [
        {
          "match": {
            "type": "payload-hmac-sha256",
            "secret": "YOUR_WEBHOOK_SECRET",
            "parameter": {
              "source": "header",
              "name": "X-Hub-Signature-256"
            }
          }
        },
        {
          "match": {
            "type": "value",
            "value": "refs/heads/main",
            "parameter": {
              "source": "payload",
              "name": "ref"
            }
          }
        }
      ]
    }
  }
]
WEBHOOK

# Webhook 서비스 시작
webhook -hooks /etc/webhook.conf -port 9000 -verbose &
```

### 10.2 GitHub Actions 워크플로우 (선택 B: SSH 방식)

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Test Server

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: /opt/bcl-portal/deploy.sh
```

### GitHub Secrets 설정

| Secret Name | 값 |
|---|---|
| `SERVER_HOST` | 서버 IP 또는 도메인 |
| `SERVER_USER` | SSH 사용자명 |
| `SERVER_SSH_KEY` | SSH 개인키 (서버에서 생성한 키) |

---

## 11. 운영 체크리스트

### 배포 후 확인 항목

```bash
# Docker 컨테이너 상태
docker compose ps

# 포트 확인
sudo ss -tlnp | grep -E '(80|443|8080)'

# Portal 응답 확인
curl -I http://localhost:8080

# 디스크 용량
df -h

# Docker 로그
docker compose logs --tail=50 portal
docker compose logs --tail=50 race-service
```

### 로그 확인

```bash
# Docker 컨테이너 로그
docker compose logs -f

# Nginx 호스트 로그
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Docker 관리

```bash
# 컨테이너 재시작
docker compose restart

# 완전 재빌드
docker compose down
docker compose up -d --build

# 사용하지 않는 이미지/볼륨 정리
docker system prune -af
```

---

## 아키텍처 다이어그램

```
┌─────────────────────────────────────────────┐
│             Ubuntu 24.04 Server             │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │     Host Nginx (Reverse Proxy)      │    │
│  │     :80 / :443 (SSL)                │    │
│  └──────────────┬──────────────────────┘    │
│                 │                            │
│                 ▼ proxy_pass :8080           │
│  ┌─────────────────────────────────────┐    │
│  │         Docker Compose              │    │
│  │                                     │    │
│  │  ┌──────────────┐  ┌────────────┐   │    │
│  │  │ bcl-portal   │  │ bcl-race   │   │    │
│  │  │ (Nginx+HTML) │→→│ (FastAPI)  │   │    │
│  │  │   :8080      │  │  :8000     │   │    │
│  │  └──────────────┘  └────────────┘   │    │
│  └─────────────────────────────────────┘    │
│                                             │
│                 ▼                            │
│  ┌─────────────────────────────────────┐    │
│  │          Supabase (Cloud)           │    │
│  │   Auth / Database / Storage / RLS   │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

---

## 트러블슈팅

### Docker 빌드 실패
```bash
# 메모리 부족인 경우 Swap 추가
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 포트 충돌
```bash
# 8080 포트 사용 중인 프로세스 확인
sudo lsof -i :8080
```

### Nginx 502 Bad Gateway
```bash
# Docker 컨테이너가 실행 중인지 확인
docker compose ps

# 컨테이너 로그 확인
docker compose logs portal
```

### SSL 인증서 갱신 실패
```bash
# 수동 갱신
sudo certbot renew --force-renewal

# Nginx 재시작
sudo systemctl restart nginx
```
