# face-service — 갤러리 셀피 얼굴 매칭 워커

BCL 실서버에서 **docker compose 서비스**로 상주(portal·race-service와 동일 스택,
`scripts/deploy.sh`가 함께 빌드·기동). 미디어 원본은 portal과 공유하는
`gallery-media` 볼륨에서 직접 읽는다(Supabase Storage 미사용 — v2). Supabase 폴링으로:

1. **셀피 등록 처리** — `member_face_profiles.status='pending'` 행의 셀피
   (`/media/selfies/{uid}/…`)를 insightface(buffalo_l)로 512-d 임베딩 추출 →
   `embedding` 저장(status='ready'), **원본 셀피 파일 즉시 삭제**. 이어서 기존 미디어와 백필 매칭.
2. **사진·동영상 처리** — `gallery_photos.face_status='pending'` 미디어(`/media/gallery/…`)를
   분석. 동영상은 **1초 간격 프레임 샘플링**(최대 90프레임)으로 얼굴을 모으고 프레임 간
   동일 인물을 병합(유사도 0.7)하며, 얼굴이 가장 많은 프레임으로 **포스터 썸네일**을 생성
   (`{path}.thumb.jpg` + `thumb_path`/`duration_s` 기록). 시설의 ready 프로필과 코사인
   유사도 비교(기본 임계 0.45) → `gallery_photo_members` 기록.

**원시 얼굴 임베딩은 Supabase가 아니라 로컬 SQLite(`/data/faces.db`)에 저장**한다 —
원본에서 재분석 가능한 파생 데이터라 백업 불요, 클라우드 DB에는 매칭 결과·상태만 남는다.
(예외: `member_face_profiles.embedding`은 셀피 원본 파기 후 유일본이라 DB에 보관.)

## 배포

서버 `.env`(compose와 공유)에 아래 키가 있으면 `scripts/deploy.sh`가 자동 기동한다:

| 키 | 설명 |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | **필수** — 없으면 face-service는 건너뜀 (race-service와 공유) |
| `FACE_MATCH_THRESHOLD` | 선택 — 코사인 유사도 임계 (기본 0.45, 오탐 많으면 ↑) |
| `FACE_POLL_INTERVAL_S` | 선택 — 폴링 주기 초 (기본 5) |

수동 조작:

```bash
docker compose up -d face-service      # 기동 (최초 1회 모델 ~300MB 자동 다운로드 → face-models 볼륨 영속)
docker compose logs -f face-service    # 로그
docker compose restart face-service    # 임계값 등 .env 변경 반영
```

## 운영 메모
- CPU 전용(onnxruntime) — 사진 1장 ≈ 1~2초, 동영상 1분 ≈ 1~2분(백그라운드 배치라 무방).
- 임계값 가이드(buffalo_l 정규화 임베딩): 0.40 관대 ~ 0.50 보수. 마스크/측면 얼굴은 미검출 가능.
- 크래시 복구: 기동 시 `processing` 고착 행을 `pending`으로 되돌려 재처리(멱등).
- `/data/faces.db`가 유실되면 매칭 결과는 유지되지만 신규 셀피의 과거 미디어 백필이 빈다 —
  필요 시 `gallery_photos.face_status`를 `pending`으로 일괄 갱신하면 전체 재분석된다.
