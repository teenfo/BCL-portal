# BCL race-service — PM5 BLE 브릿지 (docs/15 §2.1, docs/11 배포)
# 런타임 BLE 접근은 privileged 호스트 + BlueZ 필요(docker-compose에서 privileged: true).
FROM python:3.12-slim

# BlueZ 런타임(bleak가 D-Bus로 통신). 시뮬레이터-only 실행 시에도 설치는 무해.
RUN apt-get update \
    && apt-get install -y --no-install-recommends bluez libdbus-1-3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# JSONL 레코딩 볼륨(경로3). compose에서 볼륨 마운트 권장.
RUN mkdir -p /data/recordings
ENV RACE_RECORDINGS_DIR=/data/recordings \
    RACE_SERVICE_PORT=8001 \
    PYTHONUNBUFFERED=1

EXPOSE 8001

# 헬스체크는 nginx가 /health로 프록시(§2.3)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8001/health').status==200 else 1)" || exit 1

# 기본: 실장비 모드. 시뮬레이터는 command override 또는 RACE_SIMULATE=1.
CMD ["python", "server.py"]
