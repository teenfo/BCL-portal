# face-service — 갤러리 셀피 얼굴 매칭 워커

hosub 서버에서 상주 실행되는 Python 워커. Supabase를 폴링해:

1. **셀피 등록 처리** — `member_face_profiles.status='pending'` 행의 셀피(비공개 `selfies` 버킷)를
   내려받아 insightface(buffalo_l)로 512-d 임베딩 추출 → `embedding` 저장, `status='ready'`,
   **원본 셀피 파일 삭제**(임베딩만 보관). 이어서 기존 사진 얼굴들과 백필 매칭.
2. **사진 처리** — `gallery_photos.face_status='pending'` 사진(`gallery` 버킷)을 내려받아
   얼굴 검출·임베딩 → `gallery_photo_faces` 저장, 같은 시설의 ready 프로필과 코사인 유사도
   비교(기본 임계 0.45) → `gallery_photo_members` 기록, `face_status='done'|'no_faces'`.

매칭이 전부 사전 계산되므로 앱은 RLS/RPC로 "내 사진"을 즉시 필터한다. 임베딩은 클라이언트에
노출되지 않는다.

## 설치 (hosub)

```bash
sudo mkdir -p /opt/bcl-face && sudo chown $USER /opt/bcl-face
cp worker.py requirements.txt /opt/bcl-face/
cd /opt/bcl-face
python3 -m venv venv && venv/bin/pip install -r requirements.txt   # 최초 1회 모델(~300MB) 자동 다운로드
cp face-service.env.example /opt/bcl-face/.env                      # 값 채우기
sudo cp bcl-face.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now bcl-face
```

## 환경 변수 (.env)

| 키 | 설명 |
|---|---|
| `SUPABASE_URL` | 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service role (RLS 우회 — 이 서버 밖 유출 금지) |
| `FACE_MATCH_THRESHOLD` | 코사인 유사도 임계 (기본 0.45, 오탐 많으면 ↑) |
| `POLL_INTERVAL_S` | 폴링 주기 초 (기본 5) |

## 운영 메모
- CPU 전용(onnxruntime). 사진 1장 ≈ 1~2초/8코어 — 수업 사진 배치엔 충분.
- 임계값 가이드(buffalo_l 정규화 임베딩): 0.40 관대 ~ 0.50 보수. 마스크/측면얼굴은 미검출 가능.
- 로그: `journalctl -u bcl-face -f`
