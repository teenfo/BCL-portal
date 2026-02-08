# BCL-Race - 완전한 재현 워크플로우

> 이 문서는 BCL-Race를 다른 프로젝트에서 처음부터 재현하기 위한 단계별 지침입니다.

---

## 워크플로우 개요

```
[환경 준비]
    ↓
[프로젝트 초기화]
    ↓
[Python 의존성 설치]
    ↓
[백엔드 코어 구현] (Phase 1-2)
    ↓
[프론트엔드 구현] (Phase 3-4)
    ↓
[설정 파일 생성] (Phase 5)
    ↓
[서버 테스트 및 검증]
    ↓
[배포]
```

---

## WORKFLOW 1: 환경 준비

### Step 1.1: 시스템 요구사항 확인

**확인 항목:**
```bash
# Python 버전 확인 (3.9 이상 필요)
python3 --version

# pip 버전 확인
pip3 --version

# 지원되는 OS 확인
uname -s  # macOS: Darwin, Linux: Linux
```

**만약 Python 3.9가 없다면:**
- **macOS**: `brew install python@3.9`
- **Linux (Ubuntu)**: `sudo apt-get install python3.9 python3.9-venv`
- **Windows**: python.org에서 3.9 설치

### Step 1.2: 프로젝트 디렉토리 준비

```bash
# 프로젝트 루트 생성
mkdir -p ~/projects/bcl-portal
cd ~/projects/bcl-portal

# 필수 디렉토리 구조 생성
mkdir -p app/templates
mkdir -p static
mkdir -p data
mkdir -p scripts

# Python 패키지 마크 생성
touch app/__init__.py
```

### Step 1.3: Git 초기화 (선택사항)

```bash
git init
git config user.email "your.email@example.com"
git config user.name "Your Name"
```

---

## WORKFLOW 2: Python 환경 설정

### Step 2.1: 가상환경 생성

```bash
# 가상환경 생성
python3 -m venv venv

# 활성화
source venv/bin/activate  # macOS/Linux
# 또는 Windows: venv\Scripts\activate

# 프롬프트에 (venv)가 표시되는지 확인
which python  # /path/to/venv/bin/python
```

### Step 2.2: pip 업그레이드

```bash
pip install --upgrade pip setuptools wheel
```

### Step 2.3: requirements.txt 생성

프로젝트 루트에 `requirements.txt` 파일 생성:

```
fastapi==0.104.1
uvicorn[standard]==0.24.0
jinja2==3.1.2
python-multipart==0.0.6
websockets==12.0
qrcode==7.4.2
pillow==10.1.0
bleak==0.21.1
```

### Step 2.4: 의존성 설치

```bash
pip install -r requirements.txt

# 설치 확인
pip list | grep -E "fastapi|uvicorn|jinja2"
```

---

## WORKFLOW 3: 백엔드 구현 (Phase 1-2)

### Phase 1: 핵심 데이터 및 PM5 모듈

#### File 1: app/state.py
**용도:** 데이터 모델 및 상태 관리
**크기:** ~150 줄
**의존성:** 표준 라이브러리만 사용
**주요 클래스:**
- `Participant` - 참가자 데이터
- `LaneAssignment` - ERG 배정
- `ErgState` - ERG 상태
- `RaceStore` - 스레드 안전 상태 저장소

#### File 2: app/pm5_spec.py
**용도:** PM5 BLE 사양 상수
**크기:** ~40 줄
**의존성:** 없음
**주요 내용:**
- 서비스 UUID
- 특성 UUID 목록
- 구독할 특성 정의

#### File 3: app/pm5_parsers.py
**용도:** PM5 바이너리 데이터 파싱
**크기:** ~350 줄
**의존성:** `pm5_spec`
**주요 함수:**
- `parse_general_status()` - 기본 상태 파싱
- `parse_stroke_data()` - 스트로크 데이터 파싱
- `parse_by_char_uuid()` - 특성별 자동 파싱

#### File 4: app/pm5.py
**용도:** PM5 BLE 관리자
**크기:** ~600 줄
**의존성:** `bleak`, `state`, `pm5_spec`, `pm5_parsers`
**주요 기능:**
- BLE 스캔 및 연결
- 알림 구독
- MAC→ERG 매핑
- 라벨 저장/로드
- 시뮬레이터 모드 지원
- 기기 목록 반환

**구현 팁:**
1. `_load_mac_labels()` 함수로 `data/pm5_labels.json` 로드
2. `_load_config()` 함수로 `data/pm5_config.json` 로드
3. 환경변수로 설정 오버라이드 지원 (PM5_MAP, PM5_LOG 등)

#### File 5: app/simulator.py
**용도:** 레이스 시뮬레이터
**크기:** ~60 줄
**의존성:** `state`
**주요 기능:**
- 백그라운드 스레드에서 ERG 상태 업데이트
- 거리, 파워, SPM 랜덤 생성
- 레이스 완료 감지

#### File 6: app/sim_pm5.py
**용도:** PM5 시뮬레이터 (가상 기기)
**크기:** ~200 줄
**의존성:** `state`, `pm5`, `pm5_spec`
**주요 기능:**
- 가상 PM5 기기 생성
- 스트로크 데이터 패킷 생성 (19 바이트)
- ERG별 페이스 시뮬레이션

### Phase 2: API 및 메인 앱

#### File 7: app/members.py
**용도:** 회원 관리 API
**크기:** ~70 줄
**의존성:** `fastapi`, `state`
**엔드포인트:**
- `GET /members` - 회원 관리 HTML
- `POST /api/participant/create` - 회원 생성
  - name (필수), participant_id (선택, UUID 자동), contact, email
  - 응답: `{"ok": true, "participant_id": "..."}`
- `POST /api/participant/delete` - 회원 삭제
  - participant_id (필수)
  - 배정 자동 해제

#### File 8: app/main.py
**용도:** FastAPI 메인 앱
**크기:** ~600 줄
**의존성:** `fastapi`, `state`, `simulator`, `pm5`, `sim_pm5`, `members`
**주요 구성:**

```
1. 앱 초기화
   - FastAPI() 인스턴스
   - Jinja2Templates 설정
   - 정적 파일 마운트 (/static)
   - 라우터 포함

2. 포털 페이지 (GET)
   - / (home)
   - /lounge
   - /members
   - /race (race_home)
   - /race/run
   - /race/sim
   - /race/join
   - /race/admin
   - /race/leaderboard/live
   - /race/leaderboard/result
   - /race/qr
   - /race/qr.png (QR 이미지 생성)

3. API 엔드포인트 (POST)
   - /api/assign - 참가자 배정
   - /api/unassign - 배정 해제
   - /api/race/start - 레이스 시작
   - /api/race/reset - 리셋
   - /api/race/finish - 레이스 종료
   - /api/sim/config - 시뮬레이터 설정
   - /api/sim/start - 시뮬레이터 시작
   - /api/sim/send_start - 데이터 전송
   - /api/sim/stop - 시뮬레이터 중지
   - /api/pm5/max - PM5 최대 기기 수
   - /api/pm5/label - PM5 라벨
   - /api/pm5/map - PM5 ERG 매핑

4. WebSocket
   - /ws - 실시간 상태 업데이트

5. 시동/종료
   - @app.on_event("startup")
   - @app.on_event("shutdown")
```

---

## WORKFLOW 4: 프론트엔드 구현 (Phase 3-4)

### Phase 3: 스타일시트

#### File 9: static/styles.css
**용도:** 전역 스타일 및 다크 테마
**크기:** ~500 줄
**주요 요소:**
- CSS 변수 정의 (색상, 그림자)
- 기본 레이아웃 (.page, .card)
- 버튼 스타일 (.btn, .btn.ghost, .btn.warn, .btn.danger)
- 테이블 스타일
- 반응형 디자인 (@media max-width: 640px)
- 상태 뱃지 (.pill)

**색상 팔레트:**
```css
--bg: #0d1117          (배경)
--card: #161b22        (카드)
--border: #30363d      (테두리)
--accent: #58a6ff      (기본, 파란색)
--accent-2: #2ea043    (성공, 녹색)
--danger: #f85149      (위험, 빨간색)
--warn: #d29922        (경고, 주황색)
--text: #e6edf3        (텍스트)
```

#### File 10: static/app.js
**용도:** JavaScript 로직 (현재는 대부분 각 HTML에 인라인으로 구현됨)
**크기:** ~10 줄 (비어있거나 미사용)

### Phase 4: HTML 템플릿 (Jinja2)

#### 홈 페이지 및 기본 페이지

**File 11: app/templates/home.html**
- 포털 메인 페이지
- 3개 버튼: 라운지 정보, 레이스, 회원

**File 12: app/templates/lounge.html**
- 라운지 정보 페이지 (개발 중)
- 단순 정보 표시

**File 13: app/templates/member_management.html**
- 회원 관리 섹션 (include 파일)
- 테이블 + 추가 버튼
- members.html에서 `{% include 'member_management.html' %}`로 포함

#### 회원 관리

**File 14: app/templates/members.html**
- 회원 관리 메인 페이지
- 모달 2개: 추가, 상세 정보
- 테이블: 이름(클릭), ID, 삭제
- IME 필터링 JavaScript
- WebSocket 연결 및 실시간 업데이트

**핵심 기능:**
```javascript
// IME 필터링 (한글 입력 방지)
memberIdInput.addEventListener("compositionstart", ...);
memberIdInput.addEventListener("compositionend", ...);
memberIdInput.addEventListener("input", ...);

// 모달 이벤트
openMemberModal()      // 추가 폼 열기
closeMemberModal()     // 추가 폼 닫기
openMemberDetailModal(pid)  // 상세 정보 열기
closeMemberDetailModal()    // 상세 정보 닫기

// API 호출
post("/api/participant/create", {...})
post("/api/participant/delete", {...})

// WebSocket
connectWS()            // 실시간 업데이트 수신
mergeDiff()           // 상태 업데이트 병합
```

#### 레이스 관리 페이지

**File 15: app/templates/race_home.html**
- 레이스 포털 메인
- 8개 버튼: QR, 직접 등록, 운영자, 진행, 시뮬레이터, Live, Result

**File 16: app/templates/join.html**
- 참가자 등록 (직접 입력)
- name 입력 필드
- POST /race/join 제출
- 에러/성공 메시지

**File 17: app/templates/qr.html**
- QR 코드 표시
- `<img src="/race/qr.png">` (동적 생성)
- 직접 등록 링크

**File 18: app/templates/admin.html**
- 운영자 대시보드
- 거리, PM5 최대 기기 수 설정
- PM5 기기 테이블 + 라벨/매핑 추가
- 레인 배정 테이블 (드롭다운 + 배정/해제)
- 모달: PM5 상세 정보 (실시간 갱신)

**핵심 함수:**
```javascript
openPm5Modal(mac)          // PM5 상세 모달 열기
refreshPm5Modal(mac)       // 300ms마다 새로고침
handleAssign(erg, pid)     // 배정
handleUnassign(erg)        // 해제
startRace()               // 레이스 시작
resetRace()               // 리셋
```

**File 19: app/templates/race_run.html**
- 레이스 진행 중 실시간 표시
- 그리드 레이아웃 (ERG별 카드)
- 거리(큰 폰트), 파워, SPM, HR 표시
- 상태 뱃지 (IDLE, READY, RACING, FINISHED)

**File 20: app/templates/live.html**
- 실시간 리더보드
- 테이블: # | ERG | 참가자 | 거리 | 파워 | SPM | 상태
- 거리 기준 내림차순 정렬

**File 21: app/templates/result.html**
- 결과 리더보드
- 완료 순서대로 표시
- 마지막 업데이트 시간 표시

**File 22: app/templates/sim_setup.html**
- 시뮬레이터 설정 페이지
- ERG 개수 입력
- 4개 버튼: MAC 생성, 연결, 데이터 전송, 종료
- 가상 기기 테이블: # | ERG | MAC

---

## WORKFLOW 5: 설정 파일 및 스크립트

### Phase 5: 설정 및 보조 파일

#### File 23: data/pm5_config.json
```json
{
  "max_devices": 10,
  "mac_map": {
    "AA:BB:CC:DD:EE:FF": "ERG_1"
  }
}
```

#### File 24: data/pm5_labels.json
```json
{
  "AA:BB:CC:DD:EE:FF": {
    "name": "레인 1",
    "note": "1번 에르고"
  }
}
```

#### File 25: scripts/run_portal.sh
```bash
#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8000}"
export USE_PM5_BLE="${USE_PM5_BLE:-0}"
python3 -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --reload
```

#### File 26: scripts/run_sim_server.sh
```bash
#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8001}"
export USE_PM5_BLE=0
python3 -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --reload
```

#### File 27: scripts/pm5_notify_test.py
- PM5 BLE 테스트 유틸리티
- MAC 주소로 특정 특성 구독
- 패킷 파싱 및 출력

#### File 28: .gitignore
```
__pycache__/
*.pyc
.venv/
venv/
.DS_Store
.idea/
*.log
```

#### File 29: requirements.txt
이미 생성됨 (Step 2.3 참고)

#### File 30: PROJECT_SETUP_GUIDE.md
이미 생성됨

---

## WORKFLOW 6: 테스트 및 검증

### Step 6.1: 서버 시작

```bash
# 가상환경 활성화
source venv/bin/activate

# 포털 서버 시작 (시뮬레이터 모드)
./scripts/run_portal.sh 8000

# 출력 예:
# INFO:     Uvicorn running on http://0.0.0.0:8000
# INFO:     Application startup complete
```

### Step 6.2: 브라우저 접속

```
http://localhost:8000
```

**확인 사항:**
- [ ] 포털 홈 로드됨
- [ ] "라운지 정보", "레이스", "회원" 버튼 보임
- [ ] 스타일 (다크 테마) 적용됨

### Step 6.3: 회원 관리 테스트

```
1. http://localhost:8000/members 접속
2. "회원 추가" 클릭
3. 회원 ID: test_user (영문만 가능)
4. 이름: 테스트 사용자
5. 연락처: 010-1234-5678
6. 이메일: test@example.com
7. 저장 클릭
8. 테이블에 추가됨 확인
9. 이름 클릭 → 상세 정보 모달 확인
10. 삭제 버튼 → 삭제 확인
```

### Step 6.4: 레이스 관리 테스트

```
1. http://localhost:8000/race 접속
2. "운영자" 클릭 → /race/admin
3. 거리: 500m으로 설정
4. "레이스 시작" 클릭
5. http://localhost:8000/race/run 접속
6. ERG들의 거리가 증가하는지 확인 (시뮬레이터)
7. http://localhost:8000/race/leaderboard/live 접속
8. 실시간 업데이트 확인
```

### Step 6.5: WebSocket 테스트

브라우저 콘솔에서:
```javascript
const ws = new WebSocket("ws://localhost:8000/ws");
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```

**예상 메시지:**
- 첫 번째: 전체 스냅샷 (participants, assignments, erg_states)
- 이후: diff 메시지 (변경된 부분만)

### Step 6.6: API 테스트 (curl)

```bash
# 회원 생성
curl -X POST http://localhost:8000/api/participant/create \
  -d "name=철수&participant_id=test1&contact=010-1111-1111"

# 상태 조회
curl http://localhost:8000/api/state | jq

# 레이스 시작
curl -X POST http://localhost:8000/api/race/start \
  -d "distance_target_m=1000"
```

---

## WORKFLOW 7: 배포

### Step 7.1: 프로덕션 의존성

```bash
pip install gunicorn
```

### Step 7.2: Gunicorn으로 실행

```bash
gunicorn -w 4 \
  -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  app.main:app
```

### Step 7.3: 환경 변수 설정

```bash
export USE_PM5_BLE=0
export PM5_LOG=0
export PM5_SIM_COUNT=3
export PM5_SIM_PACE=120
```

### Step 7.4: Systemd 서비스 (Linux)

`/etc/systemd/system/bcl-portal.service`:
```ini
[Unit]
Description=BCL Portal Service
After=network.target

[Service]
Type=notify
User=www-data
WorkingDirectory=/opt/bcl-portal
Environment="USE_PM5_BLE=0"
ExecStart=/opt/bcl-portal/venv/bin/gunicorn \
  -w 4 -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 app.main:app
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable bcl-portal
sudo systemctl start bcl-portal
```

### Step 7.5: Docker (선택사항)

`Dockerfile`:
```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install gunicorn

COPY . .

EXPOSE 8000

ENV USE_PM5_BLE=0

CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", "app.main:app"]
```

```bash
docker build -t bcl-portal:latest .
docker run -p 8000:8000 bcl-portal:latest
```

---

## WORKFLOW 8: 트러블슈팅

### 문제: "ModuleNotFoundError: No module named 'fastapi'"

```bash
# 가상환경 활성화 확인
which python
# /path/to/venv/bin/python 이어야 함

# 의존성 재설치
pip install -r requirements.txt
```

### 문제: "Address already in use"

```bash
# 포트 8000이 이미 사용 중
lsof -i :8000
# PID 확인 후 kill

# 또는 다른 포트 사용
./scripts/run_portal.sh 8080
```

### 문제: PM5 기기 연결 안 됨

```bash
# 1. 기기 켜기 확인
# 2. 시뮬레이터 모드 사용
./scripts/run_portal.sh 8000  # USE_PM5_BLE=0 (기본값)

# 3. 로그 확인
PM5_LOG=1 ./scripts/run_portal.sh 8000
```

### 문제: "Jinja2TemplateNotFound"

```bash
# 템플릿 디렉토리 구조 확인
ls -la app/templates/

# 모든 .html 파일이 있는지 확인
ls -1 app/templates/ | wc -l  # 12개여야 함
```

---

## 요약 체크리스트

### 환경 준비
- [ ] Python 3.9+ 설치
- [ ] 프로젝트 디렉토리 생성
- [ ] 필수 서브디렉토리 생성

### Python 환경
- [ ] 가상환경 생성 및 활성화
- [ ] requirements.txt 생성
- [ ] pip install -r requirements.txt 완료

### 백엔드 (Phase 1-2)
- [ ] app/state.py
- [ ] app/pm5_spec.py
- [ ] app/pm5_parsers.py
- [ ] app/pm5.py
- [ ] app/simulator.py
- [ ] app/sim_pm5.py
- [ ] app/members.py
- [ ] app/main.py

### 프론트엔드 (Phase 3-4)
- [ ] static/styles.css
- [ ] static/app.js (선택)
- [ ] 12개 HTML 템플릿 (app/templates/)

### 설정 (Phase 5)
- [ ] data/pm5_config.json
- [ ] data/pm5_labels.json
- [ ] scripts/run_portal.sh
- [ ] scripts/run_sim_server.sh
- [ ] scripts/pm5_notify_test.py
- [ ] .gitignore
- [ ] requirements.txt

### 테스트
- [ ] 서버 시작 성공
- [ ] 포털 홈 로드 확인
- [ ] 회원 추가/삭제 테스트
- [ ] 레이스 시작/종료 테스트
- [ ] WebSocket 연결 확인
- [ ] API 응답 확인

### 배포
- [ ] Gunicorn 설치 (선택)
- [ ] 환경 변수 설정
- [ ] 서비스 또는 Docker 구성 (선택)

---

## 예상 소요 시간

| 단계 | 소요 시간 | 설명 |
|------|---------|------|
| 환경 준비 | 10분 | Python, 디렉토리 |
| 의존성 설치 | 5분 | pip install |
| 백엔드 구현 | 60분 | 8개 파일, ~2500 줄 |
| 프론트엔드 구현 | 45분 | 12개 HTML, CSS |
| 설정 | 10분 | JSON, 스크립트 |
| 테스트 | 20분 | 각 기능 검증 |
| **총계** | **150분 (2.5시간)** | 처음부터 배포 준비까지 |

---

## 다음 단계

1. **카스터마이징**
   - 팀 로고 추가
   - 색상 테마 변경
   - 추가 필드 (스포츠 클럽 이름 등)

2. **확장 기능**
   - 데이터베이스 연동 (SQLAlchemy + PostgreSQL)
   - 사용자 인증 (FastAPI-Login)
   - 실시간 알림 (이메일, SMS)
   - 데이터 분석 대시보드

3. **성능 최적화**
   - 캐싱 (Redis)
   - 데이터베이스 쿼리 최적화
   - 자산 압축 (CSS, JS 번들링)

---

**최종 업데이트:** 2026년 1월 8일  
**상태:** 완성
