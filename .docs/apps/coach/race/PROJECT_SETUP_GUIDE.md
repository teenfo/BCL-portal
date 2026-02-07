# BCL-Race - 프로젝트 설정 및 재현 가이드

## 1. 프로젝트 개요

**BCL-Race**는 Concept2 PM5 에르고미터를 관리하고 레이스를 운영하기 위한 웹 기반 포털입니다.
- 회원 관리 (CRUD)
- 레이스 관리 (참가 등록, 레인 배정, 실시간 모니터링)
- PM5 BLE 기기 관리
- 시뮬레이터 모드 지원

---

## 2. 시스템 요구사항

### 필수
- **Python 3.9 이상**
- **macOS / Linux / WSL2 (Windows)**
- Bash 스크립트 지원

### 선택사항
- PM5 BLE 기기 (없으면 시뮬레이터 모드 사용)

---

## 3. 프로젝트 구조

```
bcl-portal/
├── app/
│   ├── __init__.py              (빈 파일)
│   ├── main.py                  (FastAPI 메인 앱)
│   ├── state.py                 (데이터 모델, RaceStore)
│   ├── members.py               (회원 관리 API)
│   ├── simulator.py             (레이스 시뮬레이터)
│   ├── pm5.py                   (PM5 BLE 관리)
│   ├── pm5_spec.py              (PM5 BLE 사양)
│   ├── pm5_parsers.py           (PM5 데이터 파서)
│   ├── sim_pm5.py               (PM5 시뮬레이터)
│   └── templates/
│       ├── admin.html           (운영자 대시보드)
│       ├── home.html            (포털 홈)
│       ├── join.html            (참가 등록)
│       ├── live.html            (실시간 리더보드)
│       ├── lounge.html          (라운지 정보)
│       ├── members.html         (회원 관리)
│       ├── member_management.html (회원 관리 섹션)
│       ├── qr.html              (QR 참가 등록)
│       ├── race_home.html       (레이스 포털)
│       ├── race_run.html        (레이스 진행)
│       ├── result.html          (결과 리더보드)
│       └── sim_setup.html       (시뮬레이터 설정)
├── static/
│   ├── app.js                   (프론트엔드 로직)
│   └── styles.css               (스타일시트)
├── data/
│   ├── pm5_config.json          (PM5 설정)
│   └── pm5_labels.json          (PM5 라벨)
├── scripts/
│   ├── run_portal.sh            (포털 서버 실행)
│   ├── run_sim_server.sh        (시뮬레이터 서버 실행)
│   ├── run_simulator.sh         (레거시 시뮬레이터)
│   └── pm5_notify_test.py       (PM5 테스트)
├── .gitignore
├── requirements.txt             (Python 의존성)
└── PROJECT_SETUP_GUIDE.md       (이 파일)
```

---

## 4. Python 의존성

### requirements.txt
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

---

## 5. 단계별 설정 지침

### 5.1 프로젝트 디렉토리 생성

```bash
mkdir -p bcl-portal
cd bcl-portal
```

### 5.2 디렉토리 구조 생성

```bash
mkdir -p app/templates static data scripts
touch app/__init__.py
```

### 5.3 Python 가상환경 설정

```bash
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# 또는 Windows: venv\Scripts\activate

pip install --upgrade pip
pip install -r requirements.txt
```

### 5.4 파일 생성 순서

#### Phase 1: 백엔드 코어 파일

1. **app/state.py** - 데이터 모델 정의
   - Participant, LaneAssignment, ErgState
   - RaceStore (스레드 안전 상태 저장소)

2. **app/pm5_spec.py** - PM5 BLE 사양 상수

3. **app/pm5_parsers.py** - PM5 데이터 파서

4. **app/pm5.py** - PM5 BLE 관리자
   - BLE 스캔, 연결, 알림 구독
   - 시뮬레이터 모드 지원

5. **app/simulator.py** - 레이스 시뮬레이터

6. **app/sim_pm5.py** - PM5 시뮬레이터

#### Phase 2: API 및 메인 앱

7. **app/members.py** - 회원 관리 API
   - POST /api/participant/create
   - POST /api/participant/delete

8. **app/main.py** - FastAPI 메인 애플리케이션
   - 모든 라우트, 웹소켓, 시동/종료 이벤트

#### Phase 3: 프론트엔드 파일

9. **static/styles.css** - 전역 스타일
   - 다크 테마, 컴포넌트 스타일

10. **static/app.js** - JavaScript 로직 (현재는 사용 안 함)

#### Phase 4: HTML 템플릿

11. **app/templates/home.html** - 포털 홈
12. **app/templates/lounge.html** - 라운지 정보
13. **app/templates/members.html** - 회원 관리
14. **app/templates/member_management.html** - 회원 관리 섹션 (include)
15. **app/templates/race_home.html** - 레이스 포털
16. **app/templates/join.html** - 참가 등록 (직접)
17. **app/templates/qr.html** - QR 참가 등록
18. **app/templates/admin.html** - 운영자 대시보드
19. **app/templates/race_run.html** - 레이스 진행
20. **app/templates/live.html** - 실시간 리더보드
21. **app/templates/result.html** - 결과 리더보드
22. **app/templates/sim_setup.html** - 시뮬레이터 설정

#### Phase 5: 설정 및 스크립트

23. **data/pm5_config.json** - PM5 설정 파일
24. **data/pm5_labels.json** - PM5 라벨 파일
25. **scripts/run_portal.sh** - 포털 서버 실행 스크립트
26. **scripts/run_sim_server.sh** - 시뮬레이터 서버 스크립트
27. **scripts/pm5_notify_test.py** - PM5 BLE 테스트 유틸리티
28. **.gitignore** - Git 무시 파일

#### Phase 6: 문서

29. **requirements.txt** - Python 의존성 목록
30. **PROJECT_SETUP_GUIDE.md** - 이 가이드

---

## 6. 서버 실행 방법

### 6.1 포털 서버 (시뮬레이터 모드, 기본)

```bash
./scripts/run_portal.sh 8000
```

또는:

```bash
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**브라우저에서 접속**: `http://localhost:8000`

### 6.2 시뮬레이터 서버 (별도 포트)

```bash
./scripts/run_sim_server.sh 8001
```

### 6.3 PM5 BLE 모드 (실제 PM5 기기)

```bash
USE_PM5_BLE=1 python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 7. 주요 API 엔드포인트

### 상태 조회
- `GET /api/state` - 현재 레이스 상태 스냅샷

### 회원 관리
- `POST /api/participant/create` - 회원 생성 (name, participant_id 선택, contact, email)
- `POST /api/participant/delete` - 회원 삭제 (participant_id)

### 레이스 관리
- `POST /api/race/start` - 레이스 시작 (distance_target_m)
- `POST /api/race/finish` - 레이스 종료
- `POST /api/race/reset` - 레이스 리셋

### 레인 배정
- `POST /api/assign` - 참가자를 ERG에 배정 (erg_id, participant_id)
- `POST /api/unassign` - ERG 배정 해제 (erg_id)

### PM5 관리
- `GET /api/pm5/devices` - 연결된 PM5 기기 목록
- `GET /api/pm5/max` - PM5 최대 연결 기기 수
- `POST /api/pm5/max` - PM5 최대 연결 기기 수 설정
- `POST /api/pm5/label` - PM5 라벨 설정 (mac, name, note)
- `POST /api/pm5/map` - PM5를 ERG에 매핑 (mac, erg_id)

### 시뮬레이터 PM5
- `GET /api/sim/state` - 시뮬레이터 상태
- `POST /api/sim/config` - 가상 기기 설정 (erg_count)
- `POST /api/sim/start` - 시뮬레이터 연결
- `POST /api/sim/send_start` - 데이터 전송 시작
- `POST /api/sim/stop` - 시뮬레이터 종료

### 웹소켓
- `WS /ws` - 실시간 상태 업데이트 (JSON 스냅샷 또는 diff)

---

## 8. 환경 변수

### 서버 모드
- `USE_PM5_BLE=1` - PM5 BLE 모드 활성화 (기본값: 0, 시뮬레이터 모드)

### PM5 관리
- `PM5_MAX=10` - 동시 연결 최대 기기 수 (기본값: 10)
- `PM5_MAP="MAC1:ERG_1,MAC2:ERG_2"` - MAC→ERG 매핑
- `PM5_LOG=1` - 상세 로깅 활성화
- `PM5_LOG_DATA=1` - 패킷 데이터 로깅

### PM5 시뮬레이터
- `PM5_SIM_COUNT=3` - 시뮬레이터 ERG 개수 (기본값: 3)
- `PM5_SIM_ERGS="ERG_1,ERG_2"` - 시뮬레이터할 특정 ERG
- `PM5_SIM_PACE=120` - 기본 페이스 (초/500m, 기본값: 120)
- `PM5_SIM_INTERVAL=0.2` - 업데이트 주기 (초, 기본값: 0.2)
- `PM5_SIM_PACE_PER_LANE="115,120,130"` - 레인별 페이스

### 파일 경로
- `PM5_LABELS_FILE=data/pm5_labels.json` - PM5 라벨 파일 경로
- `PM5_CONFIG_FILE=data/pm5_config.json` - PM5 설정 파일 경로

---

## 9. 데이터 모델

### Participant
```python
@dataclass
class Participant:
    id: str                          # UUID 또는 커스텀 ID
    name: str                        # 이름 (필수)
    created_at: float                # Unix 타임스탐프
    contact: Optional[str] = None    # 연락처
    email: Optional[str] = None      # 이메일
```

### LaneAssignment
```python
@dataclass
class LaneAssignment:
    erg_id: str                      # ERG ID (ERG_1 ~ ERG_9)
    participant_id: Optional[str] = None  # 배정된 참가자
```

### ErgState
```python
@dataclass
class ErgState:
    erg_id: str
    distance_m: int = 0              # 거리 (미터)
    power_w: int = 0                 # 파워 (와트)
    stroke_rate: int = 0             # 스트로크 레이트 (SPM)
    hr_bpm: Optional[int] = None     # 심박수
    status: str = "IDLE"             # IDLE, READY, RACING, FINISHED
    last_updated: float = 0.0        # 마지막 업데이트 시간
    finish_time_ms: Optional[int] = None  # 완료 시간 (ms)
```

---

## 10. 웹소켓 메시지 형식

### 초기 연결 시 (전체 스냅샷)
```json
{
  "ts": 1234567890.5,
  "distance_target_m": 1000,
  "race_started_at": 1234567800.0,
  "participants": {
    "uuid-1": {
      "id": "uuid-1",
      "name": "철수",
      "created_at": 1234567800.0,
      "contact": "010-1234-5678",
      "email": "chulsu@example.com"
    }
  },
  "assignments": {
    "ERG_1": {
      "erg_id": "ERG_1",
      "participant_id": "uuid-1"
    }
  },
  "erg_states": {
    "ERG_1": {
      "erg_id": "ERG_1",
      "distance_m": 500,
      "power_w": 250,
      "stroke_rate": 30,
      "hr_bpm": 160,
      "status": "RACING",
      "last_updated": 1234567890.0,
      "finish_time_ms": null
    }
  }
}
```

### 이후 업데이트 (차이점만)
```json
{
  "ts": 1234567890.6,
  "erg_states": {
    "ERG_1": {
      "distance_m": 510,
      "power_w": 255,
      "stroke_rate": 31
    }
  }
}
```

---

## 11. 프론트엔드 주요 기능

### members.html
- 회원 추가 모달 (name, ID, contact, email)
- 회원 목록 테이블 (이름 클릭 시 상세 정보 모달)
- 회원 삭제 버튼
- IME 필터링: 회원 ID는 영문만 입력 가능

### admin.html
- 레이스 거리 설정
- PM5 최대 기기 수 설정
- PM5 기기 테이블 (MAC, 별칭, ERG, 연결 상태)
- PM5 라벨/매핑 추가
- 레인 배정 테이블 (참가자 선택, 배정/해제)
- 레이스 시작/리셋 버튼

### race_run.html
- 실시간 거리, 파워, SPM, 상태 표시
- 그리드 레이아웃 (ERG별)

### live.html
- 거리 기준 정렬 리더보드
- 실시간 업데이트

### result.html
- 완료 순서 기준 결과 리더보드

---

## 12. 스타일 테마

모든 스타일은 CSS 변수 기반 다크 테마 사용:

```css
--bg: #0d1117              /* 배경색 */
--card: #161b22            /* 카드 배경 */
--border: #30363d          /* 테두리 */
--accent: #58a6ff          /* 기본 액센트 (파란색) */
--accent-2: #2ea043        /* 보조 액센트 (녹색) */
--danger: #f85149          /* 위험 (빨간색) */
--text: #e6edf3            /* 텍스트 색 */
```

---

## 13. 트러블슈팅

### "python-multipart not found"
```bash
pip install python-multipart
```

### "websockets not found"
```bash
pip install websockets
```

### PM5 BLE 연결 안 됨
1. 기기가 켜져 있는지 확인
2. `USE_PM5_BLE=0` (시뮬레이터 모드) 사용
3. 로그 확인: `PM5_LOG=1 ./scripts/run_portal.sh 8000`

### 웹소켓 연결 실패
- 방화벽 설정 확인
- `ws://` 프로토콜 사용 (https의 경우 `wss://`)

---

## 14. 배포

### 프로덕션 환경 (Gunicorn + Uvicorn)
```bash
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 app.main:app
```

### Docker (선택사항)
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python3", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 15. 개발 팁

### 코드 핫 리로드
```bash
./scripts/run_portal.sh 8000
# uvicorn은 --reload 플래그로 파일 변경 시 자동 재시작
```

### 데이터 초기화
- 서버 재시작 시 모든 메모리 상태 초기화됨
- `data/` 디렉토리: PM5 라벨, 설정 영속화

### 디버깅
```bash
# 로그 레벨 증가
PM5_LOG=1 PM5_LOG_DATA=1 ./scripts/run_portal.sh 8000
```

---

## 16. 라이선스 및 참고사항

- **PM5 BLE 사양**: Concept2 공식 문서 기반
- **의존성**: 오픈 소스 라이브러리 사용
- **웹 브라우저**: 최신 크롬, 파이어폭스, 사파리 권장

---

## 17. 버전 정보

- **Python**: 3.9+
- **FastAPI**: 0.104.1
- **Uvicorn**: 0.24.0
- **Jinja2**: 3.1.2
- **Bleak**: 0.21.1

최종 업데이트: 2026년 1월 8일
