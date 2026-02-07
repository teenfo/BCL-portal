# BCL-Race - 프로젝트 재현 및 배포 가이드 📘

> BCL-Race는 Concept2 PM5 에르고미터를 관리하고 레이스를 운영하는 웹 기반 포털입니다.  
> 이 문서 패키지는 프로젝트를 **완벽하게 재현**하고 **다른 프로젝트에 적용**할 수 있도록 설계되었습니다.

---

## 📚 문서 구조

이 패키지는 다음 4개의 **필수 가이드 문서**로 구성됩니다:

### 1️⃣ [PROJECT_SETUP_GUIDE.md](PROJECT_SETUP_GUIDE.md) - **상세 설정 가이드**
**용도**: 프로젝트를 처음부터 설정하는 완전한 단계별 지침

**포함 내용**:
- 시스템 요구사항 확인
- Python 환경 설정 (가상환경, 의존성)
- 파일 생성 순서 및 설명 (30개 파일)
- 서버 실행 및 포트 설정
- 모든 API 엔드포인트 상세 명세
- 환경 변수 참조
- 데이터 모델 정의
- 트러블슈팅 가이드
- 배포 방법 (Gunicorn, Docker)

**읽는 시간**: 30분 | **활용**: 초기 설정 시 정독

---

### 2️⃣ [WORKFLOW.md](WORKFLOW.md) - **완전한 구현 워크플로우**
**용도**: 8개 단계로 나누어 처음부터 끝까지 프로젝트 구현

**포함 내용**:
- **WORKFLOW 1**: 환경 준비 (Python, 디렉토리)
- **WORKFLOW 2**: Python 환경 설정 (가상환경, 의존성)
- **WORKFLOW 3**: 백엔드 구현 (Phase 1-2, 8개 파일)
  - 데이터 모델 (state.py)
  - PM5 BLE 관리 (pm5.py, pm5_parsers.py)
  - 시뮬레이터 (simulator.py, sim_pm5.py)
  - API 라우터 (members.py, main.py)
- **WORKFLOW 4**: 프론트엔드 구현 (Phase 3-4, 13개 파일)
  - CSS 스타일시트
  - 12개 HTML 템플릿
- **WORKFLOW 5**: 설정 파일 및 스크립트
- **WORKFLOW 6**: 테스트 및 검증
- **WORKFLOW 7**: 배포
- **WORKFLOW 8**: 트러블슈팅

**단계별 소요 시간**:
```
환경 준비: 10분
의존성 설치: 5분
백엔드 구현: 60분
프론트엔드 구현: 45분
설정: 10분
테스트: 20분
─────────────
총 150분 (2.5시간)
```

**읽는 시간**: 45분 | **활용**: 구현 과정에서 각 단계별로 참조

---

### 3️⃣ [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - **빠른 참조 가이드**
**용도**: 자주 사용하는 명령어와 체크리스트

**포함 내용**:
- 초기 설정 (5분)
- 파일 생성 순서 체크리스트
- 서버 실행 (한 줄 명령)
- 브라우저 접속 URL
- 주요 엔드포인트 테이블
- API 테스트 (curl 명령)
- WebSocket 테스트
- 환경 변수 빠른 참조
- 트러블슈팅 표
- 자주 사용하는 명령어

**읽는 시간**: 10분 | **활용**: 개발 중 계속 참조 (북마크 권장)

---

### 4️⃣ [ARCHITECTURE.md](ARCHITECTURE.md) - **기술 아키텍처 문서**
**용도**: 시스템 설계, 데이터 흐름, 성능 특성 이해

**포함 내용**:
- 시스템 아키텍처 다이어그램
- 계층 구조 (프레젠테이션, 비즈니스로직, 데이터모델, 통합)
- 주요 컴포넌트 상세 설명
  - RaceStore (스레드 안전 상태 저장소)
  - PM5Manager (BLE 관리)
  - Simulator (백그라운드 시뮬레이션)
  - SimPM5 (가상 PM5 기기)
- 데이터 흐름 (회원 생성, 레이스 시작, WebSocket 업데이트)
- 프로토콜 상세 (HTTP routes, JSON 형식)
- 동시성 모델 (스레드, RLock)
- 메모리 사용 및 성능
- 확장성 (수직/수평)
- 보안 고려사항
- 확장 포인트 (DB, 인증, 알림)

**읽는 시간**: 40분 | **활용**: 구조 이해, 확장 계획 시

---

## 🚀 빠른 시작 (5분)

```bash
# 1. 프로젝트 디렉토리 생성
mkdir -p bcl-portal && cd bcl-portal

# 2. 필수 디렉토리 생성
mkdir -p app/templates static data scripts
touch app/__init__.py

# 3. 가상환경 설정
python3 -m venv venv
source venv/bin/activate

# 4. 의존성 설치
pip install fastapi uvicorn jinja2 python-multipart websockets qrcode pillow bleak

# 5. 이 문서들을 프로젝트에 복사
# PROJECT_SETUP_GUIDE.md
# WORKFLOW.md
# QUICK_REFERENCE.md
# ARCHITECTURE.md

# 6. WORKFLOW.md를 따라 구현 시작
```

---

## 📋 전체 파일 목록 (30개)

### 백엔드 (8개)
```
app/
├── __init__.py
├── state.py                 (데이터 모델, RaceStore)
├── pm5_spec.py              (PM5 BLE 사양)
├── pm5_parsers.py           (PM5 데이터 파서)
├── pm5.py                   (PM5 BLE 관리)
├── simulator.py             (레이스 시뮬레이터)
├── sim_pm5.py               (PM5 시뮬레이터)
└── members.py               (회원 관리 API)
```

### 프론트엔드 (13개)
```
app/templates/
├── home.html                (포털 홈)
├── lounge.html              (라운지 정보)
├── member_management.html   (회원 관리 섹션)
├── members.html             (회원 관리 메인)
├── race_home.html           (레이스 포털)
├── join.html                (참가 등록 직접)
├── qr.html                  (QR 참가 등록)
├── admin.html               (운영자 대시보드)
├── race_run.html            (레이스 진행)
├── live.html                (실시간 리더보드)
├── result.html              (결과 리더보드)
└── sim_setup.html           (시뮬레이터 설정)

static/
├── styles.css               (전역 스타일)
└── app.js                   (JavaScript, 대부분 미사용)
```

### 설정 및 스크립트 (7개)
```
data/
├── pm5_config.json          (PM5 설정)
└── pm5_labels.json          (PM5 라벨)

scripts/
├── run_portal.sh            (포털 서버 실행)
├── run_sim_server.sh        (시뮬레이터 서버)
├── pm5_notify_test.py       (PM5 BLE 테스트)
└── run_simulator.sh         (레거시)

Root:
├── .gitignore               (Git 무시 파일)
└── requirements.txt         (Python 의존성)
```

### 문서 (5개 = 이 패키지)
```
├── PROJECT_SETUP_GUIDE.md   (상세 설정 가이드)
├── WORKFLOW.md              (완전한 구현 워크플로우)
├── QUICK_REFERENCE.md       (빠른 참조)
├── ARCHITECTURE.md          (기술 아키텍처)
└── README.md                (이 파일)
```

---

## 🎯 사용 시나리오별 가이드

### 시나리오 1: 처음부터 프로젝트 구현
**추천 순서**:
1. [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - 5분 읽기 (구조 파악)
2. [WORKFLOW.md](WORKFLOW.md) - 단계별 따라하기 (2.5시간)
3. [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - 테스트 명령어 사용

### 시나리오 2: 특정 부분만 이해하고 싶을 때
- **"회원 관리 기능이 어떻게 작동하나?"** 
  → [ARCHITECTURE.md](ARCHITECTURE.md) - "데이터 흐름" 섹션
- **"WebSocket은 어떻게 구현되나?"**
  → [ARCHITECTURE.md](ARCHITECTURE.md) - "WebSocket 실시간 업데이트 플로우"
- **"API 엔드포인트가 뭐가 있나?"**
  → [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - "주요 엔드포인트"

### 시나리오 3: 이미 구현된 코드를 유지보수할 때
**추천 순서**:
1. [PROJECT_SETUP_GUIDE.md](PROJECT_SETUP_GUIDE.md) - 전체 시스템 이해
2. [ARCHITECTURE.md](ARCHITECTURE.md) - 컴포넌트별 역할 확인
3. [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - API/환경변수 참조

### 시나리오 4: 프로젝트를 확장하고 싶을 때
**추천 순서**:
1. [ARCHITECTURE.md](ARCHITECTURE.md) - "확장 포인트" 섹션
2. [PROJECT_SETUP_GUIDE.md](PROJECT_SETUP_GUIDE.md) - "의존성" 섹션
3. 각 파일별 구현 상세 확인

### 시나리오 5: 다른 팀원에게 설명하고 싶을 때
**추천 순서**:
1. [QUICK_REFERENCE.md](QUICK_REFERENCE.md) (5분) - 빠른 개요
2. [ARCHITECTURE.md](ARCHITECTURE.md) (20분) - 시스템 설계
3. [PROJECT_SETUP_GUIDE.md](PROJECT_SETUP_GUIDE.md) - 상세 참조

---

## 📊 문서 활용 매트릭스

| 작업 | 초보자 | 경험자 | 팀장 |
|------|--------|--------|------|
| 처음 구현 | WORKFLOW | WORKFLOW | - |
| 유지보수 | GUIDE+ARCH | QUICK_REF | ARCH |
| 버그 수정 | QUICK_REF | GUIDE | GUIDE |
| 기능 추가 | WORKFLOW | ARCH | ARCH |
| 배포 | GUIDE | QUICK_REF | GUIDE |
| 설명하기 | ARCH | ARCH | ARCH |

---

## 💾 파일 크기 및 라인 수

```
파일                          크기      라인 수
────────────────────────────────────────────
app/main.py                   ~25KB     ~600
app/pm5.py                    ~22KB     ~600
admin.html                    ~18KB     ~600
app/state.py                  ~5KB      ~150
styles.css                    ~15KB     ~500
app/pm5_parsers.py            ~12KB     ~350
members.html                  ~12KB     ~270
sim_pm5.py                    ~8KB      ~200
race_run.html                 ~5KB      ~150
────────────────────────────────────────────
총 파일 크기                  ~200KB
총 라인 수                    ~4500
```

---

## 🔧 주요 기술 스택

```
Backend:
├── FastAPI 0.104.1           (웹 프레임워크)
├── Uvicorn 0.24.0            (ASGI 서버)
├── Jinja2 3.1.2              (템플릿 엔진)
├── Bleak 0.21.1              (BLE 라이브러리)
└── Python 3.9+               (기본 언어)

Frontend:
├── HTML5                     (마크업)
├── CSS3                      (스타일)
├── Vanilla JavaScript        (상호작용)
└── WebSocket                 (실시간 통신)

데이터 저장소:
├── JSON (선택사항)
└── In-Memory (기본)

배포:
├── Gunicorn                  (WSGI 서버)
├── Nginx (역프록시)
└── Docker (컨테이너화)
```

---

## ✅ 체크리스트: 문서 완독 후 확인사항

### 지식 습득 (학습 목표)
- [ ] BCL Portal의 목적과 주요 기능 이해
- [ ] 시스템 아키텍처 및 컴포넌트 이해
- [ ] 데이터 흐름 및 API 엔드포인트 파악
- [ ] 프로젝트 구조 및 파일 조직 이해

### 실행 능력 (실습 목표)
- [ ] 환경 설정 및 의존성 설치 가능
- [ ] 서버 실행 및 포트 설정 가능
- [ ] 주요 기능 테스트 (회원 추가, 레이스 시작) 가능
- [ ] API 호출 및 WebSocket 연결 가능

### 유지보수 능력 (운영 목표)
- [ ] 버그 발생 시 원인 파악 가능
- [ ] 성능 최적화 포인트 식별 가능
- [ ] 새로운 기능 추가 계획 가능
- [ ] 배포 및 모니터링 설정 가능

---

## 📞 자주 묻는 질문 (FAQ)

**Q1: 어디서부터 시작해야 하나?**
> A: [QUICK_REFERENCE.md](QUICK_REFERENCE.md)를 5분 읽고, [WORKFLOW.md](WORKFLOW.md)를 따라 하세요.

**Q2: 데이터베이스는 어디 있나?**
> A: 현재는 메모리(in-memory)에만 저장됩니다. 서버 재시작 시 초기화됩니다.

**Q3: PM5 기기가 없어도 되나?**
> A: 네, 시뮬레이터 모드(기본값)를 사용하면 됩니다.

**Q4: 배포는 어떻게 하나?**
> A: [PROJECT_SETUP_GUIDE.md](PROJECT_SETUP_GUIDE.md) - "배포" 섹션을 참조하세요.

**Q5: 인증/로그인이 필요한가?**
> A: 현재 없습니다. [ARCHITECTURE.md](ARCHITECTURE.md) - "확장 포인트"에서 추가 방법을 확인하세요.

---

## 🎓 학습 경로 추천

### 초급 (새로운 팀원)
```
Day 1: QUICK_REFERENCE.md (10분)
Day 2-3: WORKFLOW.md (4시간 분산)
Day 4: PROJECT_SETUP_GUIDE.md 정독 (30분)
Day 5: 직접 구현 및 테스트 (4시간)
```

### 중급 (기존 팀원)
```
Day 1: ARCHITECTURE.md (40분)
Day 2: PROJECT_SETUP_GUIDE.md (20분)
Day 3: 코드 검토 및 확장 계획 (2시간)
```

### 고급 (리드 개발자)
```
Day 1: ARCHITECTURE.md (40분)
Day 2: 코드베이스 리뷰 (2시간)
Day 3: 성능 최적화 및 확장성 계획 (3시간)
```

---

## 🔗 관련 리소스

### 공식 문서
- [FastAPI 문서](https://fastapi.tiangolo.com/)
- [Bleak 문서](https://bleak.readthedocs.io/)
- [Concept2 PM5 BLE 사양](https://www.concept2.com/)

### 추가 학습 자료
- Python 웹 개발 (FastAPI, Uvicorn)
- WebSocket 실시간 통신
- BLE (Bluetooth Low Energy) 프로토콜
- Docker 컨테이너화

---

## 📝 라이선스 및 저작권

이 문서 패키지 및 코드는 자유롭게 사용, 수정, 배포할 수 있습니다.

---

## 🙋 피드백 및 개선

이 문서에 대한 피드백이나 개선 사항이 있으시면:
1. 구체적인 섹션 지적
2. 이해하기 어려운 부분 설명
3. 추가되어야 할 정보 제안

---

## 📅 문서 관리

| 파일 | 최종 업데이트 | 상태 | 버전 |
|------|-------------|------|------|
| PROJECT_SETUP_GUIDE.md | 2026-01-08 | 완성 | 1.0 |
| WORKFLOW.md | 2026-01-08 | 완성 | 1.0 |
| QUICK_REFERENCE.md | 2026-01-08 | 완성 | 1.0 |
| ARCHITECTURE.md | 2026-01-08 | 완성 | 1.0 |
| README.md | 2026-01-08 | 완성 | 1.0 |

---

## 🎉 다음 단계

1. [QUICK_REFERENCE.md](QUICK_REFERENCE.md)를 읽으세요 (5분)
2. [WORKFLOW.md](WORKFLOW.md)를 따라 구현하세요 (2.5시간)
3. 서버를 시작하고 테스트하세요
4. [ARCHITECTURE.md](ARCHITECTURE.md)로 심화 학습하세요
5. 필요에 따라 확장하거나 배포하세요

**Happy coding! 🚀**

---

**프로젝트**: BCL-Race (Concept2 PM5 에르고미터 관리 시스템)  
**버전**: 1.0  
**상태**: 프로덕션 준비 완료  
**최종 업데이트**: 2026년 1월 8일
