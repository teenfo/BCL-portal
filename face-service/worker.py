"""BCL 갤러리 얼굴 매칭 워커 — hosub 상주 (README 참조).

Supabase 폴링 → 셀피 임베딩 추출/사진 얼굴 검출(insightface buffalo_l, CPU)
→ 코사인 매칭 사전 계산. service role 사용(이 파일은 신뢰 서버에서만 구동).
"""
from __future__ import annotations

import io
import logging
import os
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

from supabase import create_client  # noqa: E402

sb = create_client(SUPABASE_URL, SERVICE_KEY)

# insightface 초기화 — 최초 실행 시 모델 자동 다운로드(INSIGHTFACE_ROOT, 컨테이너는 볼륨 영속)
from insightface.app import FaceAnalysis  # noqa: E402

fa = FaceAnalysis(
    name="buffalo_l",
    root=os.environ.get("INSIGHTFACE_ROOT", os.path.expanduser("~/.insightface")),
    providers=["CPUExecutionProvider"],
)
fa.prepare(ctx_id=-1, det_size=(960, 960))


def _decode(data: bytes) -> np.ndarray | None:
    """JPEG/PNG/HEIC 아님 → None. BGR ndarray 반환(insightface 기대 형식)."""
    import cv2

    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    return img


def _norm(v: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(v)
    return v / n if n > 0 else v


def _cos(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(_norm(a), _norm(b)))


def _facility_profiles(facility_id: str) -> list[tuple[str, np.ndarray]]:
    """해당 시설의 ready 프로필 (member_id, embedding)."""
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
        member_id, path = r["member_id"], r["selfie_path"]
        facility_id = r["members"]["facility_id"]
        try:
            data = sb.storage.from_("selfies").download(path)
            img = _decode(data)
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
            try:
                sb.storage.from_("selfies").remove([path])
            except Exception:
                log.warning("셀피 파일 삭제 실패(무시) path=%s", path)
            backfill_member(member_id, facility_id, emb)
            log.info("셀피 등록 완료 member=%s", member_id)
        except Exception as e:  # noqa: BLE001 — 개별 실패가 워커를 죽이지 않게
            log.exception("셀피 처리 실패 member=%s", member_id)
            sb.table("member_face_profiles").update(
                {"status": "failed", "error": str(e)[:300], "updated_at": "now()"}
            ).eq("member_id", member_id).execute()
    return len(rows)


def backfill_member(member_id: str, facility_id: str, emb: np.ndarray) -> None:
    """새 프로필 ↔ 기존 사진 얼굴 전수 매칭(시설 스코프)."""
    photos = (
        sb.table("gallery_photos").select("id").eq("facility_id", facility_id).eq("face_status", "done").execute().data
    )
    if not photos:
        return
    ids = [p["id"] for p in photos]
    matches = []
    for i in range(0, len(ids), 100):
        faces = (
            sb.table("gallery_photo_faces")
            .select("photo_id, embedding")
            .in_("photo_id", ids[i : i + 100])
            .execute()
            .data
        )
        best: dict[str, float] = {}
        for f in faces:
            if not f.get("embedding"):
                continue
            s = _cos(emb, np.asarray(f["embedding"], dtype=np.float32))
            if s >= THRESHOLD and s > best.get(f["photo_id"], 0.0):
                best[f["photo_id"]] = s
        matches += [
            {"photo_id": pid, "member_id": member_id, "similarity": round(s, 4)} for pid, s in best.items()
        ]
    if matches:
        sb.table("gallery_photo_members").upsert(matches, on_conflict="photo_id,member_id").execute()
        log.info("백필 매칭 %d건 member=%s", len(matches), member_id)


def process_photos() -> int:
    rows = (
        sb.table("gallery_photos")
        .select("id, facility_id, storage_path")
        .eq("face_status", "pending")
        .limit(BATCH)
        .execute()
        .data
    )
    for r in rows:
        pid = r["id"]
        sb.table("gallery_photos").update({"face_status": "processing"}).eq("id", pid).execute()
        try:
            data = sb.storage.from_("gallery").download(r["storage_path"])
            img = _decode(data)
            faces = fa.get(img) if img is not None else []
            if not faces:
                sb.table("gallery_photos").update({"face_status": "no_faces", "face_count": 0}).eq("id", pid).execute()
                continue
            face_rows = []
            embs = []
            for f in faces:
                emb = _norm(f.normed_embedding.astype(np.float32))
                embs.append(emb)
                face_rows.append(
                    {
                        "photo_id": pid,
                        "bbox": [float(x) for x in f.bbox],
                        "embedding": [float(x) for x in emb],
                    }
                )
            sb.table("gallery_photo_faces").delete().eq("photo_id", pid).execute()  # 재처리 멱등
            sb.table("gallery_photo_faces").insert(face_rows).execute()

            profiles = _facility_profiles(r["facility_id"])
            best: dict[str, float] = {}
            for member_id, pemb in profiles:
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
            sb.table("gallery_photos").update({"face_status": "done", "face_count": len(faces)}).eq(
                "id", pid
            ).execute()
            log.info("사진 처리 완료 photo=%s faces=%d matches=%d", pid, len(faces), len(best))
        except Exception:  # noqa: BLE001
            log.exception("사진 처리 실패 photo=%s", pid)
            sb.table("gallery_photos").update({"face_status": "failed"}).eq("id", pid).execute()
    return len(rows)


def main() -> None:
    log.info("bcl-face 워커 시작 — threshold=%.2f poll=%.0fs", THRESHOLD, POLL_S)
    # 재시작 복구: 이전 크래시로 processing에 고착된 사진을 pending으로 되돌림
    sb.table("gallery_photos").update({"face_status": "pending"}).eq("face_status", "processing").execute()
    while True:
        try:
            n = process_selfies() + process_photos()
        except Exception:  # noqa: BLE001 — 네트워크 단절 등 전역 오류에도 상주 유지
            log.exception("폴링 사이클 오류")
            n = 0
        time.sleep(1 if n else POLL_S)


if __name__ == "__main__":
    main()
