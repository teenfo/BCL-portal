# BCL-Race - 빠른 설정 체크리스트 (Quick Reference)

## 1. 초기 설정 (5분)

```bash
# 1단계: 프로젝트 디렉토리 생성
mkdir -p bcl-race && cd bcl-race

# 2단계: 필수 디렉토리 생성
mkdir -p app/templates static data scripts
touch app/__init__.py

# 3단계: 가상환경 생성 및 활성화
python3 -m venv venv
source venv/bin/activate

# 4단계: Python 의존성 설치
pip install fastapi uvicorn jinja2 python-multipart websockets qrcode pillow bleak
```

## 2. 파일 생성 순서 및 체크리스트

### 백엔드 (8개 파일)
- [ ] app/state.py
- [ ] app/pm5_spec.py  
- [ ] app/pm5_parsers.py
- [ ] app/pm5.py
- [ ] app/simulator.py
- [ ] app/sim_pm5.py
- [ ] app/members.py
- [ ] app/main.py

### 프론트엔드 (12개 파일)
- [ ] static/styles.css
- [ ] app/templates/home.html
- [ ] app/templates/lounge.html
- [ ] app/templates/member_management.html
- [ ] app/templates/members.html
- [ ] app/templates/race_home.html
- [ ] app/templates/join.html
- [ ] app/templates/qr.html
- [ ] app/templates/admin.html
- [ ] app/templates/race_run.html
- [ ] app/templates/live.html
- [ ] app/templates/result.html
- [ ] app/templates/sim_setup.html

### 설정 (5개 파일)
- [ ] data/pm5_config.json
- [ ] data/pm5_labels.json
- [ ] scripts/run_portal.sh
- [ ] scripts/run_sim_server.sh
- [ ] .gitignore
- [ ] requirements.txt

### 문서 (2개 파일)
- [ ] PROJECT_SETUP_GUIDE.md
- [ ] WORKFLOW.md

## 3. 서버 실행

```bash
# 터미널 1: 포털 서버 (포트 8000)
./scripts/run_portal.sh 8000
# 또는
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 터미널 2: 시뮬레이터 서버 (포트 8001, 선택)
./scripts/run_sim_server.sh 8001
```

## 4. 브라우저 접속

```
http://localhost:8000
```

## 5. 주요 엔드포인트

| 기능 | URL | 설명 |
|------|-----|------|
| 포털 홈 | http://localhost:8000 | 메인 페이지 |
| 회원 관리 | http://localhost:8000/members | 회원 CRUD |
| 레이스 | http://localhost:8000/race | 레이스 포털 |
| 운영자 | http://localhost:8000/race/admin | 배정 및 제어 |
| 실행 중 | http://localhost:8000/race/run | 실시간 거리 표시 |
| 리더보드 | http://localhost:8000/race/leaderboard/live | 실시간 순위 |
| 결과 | http://localhost:8000/race/leaderboard/result | 최종 결과 |

## 6. API 테스트 (curl)

```bash
# 회원 생성
curl -X POST http://localhost:8000/api/participant/create \
  -d "name=철수&participant_id=test1&contact=010-1111-1111"

# 현재 상태 조회
curl http://localhost:8000/api/state | jq .

# 레이스 시작
curl -X POST http://localhost:8000/api/race/start \
  -d "distance_target_m=1000"

# 레이스 리셋
curl -X POST http://localhost:8000/api/race/reset
```

## 7. WebSocket 테스트

브라우저 콘솔:
```javascript
const ws = new WebSocket('ws://localhost:8000/ws');
ws.onmessage = (e) => {
  const data = JSON.parse(e.data);
  console.log('Received:', data);
};
ws.onerror = (e) => console.error('Error:', e);
```

## 8. 환경 변수

```bash
# 기본 (시뮬레이터 모드)
./scripts/run_portal.sh 8000

# PM5 BLE 모드 활성화
USE_PM5_BLE=1 ./scripts/run_portal.sh 8000

# 로깅 활성화
PM5_LOG=1 PM5_LOG_DATA=1 ./scripts/run_portal.sh 8000

# 시뮬레이터 설정
PM5_SIM_COUNT=5 PM5_SIM_PACE=115 ./scripts/run_portal.sh 8000
```

## 9. 트러블슈팅

| 문제 | 해결 |
|------|------|
| "Module not found" | `pip install -r requirements.txt` |
| "Port already in use" | `./scripts/run_portal.sh 8080` (다른 포트) |
| 템플릿 로드 안 됨 | `ls -la app/templates/` (모든 파일 확인) |
| PM5 연결 안 됨 | `USE_PM5_BLE=0` (시뮬레이터 모드 사용) |
| WebSocket 연결 실패 | 방화벽 확인, `ws://` 프로토콜 사용 |

## 10. 주요 특징 및 테스트

### 회원 관리
- ✅ UUID 자동 생성
- ✅ 영문 ID만 입력 (IME 필터링)
- ✅ 상세 정보 모달
- ✅ 실시간 목록 업데이트

### 레이스 관리
- ✅ 참가자 등록 (직접 또는 QR)
- ✅ 레인 배정 (ERG에 참가자 할당)
- ✅ 거리 목표 설정
- ✅ 실시간 진행 상황 표시
- ✅ 결과 리더보드

### 시뮬레이터
- ✅ 가상 PM5 기기 생성
- ✅ 랜덤 거리/파워/SPM 생성
- ✅ 레인별 개별 속도 제어

### 프론트엔드
- ✅ 다크 테마 (GitHub-inspired)
- ✅ 반응형 디자인
- ✅ WebSocket 실시간 업데이트
- ✅ 모달 및 폼 유효성 검사

## 11. 데이터 모델 참조

### Participant
```python
{
  "id": "uuid-or-custom-id",
  "name": "이름",
  "created_at": 1234567890.5,
  "contact": "010-1111-1111",
  "email": "user@example.com"
}
```

### ErgState
```python
{
  "erg_id": "ERG_1",
  "distance_m": 500,
  "power_w": 250,
  "stroke_rate": 30,
  "hr_bpm": 160,
  "status": "RACING",  # IDLE, READY, RACING, FINISHED
  "last_updated": 1234567890.5,
  "finish_time_ms": null
}
```

## 12. 성능 팁

```bash
# Gunicorn으로 프로덕션 실행
gunicorn -w 4 -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 app.main:app

# 또는 Docker
docker build -t bcl-portal .
docker run -p 8000:8000 bcl-portal
```

## 13. 자주 사용하는 명령어

```bash
# 서버 시작
./scripts/run_portal.sh 8000

# 종료 (Ctrl+C)

# 가상환경 활성화
source venv/bin/activate

# 가상환경 비활성화
deactivit

# 의존성 설치
pip install -r requirements.txt

# 의존성 업데이트
pip install --upgrade -r requirements.txt

# 테스트 API 호출
curl -X POST http://localhost:8000/api/race/reset
```

## 14. 배포 준비

```bash
# 1. 의존성 검증
pip freeze > requirements.txt

# 2. 환경 변수 설정
export USE_PM5_BLE=0
export PM5_SIM_COUNT=3

# 3. 서버 시작
gunicorn -w 4 -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 --access-logfile - app.main:app

# 4. 방화벽 규칙 (Linux)
sudo ufw allow 8000/tcp
```

## 15. 개발 팁

```bash
# 핫 리로드 활성화 (--reload 플래그 사용)
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 특정 파일만 모니터링
python3 -m uvicorn app.main:app --reload --reload-dir=app

# 웹소켓 테스트 (websocat 도구)
brew install websocat  # macOS
websocat ws://localhost:8000/ws
```

---

**정리 가이드**: 이 파일을 북마크하거나 인쇄하여 프로젝트 진행 중 참조하세요.
