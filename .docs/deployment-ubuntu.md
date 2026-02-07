# Ubuntu Server Deployment Guide (Docker)

이 문서는 우분투 서버에서 도커(Docker)를 사용하여 BCL 포털을 배포하는 방법을 설명합니다.

## 1. 사전 준비 (Prerequisites)
우분투 서버에 도커와 도커 컴포즈가 설치되어 있어야 합니다.

```bash
# Docker 설치 (없는 경우)
sudo apt update
sudo apt install docker.io docker-compose -y
sudo systemctl start docker
sudo systemctl enable docker
```

## 2. 배포 절차 (Deployment Steps)

### 1단계: 저장소 복제 (Clone Repository)
```bash
git clone <repository_url>
cd portal
```

### 2단계: 환경 변수 설정 (Environment Variables)
`.env.local` 파일을 생성하고 Supabase 정보를 입력합니다.
```bash
cp .env.local.example .env.local
nano .env.local
```

### 3단계: 도커 실행 (Run with Docker)
제공된 `docker-compose.yml`을 사용하여 서비스를 실행합니다.
```bash
docker-compose up --build -d
```

## 3. 관리 및 유지보수 (Maintenance)

- **로그 확인**: `docker-compose logs -f portal`
- **재시작**: `docker-compose restart portal`
- **업데이트 및 재빌드**:
  ```bash
  git pull
  docker-compose up --build -d
  ```

## 4. 포트 설정 (Port Configuration)
현재 `docker-compose.yml` 설정상 **8080** 포트로 서비스가 열립니다. 외부에서 접속하려면 우분투 방화벽(UFW)에서 해당 포트를 허용해야 합니다.

```bash
sudo ufw allow 8080
```
