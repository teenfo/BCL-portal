# face-service — 갤러리 셀피 얼굴 매칭 워커

BCL 실서버에서 **docker compose 서비스**로 상주(portal·race-service와 동일 스택,
`scripts/deploy.sh`가 함께 빌드·기동). Supabase를 폴링해:

1. **셀피 등록 처리** — `member_face_profiles.status='pending'` 행의 셀피(비공개 `selfies` 버킷)를
   내려받아 insightface(buffalo_l)로 512-d 임베딩 추출 → `embedding` 저장, `status='ready'`,
   **원본 셀피 파일 삭제**(임베딩만 보관). 이어서 기존 사진 얼굴들과 백필 매칭.
2. **사진 처리** — `gallery_photos.face_status='pending'` 사진(`gallery` 버킷)을 내려받아
   얼굴 검출·임베딩 → `gallery_photo_faces` 저장, 같은 시설의 ready 프로필과 코사인 유사도
   비교(기본 임계 0.45) → `gallery_photo_members` 기록, `face_status='done'|'no_faces'`.

매칭이 전부 사전 계산되므로 앱은 RLS/RPC로 "내 사진"을 즉시 필터한다. 임베딩은 클라이언트에
노출되지 않고, 얼굴 데이터는 이 서버 밖으로 나가지 않는다.

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
- CPU 전용(onnxruntime) — 사진 1장 ≈ 1~2초. 수업 사진 배치엔 충분, 포트 미노출(아웃바운드만).
- 임계값 가이드(buffalo_l 정규화 임베딩): 0.40 관대 ~ 0.50 보수. 마스크/측면 얼굴은 미검출 가능.
- 크래시 복구: 기동 시 `processing` 고착 행을 `pending`으로 되돌려 재처리(멱등).
