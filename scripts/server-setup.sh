#!/usr/bin/env bash
# BCL Portal 초기 서버 설정 (docs/11 §2) — 빈 Ubuntu 호스트 1회 프로비저닝. 멱등(재실행 안전).
#
# 사용법 (root 또는 sudo):
#   curl -fsSL https://raw.githubusercontent.com/teenfo/BCL-portal/main/scripts/server-setup.sh | sudo bash
#   또는 파일 복사 후: sudo bash server-setup.sh
#
# 파라미터 (환경변수로 오버라이드):
#   REPO_URL      클론 주소 (프라이빗 레포 → https://<PAT>@github.com/teenfo/BCL-portal.git 형태 권장)
#   APP_DIR       기본 /opt/bcl-portal (deploy.yml 고정 경로 — 변경 시 deploy.yml도 수정 필요)
#   DEPLOY_USER   기본 deploy (러너/배포 실행 계정)
#   RUNNER_TOKEN  GitHub self-hosted runner 등록 토큰 — NAT(공유기)+유동IP 환경의 배포 경로.
#                 레포 Settings → Actions → Runners → New self-hosted runner에서 발급(수분 내 만료,
#                 만료 시 재발급 후 이 스크립트 재실행). 미지정 시 러너 단계 건너뜀.
#   ENABLE_UFW=1  UFW 방화벽 활성화(OpenSSH/80/443 허용) — 기본 비활성(콘솔 접근 보장 후 직접 켜기)
#
# 수행: [1]기본 패키지 → [2]Docker+compose → [3]배포 사용자 → [4]레포 클론 →
#       [5].env 템플릿 → [6]nginx 프록시(80→3001) → [7]self-hosted runner → 다음 단계 안내
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/teenfo/BCL-portal.git}"
APP_DIR="${APP_DIR:-/opt/bcl-portal}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
RUNNER_VERSION="${RUNNER_VERSION:-2.321.0}"

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

echo "▶ [7/7] GitHub self-hosted runner (NAT/유동IP 배포 경로 — 포트 개방 불필요)"
RUNNER_DIR="/home/${DEPLOY_USER}/actions-runner"
if [ -f "${RUNNER_DIR}/.runner" ]; then
  echo "  러너 이미 등록됨 — 건너뜀 (재등록은 ${RUNNER_DIR}에서 ./config.sh remove 후 재실행)"
elif [ -n "${RUNNER_TOKEN:-}" ]; then
  ARCH="$(dpkg --print-architecture)"; case "${ARCH}" in amd64) RARCH=x64;; arm64) RARCH=arm64;; *) RARCH=x64;; esac
  install -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "${RUNNER_DIR}"
  sudo -u "${DEPLOY_USER}" bash -c "
    set -euo pipefail
    cd '${RUNNER_DIR}'
    if [ ! -f run.sh ]; then
      curl -fsSL -o runner.tar.gz \
        https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-${RARCH}-${RUNNER_VERSION}.tar.gz
      tar xzf runner.tar.gz && rm runner.tar.gz
    fi
    ./config.sh --unattended --url '${REPO_URL%.git}' --token '${RUNNER_TOKEN}' \
      --name bcl-server --labels bcl-portal --work _work --replace
  "
  (cd "${RUNNER_DIR}" && ./svc.sh install "${DEPLOY_USER}" && ./svc.sh start)
  echo "  ✅ 러너 서비스 기동(systemd) — Actions → Runners에서 Idle 확인"
else
  echo "  ⚠️ RUNNER_TOKEN 미지정 — 러너 설치 건너뜀."
  echo "     레포 Settings → Actions → Runners → New self-hosted runner(Linux)에서 토큰 발급 후:"
  echo "     sudo RUNNER_TOKEN=<토큰> bash ${APP_DIR}/scripts/server-setup.sh"
fi

if [ "${ENABLE_UFW:-0}" = "1" ]; then
  echo "▶ UFW 방화벽 (OpenSSH/80/443 허용 후 활성화)"
  apt-get install -y ufw
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
fi

LAN_IP="$(hostname -I | awk '{print $1}')"
cat <<GUIDE

════════════════════════════════════════════════════════════════════
✅ 초기 설정 완료 — 남은 수동 단계

1) ${APP_DIR}/.env 값 채우기 (신규 생성: ${ENV_CREATED})
   - NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (필수)
   - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (race-service 사용 시)
   - PAYMENT_ENV=dev (테스트 서버는 dev 유지 — simulation 강제)

2) 러너 미등록이면(위 [7/7] 안내 참조) RUNNER_TOKEN으로 재실행
   — NAT(공유기)+유동IP라 포트포워딩/DDNS 불필요, 러너가 배포를 서버 안에서 실행

3) 첫 배포 (둘 중 하나):
   - GitHub Actions → "Deploy to Test Server" → Run workflow (main)
   - 또는 서버에서 직접:  cd ${APP_DIR} && sudo -u ${DEPLOY_USER} bash scripts/deploy.sh

확인: curl -fsS http://127.0.0.1:3001/
LAN(같은 공유기) 접속: http://${LAN_IP}/  — 체육관 TV/키오스크는 이 주소 사용
데모 레이스: http://${LAN_IP}/class/race/view?event=demo  (가로: &course=h)
외부(인터넷) 접속이 필요해지면: 공유기 포트포워딩(80→${LAN_IP}) + DDNS(공유기 내장) 또는
Cloudflare Tunnel — 배포 경로와 무관하므로 나중에 추가해도 됨
════════════════════════════════════════════════════════════════════
GUIDE
