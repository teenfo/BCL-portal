#!/usr/bin/env bash
# BCL Portal 배포 스크립트 (docs/11 §5) — 서버 /opt/bcl-portal에서 실행.
# ⚠️ 과거 사고: 이 스크립트가 레포에 없어 서버에만 존재 가정 → main 병합 시 배포 실패.
#   이제 레포로 버전관리한다. deploy.yml이 git 최신화 후 이 스크립트를 호출한다.
# 범위: portal만 빌드·기동(race-service는 라이프사이클 분리 — docs/11 §2.4). git 최신화는 호출측(deploy.yml).
set -euo pipefail

# 포트는 compose와 동일 소스(.env)에서 읽는다 — 러너 프로세스 env 폴백으로 인한 소스 이원화 방지
[ -f .env ] && set -a && . ./.env && set +a
PORTAL_PORT="${PORTAL_HOST_PORT:-3001}"

echo "▶ portal·face-service 이미지 빌드"
docker compose build portal face-service

echo "▶ portal 기동 (127.0.0.1:${PORTAL_PORT} → 컨테이너 3000)"
docker compose up -d portal

echo "▶ face-service 기동 (갤러리 얼굴 매칭 워커 — SRK 미설정이면 건너뜀)"
if [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  docker compose up -d face-service
else
  echo "  … SUPABASE_SERVICE_ROLE_KEY 없음 — face-service 건너뜀(.env 설정 후 재배포)"
fi

echo "▶ 헬스체크 (최대 60s)"
for i in $(seq 1 12); do
  if curl -fsS -o /dev/null "http://127.0.0.1:${PORTAL_PORT}/health"; then
    echo "✅ portal 정상 (127.0.0.1:${PORTAL_PORT})"
    docker image prune -f >/dev/null 2>&1 || true
    echo "✅ 배포 완료"
    exit 0
  fi
  echo "  … 대기 ${i}/12"
  sleep 5
done

echo "❌ 헬스체크 실패 — 최근 로그:"
docker compose logs --tail=50 portal || true
exit 1
