#!/usr/bin/env bash
# BCL Portal 초기 서버 설정 (docs/11 §2) — 빈 Ubuntu 호스트 1회 프로비저닝. 멱등(재실행 안전).
#
# 사용법 (root 또는 sudo):
#   curl -fsSL https://raw.githubusercontent.com/teenfo/BCL-portal/main/scripts/server-setup.sh | sudo bash
#   또는 파일 복사 후: sudo bash server-setup.sh
#
# 파라미터 (환경변수로 오버라이드):
#   REPO_URL     클론 주소 (프라이빗 레포 → https://<PAT>@github.com/teenfo/BCL-portal.git 형태 권장)
#   APP_DIR      기본 /opt/bcl-portal (deploy.yml 고정 경로 — 변경 시 deploy.yml도 수정 필요)
#   DEPLOY_USER  기본 deploy (GitHub Actions SSH 접속 계정)
#   ENABLE_UFW=1 UFW 방화벽 활성화(OpenSSH/80/443 허용) — 기본 비활성(콘솔 접근 보장 후 직접 켜기)
#
# 수행: [1]기본 패키지 → [2]Docker+compose → [3]배포 사용자 → [4]레포 클론 →
#       [5].env 템플릿 → [6]nginx 프록시(80→3001) → [7]Actions SSH 키 → 다음 단계 안내
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/teenfo/BCL-portal.git}"
APP_DIR="${APP_DIR:-/opt/bcl-portal}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"

[ "$(id -u)" -eq 0 ] || { echo "❌ root(sudo)로 실행하세요"; exit 1; }
export DEBIAN_FRONTEND=noninteractive

echo "▶ [1/7] 기본 패키지 (git/curl/nginx 등)"
apt-get update -y
apt-get install -y ca-certificates curl git gnupg nginx openssl

echo "▶ [2/7] Docker 엔진 + compose 플러그인"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker
docker --version && docker compose version

echo "▶ [3/7] 배포 사용자(${DEPLOY_USER}) + docker 그룹"
id -u "${DEPLOY_USER}" >/dev/null 2>&1 || useradd -m -s /bin/bash "${DEPLOY_USER}"
usermod -aG docker "${DEPLOY_USER}"

echo "▶ [4/7] 레포 → ${APP_DIR}"
if [ -d "${APP_DIR}/.git" ]; then
  git -C "${APP_DIR}" fetch --prune origin
  echo "  기존 클론 감지 — fetch만 수행(체크아웃 갱신은 deploy.yml 담당)"
else
  git clone "${REPO_URL}" "${APP_DIR}"
fi
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_DIR}"

echo "▶ [5/7] .env 준비"
if [ ! -f "${APP_DIR}/.env" ]; then
  cp "${APP_DIR}/.env.example" "${APP_DIR}/.env"
  chown "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_DIR}/.env"
  chmod 600 "${APP_DIR}/.env"
  ENV_CREATED=1
else
  ENV_CREATED=0
fi

echo "▶ [6/7] nginx 리버스 프록시 (80 → 127.0.0.1:3001, /race-api/ → 8001)"
install -m 0644 "${APP_DIR}/nginx-host.conf" /etc/nginx/sites-available/bcl-portal
ln -sf ../sites-available/bcl-portal /etc/nginx/sites-enabled/bcl-portal
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx
systemctl reload nginx

echo "▶ [7/7] GitHub Actions SSH 키 (${DEPLOY_USER} 계정)"
SSH_DIR="/home/${DEPLOY_USER}/.ssh"
KEY_FILE="${SSH_DIR}/github-actions"
install -d -m 700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "${SSH_DIR}"
if [ ! -f "${KEY_FILE}" ]; then
  sudo -u "${DEPLOY_USER}" ssh-keygen -t ed25519 -N "" -C "bcl-portal-actions" -f "${KEY_FILE}"
  cat "${KEY_FILE}.pub" >> "${SSH_DIR}/authorized_keys"
  chown "${DEPLOY_USER}:${DEPLOY_USER}" "${SSH_DIR}/authorized_keys"
  chmod 600 "${SSH_DIR}/authorized_keys"
fi

if [ "${ENABLE_UFW:-0}" = "1" ]; then
  echo "▶ UFW 방화벽 (OpenSSH/80/443 허용 후 활성화)"
  apt-get install -y ufw
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
fi

SERVER_IP="$(curl -fsS -4 --max-time 5 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
cat <<GUIDE

════════════════════════════════════════════════════════════════════
✅ 초기 설정 완료 — 남은 수동 단계 3가지

1) ${APP_DIR}/.env 값 채우기 (템플릿 생성됨: ${ENV_CREATED} — 1이면 신규)
   - NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (필수)
   - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (race-service 사용 시)
   - PAYMENT_ENV=dev (테스트 서버는 dev 유지 — simulation 강제)

2) GitHub 레포 Settings → Secrets and variables → Actions 에 등록:
   - SSH_HOST         = ${SERVER_IP}
   - SSH_USERNAME     = ${DEPLOY_USER}
   - SSH_PORT         = 22
   - SSH_PRIVATE_KEY  = 아래 파일 내용 전체 (BEGIN~END 포함)
       sudo cat ${KEY_FILE}

3) 첫 배포 (둘 중 하나):
   - GitHub Actions → "Deploy to Test Server" → Run workflow (main)
   - 또는 서버에서 직접:  cd ${APP_DIR} && sudo -u ${DEPLOY_USER} bash scripts/deploy.sh

확인: curl -fsS http://127.0.0.1:3001/  →  브라우저 http://${SERVER_IP}/
데모 레이스: http://${SERVER_IP}/class/race/view?event=demo  (가로: &course=h)
════════════════════════════════════════════════════════════════════
GUIDE
