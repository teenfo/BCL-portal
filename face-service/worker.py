"""BCL 갤러리 얼굴 매칭 워커 — 실서버 docker compose 상주 (README 참조).

v2: 미디어 원본은 공유 볼륨(gallery-media)에서 직접 읽고(Storage 미사용),
원시 얼굴 임베딩은 로컬 SQLite(/data/faces.db)에 저장 — Supabase에는 매칭 결과와
상태만 기록한다. 동영상은 1초 간격 프레임 샘플링으로 분석하고 포스터 썸네일을 생성.
service role 사용(이 컨테이너는 신뢰 서버에서만 구동).
"""
from __future__ import annotations

import logging
import os
import sqlite3
import time

import numpy as np

log = logging.getLogger("bcl-face")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def _env(key: str, default: str | None = None) -> str:
    v = os.environ.get(key, default)
    if v is None:
        raise SystemExit(f"환경 변수 {key} 필요 (.env 참조)")
    return v


SUPABASE_URL = _env("SUPABASE_URL")
SERVICE_KEY = _env("SUPABASE_SERVICE_ROLE_KEY")
THRESHOLD = float(os.environ.get("FACE_MATCH_THRESHOLD", "0.45"))
POLL_S = float(os.environ.get("POLL_INTERVAL_S", "5"))
BATCH = int(os.environ.get("PHOTO_BATCH", "4"))
MEDIA_ROOT = os.environ.get("MEDIA_ROOT", "/media")
DATA_DIR = os.environ.get("DATA_DIR", "/data")
VIDEO_EXTS = {".mp4", ".mov", ".webm", ".m4v"}
VIDEO_MAX_FRAMES = int(os.environ.get("VIDEO_MAX_FRAMES", "90"))  # 1fps 샘플 → 최대 90초 커버
DEDUP_SIM = 0.7  # 동영상 프레임 간 동일 인물 임베딩 병합 임계
DEDUP_CAP = 40  # 미디어당 보관 대표 임베딩 상한

from supabase import create_client  # noqa: E402

sb = create_client(SUPABASE_URL, SERVICE_KEY)

# insightface 초기화 — 최초 실행 시 모델 자동 다운로드(INSIGHTFACE_ROOT, 볼륨 영속)
from insightface.app import FaceAnalysis  # noqa: E402

fa = FaceAnalysis(
    name="buffalo_l",
    root=os.environ.get("INSIGHTFACE_ROOT", os.path.expanduser("~/.insightface")),
    providers=["CPUExecutionProvider"],
)
fa.prepare(ctx_id=-1, det_size=(960, 960))

# ── 로컬 임베딩 저장(SQLite) — 파생 데이터(원본에서 재분석 가능) ──────────────
db = sqlite3.connect(os.path.join(DATA_DIR, "faces.db"))
db.execute(
    """CREATE TABLE IF NOT EXISTS faces (
        photo_id TEXT NOT NULL,
        facility_id TEXT NOT NULL,
        idx INTEGER NOT NULL,
        emb BLOB NOT NULL,
        PRIMARY KEY (photo_id, idx)
    )"""
)
db.execute("CREATE INDEX IF NOT EXISTS idx_faces_facility ON faces (facility_id)")
db.commit()


def _norm(v: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(v)
    return v / n if n > 0 else v


def _cos(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(_norm(a), _norm(b)))


def _media_path(kind: str, rel: str) -> str:
    return os.path.join(MEDIA_ROOT, kind, rel)


def _read_image(path: str) -> np.ndarray | None:
    import cv2

    return cv2.imread(path, cv2.IMREAD_COLOR)


def _save_faces(photo_id: str, facility_id: str, embs: list[np.ndarray]) -> None:
    db.execute("DELETE FROM faces WHERE photo_id = ?", (photo_id,))  # 재처리 멱등
    db.executemany(
        "INSERT INTO faces (photo_id, facility_id, idx, emb) VALUES (?,?,?,?)",
        [(photo_id, facility_id, i, e.astype(np.float32).tobytes()) for i, e in enumerate(embs)],
    )
    db.commit()


def _facility_faces(facility_id: str):
    for photo_id, blob in db.execute(
        "SELECT photo_id, emb FROM faces WHERE facility_id = ?", (facility_id,)
    ):
        yield photo_id, np.frombuffer(blob, dtype=np.float32)


def _facility_profiles(facility_id: str) -> list[tuple[str, np.ndarray]]:
    rows = (
        sb.table("member_face_profiles")
        .select("member_id, embedding, members!inner(facility_id)")
        .eq("status", "ready")
        .eq("members.facility_id", facility_id)
        .execute()
        .data
    )
    out = []
    for r in rows:
        emb = r.get("embedding")
        if emb:
            out.append((r["member_id"], np.asarray(emb, dtype=np.float32)))
    return out


def _dedup_add(reps: list[np.ndarray], emb: np.ndarray) -> None:
    """동영상 다프레임 임베딩 병합 — 기존 대표와 충분히 다를 때만 추가."""
    if len(reps) >= DEDUP_CAP:
        return
    for r in reps:
        if _cos(r, emb) >= DEDUP_SIM:
            return
    reps.append(emb)


def _extract_video(path: str) -> tuple[list[np.ndarray], int, float, np.ndarray | None]:
    """1초 간격 프레임 샘플링 → (대표 임베딩들, 최대 동시 얼굴 수, 길이초, 썸네일 프레임)."""
    import cv2

    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        return [], 0, 0.0, None
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = total / fps if fps > 0 else 0.0
    step = max(1, round(fps))
    reps: list[np.ndarray] = []
    max_faces = 0
    thumb: np.ndarray | None = None
    thumb_faces = -1
    idx = 0
    sampled = 0
    while sampled < VIDEO_MAX_FRAMES:
        ok = cap.grab()
        if not ok:
            break
        if idx % step == 0:
            ok, frame = cap.retrieve()
            if not ok or frame is None:
                break
            # 검출 속도 — 긴 변 1280 다운스케일(임베딩 정확도 영향 미미)
            h, w = frame.shape[:2]
            scale = min(1.0, 1280 / max(h, w))
            if scale < 1.0:
                frame = cv2.resize(frame, (int(w * scale), int(h * scale)))
            faces = fa.get(frame)
            max_faces = max(max_faces, len(faces))
            if len(faces) > thumb_faces:
                thumb_faces = len(faces)
                thumb = frame.copy()
            for f in faces:
                _dedup_add(reps, _norm(f.normed_embedding.astype(np.float32)))
            sampled += 1
        idx += 1
    cap.release()
    return reps, max_faces, duration, thumb


def process_selfies() -> int:
    rows = (
        sb.table("member_face_profiles")
        .select("member_id, selfie_path, members!inner(facility_id)")
        .eq("status", "pending")
        .limit(BATCH)
        .execute()
        .data
    )
    for r in rows:
        member_id, rel = r["member_id"], r["selfie_path"]
        facility_id = r["members"]["facility_id"]
        try:
            path = _media_path("selfies", rel) if rel else None
            img = _read_image(path) if path and os.path.isfile(path) else None
            faces = fa.get(img) if img is not None else []
            if not faces:
                sb.table("member_face_profiles").update(
                    {"status": "failed", "error": "no_face", "updated_at": "now()"}
                ).eq("member_id", member_id).execute()
                log.warning("셀피 얼굴 미검출 member=%s", member_id)
                continue
            # 가장 큰 얼굴 채택(배경 인물 배제)
            face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
            emb = _norm(face.normed_embedding.astype(np.float32))
            sb.table("member_face_profiles").update(
                {
                    "embedding": [float(x) for x in emb],
                    "status": "ready",
                    "error": None,
                    "selfie_path": None,
                    "updated_at": "now()",
                }
            ).eq("member_id", member_id).execute()
            # 원본 셀피 파기 — 임베딩만 보관(개인정보 최소화)
            if path:
                try:
                    os.remove(path)
                except OSError:
                    log.warning("셀피 파일 삭제 실패(무시) path=%s", rel)
            backfill_member(member_id, facility_id, emb)
            log.info("셀피 등록 완료 member=%s", member_id)
        except Exception as e:  # noqa: BLE001 — 개별 실패가 워커를 죽이지 않게
            log.exception("셀피 처리 실패 member=%s", member_id)
            sb.table("member_face_profiles").update(
                {"status": "failed", "error": str(e)[:300], "updated_at": "now()"}
            ).eq("member_id", member_id).execute()
    return len(rows)


def backfill_member(member_id: str, facility_id: str, emb: np.ndarray) -> None:
    """새 프로필 ↔ 기존 미디어 얼굴(SQLite) 전수 매칭(시설 스코프)."""
    best: dict[str, float] = {}
    for photo_id, femb in _facility_faces(facility_id):
        s = _cos(emb, femb)
        if s >= THRESHOLD and s > best.get(photo_id, 0.0):
            best[photo_id] = s
    if best:
        sb.table("gallery_photo_members").upsert(
            [
                {"photo_id": pid, "member_id": member_id, "similarity": round(s, 4)}
                for pid, s in best.items()
            ],
            on_conflict="photo_id,member_id",
        ).execute()
        log.info("백필 매칭 %d건 member=%s", len(best), member_id)


def process_media() -> int:
    import cv2

    rows = (
        sb.table("gallery_photos")
        .select("id, facility_id, storage_path, media_type")
        .eq("face_status", "pending")
        .limit(BATCH)
        .execute()
        .data
    )
    for r in rows:
        pid = r["id"]
        sb.table("gallery_photos").update({"face_status": "processing"}).eq("id", pid).execute()
        try:
            path = _media_path("gallery", r["storage_path"])
            if not os.path.isfile(path):
                raise FileNotFoundError(r["storage_path"])
            extra: dict[str, object] = {}
            if r["media_type"] == "video" or os.path.splitext(path)[1].lower() in VIDEO_EXTS:
                embs, face_count, duration, thumb = _extract_video(path)
                extra["duration_s"] = round(duration, 1)
                if thumb is not None:
                    thumb_rel = r["storage_path"] + ".thumb.jpg"
                    cv2.imwrite(_media_path("gallery", thumb_rel), thumb, [cv2.IMWRITE_JPEG_QUALITY, 85])
                    extra["thumb_path"] = thumb_rel
            else:
                img = _read_image(path)
                faces = fa.get(img) if img is not None else []
                embs = [_norm(f.normed_embedding.astype(np.float32)) for f in faces]
                face_count = len(faces)

            if not embs:
                sb.table("gallery_photos").update(
                    {"face_status": "no_faces", "face_count": 0, **extra}
                ).eq("id", pid).execute()
                continue

            _save_faces(pid, r["facility_id"], embs)  # 원시 임베딩 = 로컬 SQLite만

            best: dict[str, float] = {}
            for member_id, pemb in _facility_profiles(r["facility_id"]):
                for emb in embs:
                    s = _cos(pemb, emb)
                    if s >= THRESHOLD and s > best.get(member_id, 0.0):
                        best[member_id] = s
            if best:
                sb.table("gallery_photo_members").upsert(
                    [
                        {"photo_id": pid, "member_id": mid, "similarity": round(s, 4)}
                        for mid, s in best.items()
                    ],
                    on_conflict="photo_id,member_id",
                ).execute()
            sb.table("gallery_photos").update(
                {"face_status": "done", "face_count": face_count, **extra}
            ).eq("id", pid).execute()
            log.info(
                "미디어 처리 완료 id=%s type=%s faces=%d matches=%d",
                pid, r["media_type"], face_count, len(best),
            )
        except Exception:  # noqa: BLE001
            log.exception("미디어 처리 실패 id=%s", pid)
            sb.table("gallery_photos").update({"face_status": "failed"}).eq("id", pid).execute()
    return len(rows)


def main() -> None:
    log.info(
        "bcl-face 워커 시작 — threshold=%.2f poll=%.0fs media=%s data=%s",
        THRESHOLD, POLL_S, MEDIA_ROOT, DATA_DIR,
    )
    # 재시작 복구: 이전 크래시로 processing에 고착된 미디어를 pending으로 되돌림
    sb.table("gallery_photos").update({"face_status": "pending"}).eq("face_status", "processing").execute()
    while True:
        try:
            n = process_selfies() + process_media()
        except Exception:  # noqa: BLE001 — 네트워크 단절 등 전역 오류에도 상주 유지
            log.exception("폴링 사이클 오류")
            n = 0
        time.sleep(1 if n else POLL_S)


if __name__ == "__main__":
    main()
