# BCL face-service — 갤러리 셀피 얼굴 매칭 워커 (docs/07 §8.3b)
# BCL 실서버 docker compose로 portal·race-service와 함께 배포. 아웃바운드(Supabase)만 사용.
FROM python:3.12-slim

# insightface 소스 빌드용 툴체인(휠 미제공 환경 대비) — 설치 후 제거로 이미지 슬림 유지
COPY requirements.txt ./
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential g++ \
    && pip install --no-cache-dir -r requirements.txt \
    && apt-get purge -y build-essential g++ \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY worker.py ./

# 모델(buffalo_l ~300MB)은 최초 기동 시 자동 다운로드 — 볼륨으로 영속(재시작 시 재다운로드 방지)
# /media는 portal(uid 1001 nextjs)과 공유 — 볼륨 최초 초기화 시 1001 소유 승계(portal 쓰기 보장)
ENV INSIGHTFACE_ROOT=/data/insightface MEDIA_ROOT=/media DATA_DIR=/data
RUN mkdir -p /data/insightface /media && chown 1001:1001 /media

CMD ["python", "worker.py"]
